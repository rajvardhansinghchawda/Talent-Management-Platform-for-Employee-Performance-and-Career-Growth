# Backend Agent Handover — Django REST + Celery + Redis

> You are an AI coding agent implementing the backend of the Talent Management Platform.
> Read this file fully, then `system_design.md` (data model + domain rules) and `rulesForAntigravity.md` (working rules) before writing code.
> If anything here conflicts with `system_design.md`, **ask the user** and do not guess.

---

## 1. Mission

Build a secure, multi-tenant REST API that powers four portals (Employee, Manager, HR Admin, Executive). The API owns **all business logic**: goal scoring, review workflow, skill-gap analysis, readiness, recommendations, notifications, analytics, audit logging.

## 2. Tech Constraints

- Python 3.12+, Django (current LTS or latest stable), Django REST Framework.
- PostgreSQL, Redis, Celery 5 + `django-celery-beat`.
- Auth: `djangorestframework-simplejwt` (access in body, refresh in httpOnly cookie).
- Docs: `drf-spectacular`. Filtering: `django-filter`.
- Tests: `pytest`, `pytest-django`, `factory_boy`, `pytest-cov`.
- Lint/format: `ruff`, `black`, `isort` (or ruff only). Type hints on all service functions.

## 3. Repository Layout

```
backend/
  manage.py
  pyproject.toml / requirements/{base,dev,prod}.txt
  config/
    settings/{base,dev,prod}.py
    urls.py  celery.py  wsgi.py  asgi.py
  apps/
    core/ accounts/ organizations/ employees/ performance/ skills/
    learning/ careers/ feedback/ notifications/ analytics/ ai/ audit/
  tests/                 # cross-app and API-level tests
  scripts/               # seed_demo_data, helpers
  Dockerfile
docker-compose.yml       # api, worker, beat, postgres, redis, mailhog, frontend
.env.example
```

Each app: `models.py, selectors.py, services.py, serializers.py, permissions.py, views.py, urls.py, tasks.py, admin.py, tests/`.

## 4. Non-Negotiable Conventions

1. **Layering:** views → (serializers validate) → services (writes) / selectors (reads) → models. No business logic in views or serializers.
2. **Tenant safety:** every tenant model inherits `TenantModel`. Every queryset in a selector filters by `organization`. Never accept `organization` from client input.
3. **Permissions:** each view declares `permission_classes`; object-level checks in `permissions.py`. Cross-tenant or unauthorized objects return `404`.
4. **Transactions:** services that write multiple rows use `transaction.atomic()`.
5. **Audit:** services that perform sensitive actions call `audit.services.log(...)` (see §9).
6. **Notifications:** create `Notification` rows in services; email sending happens in Celery tasks via `transaction.on_commit`.
7. **Errors:** raise domain exceptions (`ValidationError`, `PermissionDenied`, `StateConflict`) that the global exception handler maps to the standard error format.
8. **N+1:** use `select_related/prefetch_related` in selectors; add tests with `django_assert_max_num_queries` for list endpoints.
9. **Settings:** no secrets in code; read from env via `django-environ` or `os.environ`.
10. **Migrations:** one logical migration per change; never edit applied migrations.

## 5. Standard Contracts

**Base URL:** `/api/v1/`. **Auth header:** `Authorization: Bearer <access>`.

**Pagination response**
```json
{ "count": 42, "next": "…?page=2", "previous": null, "results": [ ... ] }
```

**Error response**
```json
{ "error": { "code": "permission_denied", "message": "You do not have permission to perform this action.", "details": {} } }
```

Error codes: `validation_error`, `authentication_failed`, `permission_denied`, `not_found`, `state_conflict`, `rate_limited`, `server_error`.

## 6. Core Infrastructure Tasks (do first)

1. `core.models.TenantModel` (UUID pk, `organization` FK, timestamps) and `TenantManager`.
2. `core.pagination.StandardPagination` (page size default 20, max 100).
3. `core.exceptions.custom_exception_handler` returning the standard error format.
4. `core.permissions`: `IsHRAdmin`, `IsManager`, `IsEmployee`, `IsExecutive`, `HasRole(*roles)`.
5. Request-scoped current user/organization helper.
6. Health endpoints `/healthz`, `/readyz`.
7. Celery app (`config/celery.py`), autodiscover tasks, queues `default, notifications, reports, ai`.
8. OpenAPI schema at `/api/schema/` and Swagger at `/api/docs/`.
9. Management command `seed_demo_data` (see §12).

## 7. App-by-App Specification

Model fields are defined in `system_design.md §6.2`. This section lists **behavior and endpoints**. `R` = read, `W` = write. Roles: **E**mployee, **M**anager, **H**R, **X** Executive.

### 7.1 accounts

| Method | Path | Purpose | Access |
|---|---|---|---|
| POST | `/auth/login/` | email+password → access token, sets refresh cookie | public, rate-limited |
| POST | `/auth/refresh/` | new access token from cookie | public |
| POST | `/auth/logout/` | blacklist refresh | auth |
| GET | `/auth/me/` | user, role, employee profile summary, permissions flags | auth |
| POST | `/auth/password/change/` | change password | auth |
| POST | `/auth/password/reset/` | request reset email (always 200) | public, rate-limited |
| POST | `/auth/password/reset/confirm/` | set new password with token | public |
| POST | `/users/` | HR creates user + employee (with temp password / invite) | H |
| PATCH | `/users/{id}/` | change role/active | H |

Rules: HR cannot demote the last HR Admin; deactivating a user revokes tokens; all role changes are audited.

### 7.2 organizations

| Method | Path | Purpose | Access |
|---|---|---|---|
| GET/PATCH | `/organization/` | name + `settings` (rating scale, goal cap, readiness thresholds, privacy options) | R: all auth; W: H |
| CRUD | `/departments/` | department tree | R: all; W: H |

Validate `settings` with a typed serializer (reject unknown keys).

### 7.3 employees

| Method | Path | Purpose | Access |
|---|---|---|---|
| GET | `/employees/` | list, filters: `department, manager, role, status, q` | H: org; M: reporting tree; E: directory (limited fields) |
| POST | `/employees/` | create | H |
| GET/PATCH | `/employees/{id}/` | detail/update | self (limited), M (team, read), H |
| GET | `/employees/me/` | current employee | auth |
| GET | `/employees/{id}/team/` | direct reports | M (own), H |
| GET | `/employees/{id}/manager-history/` | assignments | H, M(team) |
| POST | `/employees/{id}/change-manager/` | create `ManagerAssignment`, close previous, sync `Employee.manager` | H |
| POST | `/employees/import/` | CSV upload → async import; returns job id | H |
| GET | `/employees/import/{job_id}/` | status + row errors | H |

Rules: prevent manager cycles (A manages B manages A); employee code unique per org; exiting an employee freezes reviews but keeps history. Directory view for non-HR hides phone, location, compensation-like fields.

### 7.4 performance (goals, cycles, reviews)

**Review cycles**

| Method | Path | Purpose | Access |
|---|---|---|---|
| CRUD | `/review-cycles/` | manage cycles | R: all; W: H |
| POST | `/review-cycles/{id}/activate/` | creates a `PerformanceReview` per active employee, notifies | H |
| POST | `/review-cycles/{id}/start-calibration/` | move to CALIBRATION | H |
| POST | `/review-cycles/{id}/close/` | close, lock reviews | H |
| GET | `/review-cycles/{id}/progress/` | counts per review status, overdue list | H, M(team) |

**Goals**

| Method | Path | Purpose | Access |
|---|---|---|---|
| GET | `/goals/` | filters: `employee, cycle, status, parent` | E: own; M: team; H: org |
| POST | `/goals/` | create (employee proposes; manager/HR assigns) | E, M, H |
| GET/PATCH/DELETE | `/goals/{id}/` | DRAFT/PENDING editable by owner; ACTIVE limited fields | per rules |
| POST | `/goals/{id}/submit/` | DRAFT → PENDING_APPROVAL | owner |
| POST | `/goals/{id}/approve/` | → ACTIVE | manager of owner, H |
| POST | `/goals/{id}/reject/` | → DRAFT with comment | manager of owner, H |
| POST | `/goals/{id}/updates/` | log progress `value`, `note`, `evidence_url`; updates `current_value` | owner |
| GET | `/goals/{id}/updates/` | history | owner, M, H |
| GET | `/goals/score/?employee=&cycle=` | weighted score + per-goal breakdown | E(own), M(team), H |

Rules: weights per employee-cycle are validated (warn if total ≠ 100 or configured sum); `current_value` auto-completes goal if target reached only when owner confirms (do not auto-complete silently). Child goals must belong to the same organization and a parent in the same cycle or company-level.

**Reviews**

| Method | Path | Purpose | Access |
|---|---|---|---|
| GET | `/reviews/` | filters: `cycle, employee, status` | E: own; M: team; H: org |
| GET | `/reviews/{id}/` | detail incl. goal score snapshot, competency ratings | scoped |
| POST | `/reviews/{id}/self-assessment/` | submit `self_rating`, comments, competency ratings → MANAGER_REVIEW | employee |
| POST | `/reviews/{id}/manager-review/` | submit `manager_rating`, comments, snapshot goal score → CALIBRATION | reviewer |
| POST | `/reviews/{id}/calibrate/` | HR sets `calibrated_rating` + `final_rating` → COMPLETED | H |
| POST | `/reviews/{id}/acknowledge/` | employee acknowledges | employee |
| POST | `/reviews/{id}/dispute/` | employee disputes with reason | employee |
| POST | `/reviews/{id}/reopen/` | DISPUTED → CALIBRATION | H |
| GET | `/reviews/{id}/history/` | state transitions (from audit) | employee(own), reviewer, H |

Rules: enforce the state machine in `services.transition_review`; invalid transitions → 409 `state_conflict`; employees see `manager_rating` only after status ≥ COMPLETED; ratings validated against org rating scale.

### 7.5 skills

| Method | Path | Purpose | Access |
|---|---|---|---|
| CRUD | `/skills/` | skills library; filter `category, q` | R: all; W: H |
| CRUD | `/job-roles/` | roles | R: all; W: H |
| CRUD | `/job-roles/{id}/skills/` | role skill requirements (`required_level, weight, is_must_have`) | R: all; W: H |
| CRUD | `/career-steps/` | allowed role transitions | R: all; W: H |
| GET | `/employees/{id}/skills/` | current self vs validated levels + history | E(own), M(team), H |
| POST | `/skill-assessments/` | self-assessment (`SELF`) or manager assessment | E (self), M (team) |
| GET | `/skill-assessments/` | filters: `employee, skill, status` ; managers see `PENDING` queue | scoped |
| POST | `/skill-assessments/{id}/validate/` | manager/H validates (optionally adjusts level) | M(team), H |
| POST | `/skill-assessments/{id}/reject/` | reject with reason | M(team), H |
| GET | `/skills/gaps/?employee=&target_role=` | gap analysis (see §8.2) | E(own), M(team), H |

Rules: assessment rows are append-only; validation triggers `recompute_employee_skill_current`; employees cannot validate themselves.

### 7.6 learning

| Method | Path | Purpose | Access |
|---|---|---|---|
| CRUD | `/courses/` | catalog; filter `skill, difficulty, format, q` | R: all; W: H |
| GET | `/learning/recommendations/?employee=&target_role=` | rule-based ranked courses with reasons | E(own), M(team), H |
| GET/POST | `/enrollments/` | list/enroll (self) or assign (manager/H) | scoped |
| POST | `/enrollments/{id}/progress/` | update `progress_pct` | owner |
| POST | `/enrollments/{id}/complete/` | mark complete (+certificate); notifies manager; may create a `SkillAssessment` request (source `CERTIFICATION`, status PENDING) | owner/M/H |

### 7.7 careers

| Method | Path | Purpose | Access |
|---|---|---|---|
| GET | `/careers/paths/?from_role=` | role graph from current role | all auth |
| GET | `/careers/readiness/?employee=&target_role=` | readiness status + reasons (see §8.3) | E(own), M(team), H |
| POST | `/careers/readiness/snapshot/` | persist snapshot | M, H |
| CRUD | `/development-plans/` | plans with items | E(own read + propose), M(team), H |
| POST | `/development-plans/generate/` | create a DRAFT plan from gaps + recommendations (rules) | M, H, E(own) |
| POST | `/development-plans/{id}/submit/` `approve/` `complete/` | workflow | per rules |
| CRUD | `/development-plans/{id}/items/` | plan items | M, H; E can propose |

### 7.8 feedback

| Method | Path | Purpose | Access |
|---|---|---|---|
| GET/POST | `/feedback/` | filters: `to_employee, type`; visibility rules enforced | scoped |
| POST | `/recognitions/` | peer recognition with badge | all auth |
| GET | `/badges/` ; POST/PATCH | badge catalog | R: all; W: H |
| CRUD | `/one-on-ones/` | meetings; `private_notes` visible only to manager | M, E |
| CRUD | `/one-on-ones/{id}/action-items/` | action items | M, E |

Rules: `PRIVATE_TO_MANAGER` feedback is never serialized for the employee; HR sees confidential feedback only if org policy allows (log access).

### 7.9 notifications

| Method | Path | Purpose |
|---|---|---|
| GET | `/notifications/` | paginated, filter `is_read` |
| POST | `/notifications/{id}/read/` | mark read |
| POST | `/notifications/read-all/` | mark all |
| GET | `/notifications/unread-count/` | badge count |
| GET/PATCH | `/notification-preferences/` | email on/off per type |

Create notifications for: cycle started, review due soon/overdue, goal approval needed/approved/rejected, assessment awaiting validation, review completed, feedback received, course assigned/completed, plan approved.

### 7.10 analytics (all read-only, cached)

| Path | Access | Returns |
|---|---|---|
| `/analytics/overview/` | H, X | headcount, active cycle %, overdue reviews, avg goal score |
| `/analytics/review-completion/` | H, M(team) | completion by status/department |
| `/analytics/performance-distribution/` | H, X | rating distribution, trend by cycle |
| `/analytics/skills-distribution/` | H, X | skill level counts by department |
| `/analytics/skill-shortages/` | H, X | skills most often below required level for target roles |
| `/analytics/training-effectiveness/` | H, X | completion rate, avg level change after course |
| `/analytics/readiness/` | H, X | counts per readiness status by role |
| `/analytics/nine-box/` | H, X | performance × potential grid (aggregated; groups < 5 suppressed for X) |
| `/analytics/team/` | M | team goal progress, pending reviews, skill gaps |
| `/reports/` (POST) / `/reports/{id}/` (GET) | H | async CSV/PDF export; job status + download link |

### 7.11 ai (feature-flagged)

| Method | Path | Purpose | Access |
|---|---|---|---|
| POST | `/ai/skill-gap-summary/` | narrative summary of a gap result | E(own), M, H |
| POST | `/ai/draft-development-plan/` | draft plan items | M, H |
| POST | `/ai/review-draft/` | draft manager review from authorized feedback + goals | M |
| POST | `/ai/assistant/query/` | whitelisted analytics questions | H, X |
| GET | `/ai/jobs/{id}/` | async job result | requester |

Rules: see `system_design.md §12`. Return `{ "draft": true, "content": "...", "sources": [...] }`. Never persist AI output to final records without an explicit user-confirmed save call.

### 7.12 audit

| GET | `/audit-logs/` | filters: `actor, action, entity_type, date range` | H only |

## 8. Domain Logic Reference (implement in `services.py` with unit tests)

### 8.1 Goal score
```
HIGHER_BETTER:  s = (current - start) / (target - start)
LOWER_BETTER:   s = (start - current) / (start - target)
s = clamp(s, 0, cap)           # cap from org settings, default 1.0
weighted = sum(w*s) / sum(w)   # ACTIVE/COMPLETED goals only
if target == start: s = 1.0 if current meets target else 0.0
```
Test cases: 8/10 → 0.8; lower-is-better 100→60 with target 50 and current 60 → 0.8; overshoot capped; zero weights → 0.

### 8.2 Skill gap
```
for each RoleSkill rs of target_role:
    v = validated_level(employee, rs.skill)  # None if absent
    gap = max(0, rs.required_level - (v or 0))
    status = UNVALIDATED if v is None else (MET if gap == 0 else GAP)
    priority = gap * rs.weight (+ must-have boost for sorting ties)
coverage = sum(min(v or 0, req) * weight) / sum(req * weight)
```
Response shape:
```json
{
  "employee": "uuid", "target_role": "uuid", "coverage": 0.72,
  "items": [
    { "skill": {"id":"…","name":"System Design"}, "required": 4, "validated": 2,
      "self": 3, "gap": 2, "weight": 5, "is_must_have": true, "status": "GAP", "priority": 10 }
  ],
  "unmet_must_haves": ["System Design"]
}
```
Test with the doc example: Python 4/4, SQL 3/4, System design 2/4, Communication 4/3 → gaps 0,1,2,0.

### 8.3 Readiness
Implement exactly as in `system_design.md §7.4`. Return:
```json
{ "status": "NEAR_READY", "coverage": 0.78,
  "criteria": [ { "name": "Must-have skills met", "passed": false, "detail": "System Design 2/4" }, ... ] }
```
Each criterion carries `passed` and a human-readable `detail`.

### 8.4 Recommendations
Follow `system_design.md §7.5`. Return `{ course, skill, reason, score }` sorted by `score`.

## 9. Audit Logging

`audit.services.log(actor, action, entity, before=None, after=None, request=None)` stores JSON diffs. Required actions (use constants): `USER_ROLE_CHANGED, REVIEW_TRANSITION, RATING_CHANGED, GOAL_APPROVED, SKILL_VALIDATED, DATA_EXPORTED, CONFIDENTIAL_FEEDBACK_VIEWED, AI_USED, ORG_SETTINGS_CHANGED, MANAGER_CHANGED`. Audit rows are never updated or deleted via the API.

## 10. Celery Tasks

Implement as in `system_design.md §10`. Requirements:
- Tasks accept primitive ids, re-fetch objects, are idempotent, and use `bind=True, max_retries=3, retry_backoff=True`.
- Dispatch with `transaction.on_commit(lambda: task.delay(...))`.
- Beat schedule defined in settings and also seeded via `django-celery-beat`.
- Email templates in `templates/emails/` with plain-text fallback.
- In tests use `CELERY_TASK_ALWAYS_EAGER=True`.

## 11. Testing Requirements

- **Unit:** every function in `services.py` (goal score, gap, readiness, recommendations, state machine).
- **API:** for every endpoint test (a) happy path, (b) 401 unauthenticated, (c) 403 wrong role, (d) 404 cross-tenant, (e) validation error shape.
- **Permissions matrix test:** parametrized test asserting the matrix in `system_design.md §8.1`.
- **Query count tests** on list endpoints.
- Fixtures via `factory_boy`; two organizations in the base test fixture to catch tenant leaks.
- Minimum coverage: 80% overall, 90% on services.

## 12. Seed Data (`manage.py seed_demo_data`)

Create one demo organization, 1 HR admin, 1 executive, 3 managers, ~25 employees across 4 departments; ~30 skills; ~8 roles with role skills (Junior → Software Developer → Senior → Tech Lead for Engineering); ~20 courses mapped to skills; one closed cycle with completed reviews and one active cycle; goals and goal updates; skill assessments (some PENDING); sample feedback and notifications. Include the "Rahul" scenario: Junior Python Developer with Python 4, SQL 3, System Design 2 targeting Senior Backend Developer. Print demo credentials. Command must be idempotent (`--reset` flag wipes demo org first).

## 13. Definition of Done (per feature)

- [ ] Models + migrations
- [ ] Selectors/services with type hints and docstrings
- [ ] Serializers with validation; OpenAPI annotated
- [ ] Permission classes + tenant scoping
- [ ] Audit + notification hooks where applicable
- [ ] Celery tasks if async needed
- [ ] Tests (unit, API, permissions) passing; coverage thresholds met
- [ ] Lint/format clean
- [ ] Endpoint documented in Swagger; example payloads included
- [ ] Short entry added to `CHANGELOG.md`

## 14. Do / Do Not

**Do**
- Ask when a requirement is ambiguous; list assumptions in the PR description.
- Keep PRs small and phase-scoped (see `phase_wise_prompts.md`).
- Prefer explicit over clever; write readable code.

**Do not**
- Put business logic in views, serializers, or signals.
- Trust client-supplied `organization`, `role`, `employee` ownership fields.
- Return another user's confidential fields "and let the UI hide them".
- Auto-promote, auto-rate, or auto-finalize anything based on AI or readiness status.
- Store secrets, tokens, or real employee data in the repo or fixtures.
- Edit applied migrations or silence failing tests.
- Introduce new infrastructure (message brokers, services) without approval.

## 15. Useful Commands

```
docker compose up --build
docker compose exec api python manage.py migrate
docker compose exec api python manage.py createsuperuser
docker compose exec api python manage.py seed_demo_data --reset
docker compose exec api pytest --cov=apps -q
docker compose exec api ruff check . && docker compose exec api black --check .
docker compose exec worker celery -A config inspect active
```

## 16. Handover Checklist When You Finish a Phase

1. Summarize what was built, endpoints added, and assumptions.
2. List any deviations from `system_design.md` and why.
3. Provide curl/Swagger examples for the new endpoints.
4. Note follow-ups or risks.
5. Confirm tests, lint, and migrations are clean.
