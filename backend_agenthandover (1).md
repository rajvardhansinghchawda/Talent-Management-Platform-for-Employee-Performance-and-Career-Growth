# Backend Agent Handover (v2) — Portal-wise, aligned to the UI Page Descriptions

> You are an AI coding agent implementing the backend (Django REST Framework + Celery + Redis + PostgreSQL) of the Talent Management Platform.
> This version is organized **portal by portal, page by page**. Every page in the UI inventory has the endpoints, response shapes, filters, and rules it needs.
> Read order: `project_description.md` → `system_design.md` → this file → `rulesForAntigravity.md`.
> **Precedence:** where this file and `system_design.md` differ (see §5 *Data model additions*), this file wins for implementation, and you must report the difference in your handover note. If anything is unclear, ask; do not guess.

---

## 0. How This Document Is Organized

| Section | Content |
|---|---|
| 1–4 | Mission, stack, repo layout, conventions, standard contracts |
| 5 | Data model additions and changes required by the UI |
| 6 | Core infrastructure to build first |
| 7 | **Portal-wise API specification (page by page)** |
| 8 | Domain logic reference (formulas, derivations) |
| 9–11 | Analytics rules, audit, Celery |
| 12–16 | Tests, seed data, definition of done, do/don't, commands |
| 17 | Page → endpoint coverage checklist |
| 18 | Assumptions that need the owner's confirmation |

Roles used below: **E** = Employee, **M** = Manager, **H** = HR Admin, **X** = Executive. A manager is also an employee for their own data (the UI's "Switch to My Portal"). "Self" means the authenticated user's own records.

---

## 1. Mission and Tech Constraints

Build a secure, multi-tenant REST API powering four portals plus shared auth pages. The API owns **all business logic**: goal scoring, review workflow, skill-gap analysis, readiness, recommendations, notifications, analytics, audit. The frontend only displays server results.

- Python 3.12+, Django (LTS or latest stable), Django REST Framework.
- PostgreSQL, Redis, Celery 5 + `django-celery-beat`.
- Auth: `djangorestframework-simplejwt` (access token in body, refresh token in httpOnly cookie).
- Docs/filtering: `drf-spectacular`, `django-filter`.
- Files: Django storage abstraction (local volume in dev, S3-compatible in prod) for photos, logos, and generated reports.
- Tests: `pytest`, `pytest-django`, `factory_boy`, `pytest-cov`. Lint/format: `ruff`, `black`.
- Type hints on all service and selector functions.

## 2. Repository Layout

```
backend/
  manage.py
  requirements/{base,dev,prod}.txt
  config/
    settings/{base,dev,prod}.py   urls.py   celery.py   wsgi.py   asgi.py
  apps/
    core/            # TenantModel, pagination, exceptions, permissions, search, uploads
    accounts/        # User, auth, password flows, invites
    organizations/   # Organization, Department, settings groups, branding
    employees/       # Employee, ManagerAssignment, RoleHistory, import jobs
    performance/     # ReviewCycle, Goal, GoalUpdate, GoalComment, PerformanceReview, calibration
    skills/          # Skill, JobRole, RoleSkill, CareerPathStep, SkillAssessment, gap engine
    learning/        # Course, CourseSkill, Enrollment, recommendations
    careers/         # DevelopmentPlan(+Item), readiness engine, PromotionReviewFlag
    feedback/        # Feedback, FeedbackRequest, Badge, Recognition, OneOnOne, ActionItem
    notifications/   # Notification, NotificationPreference, email dispatch
    analytics/       # selectors, cache, dashboards, nine-box, report jobs
    ai/              # LLM client, drafts, AIRequestLog (feature-flagged, later phase)
    audit/           # AuditLog + service
  tests/  scripts/  Dockerfile
docker-compose.yml  .env.example
```

Per app: `models.py, selectors.py, services.py, serializers.py, permissions.py, views.py, urls.py, tasks.py, admin.py, tests/`.

## 3. Non-Negotiable Conventions

1. **Layering:** `views → serializers (validate) → services (writes) / selectors (reads) → models`. No business logic in views, serializers, or signals.
2. **Tenant safety:** every tenant model inherits `TenantModel`; every selector filters by `organization`; never accept `organization` from client input.
3. **Permissions:** each view declares `permission_classes`; add object-level checks. Cross-tenant or unauthorized objects return `404` (do not leak existence).
4. **Transactions:** multi-row writes use `transaction.atomic()`. Dispatch Celery with `transaction.on_commit`.
5. **Audit:** sensitive actions call `audit.services.log(...)` (see §10).
6. **Notifications:** services create `Notification` rows (respecting `NotificationPreference`); emails are sent by Celery.
7. **Errors:** raise domain exceptions mapped to the standard error format.
8. **Queries:** `select_related`/`prefetch_related` in selectors; test list endpoints with `django_assert_max_num_queries`.
9. **Settings:** secrets from environment only.
10. **Migrations:** one logical migration per change; never edit applied migrations.
11. **Server computes, UI displays:** scores, gaps, readiness, `next_action`, `is_overdue`, `progress_pct`, status labels' underlying enums, and "reasons" are all returned by the API.

## 4. Standard Contracts

**Base URL:** `/api/v1/`. **Auth:** `Authorization: Bearer <access>`. Field names `snake_case`; ids UUID; timestamps ISO-8601 UTC; dates `YYYY-MM-DD`.

**Pagination** (page-number, `?page=&page_size=`, default 20, max 100):
```json
{ "count": 42, "next": "…?page=2", "previous": null, "results": [] }
```

**Errors:**
```json
{ "error": { "code": "validation_error", "message": "Invalid input.", "details": { "field": ["msg"] } } }
```
Codes: `validation_error, authentication_failed, permission_denied, not_found, state_conflict, rate_limited, server_error`. Status codes: 400/401/403/404/409/429.

**Filtering and sorting:** `django-filter` query params + `?ordering=field,-field` + `?q=` for text search on list endpoints that show a search box in the UI. Filters shown in the UI must be real query params (listed per page below), so the frontend can mirror them in the URL.

**Computed fields:** list/detail serializers return computed fields (e.g., `progress_pct`, `is_overdue`, `next_action`, `open_actions_count`) so the UI never recomputes them.

**Async job pattern (imports, reports, AI):** `POST` returns `202 { "job_id", "status": "PENDING" }`; `GET .../{job_id}/` returns `{ status: PENDING|RUNNING|SUCCEEDED|FAILED, progress_pct, result, error }`. Jobs survive page navigation and create a notification on completion.

**Uploads:** multipart; validate type and size (images: png/jpg/webp ≤ 2 MB; CSV ≤ 5 MB); store via storage backend; never trust file names; serve photos via signed or authenticated URLs.

**Empty vs forbidden:** return `200` with empty `results` for "no data", `403` for role denial, `404` for not found or cross-tenant.

---

## 5. Data Model Additions and Changes (vs `system_design.md`)

The UI spec requires these. Implement them in addition to the models in `system_design.md §6.2`.

| Model / field | Change | Reason (UI page) |
|---|---|---|
| `User.must_change_password` (bool), `User.invite_token`/`invite_expires_at` | add | Forced first-login password change; invite flow (`/change-password`, HR create employee) |
| `Employee.preferred_name`, `bio`, `photo`, `target_role` (FK JobRole, null) | add | Profile page; target-role selector in Skill Gap, Career, manager Career tab |
| `Employee.phone` visibility | HR/self only | Directory shows limited fields |
| `JobRole.is_critical` (bool) | add | Executive "critical-role bench strength" |
| `EmployeeRoleHistory` (employee, from_role, to_role, effective_date, changed_by, reason) | add; written by the service whenever `current_role` changes | Executive "internal mobility trends" |
| `GoalComment` (goal, author, kind `APPROVAL|REJECTION|NOTE`, text) | add | Goal detail "Manager comments" card |
| `Goal.completed_at`, `Goal.completion_note` | add | Distinct completion confirmation |
| `ReviewCycle.departments` (M2M Department), `rating_scale_snapshot` (JSON) | add; snapshot copied from org settings at activation | Cycle form "included departments", "rating-scale reference" |
| `PerformanceReview.development_recommendations` (JSON list of `{text, skill?}`) | add | Manager review form; employee result "Development suggestions" |
| `PerformanceReview.manager_draft`, `self_assessment_draft` (JSON) | add | "Save draft" on manager form; employee wizard resume |
| `PerformanceReview.proposed_calibrated_rating`, `calibration_comment` | add | Calibration table "Proposed calibrated rating"; mandatory comment |
| `ReviewCalibrationEntry` (review, actor, from_rating, to_rating, comment, created_at) | add (append-only) | Calibration history and audit trail |
| `FeedbackRequest` (requester, requested_from, message, status `OPEN|FULFILLED|DECLINED`, fulfilled_feedback FK null) | add | Employee "Request feedback" dialog |
| `OneOnOne.recurrence` (JSON `{frequency: WEEKLY|BIWEEKLY|MONTHLY, until}`), `series_id` | add | Manager "recurring meeting template" |
| `DevelopmentPlanItem.status` choices | `PROPOSED, PLANNED, IN_PROGRESS, DONE, REJECTED`; add `progress_note`, `proposed_by` | Employee "Propose new item" + progress; manager approval |
| `PromotionReviewFlag` (employee, target_role, flagged_by, note, status `OPEN|ACKNOWLEDGED|CLOSED`, readiness_snapshot JSON) | add | Manager Career tab "Flag ready for promotion review" (notifies HR; **never promotes**) |
| `NotificationPreference` (user, category, email_enabled, in_app_enabled) | add; unique `(user, category)` | `/settings/notifications` |
| `Notification.category` | add (enum below) | Preferences rows |
| `Skill.is_active`, `Skill.usage_count` (computed) | ensure | Skills library; deactivate instead of delete when used |
| `Course.is_active`, computed `enrollment_count`, `completion_rate` | ensure | Course catalog usage stats |
| `Department.sort_order` (int) | add (optional feature) | Drag-reorder in tree |
| `ReportJob` (requested_by, report_type, filters JSON, format `CSV|PDF`, status, file, error, started_at, finished_at) | add | Reports pages, analytics export, audit export |
| `ImportJob` (type `EMPLOYEES|SKILLS`, uploaded_file, status, total_rows, processed_rows, errors JSON) | add | Employee import, skills CSV import |
| `Organization.logo`, `Organization.accent_color` | add | Settings → basic branding |

**Notification categories (enum):** `CYCLE_STARTED, REVIEW_DUE, REVIEW_OVERDUE, REVIEW_COMPLETED, GOAL_APPROVAL_NEEDED, GOAL_DECISION, SKILL_VALIDATION_NEEDED, SKILL_VALIDATED, FEEDBACK_RECEIVED, FEEDBACK_REQUESTED, RECOGNITION_RECEIVED, COURSE_ASSIGNED, COURSE_COMPLETED, PLAN_PENDING_APPROVAL, PLAN_DECISION, ONE_ON_ONE_SCHEDULED, PROMOTION_REVIEW_FLAGGED, REPORT_READY, IMPORT_FINISHED`.

**Organization settings groups** (typed serializers, reject unknown keys): `general` (name, branding), `performance` (rating_scale[{value,label,anchor}], goal_score_cap, goal_weight_rule {sum_target, enforce}, goal_approval_required), `career` (readiness_thresholds {ready_coverage, near_coverage, min_goal_score, min_rating}, show_self_assessed_as_provisional), `privacy` (confidential_feedback_visibility `HR_NONE|HR_AUDITED`, ai_enabled, retention_notes).

---

## 6. Core Infrastructure (build first)

1. `core.models.TenantModel` (UUID pk, `organization`, timestamps) + tenant manager.
2. `StandardPagination`, custom exception handler (standard error format).
3. Permission classes: `HasRole(*roles)`, `IsSelfOrManagerOrHR`, `IsManagerOfEmployee` (uses current reporting tree).
4. Reporting-tree selector `reports_to_tree(manager)` (cached per request) used for all "team" scoping.
5. Async job base (`ImportJob`, `ReportJob`) with status/progress helpers.
6. Notification service (`notify(user, category, title, body, link)` honoring preferences) and email task.
7. Audit service.
8. Suppression helper `suppress_small_groups(rows, min_size=5)` for executive analytics (see §9).
9. Health endpoints `/healthz`, `/readyz`; OpenAPI at `/api/schema/`, `/api/docs/`.
10. `seed_demo_data` management command (§13).

---

# 7. Portal-wise API Specification

> Each page lists: **Calls** (endpoints), **Contract** (response/field notes and filters), **Rules**. Endpoints are reused across portals; the page tables reference them by method + path. Full list of reusable endpoints per domain follows each portal.

---

## 7.1 Auth Portal and Shared Pages

### Pages without business data
`/forbidden`, `/not-found`, error boundary page — no API calls.

### `/login`
- **Calls:** `POST /auth/login/` → `{ access, user: {id, email, role}, must_change_password, available_portals[] }`; refresh token set as httpOnly cookie.
- **Rules:** rate-limited (Redis) → `429 rate_limited`; failed attempts return generic `authentication_failed`; lock account after configurable repeated failures (return the same error plus `details.locked_until` only when locked); inactive users cannot log in.

### `/forgot-password`
- **Calls:** `POST /auth/password/reset/` → always `200 {message}` (never reveals whether the email exists); sends email via Celery.

### `/reset-password?token=`
- **Calls:** `POST /auth/password/reset/validate/` (token check → `200` or `400 invalid_token`, used to show the invalid/expired panel before the form); `POST /auth/password/reset/confirm/ {token, new_password}`.
- **Rules:** token single-use and time-limited; enforce password policy server-side and return policy failures in `details` so the UI strength hints stay consistent (`GET /auth/password/policy/` returns rules text for hints).

### `/change-password`
- **Calls:** `POST /auth/password/change/ {current_password, new_password}`.
- **Rules:** when `must_change_password=true` all other authenticated endpoints except `/auth/me/`, `/auth/logout/`, and this one return `403 permission_denied` with `details.code = "password_change_required"`; clearing the flag happens on success; revoke other refresh tokens.

### Session endpoints
`POST /auth/refresh/` (cookie), `POST /auth/logout/` (blacklist), `GET /auth/me/` → 
```json
{ "id": "…", "email": "…", "role": "MANAGER", "must_change_password": false,
  "employee": {"id":"…","name":"…","preferred_name":"…","photo_url":"…","designation":"…","department":"…"},
  "organization": {"id":"…","name":"…","logo_url":"…","accent_color":"#…"},
  "available_portals": ["manager","employee"], "ai_enabled": false,
  "rating_scale": [{"value":1,"label":"…","anchor":"…"}] }
```
`available_portals`: EMPLOYEE → `["employee"]`; MANAGER → `["manager","employee"]`; HR_ADMIN → `["hr"]` (plus `employee` if they have an employee profile); EXECUTIVE → `["executive"]`.

### Global search (top bar)
- **Calls:** `GET /search/?q=&limit=` → grouped results.
- **Contract:** `{ "employees": [{id,name,designation,department}], "courses": [{id,title,provider}], "skills": [{id,name,category}] }`. Groups returned depend on role: **E** → `courses`, `skills`; **M** → `employees` (reporting tree only); **H** → `employees` (organization). **X** → empty groups (see §18, assumption A1). Minimum 2 characters; debounce is a UI concern; cap 5 per group.

### Notification bell and `/notifications`
- **Calls:** `GET /notifications/unread-count/`; `GET /notifications/?is_read=false&page_size=5` (dropdown); `GET /notifications/?is_read=` (page; `All`/`Unread` filter); `POST /notifications/{id}/read/`; `POST /notifications/read-all/`.
- **Contract:** item `{id, category, title, body, link, is_read, created_at}`. `link` is a frontend route (validated against an allow-list pattern on creation).
- **Rules:** users only ever see their own notifications.

### `/settings/notifications`
- **Calls:** `GET /notification-preferences/` → one row per category with defaults filled: `[{category, label, description, email_enabled, in_app_enabled}]`; `PUT /notification-preferences/` bulk update (array of rows).
- **Rules:** categories relevant to the user's role only (e.g., employees do not see `GOAL_APPROVAL_NEEDED`); in-app notifications cannot be disabled for `REVIEW_DUE` if the org marks it mandatory (optional rule; return `locked: true` on such rows).

### Profile menu
Uses `/auth/me/`; "Switch portal" is client navigation based on `available_portals`.

---

## 7.2 Employee Portal (`/employee`)

Roles: **E** (and **M** for their own data). All endpoints below operate on the authenticated user's own employee record unless stated; use `employee=me` (alias accepted by every employee-scoped filter).

### `/employee` — Dashboard
- **Calls:** `GET /dashboards/employee/`.
- **Contract:**
```json
{
  "greeting_name": "Rahul",
  "goal_progress": { "weighted_score": 0.78, "cycle": {...}, "top_goals": [{"id","title","progress_pct","due_date","status"}] },
  "active_review": { "id","cycle_name","status","steps":[{"key","label","state":"DONE|CURRENT|UPCOMING","at"}],"due_dates":{"self_assessment","manager_review"} } ,
  "target_role": null,
  "top_gaps": [{"skill","required","validated","gap"}],
  "recommended_courses": [{"id","title","skill","difficulty","duration_hours","reason"}],
  "readiness": { "status":"NEAR_READY","summary":"…" },
  "recent_feedback": [{"id","type","author","created_at","preview"}],
  "recognition": [{"badge","from","created_at"}],
  "upcoming_one_on_ones": [{"id","with","scheduled_at"}],
  "action_items": [{"id","title","due_date","status"}]
}
```
- **Rules:** `active_review` is `null` when no active cycle ("No review in progress"); when `target_role` is null, `top_gaps`, `readiness` are `null` and the UI shows the "choose target role" prompt. Feedback includes only items visible to the employee.

### `/employee/goals` — My Goals
- **Calls:** `GET /goals/?employee=me&cycle=&status=&ordering=` ; `GET /review-cycles/?mine=true` (cycle selector).
- **Contract:** row `{id,title,goal_type,weight,progress_pct,due_date,status,is_overdue,is_locked}`; `is_locked` true for `PENDING_APPROVAL`.
- **Rules:** `progress_pct` derived from start/current/target and direction; clamped 0–100 for display (score cap lives in the score endpoint).

### `/employee/goals/new` and `/employee/goals/[id]/edit`
- **Calls:** `POST /goals/`; `PATCH /goals/{id}/`; `POST /goals/{id}/submit/`; `GET /goals/?employee=me&status=ACTIVE&for_parent=true` (parent selector); `GET /review-cycles/?mine=true`.
- **Fields:** `title, description, goal_type, metric_unit, start_value, target_value, direction, weight, due_date, parent, cycle`.
- **Rules:** "Save draft" = create/patch with status `DRAFT`; "Submit for approval" = `POST /goals/{id}/submit/` (validates completeness: target ≠ start, weight in range, due date inside cycle); only owner edits `DRAFT`; a rejected goal returns to `DRAFT` with a `GoalComment`; the parent must belong to the same org and be compatible (no cycles); owner is always taken from the session, never the body.

### `/employee/goals/[id]` — Goal detail
- **Calls:** `GET /goals/{id}/`; `GET /goals/{id}/updates/`; `POST /goals/{id}/updates/ {value, note, evidence_url}`; `POST /goals/{id}/complete/ {note?}`; `GET /goals/{id}/alignment/`; `GET /goals/{id}/comments/`.
- **Contract:** detail includes `description, goal_type, weight, start_value, target_value, current_value, due_date, status, progress_pct, can_update_progress (bool), can_complete (bool)`. `updates` ordered chronologically, usable directly for the line chart: `[{id,value,note,evidence_url,created_at}]`. `alignment` returns `{ancestors:[…], goal:{…}, children:[…]}`.
- **Rules:** progress updates only when `ACTIVE`; the endpoint updates `current_value`; `complete` is a separate explicit action — allowed from `ACTIVE`; if the target is not met, `note` is required; completion never happens silently on a progress update. Comments card = `GoalComment` list (`APPROVAL|REJECTION|NOTE`) with author and date.

### `/employee/reviews` — My Reviews
- **Calls:** `GET /reviews/?employee=me`.
- **Contract:** one row per cycle: `{id, cycle:{id,name,start_date,end_date}, status, steps[], next_due_date, next_action}`; `next_action ∈ START_SELF_ASSESSMENT | CONTINUE_SELF_ASSESSMENT | VIEW_RESULT | ACKNOWLEDGE | NONE`. Completed cycles are included (UI renders them quieter).

### `/employee/reviews/[id]` — Review detail
- **Calls:** `GET /reviews/{id}/` ; `GET /reviews/{id}/goal-results/` (wizard step 1); `PUT /reviews/{id}/self-assessment/draft/` (save wizard progress); `POST /reviews/{id}/self-assessment/` (submit); `POST /reviews/{id}/acknowledge/`; `POST /reviews/{id}/dispute/ {reason}`; `GET /reviews/{id}/history/` (timeline).
- **Contract (status = SELF_ASSESSMENT):** `competencies:[{id,name,description,anchors[]}]`, `rating_scale`, `draft` (employee's saved draft), `goal_results:[{goal_id,title,score,notes}]` (read-only snapshot-so-far).
- **Contract (status ≥ COMPLETED):** `final_rating, manager_comments, goal_score_snapshot, competency_comparison:[{name,self_rating,manager_rating}], development_recommendations[], timeline[]`.
- **Rules:** `manager_rating`, `manager_comments`, `competency manager ratings`, and `development_recommendations` are omitted from the employee serializer until status ≥ `COMPLETED`; submit validates all competencies rated; after submit the review moves to `MANAGER_REVIEW` and employee edits are rejected with `409`; `acknowledge` and `dispute` are only valid from `COMPLETED`; `dispute` requires `reason`; all transitions audited.

### `/employee/skills` — My Skills
- **Calls:** `GET /employees/me/skills/`; `POST /skill-assessments/ {skill, level, evidence_note, evidence_url}`; `GET /employees/me/skills/{skill_id}/history/`; `GET /skills/?q=&category=` (skill picker).
- **Contract:** row `{skill:{id,name,category}, self_level, validated_level, last_validated_on, status: SELF_REPORTED|VALIDATED|UNVALIDATED, has_pending_validation}`. History: `[{id,level,source,status,assessed_on,validated_by?,validated_on?,evidence_note,evidence_url}]`.
- **Rules:** creating an assessment as an employee always has `source=SELF`, `status=PENDING`; employees cannot set `validated_*`; assessments append-only; notification to manager.

### `/employee/skill-gap` — Skill Gap
- **Calls:** `GET /skills/gaps/?employee=me&target_role=`; `GET /job-roles/?reachable_from=me` (target-role selector); `PUT /employees/me/target-role/ {target_role}` (persist selection); AI panel (later): `POST /ai/skill-gap-summary/`.
- **Contract:**
```json
{ "target_role": {"id","title"}, "coverage": 0.72, "must_haves_remaining": 1,
  "unmet_must_haves": ["System Design"],
  "items": [ { "skill": {"id","name"}, "required": 4, "validated": 2, "self": 3, "gap": 2,
               "weight": 5, "is_must_have": true, "status": "GAP|MET|UNVALIDATED",
               "priority": 10, "why_it_matters": "Must-have for Senior Backend Developer (weight 5)." } ],
  "radar": { "axes": ["Python","SQL","System Design"], "required": [4,4,4], "validated": [4,3,2] } }
```
- **Rules:** items sorted by `priority` desc, must-haves first on ties; `why_it_matters` is server-generated text from role-skill data; `radar` is provided so the chart and its accessible table use identical numbers; target role restricted by policy (`reachable_from=me` returns roles from career steps; HR setting may allow all roles — keep a setting `career.target_role_scope: PATH|ALL`, default `PATH`).

### `/employee/learning` — Learning (tabs: Recommended, Catalog, My Enrollments)
- **Calls:** `GET /learning/recommendations/?employee=me&target_role=`; `GET /courses/?q=&skill=&difficulty=&format=&duration_min=&duration_max=&is_active=true`; `POST /enrollments/ {course}` (Enroll); `GET /enrollments/?employee=me` (tab 3 data).
- **Contract (recommendation):** `{course:{id,title,provider,duration_hours,difficulty,format,skills[]}, skill:{id,name}, reason:"Closes System Design gap (2 → 4) for Senior Backend Developer", score}` ordered by `score`. Catalog item includes `is_enrolled` and `enrollment_id`.
- **Rules:** duplicate active enrollment → `409`; `is_active=false` courses never appear for employees.

### `/employee/learning/[courseId]` — Course detail
- **Calls:** `GET /courses/{id}/`; `POST /enrollments/ {course}`.
- **Contract:** `{id,title,provider,provider_url,description,overview,difficulty,format,duration_hours,skills:[{skill,level_from,level_to}], is_enrolled, enrollment_id}`.

### `/employee/enrollments` — My Enrollments
- **Calls:** `GET /enrollments/?employee=me&status=`; `POST /enrollments/{id}/progress/ {progress_pct}`; `POST /enrollments/{id}/complete/ {certificate_url?}`.
- **Contract:** `{id, course:{title,provider}, skill, enrolled_at, progress_pct, status, certificate_url, can_update_progress, can_complete}`.
- **Rules:** progress is monotonic non-decreasing; `complete` allowed when `progress_pct = 100` or via explicit confirm field; completion notifies manager and creates a `PENDING` skill-assessment request (`source=CERTIFICATION`) for the course's skills.

### `/employee/career` — Career
- **Calls:** `GET /careers/paths/?from_role=me` (graph); `GET /careers/readiness/?employee=me&target_role=`; `GET /job-roles/?reachable_from=me`; `PUT /employees/me/target-role/`.
- **Contract (graph):** `{ "nodes":[{id,title,level,track,is_current,is_target}], "edges":[{from,to}] }`. **Readiness:** `{status, coverage, criteria:[{key,name,passed,detail}], advisory_text:"Readiness is advisory and reviewed by your manager and HR."}` — the advisory sentence is returned by the API so the wording is controlled centrally.
- **Rules:** target-role change notifies the manager; readiness uses validated skills only.

### `/employee/development-plan` — Development Plan
- **Calls:** `GET /development-plans/?employee=me&status=active_or_latest`; `GET /development-plans/{id}/`; `POST /development-plans/{id}/items/ {item_type, skill, title, due_date, rationale?}` (Propose new item); `POST /development-plan-items/{id}/progress/ {status, progress_note}`.
- **Contract:** plan `{id,target_role,start_date,target_date,status,progress_pct,items:[{id,item_type,skill,title,due_date,status,rationale,proposed_by}]}`.
- **Rules:** employee-created items start as `PROPOSED` until a manager accepts (`PLANNED`) or rejects; employee can move own approved items between `PLANNED → IN_PROGRESS → DONE`; plan statuses: `DRAFT, PENDING_APPROVAL, ACTIVE, COMPLETED`; employees cannot approve plans.

### `/employee/feedback` — Feedback
- **Calls:** `GET /feedback/?to_employee=me&type=&date_from=&date_to=`; `GET /employees/?q=&scope=feedback_recipients` (picker); `POST /feedback-requests/ {requested_from, message}`.
- **Contract:** `{id,type,author:{id,name}|null,created_at,content}`; `author` is `null` when the visibility or policy hides it.
- **Rules:** `PRIVATE_TO_MANAGER` feedback never appears; feedback request notifies the recipient (`FEEDBACK_REQUESTED`); recipient fulfils via `POST /feedback/ {…, fulfills_request}`.

### `/employee/recognition` — Recognition
- **Calls:** `GET /recognitions/?scope=received` (my badges); `GET /recognitions/?scope=wall` (organization-visible feed); `POST /recognitions/ {to_employee, badge, message}`; `GET /badges/`; `GET /employees/?q=&scope=directory` (colleague picker).
- **Contract:** `{id,badge:{id,name,icon},from:{id,name},to:{id,name},message,created_at}`.
- **Rules:** cannot recognize yourself; wall only shows `PUBLIC_RECOGNITION` visibility; recipient notified (`RECOGNITION_RECEIVED`).

### `/employee/one-on-ones` — 1:1 Meetings
- **Calls:** `GET /one-on-ones/?employee=me&when=upcoming|past`; `GET /one-on-ones/{id}/`; `GET /one-on-ones/{id}/action-items/`; `PATCH /action-items/{id}/ {status}` (employee can only change own items).
- **Contract:** meeting `{id,manager:{id,name},scheduled_at,status,shared_notes}`; action item `{id,title,owner:{id,name},due_date,status,is_mine}`.
- **Rules:** `private_notes` is **never** serialized for the employee (exclude at serializer class level — use a separate `EmployeeOneOnOneSerializer`).

### `/employee/directory` — Directory
- **Calls:** `GET /employees/?scope=directory&q=&page=`.
- **Contract:** limited fields only: `{id,name,photo_url,designation,department,manager:{id,name}}`.
- **Rules:** active employees only; no phone, location, status history, or review data.

### `/employee/profile` — Profile
- **Calls:** `GET /employees/me/`; `PATCH /employees/me/ {preferred_name, phone, bio}`; `POST /employees/me/photo/` (multipart) and `DELETE /employees/me/photo/`.
- **Contract:** read-only: `name, employee_code, designation, department, manager, joining_date, employment_status, location`; editable: `photo, preferred_name, phone, bio`. Include `editable_fields[]` so the UI can render the distinction.
- **Rules:** any attempt to patch other fields returns `400`.

---

## 7.3 Manager Portal (`/manager`)

Roles: **M**. All team scoping uses the reporting tree (direct reports plus, per org setting `manager.scope: DIRECT|TREE`, indirect). Default `DIRECT`. Any employee outside scope → `404`.

### `/manager` — Dashboard
- **Calls:** `GET /dashboards/manager/`.
- **Contract:**
```json
{ "pending": { "goal_approvals": 3, "reviews_due": 5, "skill_validations": 7, "plans_awaiting_approval": 1 },
  "team_goal_progress": { "overall_pct": 64, "by_employee": [{"employee_id","name","weighted_score"}] },
  "review_cycle_progress": { "cycle": {"id","name"}, "counts": {"SELF_ASSESSMENT":2,"MANAGER_REVIEW":3,"CALIBRATION":0,"COMPLETED":4}, "completion_pct": 40 },
  "top_team_gaps": [{"skill","affected_count","avg_gap"}],
  "readiness": { "near_ready": [{"employee_id","name"}], "ready_for_review": [{"employee_id","name"}] },
  "upcoming_one_on_ones": [{"id","employee","scheduled_at"}] }
```
- **Rules:** cached 5 min per manager; counts must equal what the destination list pages return with the matching filter (add tests).

### `/manager/team` — My Team
- **Calls:** `GET /manager/team/?q=&department=&role=&review_status=&ordering=`.
- **Contract:** row `{employee:{id,name,photo_url}, role, department, goal_score, review_status, readiness_status, open_actions_count}`.
- **Rules:** `open_actions_count` = pending goal approvals + pending skill validations + reviews awaiting manager + plans awaiting approval for that employee; `review_status` refers to the latest or active cycle.

### `/manager/team/[id]` — Team member detail (tabs)
- **Header:** `GET /employees/{id}/` (manager-scoped fields).
- **Overview:** `GET /manager/team/{id}/overview/` → `{profile_summary, goal_score, latest_rating, top_gaps[], readiness}`.
- **Goals tab:** `GET /goals/?employee={id}` (+`cycle`, `status`).
- **Reviews tab:** `GET /reviews/?employee={id}`.
- **Skills tab:** `GET /employees/{id}/skills/`; `GET /employees/{id}/skills/{skill_id}/history/`; `POST /skill-assessments/{id}/validate/` and `/reject/` for pending rows.
- **Development Plan tab:** `GET /development-plans/?employee={id}`; `POST /development-plans/generate/ {employee, target_role}`; `PATCH /development-plans/{id}/`; item CRUD `POST/PATCH/DELETE /development-plans/{id}/items/…`; `POST /development-plans/{id}/approve/`.
- **Feedback tab:** `GET /feedback/?to_employee={id}` → returns `visibility` and `visibility_label` on every item (manager sees shared and private-to-manager items they are entitled to).
- **Career tab:** `GET /careers/paths/?from_role={employee_role}`; `GET /careers/readiness/?employee={id}&target_role=`; `PUT /employees/{id}/target-role/` (manager sets/confirms); `POST /careers/promotion-flags/ {employee, target_role, note}`.
- **Rules (promotion flag):** creates `PromotionReviewFlag`, snapshots readiness, notifies HR (`PROMOTION_REVIEW_FLAGGED`), audited; response states "HR has been notified"; **no role or compensation change occurs**. Flag allowed only when readiness is `READY_FOR_REVIEW` unless the manager supplies a justification note (setting `career.flag_requires_ready`, default true).

### `/manager/goals` — Team Goals
- **Calls:** `GET /goals/?scope=team&employee=&cycle=&status=&q=`; approval queue: `GET /goals/?scope=team&status=PENDING_APPROVAL`; `POST /goals/{id}/approve/ {comment?}`; `POST /goals/{id}/reject/ {comment}` (required); `POST /goals/ {employee, …}` (Assign goal); alignment: `GET /goals/alignment/?scope=team&cycle=`.
- **Contract:** approval queue row includes `submitted_at`; alignment returns a forest `[{goal, children[]}]` rooted at company/department goals.
- **Rules:** manager-assigned goals skip approval and become `ACTIVE` unless org setting `performance.goal_approval_required` requires employee acceptance (then `PENDING_APPROVAL` for the employee side is **not** used — keep simple: manager-assigned = `ACTIVE`); rejection requires a comment and returns goal to `DRAFT`; manager cannot approve goals outside team; every decision creates `GoalComment` + notification (`GOAL_DECISION`) + audit (`GOAL_APPROVED`).

### `/manager/reviews` — Team Reviews
- **Calls:** `GET /reviews/?scope=team&cycle=&status=&q=`; `POST /reviews/remind/ {review_ids[]}` (bulk reminders).
- **Contract:** row `{id,employee,cycle,status,due_date,is_overdue,next_action}`; `next_action ∈ COMPLETE_MANAGER_REVIEW | AWAIT_EMPLOYEE | NONE`.
- **Rules:** reminders only for overdue `SELF_ASSESSMENT` reviews of own team; throttled (max one reminder per review per 24 h; return skipped ids).

### `/manager/reviews/[id]` — Review form
- **Calls:** `GET /reviews/{id}/context/` (left column); `GET /reviews/{id}/` (form data + rating scale); `PUT /reviews/{id}/manager-review/draft/` (Save draft); `POST /reviews/{id}/manager-review/` (Submit to calibration); optional `POST /ai/review-draft/`.
- **Contract (`context`):** `{employee, self_assessment:{rating,comments,submitted_at,competencies[]}, goals:[{id,title,score,snapshot_score,notes}], feedback:[authorized items]}`. **Form payload:** `competency_ratings[{competency_id,rating,comment}], overall_rating, comments, development_recommendations[{text,skill?}]`.
- **Rules:** only the assigned reviewer (or HR) may write; valid only when status `MANAGER_REVIEW`; submission validates every competency + overall rating against the org scale, snapshots `goal_score_snapshot`, moves to `CALIBRATION`, locks manager fields, audits `REVIEW_TRANSITION`; feedback in `context` obeys visibility rules; AI draft is returned as draft content only (never auto-saved).

### `/manager/skill-validation` — Skill Validation
- **Calls:** `GET /skill-assessments/?scope=team&status=PENDING&employee=&skill=`; `POST /skill-assessments/{id}/validate/ {adjusted_level?, note?}`; `POST /skill-assessments/{id}/reject/ {reason}`; `POST /skill-assessments/bulk-validate/ {ids[]}`.
- **Contract:** row `{id,employee,skill,claimed_level,evidence_note,evidence_url,source,status,is_low_risk,created_at}`.
- **Rules:** `is_low_risk = evidence provided AND claimed_level <= current_validated_level + 1`. `bulk-validate` validates **only** ids that are low-risk and in scope; response lists `validated[]` and `skipped[{id,reason}]`; adjusted level requires a note; validation triggers `recompute_employee_skill_current`, a notification to the employee, and audit (`SKILL_VALIDATED`); a manager cannot validate their own assessments.

### `/manager/feedback` — Team Feedback
- **Calls:** `GET /feedback/?scope=team&employee=&type=&date_from=&date_to=`; `POST /feedback/ {to_employee, feedback_type, content, visibility}`; `POST /recognitions/ {…}` (Recognize quick action); `GET /feedback/{id}/`.
- **Contract:** every item includes `visibility` and `visibility_help` (plain-language "who can see this"); `GET /feedback/visibility-options/` returns the allowed options with help text for the selector.
- **Rules:** `PRIVATE_TO_MANAGER` never reaches employee serializers; HR access to private items only if `privacy.confidential_feedback_visibility = HR_AUDITED` and each view is audited.

### `/manager/one-on-ones` — 1:1 Meetings
- **Calls:** `GET /one-on-ones/?scope=team&when=upcoming|past`; `POST /one-on-ones/ {employee, scheduled_at, recurrence?}` (Schedule); `PATCH /one-on-ones/{id}/ {shared_notes, private_notes, status}`; `GET/POST /one-on-ones/{id}/action-items/`; `PATCH /action-items/{id}/`.
- **Contract:** manager serializer includes `private_notes` and a boolean `private_notes_visible_to_you: true` (UI label "Only you can see this").
- **Rules:** `recurrence {frequency, until}` creates up to 12 future instances sharing `series_id` (Celery or service loop); editing one instance does not alter the series unless `apply_to_series=true`; scheduling notifies the employee (`ONE_ON_ONE_SCHEDULED`).

### `/manager/development-plans` — Team Development Plans
- **Calls:** `GET /development-plans/?scope=team&status=&q=`; pending approvals: `GET /development-plans/?scope=team&status=PENDING_APPROVAL`; `POST /development-plans/{id}/approve/ {comment?}`; `POST /development-plans/{id}/reject/ {comment}`; `POST /development-plans/{id}/assign-course/ {course}`.
- **Contract:** row `{id,employee,target_role,start_date,target_date,status,progress_pct,item_count,open_action}`.
- **Rules:** `assign-course` adds a `COURSE` plan item and creates an `Enrollment` (status `ENROLLED`, `assigned_by`) in one transaction and notifies the employee (`COURSE_ASSIGNED`); approving a plan notifies the employee (`PLAN_DECISION`); managers may accept/reject `PROPOSED` items via `POST /development-plan-items/{id}/decision/ {accept: bool, comment?}`.

### `/manager/analytics` — Team Analytics
- **Calls (all accept `cycle=`):** `GET /analytics/team/goal-progress-distribution/`; `GET /analytics/team/rating-trend/`; `GET /analytics/team/skill-heatmap/`; `GET /analytics/team/training-completion/`.
- **Contract:** distribution `{buckets:[{label,count}]}`; trend `{cycles:[{id,name}], series:[{label,values[]}]}`; heatmap `{rows:[{employee|category}], columns:[skills], cells:[[level|null]]}`; training `{completed,in_progress,not_started,completion_pct}`.
- **Rules:** team scope only; no minimum group size suppression for managers' own direct reports (they already see them), but the endpoint must never include employees outside scope.

---

## 7.4 HR Admin Portal (`/hr`)

Roles: **H** only (executive-read endpoints are separate). All writes audited.

### `/hr` — Dashboard
- **Calls:** `GET /dashboards/hr/`.
- **Contract:** 
```json
{ "kpis": { "total_employees": 200, "departments": 8, "active_cycle_completion_pct": 62.5, "overdue_reviews": 14, "avg_goal_score": 0.74, "open_skill_validations": 31 },
  "cycle_progress_by_department": [{"department","completion_pct","total","completed"}],
  "top_org_skill_gaps": [{"skill","affected_count","avg_gap"}],
  "readiness_distribution": {"DEVELOPING":120,"NEAR_READY":50,"READY_FOR_REVIEW":18},
  "recent_audit": [{"id","actor","action","entity","created_at"}] }
```
- **Rules:** cached 5–15 min; quick actions (Add employee, Launch cycle, Import CSV) are client links — no API.

### `/hr/employees` — Employees
- **Calls:** `GET /employees/?q=&department=&job_role=&manager=&status=&ordering=`; row actions: `GET /employees/{id}/`, `PATCH /employees/{id}/`, `POST /employees/{id}/change-manager/ {manager, effective_date}`, `POST /employees/{id}/deactivate/ {reason?}`, `POST /employees/{id}/reactivate/`.
- **Contract:** row `{id,name,photo_url,employee_code,department,job_role,manager,status}`.
- **Rules:** deactivate sets `employment_status=EXITED` (or `ON_LEAVE` via PATCH), deactivates the user (revokes tokens), keeps all history, freezes open reviews; cannot deactivate the last HR Admin; all actions audited.

### `/hr/employees/new` — Add employee
- **Calls:** `POST /users/` (creates user + employee atomically); lookups: `GET /departments/`, `GET /job-roles/`, `GET /employees/?scope=manager_candidates&q=`.
- **Body:** `{ email, role, credential_mode: "INVITE"|"TEMP_PASSWORD", employee: {employee_code, department, job_role, manager, joining_date, preferred_name?, phone?, location?} }`.
- **Rules:** `INVITE` emails a time-limited set-password link (Celery); `TEMP_PASSWORD` generates a random password returned **once** in the response (`temporary_password`) and sets `must_change_password=true`; unique email and employee code per org; manager must be an active employee in the same org and must not create a cycle; `employee_code` uniqueness error returned in `details.employee.employee_code`.

### `/hr/employees/[id]` — Employee detail (tabs: Overview, Employment, Manager history, Reviews, Skills, Goals, Audit)
- **Calls:** `GET /employees/{id}/` (overview + employment); `GET /employees/{id}/manager-history/`; `GET /reviews/?employee={id}`; `GET /employees/{id}/skills/`; `GET /goals/?employee={id}`; `GET /audit-logs/?entity_type=employee&entity_id={id}`; header actions as in §7.4 `/hr/employees`.
- **Contract (overview):** include `performance_summary {latest_rating, latest_goal_score}` and `career_summary {target_role, readiness_status}`.
- **Rules:** audit tab is HR-only; role changes (`current_role`) write `EmployeeRoleHistory`.

### `/hr/employees/import` — Import
- **Calls (stepwise):** `GET /employees/import/template/` (CSV file); `POST /employees/import/preview/` (multipart; validates without writing; returns `{upload_id, total_rows, preview_rows[first 20], errors[{row,field,message,row_data}]}`); `POST /employees/import/ {upload_id}` → `202 {job_id}`; `GET /employees/import/{job_id}/` (progress); `GET /employees/import/{job_id}/errors.csv` (Download error file).
- **Rules:** commit only allowed when preview has `errors=[]` or when `?skip_invalid=true` is explicit (invalid rows skipped and listed); import is idempotent per `employee_code` (update vs create is controlled by `mode=CREATE_ONLY|UPSERT`, default `CREATE_ONLY`); processed in a Celery task with chunked transactions; manager references resolved by `manager_employee_code`; notification `IMPORT_FINISHED` on completion.

### `/hr/departments` — Departments
- **Calls:** `GET /departments/tree/` → nested `[{id,name,head:{id,name}|null,employee_count,children[]}]`; `POST /departments/`; `PATCH /departments/{id}/`; `DELETE /departments/{id}/`; `POST /departments/reorder/ {parent, ordered_ids[]}` (only if drag-reorder enabled).
- **Rules:** `DELETE` fails with `409 state_conflict` and `details.reason="HAS_EMPLOYEES"` (or `HAS_CHILDREN`) with counts, so the UI can show the explanatory message; the tree response includes `can_delete` per node; parent change must not create a cycle; head must be an employee in that org.

### `/hr/review-cycles` — Review Cycles
- **Calls:** `GET /review-cycles/?status=&type=`; `POST /review-cycles/`; `PATCH /review-cycles/{id}/`.
- **Contract (row):** `{id,name,cycle_type,start_date,end_date,departments[{id,name}],status,completion_pct}`.
- **Fields (create/edit):** `name, cycle_type, start_date, end_date, self_assessment_due, manager_review_due, departments[], rating_scale_ref` (where `rating_scale_ref` = `"CURRENT"`; the server snapshots the org scale into `rating_scale_snapshot` on activation).
- **Rules:** editable only while `DRAFT` (after activation only deadlines can change, audited); date ordering validated (`start ≤ self_due ≤ manager_due ≤ end`); at least one department required unless "all".

### `/hr/review-cycles/[id]` — Cycle detail
- **Calls:** `GET /review-cycles/{id}/`; `GET /review-cycles/{id}/board/` ; `GET /review-cycles/{id}/overdue/`; `POST /review-cycles/{id}/remind-overdue/ {review_ids[]?}`; actions: `POST /review-cycles/{id}/activate/`, `/start-calibration/`, `/close/`; consequence previews: `GET /review-cycles/{id}/action-preview/?action=activate|start_calibration|close`.
- **Contract (`board`):** `{columns:[{status, count, cards:[{review_id,employee,department,role,due_date,is_overdue}]}]}` (cards capped at 50 per column with `more` count + link filters). **`action-preview`:** `{action, consequences:[strings], counts:{reviews_to_create, notifications_to_send, reviews_to_lock}, blockers:[strings]}` so the confirmation dialog lists consequences from the server.
- **Rules:** activation creates one review per active employee in the included departments (idempotent), snapshots the rating scale, notifies employees and managers; `start-calibration` allowed when no review is still in `SELF_ASSESSMENT` unless `force=true` with justification; `close` allowed only when all reviews are `COMPLETED|ACKNOWLEDGED|DISPUTED-resolved`, then locks them; invalid state → `409`.

### `/hr/calibration` — Calibration
- **Calls:** `GET /calibration/reviews/?cycle=&department=&manager=&status=`; `GET /calibration/distribution/?cycle=&group_by=department|manager`; `POST /reviews/{id}/propose-calibration/ {calibrated_rating, comment}`; `POST /reviews/{id}/finalize/ {final_rating?}`; `POST /reviews/{id}/reopen/ {comment}`; `GET /reviews/{id}/calibration-history/`.
- **Contract (table row):** `{review_id, employee, manager, self_rating, manager_rating, goal_score, proposed_calibrated_rating, status, has_dispute}`. **Distribution:** `{group_by, groups:[{label, counts:{"1":n,…,"5":n}, mean, total}]}`.
- **Rules:** `propose-calibration` requires a non-empty `comment` and keeps status `CALIBRATION` (writes `ReviewCalibrationEntry`); `finalize` sets `calibrated_rating`/`final_rating`, moves to `COMPLETED`, locks, notifies employee (`REVIEW_COMPLETED`), audits `RATING_CHANGED`; `finalize` returns `409` if no proposal exists unless `final_rating` is provided with a comment; `reopen` is valid only from `DISPUTED` → `CALIBRATION`; HR cannot calibrate a review in `MANAGER_REVIEW`.

### `/hr/skills` — Skills Library
- **Calls:** `GET /skills/?q=&category=&is_active=`; `POST /skills/`; `PATCH /skills/{id}/`; `POST /skills/{id}/deactivate/`; `DELETE /skills/{id}/` (only if unused); import: `POST /skills/import/preview/`, `POST /skills/import/ {upload_id}`, `GET /skills/import/{job_id}/`.
- **Contract:** row `{id,name,category,description,usage:{employees,roles,courses},is_active}`.
- **Rules:** `DELETE` on a used skill returns `409 state_conflict` with usage counts and the UI shows "Deactivate" instead; deactivated skills disappear from pickers but remain in history; unique name per org (case-insensitive).

### `/hr/roles` — Job Roles
- **Calls:** `GET /job-roles/?track=&level=&department=&q=`; `POST /job-roles/`.
- **Contract:** `{id,title,track,level,department,employee_count,is_critical}`.

### `/hr/roles/[id]` — Role detail
- **Calls:** `GET /job-roles/{id}/`; `PATCH /job-roles/{id}/` (description, `min_months_in_role`, `is_critical`); requirements: `GET/POST /job-roles/{id}/skills/`, `PATCH/DELETE /job-roles/{id}/skills/{skill_id}/`, bulk `PUT /job-roles/{id}/skills/` (replace set, atomic); career steps: `GET/POST /job-roles/{id}/next-roles/`, `DELETE /job-roles/{id}/next-roles/{to_role}/`; people: `GET /employees/?job_role={id}&scope=name_department`.
- **Rules:** `required_level` 1–5, `weight` 1–5; changes to requirements are audited and trigger a readiness-snapshot refresh task for employees targeting this role; career-step cycles allowed only if they do not create a self-loop.

### `/hr/courses` — Course Catalog
- **Calls:** `GET /courses/?q=&skill=&difficulty=&format=&is_active=`; `POST /courses/`; `GET /courses/{id}/`; `PATCH /courses/{id}/`; skills mapping: `PUT /courses/{id}/skills/ [{skill, level_from, level_to}]`.
- **Contract:** row `{id,title,provider,skills[],difficulty,format,duration_hours,is_active,enrollment_count,completion_rate}`.
- **Rules:** `level_from < level_to`; deactivating hides from employee catalog but keeps existing enrollments.

### `/hr/analytics` — HR Analytics (tabs: Performance, Skills, Training, Readiness, Nine-box)
- **Global filters on every call:** `department=&role=&cycle=&date_from=&date_to=`.
- **Calls:** `GET /analytics/performance/rating-distribution/`; `GET /analytics/performance/trend/`; `GET /analytics/skills/heatmap/`; `GET /analytics/skills/shortages/`; `GET /analytics/training/completion/`; `GET /analytics/training/effectiveness/`; `GET /analytics/readiness/by-role/`; `GET /analytics/readiness/mobility-pipeline/`; `GET /analytics/nine-box/`; export current view: `POST /reports/ {report_type: "ANALYTICS_VIEW", filters, format}`.
- **Contract (nine-box):** see §8.6. **Heatmap:** `{departments:[…], skills:[…], cells:[[avg_validated_level|null]], legend:[{min,max,label}]}`.
- **Rules:** HR sees organization-wide data (individual-level only where an existing HR page allows it); results cached with key `analytics:{org}:{role}:{endpoint}:{hash(filters)}` (TTL 5–15 min); every response includes `filters_applied` and `generated_at`.

### `/hr/reports` — Reports
- **Calls:** `GET /reports/types/` (role-scoped catalog `[{type,name,description,formats[],filters_schema}]`); `POST /reports/ {report_type, filters, format}` → `202`; `GET /reports/?status=&ordering=-created_at` (jobs + history); `GET /reports/{id}/` (status/progress); `GET /reports/{id}/download/`; `POST /reports/{id}/retry/` (failed jobs).
- **Contract:** job `{id,report_type,name,requested_at,format,status,progress_pct,download_url?,error?}`.
- **Rules:** generation in Celery `reports` queue; download links are authenticated and expire; exports audited (`DATA_EXPORTED`); `filters` validated against `filters_schema`; failed jobs store a user-safe error message only.

### `/hr/audit-logs` — Audit Logs
- **Calls:** `GET /audit-logs/?actor=&action=&entity_type=&entity_id=&date_from=&date_to=&q=`; `GET /audit-logs/{id}/` (detail drawer); `POST /audit-logs/export/ {filters, format}` → report job.
- **Contract:** row `{id,created_at,actor,action,entity:{type,id,label},summary}`; detail adds `before`, `after`, and `changes:[{field,before,after}]` (precomputed diff for the two-column comparison), `ip_address`, `user_agent`.
- **Rules:** read-only; no update or delete endpoint exists; sensitive values (passwords, tokens) are never stored in `before/after`.

### `/hr/settings` — Organization Settings
- **Calls:** `GET /organization/settings/` (all groups); `PATCH /organization/settings/{group}/` where `group ∈ general | performance | career | privacy`; `POST /organization/logo/` (multipart); users and roles: `GET /users/?q=&role=`, `PATCH /users/{id}/ {role, is_active}`.
- **Contract:** each group returns `{values, schema_hints, updated_at, updated_by}`; `users` rows `{id,name,email,role,is_active,is_last_hr_admin}`.
- **Rules:** typed validation per group (e.g., rating scale: consecutive integers starting at 1, each with label+anchor; `goal_score_cap` between 1.0 and 1.5; thresholds between 0 and 1); changing the rating scale after an active cycle affects only future cycles (snapshots protect existing ones); any change audited with before/after (`ORG_SETTINGS_CHANGED`); role changes audited (`USER_ROLE_CHANGED`); demoting or deactivating the last HR Admin is blocked (`409`, `details.reason="LAST_HR_ADMIN"`); `ai_enabled` can be turned on only if the deployment flag `AI_ENABLED` is true.

---

## 7.5 Executive Portal (`/executive`)

Roles: **X** (and **H** for read access, per the UI route rules). Executive endpoints return **aggregates only** — never individual names, review records, or goals. Apply `suppress_small_groups` (min group size 5) to every grouped result (see §9). Responses carry `suppression: {applied: bool, suppressed_groups: int, merged_into: "Other (small groups)"|null, min_group_size: 5}` so the UI can show its explanatory tooltip.

### `/executive` — Dashboard
- **Calls:** `GET /dashboards/executive/`.
- **Contract:**
```json
{ "kpis": { "headcount": 200, "avg_goal_score": 0.74, "review_completion_pct": 88.0, "training_completion_pct": 63.0, "near_or_ready_pct": 21.5 },
  "performance_by_department": [{"department","avg_goal_score","avg_rating","headcount"}],
  "top_skill_shortages": [{"skill","shortage_index"}],
  "readiness_pipeline": {"DEVELOPING":0,"NEAR_READY":0,"READY_FOR_REVIEW":0},
  "trend_by_cycle": [{"cycle","avg_rating","avg_goal_score"}],
  "suppression": {"applied": true, "suppressed_groups": 1, "merged_into": "Other (small groups)", "min_group_size": 5} }
```

### `/executive/performance` — Organization Performance
- **Calls:** `GET /analytics/executive/rating-distribution/?cycle=`; `GET /analytics/executive/rating-trend/`; `GET /analytics/executive/department-comparison/?cycle=`; `GET /analytics/executive/goal-achievement/?cycle=`.
- **Rules:** departments with fewer than 5 employees are merged into "Other (small groups)" (or omitted if merging would still leave <5); rating distribution cells with counts <5 are masked/merged to avoid inferring individuals; no endpoint on this page ever returns employee identifiers.

### `/executive/skills` — Skills & Shortages
- **Calls:** `GET /analytics/executive/skill-heatmap/`; `GET /analytics/executive/shortage-ranking/`; `GET /analytics/executive/training-effectiveness/`; `GET /analytics/executive/focus-areas/`.
- **Contract:** `shortage-ranking` item `{skill, shortage_index, severity: LOW|MEDIUM|HIGH, affected_pct}`; `focus-areas` is a **rule-based** list `[{skill, rationale, suggested_actions[]}]` derived from the top shortages (e.g., top 3 skills with `affected_pct ≥ threshold`); text is generated from templates, not AI.
- **Rules:** heatmap cells use averages of validated levels with group size ≥ 5.

### `/executive/readiness` — Readiness & Succession
- **Calls:** `GET /analytics/executive/readiness-summary/?group_by=role|department`; `GET /analytics/executive/bench-strength/` (critical roles only, uses `JobRole.is_critical`); `GET /analytics/executive/nine-box/`; `GET /analytics/executive/mobility-trends/`.
- **Contract:** `bench-strength` `[{role, ready_count, near_ready_count, total_in_feeder_roles, suppressed: bool}]` (counts below 5 are shown as `"<5"` strings plus `suppressed:true`); `mobility-trends` `{periods:[…], series:[{label:"Internal moves"|"Promotions", values[]}]}` built from `EmployeeRoleHistory`.
- **Rules:** nine-box via §8.6 with suppression; no employee names.

### `/executive/reports` — Executive Reports
- **Calls:** `GET /reports/catalog/` (predefined executive summaries `[{type,name,description,formats[]}]`); `POST /reports/ {report_type, format}`; `GET /reports/?scope=mine` (request history); `GET /reports/{id}/download/`.
- **Contract:** the catalog response includes `scheduled_reports: { "available": false, "message": "Coming soon" }`.
- **Rules:** **no** scheduling endpoints exist in this version; executive-generated exports contain aggregates only and are audited.

---

# 8. Domain Logic Reference (implement in `services.py` with unit tests)

### 8.1 Goal score and progress
```
progress_pct (display):
  HIGHER_BETTER: (current - start) / (target - start) * 100
  LOWER_BETTER : (start - current) / (start - target) * 100
  clamp to [0, 100]; if target == start: 100 if current meets target else 0

score s (used for weighted score): same ratio, clamped to [0, cap]   # cap from org settings, default 1.0
weighted = sum(w*s) / sum(w)       # goals with ACTIVE or COMPLETED status in the cycle; cancelled excluded; zero weights -> 0
```
Unit cases: 8/10 → 0.8; lower-is-better 100→60 target 50 current 60 → 0.8; overshoot capped; `target==start`.

### 8.2 Skill gap and coverage
```
for rs in role_skills(target_role):
    v = validated_level(employee, rs.skill)        # None if none
    gap = max(0, rs.required_level - (v or 0))
    status = UNVALIDATED if v is None else ("MET" if gap == 0 else "GAP")
    priority = gap * rs.weight   # must-haves sorted first on ties
coverage = sum(min(v or 0, req) * weight) / sum(req * weight)
```
Provisional mode (`career.show_self_assessed_as_provisional=true`): also return `self` level on each item but do **not** use it in `gap`, `coverage`, or readiness. `why_it_matters` text template: *"{Must-have|Important} for {role} (weight {w}); gap of {gap} level(s)."*

### 8.3 Readiness
Implement exactly as in `system_design.md §7.4` with thresholds from org `career` settings. Each criterion returns `{key, name, passed, detail}`. Keys: `MUST_HAVES_MET, COVERAGE, GOAL_SCORE, RATING, REQUIRED_COURSES, TIME_IN_ROLE`. Status: `READY_FOR_REVIEW | NEAR_READY | DEVELOPING`. Include `advisory_text` string.

### 8.4 Recommendations
Rank active courses mapped to gap skills where `level_from ≤ current` and `level_to ≥ required` (or the highest available); score = priority × level-fit factor, with small bonuses for shorter duration and lower difficulty mismatch; exclude completed or already-enrolled courses; return a `reason` string per item.

### 8.5 Derived list fields
- `next_action` (employee review): `NOT_STARTED/SELF_ASSESSMENT` with no draft → `START_SELF_ASSESSMENT`; with draft → `CONTINUE_SELF_ASSESSMENT`; `COMPLETED` (not acknowledged) → `ACKNOWLEDGE`; `ACKNOWLEDGED|COMPLETED` and viewed → `VIEW_RESULT`; otherwise `NONE`.
- `is_overdue`: due date passed and the item is not in a terminal state.
- `open_actions_count` (manager team table): see §7.3 `/manager/team`.
- `is_low_risk` (skill validation): see §7.3.

### 8.6 Nine-box (aggregated)
Axes: **Performance** (X) from `final_rating` of the latest completed cycle, banded by org scale into `LOW | MEDIUM | HIGH` (default bands: ≤2, 3, ≥4 on a 5-point scale); **Potential** (Y) is **derived** from the latest readiness snapshot against any target role: `READY_FOR_REVIEW → HIGH`, `NEAR_READY → MEDIUM`, `DEVELOPING → LOW`. (A dedicated manager-entered potential rating is *not* in the UI spec; see §18, assumption A2.)
```json
{ "x_axis": ["Low","Medium","High"], "y_axis": ["Low","Medium","High"],
  "cells": [ {"x":"High","y":"High","count":12,"suppressed":false}, {"x":"Low","y":"High","count":null,"suppressed":true} ],
  "suppression": {"applied": true, "min_group_size": 5} }
```
Executive and HR both receive aggregates; neither endpoint returns employee identifiers.

### 8.7 Small-group suppression
`suppress_small_groups(groups, min_size=5)`: groups with `n < 5` are merged into one `"Other (small groups)"` bucket; if the merged bucket is still `< 5` it is dropped and counted in `suppressed_groups`. For count matrices (nine-box, distributions) cells `< 5` return `count: null, suppressed: true`. Complementary-disclosure guard: never publish totals that let a suppressed cell be inferred by subtraction (publish margin totals only if every contributing cell is unsuppressed, otherwise round totals to the nearest 5).

---

# 9. Analytics Caching and Access Rules

- Redis keys: `analytics:{org_id}:{role}:{user_scope_hash}:{endpoint}:{filters_hash}`; TTL 5–15 min; manager caches keyed by manager id; executive caches shared per org.
- Beat task `refresh_analytics_cache` warms HR and executive dashboards every 15 min; invalidate on cycle close and bulk imports.
- Never cache confidential feedback, review text, or personal data.
- Scope rules: **M** = reporting tree; **H** = org; **X** = aggregates with suppression.

# 10. Audit Logging

`audit.services.log(actor, action, entity, before=None, after=None, request=None)`; append-only; no API to modify. Required actions (constants): `USER_ROLE_CHANGED, USER_DEACTIVATED, MANAGER_CHANGED, EMPLOYEE_CREATED, EMPLOYEE_IMPORTED, REVIEW_TRANSITION, RATING_CHANGED, CALIBRATION_PROPOSED, GOAL_APPROVED, GOAL_REJECTED, SKILL_VALIDATED, SKILL_REJECTED, PLAN_APPROVED, PROMOTION_FLAGGED, DATA_EXPORTED, CONFIDENTIAL_FEEDBACK_VIEWED, ORG_SETTINGS_CHANGED, ROLE_REQUIREMENTS_CHANGED, AI_USED`. Store field-level `changes` for the detail drawer; never log secrets.

# 11. Celery Tasks

| Task | Trigger | Queue |
|---|---|---|
| `send_email_notification(notification_id)` | on commit after notification | notifications |
| `send_password_reset_email`, `send_invite_email` | auth flows | notifications |
| `notify_cycle_started(cycle_id)` | cycle activation | notifications |
| `send_review_reminders` | beat daily; manual reminder endpoints | notifications |
| `flag_overdue_items` | beat daily | default |
| `recompute_employee_skill_current(employee_id, skill_id)` | assessment validated | default |
| `snapshot_readiness(employee_id?)` | beat weekly; role requirements changed; target role changed | default |
| `run_employee_import(job_id)`, `run_skill_import(job_id)` | import commit | default |
| `generate_report(job_id)` | report request, analytics export, audit export | reports |
| `refresh_analytics_cache` | beat 15 min | reports |
| `create_one_on_one_series(series_id)` | recurring schedule | default |
| `run_ai_job(job_id)` | AI endpoints (later) | ai |

Requirements: idempotent, `bind=True, max_retries=3, retry_backoff=True`, accept ids not objects, dispatch via `transaction.on_commit`, `CELERY_TASK_ALWAYS_EAGER=True` in tests, notification emails honor `NotificationPreference.email_enabled`.

---

# 12. Testing Requirements

- **Unit:** every service (goal score, gap, readiness, recommendations, state machine, suppression, low-risk rule, recurrence expansion).
- **API (per endpoint):** happy path, 401, 403 wrong role, 404 cross-tenant, validation error shape, pagination/filters used by the UI page.
- **Permission matrix test:** parametrized from `system_design.md §8.1` plus the page-level access in §7.
- **Visibility tests:** private feedback and private notes never appear in employee or HR serializers (unless policy allows and audit is written); manager fields hidden from employees until `COMPLETED`.
- **Executive tests:** no endpoint under `/analytics/executive/*` or `/dashboards/executive/` contains employee ids/names; suppression cases (groups of 4 and 5; subtraction guard).
- **Dashboard consistency tests:** dashboard counts equal the list endpoints' counts for the same filters.
- **State-machine tests:** exhaustive transition table for reviews, goals, plans, items, cycles.
- **Query-count tests** on list and dashboard endpoints.
- **Two-organization fixture** in the base test setup to catch tenant leaks.
- Coverage ≥ 80% overall, ≥ 90% on services.

# 13. Seed Data (`manage.py seed_demo_data [--reset]`)

One demo organization; 1 HR admin, 1 executive, 3 managers, ~30 employees over 5 departments (ensure every department has ≥ 5 employees except one deliberately small department to demo suppression); ~30 skills; 8+ roles including a critical role (Tech Lead) with role skills and career steps; ~20 courses mapped to skills; one closed cycle with completed reviews and one active cycle with reviews across every status; goals and updates; skill assessments incl. pending low-risk and non-low-risk; feedback of every visibility; recognitions and badges; one-on-ones with private notes and action items; notifications; `EmployeeRoleHistory` entries for mobility trends; the **Rahul** scenario (Junior Python Developer: Python 4, SQL 3, System Design 2 → Senior Backend Developer). Idempotent; prints demo credentials; synthetic data only.

# 14. Definition of Done (per page-level feature)

- [ ] Models + migrations (per §5)
- [ ] Selectors/services typed and tested
- [ ] Serializers per audience (employee / manager / HR / executive variants where fields differ)
- [ ] Tenant scoping + role permissions + object-level checks
- [ ] Filters and ordering exactly as listed for the page
- [ ] Computed fields returned (no UI computation needed)
- [ ] Audit, notification, Celery hooks where specified
- [ ] OpenAPI documented with examples
- [ ] Tests (unit, API, permissions, visibility, tenant)
- [ ] Lint/format/type checks clean; changelog updated

# 15. Do / Do Not

**Do:** ask on ambiguity; keep PRs phase-scoped; return reasons with every score/gap/readiness result; use separate serializers per audience; keep executive responses aggregate-only.

**Do not:** put business logic in views/serializers/signals; trust client-supplied `organization`, `role`, `owner`, or `employee` for authorization; hide confidential fields only in the UI; auto-promote, auto-rate, or auto-finalize anything (readiness, AI, or promotion flags never change roles/ratings); add endpoints for pages not in the UI inventory (e.g., **no scheduled-report endpoints**); store secrets or real employee data in the repo; edit applied migrations; weaken tests to pass.

# 16. Useful Commands
```
docker compose up --build
docker compose exec api python manage.py migrate
docker compose exec api python manage.py seed_demo_data --reset
docker compose exec api pytest --cov=apps -q
docker compose exec api ruff check . && docker compose exec api black --check .
docker compose exec worker celery -A config inspect active
```

---

# 17. Page → Endpoint Coverage Checklist

Mark each when its endpoints, tests, and OpenAPI examples are done.

**Auth / shared**
- [ ] `/login` · [ ] `/forgot-password` · [ ] `/reset-password` · [ ] `/change-password` · [ ] `/forbidden`, `/not-found`, error page (no API) · [ ] global search · [ ] notification bell · [ ] `/notifications` · [ ] `/settings/notifications`

**Employee** — [ ] `/employee` · [ ] `/employee/goals` · [ ] `/employee/goals/new` · [ ] `/employee/goals/[id]/edit` · [ ] `/employee/goals/[id]` · [ ] `/employee/reviews` · [ ] `/employee/reviews/[id]` · [ ] `/employee/skills` · [ ] `/employee/skill-gap` · [ ] `/employee/learning` · [ ] `/employee/learning/[courseId]` · [ ] `/employee/enrollments` · [ ] `/employee/career` · [ ] `/employee/development-plan` · [ ] `/employee/feedback` · [ ] `/employee/recognition` · [ ] `/employee/one-on-ones` · [ ] `/employee/directory` · [ ] `/employee/profile`

**Manager** — [ ] `/manager` · [ ] `/manager/team` · [ ] `/manager/team/[id]` (7 tabs) · [ ] `/manager/goals` · [ ] `/manager/reviews` · [ ] `/manager/reviews/[id]` · [ ] `/manager/skill-validation` · [ ] `/manager/feedback` · [ ] `/manager/one-on-ones` · [ ] `/manager/development-plans` · [ ] `/manager/analytics`

**HR** — [ ] `/hr` · [ ] `/hr/employees` · [ ] `/hr/employees/new` · [ ] `/hr/employees/[id]` (7 tabs) · [ ] `/hr/employees/import` · [ ] `/hr/departments` · [ ] `/hr/review-cycles` · [ ] `/hr/review-cycles/[id]` · [ ] `/hr/calibration` · [ ] `/hr/skills` · [ ] `/hr/roles` · [ ] `/hr/roles/[id]` · [ ] `/hr/courses` · [ ] `/hr/analytics` (5 tabs) · [ ] `/hr/reports` · [ ] `/hr/audit-logs` · [ ] `/hr/settings`

**Executive** — [ ] `/executive` · [ ] `/executive/performance` · [ ] `/executive/skills` · [ ] `/executive/readiness` · [ ] `/executive/reports`

---

# 18. Assumptions Needing the Owner's Confirmation

Implement the defaults below; flag them in your handover note so they can be changed cheaply.

| # | Topic | Default implemented | Why it needs confirmation |
|---|---|---|---|
| A1 | Global search for Executive | Returns empty groups (UI spec defines search only for HR, managers, employees) | Spec silent for executives |
| A2 | Nine-box "potential" axis | Derived from readiness status (§8.6); no manager-entered potential rating | UI manager review form has no potential field; adding one would need a small UI change |
| A3 | Manager scope | `DIRECT` reports only (org setting `manager.scope` can switch to `TREE`) | Spec says "team" without defining indirect reports |
| A4 | Manager-assigned goals | Created as `ACTIVE` | Spec does not define whether employee acceptance is required |
| A5 | Target-role scope | Roles reachable via career steps (`PATH`); org setting can allow `ALL` | Spec shows a selector but not its option set |
| A6 | Critical roles | New `JobRole.is_critical` flag set by HR on the role detail page | Executive page needs a definition; HR role page spec has no explicit control (add a small toggle or set via seed/admin) |
| A7 | Potential for "flag ready for promotion review" | Allowed only when readiness is `READY_FOR_REVIEW` unless a justification note is supplied | Spec says "Flag ready…" without prerequisites |
| A8 | Executive suppression | Min group size 5; merge into "Other (small groups)" | Matches the UI note; threshold configurable |
| A9 | Report types | Initial catalog: Review completion, Goal achievement, Skill gaps, Training completion, Readiness summary, Audit export (HR); Organization summary, Skills & shortages, Readiness & succession (Executive) | Spec lists the report UI but not report names |
| A10 | Promotion flag outcome | Creates a flag + HR notification only | Spec says "note/notification to HR" |

When you finish a phase, summarize: what was built, endpoints added, which assumptions you used, deviations from `system_design.md`, risks, and how to run and test it.
