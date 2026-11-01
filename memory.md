# Project Memory

## Project Overview
Talent Management Platform for Employee Performance and Career Growth: A multi-portal HR web platform connecting performance reviews, skill assessments, learning, and career planning into one continuous closed loop. Features role-based portals for Employee, Manager, HR Admin, and Executive with explainable ratings and career readiness insights.

## Current Architecture
- **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, React Hook Form, Zod, Recharts
- **Backend**: Django 5.x & Django REST Framework (DRF), modular monolith, PostgreSQL
- **Multi-Tenancy**: Single-organization mode active (multi-tenancy disabled per user decision; `BaseModel` provides UUID and timestamps without `organization` FK)
- **Async Processing**: Celery 5.x + Redis 7 + Celery Beat (`default`, `notifications`, `reports`, `ai` queues)
- **Authentication**: JWT access token + httpOnly refresh cookie (`djangorestframework-simplejwt`)
- **Authorization**: RBAC (`HR_ADMIN`, `MANAGER`, `EMPLOYEE`, `EXECUTIVE`), object-level permissions (`HasRole`, `IsSelf`), standard error format
- **API Spec**: DRF Spectacular OpenAPI 3.0 (`/api/schema/`, `/api/docs/`, `/api/redoc/`)
- **Design Pattern**: `views -> serializers (validation/presentation) -> services/selectors (business logic/queries) -> models`

## Important Decisions
- Multi-tenancy disabled for now per user feedback ("multi tanant nhi banaye ge ise abhi ke liye"); single-organization backend layout implemented using clean `BaseModel`.
- Backend architecture strictly modularized into 14 apps: `core`, `accounts`, `organizations`, `employees`, `performance`, `skills`, `learning`, `careers`, `feedback`, `notifications`, `analytics`, `ai_assistant`, `audit`, `reports`.
- Celery queues partitioned: `default`, `notifications`, `reports`, `ai`.
- Executive portal enforces small-group suppression ($N < 5$) to preserve employee anonymity (`apps.analytics.services.suppress_small_groups`).
- Goal progress and scoring engine (`apps.performance.goal_engine`) enforces directional formulas (`HIGHER_BETTER`, `LOWER_BETTER`) and weighted calculation.
- Skill gap analysis engine (`apps.skills.gap_engine`) calculates validated gaps, priority rankings, coverage percentage, and radar coordinates.

## Current State
- **Phase 0 completed**:
  - Django backend scaffolded (`backend/`), configuration with split settings (`base.py`, `dev.py`, `prod.py`).
  - All 14 apps scaffolded with standard structure (`models.py`, `serializers.py`, `services.py`, `selectors.py`, `views.py`, `urls.py`, `permissions.py`, `tasks.py`, `admin.py`, `apps.py`, `tests/`).
  - Core base models, pagination (`StandardPagination`), custom exception handler (standard error shape), and permission classes implemented.
  - Health checks `/healthz` and `/readyz` (PostgreSQL and Redis connectivity) configured.
  - Celery configuration with 4 queues, ping task, and notification email dispatch tasks.
  - Docker setup complete: `backend/Dockerfile`, root `docker-compose.yml` (`db`, `redis`, `mailhog`, `api`, `worker`, `beat`), validated with `docker compose config`.
  - GitHub Actions CI workflow created (`.github/workflows/ci.yml`).
  - 178 Python files formatted and validated cleanly with Ruff linter and formatter.

## Known Issues
- Remote git repository not configured yet; changes tracked locally on branch `master`.

## Pending Work
- Phase 1: Authentication, session management, password reset/change with forced change rule, `/auth/me/`, and user RBAC endpoints.
- Subsequent phases (2–9) per implementation blueprint.

## Interaction History

### 2026-11-01 22:40

**User Request**
> Approved backend architecture plan with specific adjustment: "multi tanant nhi banaye ge ise abhi ke liye -" (do not build multi-tenant for now). Instructed to proceed with implementation.

**Exploration**
- Inspected existing backend directory and verified previously generated model and service files.
- Verified Docker daemon status (running on WSL2/Docker Desktop) and Python tools.
- Checked configuration requirements for single-organization architecture.

**Work Done**
- Executed Phase 0 Backend Scaffolding:
  1. Configured single-tenant `BaseModel` (UUID + timestamps) in `apps/core/models.py`.
  2. Implemented all 14 apps with complete standard layout (`apps.py`, `models.py`, `serializers.py`, `selectors.py`, `services.py`, `views.py`, `urls.py`, `permissions.py`, `tasks.py`, `admin.py`):
     - `core`, `accounts`, `organizations`, `employees`, `performance`, `skills`, `learning`, `careers`, `feedback`, `notifications`, `analytics`, `ai_assistant`, `audit`, `reports`.
  3. Built domain engines:
     - `apps/performance/goal_engine.py`: KPI/OKR scoring formulas, directional progress clamping, weighted score calculation.
     - `apps/skills/gap_engine.py`: Validated skill gap engine, coverage percentage, priority calculation, server-generated why-it-matters explanations, radar chart axis pre-computations.
     - `apps/analytics/services.py`: Small-group suppression engine ($N < 5$) for executive analytics.
     - `apps/audit/services.py`: Centralized audit logging service (`audit.services.log`).
     - `apps/notifications/services.py`: Multi-channel notification creation with Celery email dispatch.
  4. Configured health checks:
     - `/healthz`: Liveness check.
     - `/readyz`: Database and Redis connectivity check.
  5. Configured Celery (`config/celery.py`) with 4 dedicated queues (`default`, `notifications`, `reports`, `ai`) and Celery Beat scheduler.
  6. Created Docker and environment files:
     - `backend/Dockerfile`: Python 3.12-slim multi-stage setup with dev/prod requirements.
     - `docker-compose.yml`: Root compose definition with PostgreSQL 16, Redis 7, MailHog, API, Worker, and Beat.
     - `backend/.env.example` and `backend/.env`.
     - `.gitignore`: Configured to exclude `.env`, `.ruff_cache`, media, and pycache.
     - `.github/workflows/ci.yml`: CI pipeline for linting, formatting, and pytest with PostgreSQL and Redis services.
  7. Formatted and validated all 178 Python files with Ruff (`ruff check` and `ruff format`).
  8. Created unit tests for goal calculation engine (`apps/performance/tests/test_goal_engine.py`).

**Files Changed**
- `backend/config/*` (`celery.py`, `urls.py`, `api_urls.py`, `wsgi.py`, `asgi.py`, `settings/{base,dev,prod}.py`)
- `backend/apps/core/*` (`models.py`, `pagination.py`, `exceptions.py`, `permissions.py`, `tasks.py`, `urls.py`, `apps.py`, `tests/test_exceptions.py`)
- `backend/apps/accounts/*` (`models.py`, `constants.py`, `serializers.py`, `services.py`, `selectors.py`, `views.py`, `urls.py`, `permissions.py`, `tasks.py`, `admin.py`, `apps.py`, `tests/test_auth.py`)
- `backend/apps/organizations/*` (`models.py`, `serializers.py`, `selectors.py`, `services.py`, `views.py`, `urls.py`, `admin.py`, `apps.py`)
- `backend/apps/employees/*` (`models.py`, `role_history.py`, `serializers.py`, `selectors.py`, `services.py`, `views.py`, `urls.py`, `admin.py`, `apps.py`)
- `backend/apps/performance/*` (`models.py`, `goal_engine.py`, `serializers.py`, `selectors.py`, `services.py`, `views.py`, `urls.py`, `admin.py`, `apps.py`, `tests/test_goal_engine.py`)
- `backend/apps/skills/*` (`models.py`, `gap_engine.py`, `serializers.py`, `selectors.py`, `services.py`, `views.py`, `urls.py`, `admin.py`, `apps.py`)
- `backend/apps/learning/*` (`models.py`, `serializers.py`, `selectors.py`, `services.py`, `views.py`, `urls.py`, `admin.py`, `apps.py`)
- `backend/apps/careers/*` (`models.py`, `serializers.py`, `selectors.py`, `services.py`, `views.py`, `urls.py`, `admin.py`, `apps.py`)
- `backend/apps/feedback/*` (`models.py`, `serializers.py`, `selectors.py`, `services.py`, `views.py`, `urls.py`, `admin.py`, `apps.py`)
- `backend/apps/notifications/*` (`models.py`, `services.py`, `tasks.py`, `serializers.py`, `selectors.py`, `views.py`, `urls.py`, `admin.py`, `apps.py`)
- `backend/apps/analytics/*` (`services.py`, `selectors.py`, `views.py`, `urls.py`, `admin.py`, `apps.py`)
- `backend/apps/ai_assistant/*` (`models.py`, `serializers.py`, `selectors.py`, `services.py`, `views.py`, `urls.py`, `admin.py`, `apps.py`)
- `backend/apps/audit/*` (`models.py`, `services.py`, `selectors.py`, `views.py`, `urls.py`, `admin.py`, `apps.py`)
- `backend/apps/reports/*` (`models.py`, `serializers.py`, `selectors.py`, `services.py`, `views.py`, `urls.py`, `admin.py`, `apps.py`)
- `backend/pyproject.toml`
- `backend/Dockerfile`
- `docker-compose.yml`
- `.gitignore`
- `.github/workflows/ci.yml`
- `memory.md`

**Verification**
- `python -m ruff check backend`: Passed (0 errors).
- `python -m ruff format --check backend`: Passed (178 files verified formatted).
- `docker compose config`: Successfully validated container configuration.
- `git status`: Verified untracked files and confirmed sensitive files (`backend/.env`) are properly ignored.

**Response**
- Summarized completion of Phase 0 scaffolding with single-organization mode.
- Listed core infrastructure, domain calculation engines, and Docker configuration.
- Outlined readiness to proceed to Phase 1 (Auth, RBAC, sessions, and password policy).

**Git**
- Branch: `master`
- Commit: `38d54f7` ("feat: scaffold Phase 0 backend infrastructure and domain engines")
- Push: None (remote not configured yet)
- Status: Clean working tree

---

### 2026-11-01 22:13

**User Request**
> Analyze `backend_agenthandover (1).md` which describes the backend for each portal. Completely design the backend using Django REST Framework, Celery, Redis, etc., portal-wise, and present the plan for user approval before starting implementation.

**Exploration**
- Inspected workspace directory and verified files (`backend_agenthandover (1).md`, `system_design.md`, `project_description.md`, `phase_wise_prompts.md`).
- Examined `backend_agenthandover (1).md` v2 specifications across all portals.
- Formulated interactive artifact blueprint.

**Work Done**
- Formulated a comprehensive Portal-Wise Backend Architecture and Implementation Blueprint.
- Created interactive artifact `backend_architecture_and_implementation_plan.md`.
- Updated `memory.md`.

**Verification**
- Verified artifact creation.

**Response**
- Restated task, listed assumptions, and presented artifact for user feedback.

**Git**
- Branch: `master`
- Commit: None
- Push: None
