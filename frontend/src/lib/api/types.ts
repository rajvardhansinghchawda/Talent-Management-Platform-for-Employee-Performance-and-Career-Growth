/**
 * Core Domain Types for Talent Management Platform.
 * Strict types mirroring DRF OpenAPI specifications. Zero `any`.
 */

export type UserRole = "HR_ADMIN" | "MANAGER" | "EMPLOYEE" | "EXECUTIVE";

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_active: boolean;
  must_change_password?: boolean;
}

export type EmploymentStatus = "ACTIVE" | "ON_LEAVE" | "EXITED";

export interface Employee {
  id: string;
  name: string;
  photo_url?: string | null;
  employee_code: string;
  job_title?: string;
  job_role?: JobRole | null;
  department?: Department | null;
  manager?: { id: string; name: string } | null;
  employment_status: EmploymentStatus;
  joining_date?: string;
  preferred_name?: string;
  phone?: string;
  location?: string;
  bio?: string;
  performance_summary?: {
    latest_rating?: number | null;
    latest_goal_score?: number | null;
  };
  career_summary?: {
    target_role?: string | null;
    readiness_status?: "DEVELOPING" | "NEAR_READY" | "READY_FOR_REVIEW" | null;
  };
}

export interface Department {
  id: string;
  name: string;
  parent?: string | null;
  parent_name?: string | null;
  head?: { id: string; name: string } | null;
  employee_count: number;
  sort_order: number;
  can_delete?: boolean;
  children?: Department[];
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  description: string;
  is_active: boolean;
  usage?: {
    employees: number;
    roles: number;
    courses: number;
  };
  created_at?: string;
}

export interface RoleSkill {
  id: string;
  skill: string;
  skill_name: string;
  category?: string;
  required_level: number;
  weight: number;
  is_must_have: boolean;
}

export interface CareerPathStep {
  id: string;
  from_role: string;
  to_role: string;
  to_role_title: string;
  to_role_track: string;
  to_role_level: number;
  typical_duration_months: number;
}

export interface JobRole {
  id: string;
  title: string;
  department?: string | null;
  department_name?: string | null;
  track: string;
  level: number;
  description?: string;
  min_months_in_role?: number;
  is_critical: boolean;
  employee_count: number;
  skills?: RoleSkill[];
  next_roles?: CareerPathStep[];
  created_at?: string;
}

export interface Course {
  id: string;
  title: string;
  provider: string;
  provider_url?: string;
  description: string;
  overview?: string;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  format: "ONLINE" | "IN_PERSON" | "BLENDED" | "SELF_PACED";
  duration_hours: number;
  is_active: boolean;
  skills?: Array<{
    id: string;
    skill: string;
    skill_name: string;
    category?: string;
    level_from: number;
    level_to: number;
  }>;
  enrollment_count: number;
  completion_rate: number;
  created_at?: string;
}

export interface ReviewCycle {
  id: string;
  name: string;
  cycle_type: "ANNUAL" | "SEMI_ANNUAL" | "QUARTERLY" | "ADHOC";
  start_date: string;
  end_date: string;
  self_assessment_due?: string;
  manager_review_due?: string;
  status: "DRAFT" | "ACTIVE" | "CALIBRATION" | "CLOSED";
  completion_pct?: number;
  departments?: Array<{ id: string; name: string }>;
  rating_scale_snapshot?: Record<string, unknown>;
}

export interface CalibrationReviewItem {
  id: string;
  review_id: string;
  employee: {
    id: string;
    name: string;
    employee_code: string;
    department?: string | null;
  };
  manager?: {
    id: string;
    name: string;
  } | null;
  self_rating?: number | null;
  manager_rating?: number | null;
  goal_score?: number | null;
  proposed_calibrated_rating?: number | null;
  calibration_comment?: string;
  calibrated_rating?: number | null;
  final_rating?: number | null;
  status: string;
  has_dispute: boolean;
}

export interface CalibrationDistribution {
  group_by: string;
  groups: Array<{
    label: string;
    counts: Record<string, number>;
    mean: number;
    total: number;
  }>;
}

export interface HRDashboardKPIs {
  total_employees: number;
  departments: number;
  active_cycle_completion_pct: number;
  overdue_reviews: number;
  avg_goal_score: number;
  open_skill_validations: number;
}

export interface HRDashboardData {
  kpis: HRDashboardKPIs;
  cycle_progress_by_department: Array<{
    department: string;
    completion_pct: number;
    total: number;
    completed: number;
  }>;
  top_org_skill_gaps: Array<{
    skill: string;
    affected_count: number;
    avg_gap: number;
  }>;
  readiness_distribution: Record<string, number>;
  recent_audit: Array<{
    id: string;
    actor: string;
    action: string;
    entity: string;
    created_at: string;
  }>;
}

export interface AuditLogItem {
  id: string;
  created_at: string;
  actor_name?: string | null;
  actor_email?: string | null;
  action: string;
  entity: {
    type: string;
    id: string;
    label?: string;
  };
  summary: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  changes?: Array<{ field: string; before: unknown; after: unknown }> | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

export interface ReportJobItem {
  id: string;
  report_type: string;
  filters: Record<string, unknown>;
  format: "CSV" | "PDF";
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";
  progress_pct: number;
  error?: string;
  requested_by_email?: string;
  download_url?: string | null;
  created_at: string;
}

export interface ReportTypeItem {
  type: string;
  name: string;
  description: string;
  formats: string[];
  filters_schema: Record<string, unknown>;
}

export interface OrganizationSettings {
  general?: {
    name: string;
    timezone: string;
    date_format: string;
  };
  performance?: {
    rating_scale_max: number;
    rating_scale_labels: Record<string, string>;
    rating_anchors: Record<string, string>;
    goal_score_cap: string;
    goal_weight_min: number;
    goal_weight_max: number;
    require_goal_approval: boolean;
  };
  career?: {
    readiness_thresholds: Record<string, number>;
    self_assessments_provisional: boolean;
  };
  privacy?: {
    confidential_feedback: boolean;
    retention_years: number;
  };
}

export interface ManagerDashboardData {
  pending: {
    goal_approvals: number;
    reviews_due: number;
    skill_validations: number;
    plans_awaiting_approval: number;
  };
  team_goal_progress: {
    overall_pct: number;
    by_employee: Array<{
      employee_id: string;
      name: string;
      weighted_score: number;
    }>;
  };
  review_cycle_progress: {
    cycle?: { id: string; name: string } | null;
    counts: Record<string, number>;
    completion_pct: number;
  };
  top_team_gaps: Array<{
    skill: string;
    affected_count: number;
    avg_gap: number;
  }>;
  readiness: {
    near_ready: Array<{ employee_id: string; name: string }>;
    ready_for_review: Array<{ employee_id: string; name: string }>;
  };
  upcoming_one_on_ones: Array<{
    id: string;
    employee: { id: string; name: string };
    scheduled_at?: string | null;
    status?: string;
  }>;
}

export interface ManagerTeamRosterItem {
  id: string;
  employee: {
    id: string;
    name: string;
    employee_code: string;
    photo_url?: string | null;
  };
  role: string;
  department: string;
  goal_score: number;
  review_status: string;
  readiness_status: string;
  open_actions_count: number;
}

export interface ManagerTeamMemberOverview {
  profile_summary: {
    name: string;
    employee_code: string;
    job_title?: string | null;
    department?: string | null;
    joining_date?: string | null;
  };
  goal_score: number;
  latest_rating: number;
  top_gaps: Array<{ skill: string; gap: number }>;
  readiness: string;
}

export interface SkillAssessmentQueueItem {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  department: string;
  skill: string;
  skill_name: string;
  skill_category: string;
  level: number;
  source: string;
  status: string;
  evidence_note?: string;
  evidence_url?: string;
  assessed_on: string;
  created_at: string;
}

export interface OneOnOneItem {
  id: string;
  manager: string;
  manager_name: string;
  employee: string;
  employee_name: string;
  employee_code: string;
  scheduled_at: string;
  status: string;
  shared_notes: string;
  private_notes: string;
  private_notes_visible_to_you: boolean;
  action_items: Array<{
    id: string;
    title: string;
    owner_name: string;
    due_date?: string | null;
    status: string;
  }>;
  created_at: string;
}

export interface FeedbackItem {
  id: string;
  from_employee?: string | null;
  from_name?: string | null;
  to_employee: string;
  to_name: string;
  feedback_type: string;
  visibility: string;
  visibility_label: string;
  content: string;
  created_at: string;
}

export interface DevelopmentPlanItem {
  id: string;
  title: string;
  item_type: string;
  course?: string | null;
  course_title?: string | null;
  skill?: string | null;
  skill_name?: string | null;
  status: string;
  due_date?: string | null;
  created_at: string;
}

export interface DevelopmentPlanRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  target_role?: string | null;
  target_role_title?: string;
  start_date?: string | null;
  target_date?: string | null;
  status: string;
  progress_pct: number;
  item_count: number;
  items: DevelopmentPlanItem[];
  created_at: string;
}

export interface GoalItem {
  id: string;
  title: string;
  owner_id?: string;
  owner_name?: string;
  goal_type: string;
  direction: string;
  weight: string | number;
  target_value: string | number;
  current_value: string | number;
  progress_pct: number;
  status: string;
  due_date?: string | null;
  submitted_at?: string | null;
  created_at?: string;
}
