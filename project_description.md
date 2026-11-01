# Project Description — Talent Management Platform for Employee Performance and Career Growth

## 1. One-Line Summary

A multi-portal HR web platform that connects **performance reviews, skill assessments, learning, and career planning** into one continuous loop, so employees know how to grow and organizations can make better-informed talent decisions.

## 2. Problem Statement

Many companies manage talent with spreadsheets, emails, and disconnected HR tools. As a result:

- Performance data lives separately from skills data.
- Managers cannot easily see which skills their team lacks.
- Employees receive feedback once a year and don't know what to learn next.
- HR cannot identify who is ready for the next role or where the organization has skill shortages.
- Reviews are inconsistent across managers and hard to audit.

## 3. Vision and Differentiator

Most HR tools record performance. This platform **acts on it**:

1. Measure performance against goals.
2. Identify validated skill gaps against a target role.
3. Recommend learning and build a development plan.
4. Reassess and show explainable career readiness.
5. Repeat every review cycle.

The differentiator is the **closed loop plus explainability**: every score, gap, readiness status, and recommendation shows *why*. AI and rules support decisions; people make them.

## 4. Target Users (Portals)

| Portal | User | Main goals |
|---|---|---|
| Employee | Individual contributors | See goals and progress, update skills, request feedback, follow a development plan, view career path |
| Manager | Team leads and managers | Set goals, review performance, validate skills, give feedback, recommend training and promotions |
| HR Admin | HR team | Manage organization structure, review cycles, skills/roles/courses, calibration, reports, policies |
| Executive | Senior management | View aggregated performance, skill shortages, readiness and succession insights |

Access is enforced by role-based access control (RBAC) with tenant isolation by organization.

## 5. Core Modules

1. **Employee Management** — profiles, departments, roles, managers, history, CSV import.
2. **Performance Management** — KPI/OKR goals with weights and cascading alignment, progress updates with evidence, review cycles, self-assessment, manager review, calibration, acknowledgement/dispute.
3. **Skills and Gap Analysis** — skill library, role requirements (level, weight, must-have), self vs validated assessments, gap and coverage calculation.
4. **Learning and Development** — course catalog, rule-based recommendations, enrollments, completion tracking, development plans.
5. **Career Growth** — role progression paths, readiness status (Developing / Near Ready / Ready for Review) with reasons.
6. **Feedback and Recognition** — manager and peer feedback, recognition badges, one-on-one notes and action items.
7. **Analytics and Reporting** — department performance, skill distribution, shortages, training effectiveness, readiness and nine-box summaries, exports.
8. **Notifications** — in-app and email alerts and reminders (Celery).
9. **AI Assistance (advanced, optional)** — draft summaries and plans, natural-language analytics, always as editable drafts.
10. **Audit and Security** — audit logs, privacy controls, confidential feedback handling.

## 6. Technology Stack

- **Frontend:** Next.js (App Router, TypeScript), Tailwind CSS, shadcn/ui, TanStack Query, React Hook Form + Zod, Recharts.
- **Backend:** Django + Django REST Framework (modular monolith), JWT auth.
- **Async:** Celery workers and Celery Beat with Redis as broker and cache.
- **Database:** PostgreSQL.
- **Infra:** Docker Compose, GitHub Actions CI.

## 7. Key User Journeys

### 7.1 End-to-end demo journey
1. HR creates an employee (Rahul, Junior Python Developer) and assigns a manager.
2. Manager creates three measurable quarterly goals; Rahul submits updates with evidence.
3. Rahul submits a self-assessment; the manager completes the review.
4. HR calibrates and finalizes the rating; Rahul acknowledges it.
5. Rahul's validated skills are compared against Senior Backend Developer requirements; the platform identifies SQL and System Design gaps.
6. Rahul receives ranked course recommendations with reasons and a draft development plan, which his manager approves.
7. Rahul completes the courses; the manager validates the improved skill levels.
8. Readiness moves from Developing → Near Ready; HR sees the change in analytics.

### 7.2 Manager journey
Dashboard → pending reviews and approvals → team goal progress → skill validation queue → give feedback → recommend development plan → open promotion review when employee is "Ready for Review".

### 7.3 HR journey
Configure organization and rating scale → import employees → define skills, roles, courses → launch review cycle → monitor completion and overdue items → calibrate → analyze → export reports.

### 7.4 Executive journey
Open dashboard → view department performance and skill shortages → review readiness and succession coverage → export summary.

## 8. Scope

### In scope (MVP)
- Authentication, RBAC, multi-tenant organization model.
- Employees, departments, manager hierarchy.
- Goals and progress, review cycles and review workflow.
- Skills, role requirements, assessments, gap analysis.
- Courses, recommendations, enrollments, development plans.
- Career paths and readiness.
- Feedback and recognition.
- Notifications and basic analytics.
- Audit logs.

### Later phases
- AI assistance and natural-language analytics.
- SSO, MFA enforcement, Slack/Teams integration.
- GitHub/Jira evidence integration, LMS integrations.
- Advanced succession planning and 360° surveys.

### Non-goals
- Payroll, attendance, leave management.
- Recruitment/ATS.
- Compensation or automatic promotion/termination decisions.
- Training an ML model from scratch.

## 9. Business Rules (Summary)

- Only **validated** skill levels drive gap and readiness; self-assessments are shown as provisional.
- Reviews follow a strict state machine and finalized ratings are locked; changes require HR reopen and are audited.
- Goal scores are weighted and capped (configurable), and cancelled goals are excluded.
- Readiness is explainable, threshold-based, and never triggers promotion automatically.
- Employees only see their own data; managers see their reporting tree; HR sees org-wide; executives see aggregates (small groups suppressed).
- Confidential manager feedback is never shown to the employee.
- AI outputs are drafts with an "AI-generated" label and require human approval.

## 10. Success Metrics

Defined clearly and interpreted in context (they indicate adoption and process health, not proof of causation):

- Review cycle completion rate and on-time rate.
- Goal achievement rate (weighted score distribution).
- Training completion rate.
- Average skill-gap reduction after learning.
- Share of employees with an approved development plan.
- Internal role movement and time-to-readiness.
- User satisfaction (manager and employee survey).

## 11. Non-Functional Expectations

- Security: server-side authorization everywhere, audit logging, OWASP Top 10 review.
- Privacy: data minimization, retention policy, alignment with applicable laws (e.g., DPDP Act 2023, GDPR).
- Performance: responsive dashboards via cached aggregates.
- Accessibility: WCAG 2.1 AA for core flows.
- Responsiveness: usable on mobile for employee tasks.
- Quality: automated tests, typed frontend, OpenAPI contract.

## 12. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Scope too large for the timeline | Build in phases; MVP = foundation, performance, skills and growth; analytics next; AI last |
| Cold start: empty skill/role library | Seed taxonomy and demo data; CSV import |
| Subjective or inconsistent ratings | Anchored rating scale, calibration step, audit trail |
| Privacy of sensitive data | RBAC, tenant isolation, field-level confidentiality, minimal AI data exposure |
| Bias in recommendations | Transparent rules, human review, no protected attributes, periodic review of outcomes |
| Two-codebase complexity | Typed API contract (OpenAPI), shared naming, thin frontend logic |

## 13. Glossary

- **KPI:** Key Performance Indicator, a measurable target.
- **OKR:** Objective and Key Results, a goal framework with a qualitative objective and measurable key results.
- **Skill gap:** shortfall between a role's required skill level and the employee's validated level.
- **Validated skill:** a level confirmed by a manager, assessment, or certification.
- **Calibration:** HR-led normalization of ratings across managers.
- **Readiness:** an explainable status of how close an employee is to a target role.
- **Nine-box:** a performance × potential grid used in succession planning.
- **RBAC:** Role-Based Access Control.
- **Tenant:** one organization's isolated data space.

## 14. Deliverable Documents

| File | Purpose |
|---|---|
| `project_description.md` | This document: what and why |
| `system_design.md` | Architecture, data model, domain logic, security |
| `backend_agenthandover.md` | Backend implementation spec for coding agents |
| `frontend_all_portals_pages_description.md` | Every portal and page, in detail |
| `phase_wise_prompts.md` | Ready-to-use prompts per build phase |
| `rulesForAntigravity.md` | Working rules for the AI coding agent |

## 15. Suggested Timeline (solo, part-time)

| Weeks | Focus |
|---|---|
| 1 | Decisions, ERD v2, wireframes, repo + Docker scaffold |
| 2–3 | Auth, RBAC, organizations, employees, app shell |
| 4–5 | Goals, review cycles, review workflow |
| 6–7 | Skills, assessments, gap analysis, learning, careers |
| 8 | Feedback, notifications, analytics, polish |
| 9–10 | AI (optional), hardening, deployment, documentation, demo |

The timeline is an estimate; adjust based on available time and polish level.
