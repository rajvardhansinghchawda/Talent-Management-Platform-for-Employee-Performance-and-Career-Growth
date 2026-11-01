# Phase-Wise Prompts — Talent Management Platform

> Copy one prompt at a time into Antigravity (or any coding agent). Finish and verify a phase before starting the next.
> Every prompt assumes the repo contains the six project docs. Always prepend the **Global Preamble** below.

---

## Global Preamble (prepend to every prompt)

```text
You are working on the Talent Management Platform (Next.js frontend, Django REST backend,
PostgreSQL, Redis + Celery).

Before doing anything:
1. Read project_description.md, system_design.md, rulesForAntigravity.md.
   For backend work also read backend_agenthandover.md.
   For frontend work also read frontend_all_portals_pages_description.md.
2. Restate the task and list assumptions. If something is ambiguous or conflicts with the docs, ask me.
3. Give a short plan (files to add/change, tests to write) before coding.
4. Implement in small commits following the rules file. Write tests with the code.
5. Run lint, type checks, and tests. Report the real results.
6. End with a handover note: what changed, endpoints/pages added, assumptions, deviations, risks,
   and how to run/test it.
Do not add new frameworks or services. Do not invent business rules.
```

---

## Phase Map

| Phase | Name | Output |
|---|---|---|
| 0 | Repo, Docker, scaffolding | Running empty stack, CI |
| 1 | Auth, RBAC, tenancy, app shell | Login + role-based layouts |
| 2 | Organization and employees | Directory, profiles, CSV import |
| 3 | Goals | KPI/OKR goals with scoring |
| 4 | Review cycles and reviews | Full review workflow |
| 5 | Skills, assessments, gap analysis | Gap reports |
| 6 | Learning, careers, development plans | Recommendations, readiness |
| 7 | Feedback, recognition, notifications | Celery-powered alerts |
| 8 | Analytics and reports | Dashboards, exports |
| 9 | AI assistance (optional) | Draft-only AI features |
| 10 | Hardening, E2E, deployment, demo | Release-ready build |

---

## Phase 0 — Repo, Docker, Scaffolding

**Backend prompt**

```text
PHASE 0 (backend): Scaffold the Django project.

Do:
- Create backend/ with config/settings/{base,dev,prod}.py, apps/ package, requirements split (base/dev/prod),
  ruff + black config, pytest config (pytest-django), .env.example.
- Create empty apps: core, accounts, organizations, employees, performance, skills, learning,
  careers, feedback, notifications, analytics, ai, audit (each with the standard file layout from backend_agenthandover.md §3).
- Configure DRF, simplejwt, drf-spectacular, django-filter, CORS allow-list, PostgreSQL via DATABASE_URL.
- Configure Celery (config/celery.py) with queues default/notifications/reports/ai and django-celery-beat. Add a ping task.
- Add /healthz and /readyz (DB + Redis checks).
- Implement core: TenantModel, StandardPagination, custom exception handler (standard error format), role permission classes.
- Add Dockerfile and docker-compose.yml with api, worker, beat, postgres, redis, mailhog.
- Add GitHub Actions workflow: lint + pytest with postgres/redis services.

Acceptance:
- docker compose up starts all services; /healthz returns 200; /api/docs/ loads.
- A test proves the exception handler returns the standard error format.
- CI passes.
```

**Frontend prompt**

```text
PHASE 0 (frontend): Scaffold the Next.js app.

Do:
- Create frontend/ with Next.js App Router + TypeScript (strict), Tailwind, shadcn/ui, TanStack Query,
  React Hook Form, Zod, Recharts, ESLint, Prettier, Vitest + Testing Library, Playwright config.
- Folder structure per frontend_all_portals_pages_description.md §3 (route groups (auth), employee, manager, hr, executive; src/components, src/lib/api, src/hooks, src/types).
- Add a typed API client (src/lib/api/client.ts) with base URL from NEXT_PUBLIC_API_BASE_URL, Bearer token injection,
  single refresh-and-retry on 401, and standard error parsing.
- Add QueryClientProvider, theme tokens (light/dark), base layout, toast system, and a placeholder landing page.
- Add Dockerfile and wire into docker-compose.

Acceptance:
- npm run lint, npm run typecheck, npm test all pass.
- App runs in Docker and can call the backend /healthz through the client.
```

---

## Phase 1 — Auth, RBAC, Tenancy, App Shell

**Backend prompt**

```text
PHASE 1 (backend): Implement authentication, RBAC, and tenancy.

Build (see backend_agenthandover.md §7.1, §7.2):
- Models: Organization, User (roles HR_ADMIN/MANAGER/EMPLOYEE/EXECUTIVE).
- Endpoints: /auth/login/, /auth/refresh/, /auth/logout/, /auth/me/, /auth/password/change/,
  /auth/password/reset/, /auth/password/reset/confirm/, /organization/ (GET/PATCH).
- Refresh token in httpOnly secure cookie; access token in response body; blacklist on logout.
- Rate limit login and reset endpoints via Redis.
- Password reset email via Celery task (mailhog in dev).
- Audit log model + audit.services.log; audit role changes and org settings changes.
- Typed validation for organization.settings (rating scale, goal cap, readiness thresholds).

Tests:
- Login success/failure, token refresh, logout blacklist, rate limiting, password reset flow.
- Permission tests per role; cross-tenant isolation test using two organizations.

Acceptance: all above endpoints documented in Swagger, tests green, coverage >= 85% for accounts/organizations.
```

**Frontend prompt**

```text
PHASE 1 (frontend): Implement auth flows and the role-based app shell.

Build (see frontend doc §4 Auth Portal and §5 shared shell):
- Pages: /login, /forgot-password, /reset-password, /change-password.
- Auth provider: in-memory access token, silent refresh on load, logout, /auth/me bootstrap.
- Route protection (middleware or layout guards) redirecting by role to /employee, /manager, /hr, /executive.
- App shell: sidebar (role-based nav), top bar (search placeholder, notifications bell placeholder, profile menu), breadcrumbs.
- Forbidden (403), not found (404), and error pages.

Tests: login form validation, redirect-by-role, token refresh retry, route guard behavior.
Acceptance: users of each role land on their own portal home (placeholder content) and cannot open other portals.
```

---

## Phase 2 — Organization and Employees

**Backend prompt**

```text
PHASE 2 (backend): Departments, job roles (basic), employees, manager hierarchy.

Build (backend_agenthandover.md §7.2, §7.3):
- Models: Department (tree), JobRole (basic fields only for now), Employee, ManagerAssignment.
- Endpoints: /departments/ CRUD; /users/ (HR creates user+employee, sends invite/temp password);
  /employees/ list/create/detail/update, /employees/me/, /employees/{id}/team/,
  /employees/{id}/change-manager/, /employees/{id}/manager-history/,
  /employees/import/ + /employees/import/{job_id}/ (Celery CSV import with row-level error report).
- Rules: prevent manager cycles; unique employee_code per org; directory view hides sensitive fields for non-HR;
  managers see only their reporting tree.
- Audit: manager changes and role changes.

Tests: cycle prevention, import with good/bad rows, visibility per role, cross-tenant 404.
Acceptance: seed_demo_data (initial version) creates org, departments, users, employees.
```

**Frontend prompt**

```text
PHASE 2 (frontend): Employee management UI.

Build:
- HR: /hr/employees (table with search, filters, pagination), /hr/employees/new, /hr/employees/[id] (profile tabs: Overview, Employment, Manager history),
  /hr/employees/import (CSV upload, progress, error table), /hr/departments (tree + CRUD).
- Manager: /manager/team (direct reports list), /manager/team/[id] (read-only profile).
- Employee: /employee/profile (view + edit allowed fields), /employee/directory (limited fields).
- Reusable components: DataTable (server pagination), FilterBar, EmployeeAvatar, ConfirmDialog, FormField set.

Tests: form validation, table filters, import error display.
Acceptance: each role can only reach pages/data permitted by the matrix; all states (loading/empty/error/forbidden) handled.
```

---

## Phase 3 — Goals

**Backend prompt**

```text
PHASE 3 (backend): Goals (KPI/OKR) with scoring.

Build (backend_agenthandover.md §7.4 Goals, §8.1):
- Models: Goal (parent hierarchy, weight, direction, status workflow), GoalUpdate.
- Endpoints: /goals/ CRUD, /goals/{id}/submit|approve|reject/, /goals/{id}/updates/ (GET/POST), /goals/score/.
- services.goal_score implementing the exact formula with cap and edge cases; return per-goal breakdown.
- Rules: only owner edits DRAFT; manager/HR approval; weight sum warnings; prevent circular parents.
- Notifications (create rows) for submit/approve/reject.

Tests: score unit tests (higher/lower better, overshoot cap, target==start, zero weights), permission tests, status transitions.
Acceptance: Swagger documents examples; score endpoint matches unit-test fixtures.
```

**Frontend prompt**

```text
PHASE 3 (frontend): Goals UI.

Build:
- Employee: /employee/goals (list with progress bars, status chips), /employee/goals/new, /employee/goals/[id] (details, update progress form with evidence link, history timeline, parent/child alignment).
- Manager: /manager/goals (team goals with filters), approval queue, create/assign goal for employee.
- Components: GoalCard, ProgressBar, GoalScoreSummary (shows per-goal contribution), AlignmentTree.
Tests: progress update form, approval actions, score summary rendering from API data.
Acceptance: the frontend only displays the score returned by the API; confirm dialogs on submit/approve.
```

---

## Phase 4 — Review Cycles and Reviews

**Backend prompt**

```text
PHASE 4 (backend): Review cycles and the review workflow.

Build (backend_agenthandover.md §7.4 Cycles/Reviews, system_design.md §7.2):
- Models: ReviewCycle, PerformanceReview, ReviewCompetencyRating.
- Endpoints for cycles (activate, start-calibration, close, progress) and reviews (self-assessment, manager-review, calibrate, acknowledge, dispute, reopen, history).
- Implement services.transition_review as an explicit state machine; invalid transition -> 409 state_conflict.
- Snapshot goal score on manager submit; lock after COMPLETED; employee sees manager rating only when status >= COMPLETED.
- Audit every transition and rating change.
- Celery: notify on cycle activation; beat tasks send due-soon and overdue reminders; flag overdue reviews.

Tests: full happy-path workflow, every invalid transition, role restrictions, rating-scale validation, reminders task.
Acceptance: parametrized test covers the entire transition table.
```

**Frontend prompt**

```text
PHASE 4 (frontend): Review UI.

Build:
- HR: /hr/review-cycles (list/create/edit), /hr/review-cycles/[id] (progress board by status, overdue list, activate/calibration/close actions), /hr/calibration (table to adjust and finalize ratings with comments).
- Employee: /employee/reviews, /employee/reviews/[id] (self-assessment wizard, final result view, acknowledge/dispute).
- Manager: /manager/reviews (pending list), /manager/reviews/[id] (goal score snapshot, self-assessment view, rating form, comments, submit).
- Components: StatusStepper (shows state machine), RatingInput with anchors, CompetencyRatingTable, ReviewTimeline.
Tests: wizard validation, correct buttons per status/role, dispute flow.
Acceptance: UI never offers an action the API would reject for that role/status.
```

---

## Phase 5 — Skills, Assessments, Gap Analysis

**Backend prompt**

```text
PHASE 5 (backend): Skills, role requirements, assessments, gap engine.

Build (backend_agenthandover.md §7.5, §8.2):
- Models: Skill, JobRole (complete), RoleSkill, CareerPathStep (basic), SkillAssessment (append-only), EmployeeSkillCurrent.
- Endpoints: skills, job-roles, role skills, /employees/{id}/skills/, /skill-assessments/ (+validate/reject), /skills/gaps/.
- Tasks: recompute_employee_skill_current on validation.
- services.compute_skill_gap with weights, must-have, coverage, UNVALIDATED status and optional provisional self levels per org setting.
- Extend seed_demo_data with skills, roles, role requirements and the Rahul scenario.

Tests: gap unit tests using the Rahul example (gaps 0,1,2,0), coverage math, unvalidated skills, append-only assessments, self-validation forbidden.
Acceptance: /skills/gaps/ returns sorted priority items plus unmet_must_haves.
```

**Frontend prompt**

```text
PHASE 5 (frontend): Skills UI.

Build:
- HR: /hr/skills, /hr/roles (role detail with requirement editor), career step editor.
- Employee: /employee/skills (self vs validated levels, add self-assessment with evidence), /employee/skill-gap (select target role -> radar chart + gap table with priority and reasons).
- Manager: /manager/skill-validation (queue with approve/adjust/reject), /manager/team/[id]/skills.
- Components: SkillRadarChart, GapTable, LevelSelector (1-5 with descriptions), ValidationBadge (Self / Validated / Unvalidated).
Tests: gap chart data mapping, validation actions.
Acceptance: clear visual distinction between self-reported and validated levels.
```

---

## Phase 6 — Learning, Careers, Development Plans

**Backend prompt**

```text
PHASE 6 (backend): Courses, recommendations, enrollments, career readiness, development plans.

Build (backend_agenthandover.md §7.6, §7.7, §8.3, §8.4):
- Models: Course, CourseSkill, Enrollment, DevelopmentPlan, DevelopmentPlanItem, ReadinessSnapshot.
- Endpoints: courses CRUD; /learning/recommendations/; enrollments (+progress/complete);
  /careers/paths/; /careers/readiness/ (+snapshot); /development-plans/ (+generate, submit, approve, complete, items).
- services.recommend_courses and services.compute_readiness exactly per system_design.md §7.4-7.5 with reasons.
- On enrollment completion: notify manager and create a PENDING skill assessment request (source CERTIFICATION).
- Beat task: weekly readiness snapshots.

Tests: recommendation ranking, readiness boundary cases (each criterion failing individually), plan generation from gaps, permissions.
Acceptance: readiness response always includes criteria list with passed + detail.
```

**Frontend prompt**

```text
PHASE 6 (frontend): Learning and career UI.

Build:
- Employee: /employee/learning (catalog + recommendations with reasons), /employee/learning/[courseId], /employee/enrollments, /employee/career (path graph + readiness card with criteria checklist), /employee/development-plan.
- Manager: /manager/team/[id]/development-plan (review/approve/edit items), assign course dialog.
- HR: /hr/courses (catalog CRUD with skill mapping).
- Components: CareerPathGraph, ReadinessCard, RecommendationCard (shows reason), PlanItemList.
Tests: readiness criteria rendering, recommendation reason display, plan approval flow.
Acceptance: readiness status is presented as advisory ("Ready for Review"), never as a promotion decision.
```

---

## Phase 7 — Feedback, Recognition, Notifications

**Backend prompt**

```text
PHASE 7 (backend): Feedback, recognition, one-on-ones, notifications.

Build (backend_agenthandover.md §7.8, §7.9):
- Models: Feedback, Badge, OneOnOne, ActionItem, Notification, NotificationPreference.
- Endpoints per spec; enforce visibility so PRIVATE_TO_MANAGER content never reaches the employee; private_notes manager-only.
- Notification service creating in-app rows for all events listed in §7.9; Celery email task honoring preferences and retrying.
- Audit access to confidential feedback by HR when policy allows.

Tests: visibility matrix for every feedback type and role, notification fan-out, email task idempotency/retry, preference opt-out.
Acceptance: serializers exclude confidential fields by construction (not by view logic).
```

**Frontend prompt**

```text
PHASE 7 (frontend): Feedback and notifications UI.

Build:
- Employee: /employee/feedback (received, request feedback), /employee/recognition (give/receive badges), /employee/one-on-ones.
- Manager: /manager/feedback (give feedback with visibility choice), /manager/one-on-ones (notes, action items).
- Shared: notification bell dropdown (unread count, polling or SSE-free refetch interval), /notifications page, settings page for notification preferences.
Tests: visibility selector, notification mark-read, action item updates.
Acceptance: UI clearly labels who can see each piece of feedback.
```

---

## Phase 8 — Analytics and Reports

**Backend prompt**

```text
PHASE 8 (backend): Analytics endpoints and async reports.

Build (backend_agenthandover.md §7.10):
- Selectors producing the aggregates listed; Redis cache with role- and tenant-specific keys and 5-15 min TTL; beat task refresh_analytics_cache.
- /reports/ POST creates async CSV/PDF export (Celery, reports queue), /reports/{id}/ polls status and returns download.
- Enforce manager scope (team only), executive aggregation with small-group (<5) suppression.
- Audit data exports.

Tests: aggregate correctness against seeded data, scope enforcement, suppression rule, cache key isolation.
Acceptance: dashboards respond < 500 ms on seeded data after cache warm.
```

**Frontend prompt**

```text
PHASE 8 (frontend): Dashboards and reports.

Build:
- HR dashboard, Manager dashboard, Executive dashboard, Employee dashboard (see frontend doc).
- /hr/analytics (tabs: Performance, Skills, Training, Readiness, Nine-box), /hr/reports (request + download list), /executive/* pages.
- Components: KpiCard, TrendLineChart, DistributionBarChart, HeatmapTable (skills x department), NineBoxGrid, ExportButton with job polling.
Tests: chart components render from fixtures, report polling states.
Acceptance: all charts have accessible labels/tables and handle empty data.
```

---

## Phase 9 — AI Assistance (Optional)

**Backend prompt**

```text
PHASE 9 (backend): AI features behind AI_ENABLED.

Build (system_design.md §12, backend_agenthandover.md §7.11):
- apps/ai LLM client interface with a provider adapter and a fake provider for tests.
- Endpoints: skill-gap-summary, draft-development-plan, review-draft, assistant/query (whitelisted selectors only), ai/jobs/{id}.
- Pipeline: authorize -> select minimal data -> redact -> build prompt -> call -> validate output -> return as draft with sources.
- AIRequestLog and audit entries; per-org opt-in setting; rate limits.
- Never write AI output to final records without an explicit user-confirmed save endpoint.

Tests: authorization (cannot summarize someone else's data), redaction, feature flag off -> 404/403, fake provider responses, logging.
Acceptance: no unauthorized data appears in any prompt (assert in tests).
```

**Frontend prompt**

```text
PHASE 9 (frontend): AI UI.

Build:
- "Generate summary" on the skill-gap page, "Draft plan" on development plans, "Draft review" on manager review, assistant panel for HR/Executive.
- AIDraftPanel component: shows an AI-generated label, editable text, sources/inputs used, Accept/Discard actions, loading and failure states.
Tests: draft is not saved until user confirms; feature hidden when AI disabled.
Acceptance: users can always see that content is AI-generated and edit it before saving.
```

---

## Phase 10 — Hardening, E2E, Deployment, Demo

**Combined prompt**

```text
PHASE 10: Hardening and release.

Do:
- Security review against OWASP Top 10: headers, CSRF/CORS, cookie flags, dependency audit, secrets scan, rate limits.
- Permission audit: generate a test that walks every route and asserts the matrix in system_design.md §8.1.
- Performance: add indexes per system_design.md §6.3, check query counts, load-test key endpoints on seeded data.
- E2E (Playwright): login by each role; goal update; full review cycle; skill validation; gap view; plan approval; analytics view.
- Accessibility pass (axe) on core pages.
- Production Docker images, prod settings, health checks, backup notes, environment variable documentation.
- Documentation: README (setup, architecture, demo script), API docs, CHANGELOG.
- Demo: seed_demo_data --reset produces the Rahul journey; write a 10-minute demo script.

Acceptance: CI green incl. E2E; fresh clone -> docker compose up -> seed -> demo journey works end to end.
```

---

## Reusable Prompt Snippets

**Bug fix**

```text
Bug: <describe, steps to reproduce, expected vs actual>.
First write a failing test that reproduces it, then fix it with the smallest change, then run all tests. Explain the root cause.
```

**Code review**

```text
Review the changes in <branch/files> against rulesForAntigravity.md and system_design.md.
Check: tenant isolation, permissions, business-rule placement, tests, error handling, security, naming.
List issues by severity with suggested fixes. Do not change code.
```

**Refactor**

```text
Refactor <module> to <goal> without changing behavior. Keep all existing tests passing, add tests where coverage is missing,
and keep the change set small. Summarize before/after.
```

**API contract sync**

```text
Regenerate the OpenAPI schema, update the frontend types and API client for the changed endpoints,
and list any breaking changes. Update affected pages and tests.
```
