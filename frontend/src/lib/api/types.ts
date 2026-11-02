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
