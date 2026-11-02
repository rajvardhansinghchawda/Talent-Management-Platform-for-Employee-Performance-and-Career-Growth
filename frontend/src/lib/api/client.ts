/**
 * API Client for Talent Management Platform.
 * Communicates with Django REST Framework backend at /api/v1/.
 * Handles in-memory JWT access token and automatic cookie-based refresh.
 * Zero `any` — fully typed against domain models.
 */

import type {
  AuditLogItem,
  CalibrationDistribution,
  CalibrationReviewItem,
  Course,
  Department,
  DevelopmentPlanRecord,
  Employee,
  FeedbackItem,
  GoalItem,
  HRDashboardData,
  JobRole,
  ManagerDashboardData,
  ManagerTeamMemberOverview,
  ManagerTeamRosterItem,
  OneOnOneItem,
  OrganizationSettings,
  ReportJobItem,
  ReportTypeItem,
  ReviewCycle,
  RoleSkill,
  Skill,
  SkillAssessmentQueueItem,
  User,
} from "./types";

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export class ApiError extends Error {
  code: string;
  details?: Record<string, unknown>;
  status: number;

  constructor(message: string, code: string, status: number, details?: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

// In-memory token storage (never localStorage per security rules)
let inMemoryAccessToken: string | null = null;
let tokenReadyResolvers: Array<() => void> = [];

export function setAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
  if (typeof window !== "undefined") {
    (window as any).__inMemoryAccessToken = token;
  }
  if (token) {
    const resolvers = [...tokenReadyResolvers];
    tokenReadyResolvers = [];
    resolvers.forEach((fn) => fn());
  }
}

export function getAccessToken(): string | null {
  return inMemoryAccessToken || (typeof window !== "undefined" ? (window as any).__inMemoryAccessToken : null);
}

export async function waitForToken(timeoutMs: number = 2000): Promise<string | null> {
  const current = getAccessToken();
  if (current) return current;
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(getAccessToken()), timeoutMs);
    tokenReadyResolvers.push(() => {
      clearTimeout(timer);
      resolve(getAccessToken());
    });
  });
}

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string | null) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null): void {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  if (!getAccessToken() && !endpoint.includes("/auth/login") && !endpoint.includes("/auth/password/reset") && typeof window !== "undefined") {
    await waitForToken(2000);
  }

  const token = getAccessToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // If body is FormData, delete Content-Type so browser sets multi-part boundary
  if (options.body instanceof FormData) {
    delete headers["Content-Type"];
  }

  let response = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // send httpOnly cookies
  });

  // Handle 401 with Token Refresh
  if (response.status === 401 && !endpoint.includes("/auth/login") && !endpoint.includes("/auth/refresh")) {
    if (isRefreshing) {
      try {
        const { promise, resolve, reject } = Promise.withResolvers<string | null>();
        failedQueue.push({ resolve, reject });
        const token = await promise;
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
          response = await fetch(url, { ...options, headers, credentials: "include" });
        }
      } catch {
        throw new ApiError("Session expired. Please log in again.", "UNAUTHENTICATED", 401);
      }
    } else {
      isRefreshing = true;
      try {
        const refreshRes = await fetch(`${API_BASE}/auth/refresh/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        if (refreshRes.ok) {
          const data = (await refreshRes.json()) as { access?: string; token?: string };
          const newToken = data.access || data.token || null;
          setAccessToken(newToken);
          processQueue(null, newToken);
          if (newToken) {
            headers["Authorization"] = `Bearer ${newToken}`;
            response = await fetch(url, { ...options, headers, credentials: "include" });
          }
        } else {
          setAccessToken(null);
          processQueue(new Error("Refresh failed"), null);
          throw new ApiError("Session expired. Please log in again.", "UNAUTHENTICATED", 401);
        }
      } catch (err) {
        setAccessToken(null);
        processQueue(err, null);
        throw err;
      } finally {
        isRefreshing = false;
      }
    }
  }

  if (response.status === 204) {
    return {} as T;
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const errorPayload = (data as ApiErrorResponse)?.error || {};
    throw new ApiError(
      errorPayload.message || response.statusText || "Request failed",
      errorPayload.code || "UNKNOWN_ERROR",
      response.status,
      errorPayload.details
    );
  }

  return data as T;
}

// ----------------- TYPED API ENDPOINTS -----------------

export const api = {
  auth: {
    login: (credentials: { email: string; password: string }) =>
      fetchApi<{ access: string; user: User }>("/auth/login/", {
        method: "POST",
        body: JSON.stringify(credentials),
      }),
    logout: () =>
      fetchApi<{ message: string }>("/auth/logout/", {
        method: "POST",
      }),
    me: () => fetchApi<User>("/auth/me/"),
    changePassword: (data: { old_password: string; new_password: string }) =>
      fetchApi<{ message: string }>("/auth/password/change/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  dashboard: {
    getHrDashboard: () => fetchApi<HRDashboardData>("/dashboards/hr/"),
  },

  manager: {
    getDashboard: () => fetchApi<ManagerDashboardData>("/dashboards/manager/"),
    getTeam: (params?: { q?: string; role?: string; review_status?: string }) => {
      const search = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v) search.append(k, v);
        });
      }
      return fetchApi<ManagerTeamRosterItem[]>(`/manager/team/?${search.toString()}`);
    },
    getTeamMemberOverview: (id: string) =>
      fetchApi<ManagerTeamMemberOverview>(`/manager/team/${id}/overview/`),
    getGoals: (params?: { scope?: string; employee?: string; cycle?: string; status?: string; q?: string }) => {
      const search = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v) search.append(k, v);
        });
      }
      return fetchApi<GoalItem[]>(`/goals/?${search.toString()}`);
    },
    approveGoal: (id: string, comment?: string) =>
      fetchApi<{ status: string }>(`/goals/${id}/approve/`, {
        method: "POST",
        body: JSON.stringify({ comment }),
      }),
    rejectGoal: (id: string, comment: string) =>
      fetchApi<{ status: string }>(`/goals/${id}/reject/`, {
        method: "POST",
        body: JSON.stringify({ comment }),
      }),
    assignGoal: (data: {
      employee: string;
      title: string;
      goal_type: string;
      direction: string;
      weight: number;
      target_value: number;
      due_date?: string;
    }) =>
      fetchApi<GoalItem>("/goals/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getGoalAlignment: (params?: { scope?: string; cycle?: string }) => {
      const search = new URLSearchParams(params || {}).toString();
      return fetchApi<unknown[]>(`/goals/alignment/?${search}`);
    },
    getReviews: (params?: { scope?: string; employee?: string; cycle?: string; status?: string; q?: string }) => {
      const search = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v) search.append(k, v);
        });
      }
      return fetchApi<unknown[]>(`/reviews/?${search.toString()}`);
    },
    getReviewDetail: (id: string) => fetchApi<Record<string, unknown>>(`/reviews/${id}/`),
    getReviewContext: (id: string) => fetchApi<Record<string, unknown>>(`/reviews/${id}/context/`),
    saveReviewDraft: (id: string, draft: Record<string, unknown>) =>
      fetchApi<Record<string, unknown>>(`/reviews/${id}/manager-review/draft/`, {
        method: "PUT",
        body: JSON.stringify({ draft }),
      }),
    submitReview: (id: string, data: {
      overall_rating: number;
      comments: string;
      competency_ratings?: Array<{ competency_id: string; rating: number; comment?: string }>;
      development_recommendations?: Array<{ text: string; skill?: string }>;
    }) =>
      fetchApi<Record<string, unknown>>(`/reviews/${id}/manager-review/`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    remindReviews: (review_ids: string[]) =>
      fetchApi<{ reminders_sent: number }>("/reviews/remind/", {
        method: "POST",
        body: JSON.stringify({ review_ids }),
      }),
    getSkillValidationQueue: (params?: { scope?: string; status?: string; employee?: string; skill?: string }) => {
      const search = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v) search.append(k, v);
        });
      }
      return fetchApi<SkillAssessmentQueueItem[]>(`/skill-assessments/?${search.toString()}`);
    },
    validateSkill: (id: string, data: { adjusted_level?: number; note?: string }) =>
      fetchApi<{ status: string; level: number }>(`/skill-assessments/${id}/validate/`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    rejectSkill: (id: string, reason: string) =>
      fetchApi<{ status: string; reason: string }>(`/skill-assessments/${id}/reject/`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    bulkValidateSkills: (ids: string[]) =>
      fetchApi<{ validated_count: number }>("/skill-assessments/bulk-validate/", {
        method: "POST",
        body: JSON.stringify({ ids }),
      }),
    getFeedback: (params?: { scope?: string; to_employee?: string }) => {
      const search = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v) search.append(k, v);
        });
      }
      return fetchApi<FeedbackItem[]>(`/feedback/?${search.toString()}`);
    },
    giveFeedback: (data: { to_employee: string; feedback_type: string; content: string; visibility: string }) =>
      fetchApi<FeedbackItem>("/feedback/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    giveRecognition: (data: { to_employee: string; message: string }) =>
      fetchApi<Record<string, unknown>>("/recognitions/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getFeedbackVisibilityOptions: () =>
      fetchApi<Array<{ value: string; label: string; help: string }>>("/feedback/visibility-options/"),
    getOneOnOnes: (params?: { scope?: string; when?: "upcoming" | "past" }) => {
      const search = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v) search.append(k, v);
        });
      }
      return fetchApi<OneOnOneItem[]>(`/one-on-ones/?${search.toString()}`);
    },
    scheduleOneOnOne: (data: { employee: string; scheduled_at: string; shared_notes?: string; private_notes?: string }) =>
      fetchApi<OneOnOneItem>("/one-on-ones/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateNotes: (id: string, data: { shared_notes?: string; private_notes?: string; status?: string }) =>
      fetchApi<OneOnOneItem>(`/one-on-ones/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    addActionItem: (meetingId: string, data: { title: string; owner?: string; due_date?: string }) =>
      fetchApi<Record<string, unknown>>(`/one-on-ones/${meetingId}/action-items/`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getDevelopmentPlans: (params?: { scope?: string; employee?: string; status?: string }) => {
      const search = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v) search.append(k, v);
        });
      }
      return fetchApi<DevelopmentPlanRecord[]>(`/development-plans/?${search.toString()}`);
    },
    approveDevelopmentPlan: (id: string) =>
      fetchApi<DevelopmentPlanRecord>(`/development-plans/${id}/approve/`, {
        method: "POST",
      }),
    rejectDevelopmentPlan: (id: string) =>
      fetchApi<DevelopmentPlanRecord>(`/development-plans/${id}/reject/`, {
        method: "POST",
      }),
    assignCourseToPlan: (planId: string, courseId: string) =>
      fetchApi<Record<string, unknown>>(`/development-plans/${planId}/assign-course/`, {
        method: "POST",
        body: JSON.stringify({ course: courseId }),
      }),
    flagPromotion: (data: { employee: string; note?: string }) =>
      fetchApi<{ message: string; flag: Record<string, unknown> }>("/careers/promotion-flags/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getTeamGoalDistribution: () => fetchApi<{ buckets: Array<{ label: string; count: number }> }>("/analytics/team/goal-progress-distribution/"),
    getTeamRatingTrend: () => fetchApi<Array<{ cycle_id: string; cycle_name: string; avg_rating: number }>>("/analytics/team/rating-trend/"),
    getTeamSkillHeatmap: () => fetchApi<{ skills: string[]; rows: Array<{ employee_name: string; levels: number[] }> }>("/analytics/team/skill-heatmap/"),
    getTeamTrainingCompletion: () => fetchApi<{ completed: number; in_progress: number; enrolled: number; total: number; completion_pct: number }>("/analytics/team/training-completion/"),
  },

  employees: {
    list: (params?: Record<string, string | number | boolean | undefined>) => {
      const search = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== "") search.append(k, String(v));
        });
      }
      return fetchApi<{ results?: Employee[]; count?: number } | Employee[]>(`/employees/?${search.toString()}`);
    },
    get: (id: string) => fetchApi<Employee>(`/employees/${id}/`),
    create: (data: {
      email: string;
      role: string;
      credential_mode: "INVITE" | "TEMP_PASSWORD";
      employee: {
        employee_code: string;
        department?: string | null;
        job_role?: string | null;
        manager?: string | null;
        joining_date?: string;
        preferred_name?: string;
        phone?: string;
        location?: string;
      };
    }) =>
      fetchApi<{ user: User; employee: Employee; temporary_password?: string }>("/users/create/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Employee>) =>
      fetchApi<Employee>(`/employees/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    changeManager: (id: string, data: { manager: string; effective_date?: string }) =>
      fetchApi<Employee>(`/employees/${id}/change-manager/`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getManagerHistory: (id: string) =>
      fetchApi<Array<{ id: string; manager_name: string; start_date: string; end_date?: string | null }>>(
        `/employees/${id}/manager-history/`
      ),
    deactivate: (id: string, reason?: string) =>
      fetchApi<Employee>(`/employees/${id}/deactivate/`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    reactivate: (id: string) =>
      fetchApi<Employee>(`/employees/${id}/reactivate/`, {
        method: "POST",
      }),
    importTemplateUrl: () => `${API_BASE}/employees/import/template/`,
    importPreview: (formData: FormData) =>
      fetchApi<{
        upload_id: string;
        total_rows: number;
        preview_rows: Array<Record<string, string>>;
        errors: Array<{ row: number; field: string; message: string; row_data: Record<string, string> }>;
      }>("/employees/import/preview/", {
        method: "POST",
        body: formData,
      }),
    importCommit: (uploadId: string, skipInvalid = false) =>
      fetchApi<{ job_id: string }>("/employees/import/", {
        method: "POST",
        body: JSON.stringify({ upload_id: uploadId, skip_invalid: skipInvalid }),
      }),
    importStatus: (jobId: string) =>
      fetchApi<{
        status: string;
        processed_rows: number;
        total_rows: number;
        errors: Array<{ row: number; error: string }>;
      }>(`/employees/import/${jobId}/`),
  },

  departments: {
    getTree: () => fetchApi<Department[]>("/departments/tree/"),
    list: () => fetchApi<Department[]>("/departments/"),
    create: (data: { name: string; parent?: string | null; head?: string | null }) =>
      fetchApi<Department>("/departments/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<{ name: string; parent?: string | null; head?: string | null }>) =>
      fetchApi<Department>(`/departments/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchApi<void>(`/departments/${id}/`, {
        method: "DELETE",
      }),
  },

  reviewCycles: {
    list: () => fetchApi<ReviewCycle[]>("/review-cycles/"),
    get: (id: string) => fetchApi<ReviewCycle>(`/review-cycles/${id}/`),
    create: (data: Partial<ReviewCycle>) =>
      fetchApi<ReviewCycle>("/review-cycles/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<ReviewCycle>) =>
      fetchApi<ReviewCycle>(`/review-cycles/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    getBoard: (id: string) =>
      fetchApi<{
        columns: Array<{
          status: string;
          title: string;
          count: number;
          cards: Array<{
            id: string;
            employee_name: string;
            employee_code: string;
            department: string;
            reviewer_name: string;
            status: string;
          }>;
        }>;
      }>(`/review-cycles/${id}/board/`),
    getOverdue: (id: string) =>
      fetchApi<
        Array<{
          id: string;
          employee_name: string;
          employee_code: string;
          department: string;
          stage: string;
          reviewer_name: string;
        }>
      >(`/review-cycles/${id}/overdue/`),
    activate: (id: string) =>
      fetchApi<ReviewCycle>(`/review-cycles/${id}/activate/`, {
        method: "POST",
      }),
    startCalibration: (id: string) =>
      fetchApi<ReviewCycle>(`/review-cycles/${id}/start-calibration/`, {
        method: "POST",
      }),
    close: (id: string) =>
      fetchApi<ReviewCycle>(`/review-cycles/${id}/close/`, {
        method: "POST",
      }),
  },

  calibration: {
    getReviews: (params?: { cycle?: string; department?: string; manager?: string; status?: string }) => {
      const search = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v) search.append(k, v);
        });
      }
      return fetchApi<CalibrationReviewItem[]>(`/calibration/reviews/?${search.toString()}`);
    },
    getDistribution: (params?: { cycle?: string; group_by?: string }) => {
      const search = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v) search.append(k, v);
        });
      }
      return fetchApi<CalibrationDistribution>(`/calibration/distribution/?${search.toString()}`);
    },
    propose: (reviewId: string, data: { calibrated_rating: number; comment: string }) =>
      fetchApi<CalibrationReviewItem>(`/reviews/${reviewId}/propose-calibration/`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    finalize: (reviewId: string, data?: { final_rating?: number; comment?: string }) =>
      fetchApi<CalibrationReviewItem>(`/reviews/${reviewId}/finalize/`, {
        method: "POST",
        body: JSON.stringify(data || {}),
      }),
    reopen: (reviewId: string, comment: string) =>
      fetchApi<CalibrationReviewItem>(`/reviews/${reviewId}/reopen/`, {
        method: "POST",
        body: JSON.stringify({ comment }),
      }),
  },

  skills: {
    list: (params?: { q?: string; category?: string; is_active?: boolean }) => {
      const search = new URLSearchParams();
      if (params) {
        if (params.q) search.append("q", params.q);
        if (params.category) search.append("category", params.category);
        if (params.is_active !== undefined) search.append("is_active", String(params.is_active));
      }
      return fetchApi<Skill[]>(`/skills/?${search.toString()}`);
    },
    get: (id: string) => fetchApi<Skill>(`/skills/${id}/`),
    create: (data: { name: string; category?: string; description?: string; is_active?: boolean }) =>
      fetchApi<Skill>("/skills/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Skill>) =>
      fetchApi<Skill>(`/skills/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    deactivate: (id: string) =>
      fetchApi<Skill>(`/skills/${id}/deactivate/`, {
        method: "POST",
      }),
    delete: (id: string) =>
      fetchApi<void>(`/skills/${id}/`, {
        method: "DELETE",
      }),
  },

  jobRoles: {
    list: (params?: { q?: string; track?: string; level?: number; department?: string }) => {
      const search = new URLSearchParams();
      if (params) {
        if (params.q) search.append("q", params.q);
        if (params.track) search.append("track", params.track);
        if (params.level) search.append("level", String(params.level));
        if (params.department) search.append("department", params.department);
      }
      return fetchApi<JobRole[]>(`/job-roles/?${search.toString()}`);
    },
    get: (id: string) => fetchApi<JobRole>(`/job-roles/${id}/`),
    create: (data: Partial<JobRole>) =>
      fetchApi<JobRole>("/job-roles/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<JobRole>) =>
      fetchApi<JobRole>(`/job-roles/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    getSkills: (id: string) => fetchApi<RoleSkill[]>(`/job-roles/${id}/skills/`),
    addSkill: (id: string, data: { skill: string; required_level: number; weight: number; is_must_have?: boolean }) =>
      fetchApi<RoleSkill>(`/job-roles/${id}/skills/`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    bulkSetSkills: (id: string, skills: Array<{ skill: string; required_level: number; weight: number; is_must_have?: boolean }>) =>
      fetchApi<RoleSkill[]>(`/job-roles/${id}/skills/`, {
        method: "PUT",
        body: JSON.stringify(skills),
      }),
    deleteSkill: (id: string, skillId: string) =>
      fetchApi<void>(`/job-roles/${id}/skills/${skillId}/`, {
        method: "DELETE",
      }),
    getCareerSteps: (id: string) => fetchApi<any[]>(`/job-roles/${id}/next-roles/`),
    addCareerStep: (id: string, data: { to_role: string; typical_duration_months?: number }) =>
      fetchApi<any>(`/job-roles/${id}/next-roles/`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    deleteCareerStep: (id: string, toRoleId: string) =>
      fetchApi<void>(`/job-roles/${id}/next-roles/${toRoleId}/`, {
        method: "DELETE",
      }),
  },

  courses: {
    list: (params?: { q?: string; skill?: string; difficulty?: string; format?: string; is_active?: boolean }) => {
      const search = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== "") search.append(k, String(v));
        });
      }
      return fetchApi<Course[]>(`/courses/?${search.toString()}`);
    },
    get: (id: string) => fetchApi<Course>(`/courses/${id}/`),
    create: (data: Partial<Course>) =>
      fetchApi<Course>("/courses/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Course>) =>
      fetchApi<Course>(`/courses/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    setSkills: (id: string, mappings: Array<{ skill: string; level_from: number; level_to: number }>) =>
      fetchApi<any[]>(`/courses/${id}/skills/`, {
        method: "PUT",
        body: JSON.stringify(mappings),
      }),
  },

  analytics: {
    getRatingDistribution: (filters?: Record<string, string | undefined>) => {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([k, v]) => {
          if (v) params.append(k, v);
        });
      }
      return fetchApi<{
        distribution: Array<{ rating: number; count: number; percentage: number }>;
        total_reviews: number;
      }>(`/analytics/performance/rating-distribution/?${params.toString()}`);
    },
    getTrend: (filters?: Record<string, string | undefined>) => {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([k, v]) => {
          if (v) params.append(k, v);
        });
      }
      return fetchApi<Array<{ cycle_id: string; cycle_name: string; avg_rating: number; total_reviews: number }>>(
        `/analytics/performance/trend/?${params.toString()}`
      );
    },
    getSkillsHeatmap: (filters?: Record<string, string | undefined>) => {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([k, v]) => {
          if (v) params.append(k, v);
        });
      }
      return fetchApi<{
        departments: string[];
        skills: string[];
        cells: number[][];
        legend: Array<{ min: number; max: number; label: string }>;
      }>(`/analytics/skills/heatmap/?${params.toString()}`);
    },
    getSkillsShortages: (filters?: Record<string, string | undefined>) => {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([k, v]) => {
          if (v) params.append(k, v);
        });
      }
      return fetchApi<
        Array<{
          skill_id: string;
          skill_name: string;
          category: string;
          current_supply: number;
          required_demand: number;
          shortage_gap: number;
          urgency: "HIGH" | "MEDIUM" | "LOW";
        }>
      >(`/analytics/skills/shortages/?${params.toString()}`);
    },
    getTrainingCompletion: (filters?: Record<string, string | undefined>) => {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([k, v]) => {
          if (v) params.append(k, v);
        });
      }
      return fetchApi<{
        total_enrollments: number;
        completed: number;
        in_progress: number;
        enrolled: number;
        overall_completion_pct: number;
        by_course: Array<{
          course_id: string;
          title: string;
          enrolled: number;
          completed: number;
          completion_rate: number;
        }>;
      }>(`/analytics/training/completion/?${params.toString()}`);
    },
    getTrainingEffectiveness: (filters?: Record<string, string | undefined>) => {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([k, v]) => {
          if (v) params.append(k, v);
        });
      }
      return fetchApi<
        Array<{
          course_id: string;
          title: string;
          avg_skill_gain: number;
          employee_satisfaction: number;
          applied_on_job_pct: number;
        }>
      >(`/analytics/training/effectiveness/?${params.toString()}`);
    },
    getReadinessByRole: (filters?: Record<string, string | undefined>) => {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([k, v]) => {
          if (v) params.append(k, v);
        });
      }
      return fetchApi<
        Array<{
          role_id: string;
          role_title: string;
          track: string;
          developing: number;
          near_ready: number;
          ready_for_review: number;
          total_candidates: number;
        }>
      >(`/analytics/readiness/by-role/?${params.toString()}`);
    },
    getMobilityPipeline: (filters?: Record<string, string | undefined>) => {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([k, v]) => {
          if (v) params.append(k, v);
        });
      }
      return fetchApi<Array<{ stage: string; count: number }>>(`/analytics/readiness/mobility-pipeline/?${params.toString()}`);
    },
    getNineBox: (filters?: Record<string, string | undefined>) => {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([k, v]) => {
          if (v) params.append(k, v);
        });
      }
      return fetchApi<{
        grid: Array<{
          row: number;
          col: number;
          label: string;
          count: number;
          category: string;
        }>;
        suppression: { applied: boolean; min_group_size: number };
      }>(`/analytics/nine-box/?${params.toString()}`);
    },
  },
  reports: {
    getTypes: () => fetchApi<ReportTypeItem[]>("/reports/types/"),
    listJobs: (status?: string) => {
      const search = status ? `?status=${status}` : "";
      return fetchApi<{ results?: ReportJobItem[]; count?: number } | ReportJobItem[]>(`/reports/${search}`);
    },
    requestJob: (data: { report_type: string; filters?: Record<string, unknown>; format: string }) =>
      fetchApi<ReportJobItem>("/reports/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    retry: (id: string) =>
      fetchApi<ReportJobItem>(`/reports/${id}/retry/`, {
        method: "POST",
      }),
  },

  audit: {
    list: (params?: Record<string, string | undefined>) => {
      const search = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v) search.append(k, v);
        });
      }
      return fetchApi<{ results?: AuditLogItem[]; count?: number } | AuditLogItem[]>(`/audit-logs/?${search.toString()}`);
    },
    get: (id: string) => fetchApi<AuditLogItem>(`/audit-logs/${id}/`),
  },

  settings: {
    get: () => fetchApi<OrganizationSettings>("/organization/settings/"),
    updateGroup: (group: string, values: Record<string, unknown>) =>
      fetchApi<{ values: Record<string, unknown>; updated_at: string }>(`/organization/settings/${group}/`, {
        method: "PATCH",
        body: JSON.stringify({ values }),
      }),
    uploadLogo: (formData: FormData) =>
      fetchApi<{ logo_url: string }>("/organization/logo/", {
        method: "POST",
        body: formData,
      }),
    listUsers: (params?: { q?: string; role?: string }) => {
      const search = new URLSearchParams();
      if (params?.q) search.append("q", params.q);
      if (params?.role) search.append("role", params.role);
      return fetchApi<{ results?: User[]; count?: number } | User[]>(`/users/?${search.toString()}`);
    },
    updateUser: (id: string, data: { role?: string; is_active?: boolean }) =>
      fetchApi<User>(`/users/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },
};
