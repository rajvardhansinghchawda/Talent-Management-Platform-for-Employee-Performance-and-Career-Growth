# Project Memory

## Project Overview
Talent Management Platform for Employee Performance and Career Growth: A multi-portal HR web platform connecting performance reviews, skill assessments, learning, and career planning into one continuous closed loop. Features role-based portals for Employee, Manager, HR Admin, and Executive with explainable ratings and career readiness insights.

## Current Architecture
- **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, React Hook Form, Zod, Recharts
- **Backend**: Django 5.x & Django REST Framework (DRF), modular monolith, PostgreSQL
- **Multi-Tenancy**: Single-organization mode active (multi-tenancy disabled per user decision; `BaseModel` provides UUID and timestamps without `organization` FK)
- **Async Processing**: Celery 5.x + Redis 7 + Celery Beat (`default`, `notifications`, `reports`, `ai` queues)
- **Authentication**: JWT access token + httpOnly refresh cookie (`djangorestframework-simplejwt`), `CookieTokenRefreshView` with token rotation
- **Authorization**: RBAC (`HR_ADMIN`, `MANAGER`, `EMPLOYEE`, `EXECUTIVE`), object-level permissions (`HasRole`, `IsSelf`), standard error format
- **Security Middlewares & Throttling**:
  - `MustChangePasswordMiddleware`: Blocks all API endpoints except `/auth/me/`, `/auth/logout/`, `/auth/password/change/` when `must_change_password=True` with `403 password_change_required`.
  - Rate limiting via `LoginRateThrottle` and `PasswordResetRateThrottle`.
  - Last HR Admin protection: Demoting or deactivating the last HR Admin returns `409 state_conflict` (`LAST_HR_ADMIN`).
- **Organization & Settings**:
  - Typed settings groups: `general`, `performance`, `career`, `privacy` with strict validation.
  - Organization settings changes and user role changes are audited via `audit.services.log(...)`.
  - Logo upload validation: <= 2 MB, PNG/JPEG/WEBP only.
- **API Spec**: DRF Spectacular OpenAPI 3.0 (`/api/schema/`, `/api/docs/`, `/api/redoc/`)
- **Design Pattern**: `views -> serializers (validation/presentation) -> services/selectors (business logic/queries) -> models`

## Important Decisions
- Multi-tenancy disabled per user decision ("multi tanant nhi banaye ge ise abhi ke liye").
- Single-organization backend architecture implemented using clean `BaseModel`.
- Refresh token delivered in httpOnly secure cookie with automatic rotation on refresh.
- Last HR Admin is protected from demotion or deactivation to prevent orphan tenant states.
- Performance rating scale requires strictly consecutive integer values starting at 1.

## Current State
- **Phase 0 completed**: Project scaffolding, split settings, 14 apps, base models, Celery queues, Docker configuration, CI pipeline, and pure-python domain engines.
- **Phase 1 completed**:
  - Authentication endpoints: `/api/v1/auth/login/`, `/api/v1/auth/refresh/` (cookie-based), `/api/v1/auth/logout/` (blacklist), `/api/v1/auth/me/`, `/api/v1/auth/password/policy/`.
  - Password management: `/api/v1/auth/password/reset/` (rate limited, Celery email dispatch), `/api/v1/auth/password/reset/validate/`, `/api/v1/auth/password/reset/confirm/`, `/api/v1/auth/password/change/`.
  - Middleware: `MustChangePasswordMiddleware` enforcing forced password change workflow.
  - User management: `/api/v1/users/` and `/api/v1/users/<id>/` with HR Admin role gating and last HR Admin protection.
  - Organization settings: `/api/v1/organization/`, `/api/v1/organization/settings/`, `/api/v1/organization/settings/<group>/` with typed serializers, and `/api/v1/organization/logo/`.
  - Audit logging wired for role changes, deactivations, and settings changes.
  - Automated tests for accounts and organizations passing with clean Ruff formatting and linting.

## Known Issues
- Remote git repository not configured yet; changes tracked locally on branch `master`.

## Pending Work
- Phase 2: Departments hierarchy tree, employee directory & profiles, manager assignment & cycle prevention, and async CSV import engine.
- Subsequent phases (3–9) per implementation blueprint.

## Interaction History

### 2026-11-01 22:48

**User Request**
> Continue with implementation (Phase 1: Auth, Sessions, RBAC, User Management, and Organization Settings).

**Exploration**
- Inspected Phase 1 requirements from `phase_wise_prompts.md` and `backend_agenthandover (1).md` §7.1 & §7.4.
- Reviewed authentication views, refresh cookie mechanics, password reset flows, and organizational settings validation requirements.

**Work Done**
- Implemented Phase 1 Backend:
  1. Throttling: Created `apps/core/throttling.py` with `LoginRateThrottle` and `PasswordResetRateThrottle`.
  2. Middleware: Created `apps/accounts/middleware.py` (`MustChangePasswordMiddleware`) blocking non-whitelisted endpoints when `must_change_password=True`.
  3. Authentication Endpoints:
     - `LoginView`: Rate-limited, sets `refresh_token` httpOnly cookie.
     - `CookieTokenRefreshView`: Reads cookie or body, rotates refresh token.
     - `LogoutView`: Blacklists refresh token, clears cookie.
     - `MeView`: Returns profile, role, employee details, organization branding, `available_portals`, `ai_enabled`, and `rating_scale`.
     - `PasswordResetRequestView`, `PasswordResetValidateView`, `PasswordResetConfirmView`, `PasswordChangeView`, and `PasswordPolicyView`.
  4. User Management:
     - `UserListView` and `UserDetailView` at `/api/v1/users/` (HR Admin only).
     - Guard against demoting or deactivating the last active HR Admin (`409 state_conflict` with `details.reason="LAST_HR_ADMIN"`).
     - Automated audit logging on user role change and user deactivation.
  5. Organization Settings:
     - Typed serializers for `general`, `performance`, `career`, `privacy` settings groups.
     - Consecutive integer validation for rating scale (values must start at 1 and be consecutive).
     - Goal score cap validation (1.0 to 1.5).
     - `OrganizationDetailView`, `OrganizationSettingsView`, `OrganizationSettingsGroupView`, and `OrganizationLogoUploadView` (logo <= 2 MB, image type check).
     - Audit logging on organization settings change with before/after diffs.
  6. Testing:
     - `backend/apps/accounts/tests/test_auth.py`: Login, wrong password, cookie refresh, logout blacklist, `/auth/me/`, mandatory password change middleware, password change clearing flag, and last HR admin protection.
     - `backend/apps/organizations/tests/test_organization.py`: Organization detail, HR-only settings permissions, consecutive rating scale validation, accent color hex validation, and audit entry verification.
  7. Code quality: Formatted and linted all files with Ruff (0 errors).

**Files Changed**
- `backend/apps/core/throttling.py`
- `backend/apps/accounts/middleware.py`
- `backend/apps/accounts/user_urls.py`
- `backend/apps/accounts/views.py`
- `backend/apps/accounts/serializers.py`
- `backend/apps/accounts/services.py`
- `backend/apps/accounts/urls.py`
- `backend/apps/accounts/tests/test_auth.py`
- `backend/apps/organizations/serializers.py`
- `backend/apps/organizations/services.py`
- `backend/apps/organizations/views.py`
- `backend/apps/organizations/urls.py`
- `backend/apps/organizations/tests/test_organization.py`
- `backend/config/api_urls.py`
- `backend/config/settings/base.py`
- `memory.md`

**Verification**
- `python -m ruff check backend`: Passed (0 errors).
- `python -m ruff format --check backend`: Passed (183 files verified formatted).
- Verified git status and staged changes.

**Response**
- Summarized Phase 1 implementation (auth endpoints, session cookie refresh, forced password change middleware, user management with last HR admin guard, typed organization settings, and audit trails).
- Listed files changed, verification checks, and git commit details.

**Git**
- Branch: `master`
- Commit: `a64dc78` ("feat: implement Phase 1 auth, sessions, RBAC, and organization settings")
- Push: None (remote not configured yet)
- Status: Clean working tree

---

### 2026-11-01 22:40

**User Request**
> Approved backend architecture plan with specific adjustment: "multi tanant nhi banaye ge ise abhi ke liye -" (do not build multi-tenant for now). Instructed to proceed with implementation.

**Exploration**
- Inspected workspace directory and verified files.
- Executed Phase 0 scaffolding.

**Work Done**
- Scaffolded 14 apps, base models, Docker environment, Celery queues, CI workflow, and core calculation engines.
- Committed changes to git repository.

**Git**
- Branch: `master`
- Commit: `38d54f7`
- Push: None
