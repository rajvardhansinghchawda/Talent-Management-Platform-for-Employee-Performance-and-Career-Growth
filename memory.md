# Project Memory

## Project Overview
Talent Management Platform for Employee Performance and Career Growth: A multi-portal HR web platform connecting performance reviews, skill assessments, learning, and career planning into one continuous closed loop. Features role-based portals for Employee, Manager, HR Admin, and Executive with explainable ratings and career readiness insights.

## Current Architecture
- **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, React Hook Form, Zod, Recharts
- **Backend**: Django 5.x & Django REST Framework (DRF), modular monolith, PostgreSQL
- **Multi-Tenancy**: Single-organization mode active (multi-tenancy disabled per user decision; `BaseModel` provides UUID and timestamps without `organization` FK)
- **Async Processing**: Celery 5.x + Redis 7 + Celery Beat (`default`, `notifications`, `reports`, `ai` queues)
- **Authentication**: JWT access token + httpOnly refresh cookie (`djangorestframework-simplejwt`), `CookieTokenRefreshView` with token rotation
- **Authorization & Security**:
  - RBAC (`HR_ADMIN`, `MANAGER`, `EMPLOYEE`, `EXECUTIVE`), object-level permissions (`HasRole`, `IsSelf`), standard error format
  - `MustChangePasswordMiddleware`: Blocks all API endpoints except `/auth/me/`, `/auth/logout/`, `/auth/password/change/` when `must_change_password=True`.
  - Rate limiting via `LoginRateThrottle` and `PasswordResetRateThrottle`.
  - Last HR Admin protection: Demoting or deactivating the last HR Admin returns `409 state_conflict` (`LAST_HR_ADMIN`).
- **Organization & Hierarchy**:
  - `Department` model with parent-child tree, head mapping, cycle detection, and deletion protection (`HAS_EMPLOYEES`, `HAS_CHILDREN`).
  - `Employee` model with user link, manager hierarchy, and `ManagerHistory` timeline.
  - Cycle prevention for manager assignments and department parent assignments.
  - Asynchronous CSV employee import pipeline (`ImportJob` + Celery task `run_employee_import`).
- **API Spec**: DRF Spectacular OpenAPI 3.0 (`/api/schema/`, `/api/docs/`, `/api/redoc/`)
- **Design Pattern**: `views -> serializers (validation/presentation) -> services/selectors (business logic/queries) -> models`

## Important Decisions
- Multi-tenancy disabled per user decision ("multi tanant nhi banaye ge ise abhi ke liye").
- Single-organization backend architecture implemented using clean `BaseModel`.
- Refresh token delivered in httpOnly secure cookie with automatic rotation on refresh.
- Last HR Admin is protected from demotion or deactivation.
- Performance rating scale requires strictly consecutive integer values starting at 1.
- Department deletion strictly blocked if active employees or sub-departments exist.
- Reporting relationships prevent self-reporting or circular hierarchy.

## Current State
- **Phase 0 completed**: Project scaffolding, split settings, 14 apps, base models, Celery queues, Docker configuration, CI pipeline, and pure-python domain engines.
- **Phase 1 completed**: Auth endpoints, session cookie refresh, forced password change middleware, user management, typed organization settings, and audit trails.
- **Phase 2 completed**:
  - Departments tree (`/api/v1/departments/tree/`), CRUD, circular reference prevention, and deletion safeguards.
  - User and Employee atomic creation (`POST /api/v1/users/`), temporary password generation, and invite tokens.
  - Employee directory with privacy filtering (`/api/v1/employees/?scope=directory` hides phone, bio, compensation).
  - Employee self-service updates (`PATCH /api/v1/employees/me/` with strict whitelist).
  - Reporting hierarchy management (`POST /api/v1/employees/{id}/change-manager/`) with circular reference detection.
  - Manager history tracking (`ManagerHistory` model and `GET /api/v1/employees/{id}/manager-history/`).
  - Employee lifecycle: deactivation/reactivation with last HR Admin protection.
  - CSV Import engine: template download, preview with row validation, Celery background processor (`run_employee_import`), and progress tracking.
  - Management command `manage.py seed_demo_data [--reset]` seeding organization, departments, job roles, users, and employees (including Rahul).
  - Automated tests for employee hierarchy, cycle prevention, directory scoping, and CSV preview.

## Known Issues
- Remote git repository not configured yet; changes tracked locally on branch `master`.

## Pending Work
- Phase 3: Goals & KPI Tracking Engine (KPI/OKR metrics, directional scoring, progress updates, approval workflows, comments).
- Subsequent phases (4–9) per implementation blueprint.

## Interaction History

### 2026-11-01 22:54

**User Request**
> Continue with implementation (Phase 2: Organization Hierarchy, Departments Tree, Employee Directory, Hierarchy Management, and CSV Import).

**Exploration**
- Inspected Phase 2 requirements in `phase_wise_prompts.md` and `backend_agenthandover (1).md` §7.2, §7.3, §7.4.
- Formulated Department tree building, cycle prevention, deletion guards, atomic employee onboarding, and CSV import architecture.

**Work Done**
- Implemented Phase 2 Backend:
  1. Department Tree & Safeguards:
     - `get_department_tree()`: Builds nested hierarchical tree with `can_delete` calculation.
     - `validate_no_department_cycle()`: Prevents circular parent-child relationships.
     - `delete_department()`: Rejects deletion with `409 state_conflict` if active employees (`HAS_EMPLOYEES`) or children (`HAS_CHILDREN`) exist.
     - Endpoints: `GET /api/v1/departments/tree/`, `GET /api/v1/departments/`, `POST /api/v1/departments/`, `GET /api/v1/departments/{id}/`, `PATCH /api/v1/departments/{id}/`, `DELETE /api/v1/departments/{id}/`.
  2. Employee Management & Hierarchy:
     - Atomic creation: `POST /api/v1/users/` creates User + Employee atomically with `INVITE` or `TEMP_PASSWORD` mode.
     - Directory view: `GET /api/v1/employees/?scope=directory` returns active employees with public fields only (hiding phone, bio, compensation).
     - Self profile: `GET /api/v1/employees/me/` and `PATCH /api/v1/employees/me/` (strictly restricts editing to `preferred_name`, `phone`, `bio`).
     - Avatar management: `POST /api/v1/employees/me/photo/` and `DELETE /api/v1/employees/me/photo/`.
     - Hierarchy: `validate_no_manager_cycle()` detects and prevents self-reporting and indirect circular manager loops.
     - Manager assignment: `POST /api/v1/employees/{id}/change-manager/` updates manager, creates `ManagerHistory` record, and logs audit.
     - Manager history: `GET /api/v1/employees/{id}/manager-history/`.
     - Lifecycle: `POST /api/v1/employees/{id}/deactivate/` and `reactivate/` with last HR Admin safeguard.
     - Team scoping: `GET /api/v1/employees/{id}/team/` returns reports tree.
  3. Employee CSV Import Pipeline:
     - `GET /api/v1/employees/import/template/`: Downloads sample CSV template.
     - `POST /api/v1/employees/import/preview/`: Parses and validates CSV rows, reporting row-level errors without saving.
     - `POST /api/v1/employees/import/`: Creates `ImportJob` and triggers Celery task `run_employee_import`.
     - `GET /api/v1/employees/import/{job_id}/`: Tracks asynchronous job progress and errors.
     - Celery task `run_employee_import` in `apps/employees/tasks.py`.
  4. Seed Data Command:
     - Implemented `manage.py seed_demo_data [--reset]` creating Acme Corp, 5 departments, job roles, and demo users (HR, Executive, Manager, Rahul Sharma).
  5. Automated Testing:
     - `backend/apps/employees/tests/test_employees.py`: Comprehensive test suite for atomic creation, directory scoping, self-update whitelist, reporting tree access, manager cycle detection, employee deactivation/reactivation, department tree cycle prevention, department deletion guard, and CSV preview validation.
  6. Quality Verification:
     - Formatted and validated all 188 Python files with Ruff (0 errors).

**Files Changed**
- `backend/apps/employees/models.py`
- `backend/apps/employees/serializers.py`
- `backend/apps/employees/services.py`
- `backend/apps/employees/views.py`
- `backend/apps/employees/tasks.py`
- `backend/apps/employees/urls.py`
- `backend/apps/employees/admin.py`
- `backend/apps/employees/tests/test_employees.py`
- `backend/apps/organizations/services.py`
- `backend/apps/organizations/views.py`
- `backend/apps/organizations/urls.py`
- `backend/apps/accounts/user_urls.py`
- `backend/apps/accounts/views.py`
- `backend/apps/core/management/commands/seed_demo_data.py`
- `memory.md`

**Verification**
- `python -m ruff check backend`: Passed (0 errors).
- `python -m ruff format --check backend`: Passed (188 files verified formatted).
- Verified git status and staged changes.

**Response**
- Summarized Phase 2 implementation.
- Listed files changed, verification checks, and git commit details.

**Git**
- Branch: `master`
- Commit: Pending Phase 2 commit
- Push: None
- Status: Staged and ready

---

### 2026-11-01 22:48

**User Request**
> Continue with implementation (Phase 1: Auth, Sessions, RBAC, User Management, and Organization Settings).

**Exploration**
- Inspected Phase 1 requirements from `phase_wise_prompts.md` and `backend_agenthandover (1).md` §7.1 & §7.4.

**Work Done**
- Implemented Phase 1 Backend: auth endpoints, cookie refresh, forced password change middleware, user management with last HR admin guard, typed organization settings, and audit trails.

**Git**
- Branch: `master`
- Commit: `7c23480`
- Push: None
