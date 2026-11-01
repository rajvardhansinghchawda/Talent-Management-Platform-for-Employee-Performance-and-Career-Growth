# Talent Management Platform — UI Descriptions (Page by Page)

> **Purpose of this document:** Describe only what each existing page should look like. This is a visual/UI specification for a frontend design or coding agent. It covers page layouts, visible sections, cards, tables, charts, forms, navigation, responsive arrangement, and visible states.
>
> **Scope rule:** Use only the portals, pages, routes, and page sections listed in the supplied page inventory. Do not create additional pages, modules, or routes. Do not infer or add features that are not listed there.

---

# 1. Shared visual design

## 1.1 Overall application appearance

Create a polished, professional enterprise SaaS interface for a talent and performance management product. The visual style should feel calm, structured, modern, and information-rich without looking crowded. Use a consistent design language across all portals so that employees, managers, HR administrators, and executives recognize the same product even though their navigation and dashboards differ.

- Use a clean sans-serif typeface throughout.
- Use a restrained neutral background, white or subtly tinted content surfaces, and one primary accent color.
- Use semantic status colors for success, warning, danger, and information. Never communicate a status through color alone; pair it with a readable label and, where appropriate, an icon.
- Use consistent corner radii, card padding, borders, shadows, and spacing.
- Use an 8 px spacing rhythm. Keep the main content area within a readable maximum width of approximately 1280 px.
- Maintain a clear hierarchy: page title, short page description where appropriate, section headings, card titles, body text, and secondary metadata.
- Use icons consistently and avoid decorative icons that do not clarify meaning.
- Tables, forms, charts, tabs, dialogs, drawers, badges, and buttons should share consistent styling across portals.

## 1.2 Common authenticated app shell

Every authenticated portal uses the same overall shell, with role-specific navigation items.

**Desktop layout:**
- A fixed or sticky vertical sidebar sits on the left.
- The main application area sits to the right of the sidebar.
- A horizontal top bar spans the top of the main area.
- The page content begins below the top bar and uses a consistent left/right content margin.
- The sidebar can collapse to an icon-only rail. The selected navigation item has a visible active treatment.

**Sidebar appearance:**
- Show the product logo/name at the top.
- Show navigation links grouped in the order supplied for each portal.
- Each navigation item has an icon and a text label.
- Clearly distinguish active, hovered, and inactive items.
- Keep the sidebar visually quiet so the page content remains the focus.

**Top bar appearance:**
- Show the current page context where appropriate.
- Include a global search field or search trigger.
- Include a notification bell with an unread-count indicator.
- Include the profile avatar and profile menu.
- The profile menu contains the supplied options: My profile, Switch portal where relevant, Notification settings, Change password, and Sign out.

**Content header:**
- Show a clear page title.
- Where useful, show a short supporting sentence beneath the title.
- Place the main page action on the right side of the title row (for example, Add employee, New goal, or Export), when that action is listed for that page.
- Secondary actions should appear as quieter outline or text buttons.

**Shared UI elements:**
- Breadcrumbs appear on detail pages so users can identify where they are.
- Use cards to group related information.
- Use tabs for related page sections when the source specifies tabs.
- Use status chips for the supplied status labels.
- Use tables for dense, comparable records; use cards for mobile layouts.
- Use confirmation dialogs for important confirmation moments already specified in the page inventory.
- Use toast notifications for brief action feedback.

## 1.3 Common status visual treatments

Use consistent status chips throughout the product:

- **Goals:** Draft, Pending approval, Active, Completed, Cancelled.
- **Reviews:** Not started, Self-assessment, Manager review, Calibration, Completed, Acknowledged, Disputed.
- **Skills:** Self-reported, Validated, Unvalidated.
- **Readiness:** Developing, Near ready, Ready for review.
- **Development plans:** Draft, Pending approval, Active, Completed.

Each chip should have a compact pill shape, readable text, and a restrained semantic color. Include a small icon where it improves recognition.

## 1.4 Responsive layout

- The employee portal must remain comfortable to use on a phone.
- At narrow widths, the sidebar becomes a compact mobile navigation pattern while preserving the same destinations.
- Tables should become stacked cards below approximately 768 px. Each card must retain the field labels so the information remains understandable.
- Two-column layouts should stack vertically on mobile.
- Charts should resize without clipping labels. Where a chart is too dense for a small screen, use a simplified chart or its data-table alternative.
- Forms should become single-column on mobile.
- Keep primary actions easy to find and large enough to tap.
- Manager, HR, and executive pages should be optimized primarily for tablet and desktop, while still remaining usable on smaller screens.

## 1.5 Common visual states on data pages

Every data-driven page should have matching visual states:

- **Loading:** use skeleton cards, table-row skeletons, or chart placeholders that resemble the final layout.
- **Empty:** show a simple illustration or icon, a clear explanation that there is no content yet, and the relevant next action only when that page already has one.
- **Error:** show a compact error panel with a clear message and Retry action.
- **Forbidden:** show a restrained access-denied panel with a link back to the user's home portal.
- **No results:** when filters return no records, show a no-results message and a visible way to clear filters.

---

# 2. Auth portal

Auth pages use a focused layout without the authenticated sidebar or top bar. Keep the screen minimal and centered, with the product logo/name, a clear heading, a short explanatory sentence, the form, and any relevant secondary links.

## 2.1 Sign in — `/login`

**Page composition:**
- Use a full-height page with a subtle neutral background.
- Place a centered login card with a comfortable maximum width.
- The product logo/name sits above the form heading.
- Use the heading **Sign in** and a short line explaining that the user can access their talent management workspace.
- Show an email input with an email icon or clear label.
- Show a password input with a show/hide control inside the field.
- Place the primary **Sign in** button across the card width.
- Place the **Forgot password?** link below the password field or near the button.
- Keep spacing generous and avoid extra marketing sections.

**Visible feedback:**
- An invalid-credentials or locked/rate-limited message appears as a clearly visible alert above the form fields.
- Field labels remain visible; do not rely only on placeholders.
- The submit button has a visible loading treatment while sign-in is being processed.

## 2.2 Request password reset — `/forgot-password`

**Page composition:**
- Reuse the centered auth-card layout from the login page.
- Show a back-to-sign-in link near the top of the card.
- Heading: **Forgot password?**
- Supporting text explains that the user can enter their account email to receive a reset link.
- Include one email field.
- Include a full-width primary **Send reset link** button.

**Confirmation appearance:**
- After submission, show a neutral/success confirmation panel in the same card area.
- Use generic wording that does not reveal whether the email is associated with an account.
- Keep the return-to-sign-in link visible.

## 2.3 Set new password — `/reset-password?token=`

**Page composition:**
- Reuse the centered auth-card style.
- Heading: **Set a new password**.
- Supporting text briefly explains that the user is choosing a replacement password.
- Include a **New password** field with show/hide control.
- Include a **Confirm new password** field with show/hide control.
- Show compact password-strength hints beneath the new-password field.
- Include a full-width **Reset password** button.

**Invalid or expired link appearance:**
- Replace the form with a clear warning/information panel explaining that the reset link is invalid or expired.
- Show a **Request a new reset link** action.

## 2.4 Change password — `/change-password`

**Page composition:**
- Use the authenticated app shell when the user is signed in.
- Keep the content relatively narrow and position it near the top of the main content area.
- Heading: **Change password**.
- Use a single card containing three vertically stacked fields: Current password, New password, Confirm new password.
- Each password field has a show/hide control.
- Show password-strength hints beneath the new-password field.
- Place the primary **Update password** button below the fields.
- When this is a forced first-login change, show a compact information banner above the form explaining that the password must be changed before continuing.

## 2.5 Forbidden page — `/forbidden`

**Page composition:**
- Use a simple centered system-state layout without portal navigation being the visual focus.
- Show a lock or access-denied icon.
- Heading: **You don't have access to this page**.
- Add one short explanatory sentence.
- Show a primary or outline **Go to my home** button.
- Avoid exposing protected page details.

## 2.6 Not found page — `/not-found`

**Page composition:**
- Use the same centered system-state layout.
- Show a simple not-found illustration or icon.
- Heading: **Page not found**.
- Add a short sentence stating that the requested page could not be found.
- Show a **Go to my home** button.

## 2.7 Error boundary page

**Page composition:**
- Use the same system-state visual language as the forbidden and not-found pages.
- Show a warning/error icon.
- Heading: **Something went wrong**.
- Add a brief, non-technical explanation.
- Show a **Try again** action and a **Go to my home** action where appropriate.
- Keep technical stack traces and internal error details off the user-facing screen.

---

# 3. Shared authenticated pages and elements

## 3.1 Global app shell

Use the common authenticated shell described in Section 1.2. The sidebar items must match the exact portal navigation lists in Sections 4–7. Do not add new navigation destinations.

## 3.2 Global search

- Show a search field or search icon in the top bar.
- When opened, show a command-palette-style panel anchored centrally or beneath the search control.
- Show a search input at the top and grouped matching results below.
- For HR and managers, results relate to employees. For employees, results relate to courses and skills.
- Each result row uses a clear title and small secondary context such as department, role, skill category, or course provider.
- Keep the panel visually compact and keyboard-friendly.

## 3.3 Notification bell and dropdown

- Show a bell icon in the top bar with an unread-count badge when unread notifications exist.
- Clicking it opens a dropdown panel with the latest five notifications.
- Each notification row shows a short title, a one-line preview, a timestamp, and an unread indicator.
- Include a **View all** link to `/notifications`.
- The dropdown should have a compact empty state when there are no notifications.

## 3.4 Profile menu

- Show the user's avatar, or initials when no photo exists, with a small dropdown indicator.
- The dropdown contains: My profile, Switch to My Portal where relevant, Notification settings, Change password, and Sign out.
- Keep menu spacing and dividers consistent.

## 3.5 Notifications list — `/notifications`

**Page composition:**
- Use the authenticated shell.
- Page header: **Notifications**.
- At the top of the content area, show a compact filter row with **All** and **Unread** options.
- Include a **Mark all as read** action aligned to the right.
- Display notifications in a vertically stacked list or grouped cards.
- Each notification row contains an unread dot or visual marker, notification title, short description, date/time, and a related-item link when present.
- Use subtle separators between rows.
- The empty state should distinguish between no notifications and no unread notifications.

## 3.6 Notification settings — `/settings/notifications`

**Page composition:**
- Page header: **Notification settings**.
- Use one clean settings card with notification categories arranged in rows.
- Each row contains the notification category/name, a short description, and separate **Email** and **In-app** controls.
- Align controls in clear columns on desktop.
- On mobile, stack the category description above its controls.
- Keep settings visually simple; avoid adding unrelated account or organization settings here.

---

# 4. Employee portal (`/employee`)

## 4.1 Employee sidebar

Display the following navigation items in this exact order:

1. Dashboard
2. My Goals
3. My Reviews
4. My Skills
5. Skill Gap
6. Learning
7. Career
8. Development Plan
9. Feedback
10. Recognition
11. 1:1 Meetings
12. Directory
13. Profile

Use a distinct icon for each item while keeping icon style consistent.

## 4.2 Employee dashboard — `/employee`

**Purpose and overall layout:**
A personal overview page. Use a dashboard grid with the most important personal information at the top. Start with the page heading **My Dashboard** and a brief personalized greeting if the employee name is available.

**Top summary area:**
- Show a prominent **Goal progress** card with the weighted overall goal score.
- Include a compact progress visualization and the top three goals beneath it. Each goal summary shows its title, progress, and due date.
- Show an **Active review cycle** card with the cycle name, due dates, current review status, and a horizontal stepper.

**Middle area:**
- Show a **Top skill gaps** card containing up to three skills, each with current/required level and a small gap indicator.
- Show a **Recommended courses** section with two or three compact course cards. Each card displays course title, relevant skill, difficulty or duration, and the recommendation reason where space allows.
- Show a **Career readiness** card with the current readiness label and a short summary.

**Lower area:**
- Show **Recent feedback** as a compact list of the latest shared feedback entries.
- Show **Recognition** as small badge tiles or a compact badge row.
- Show **Upcoming 1:1s** with meeting date/time and participant.
- Show **Action items** as a short checklist-style list.

**Empty dashboard treatments:**
- If no target role is selected, the skill-gap/career area should display a clear prompt to choose a target role.
- If there is no active review cycle, the review card should read **No review in progress** and use a neutral empty-state treatment.

## 4.3 My Goals — `/employee/goals`

**Page header:**
- Title: **My Goals**.
- Place a **New goal** button at the top right.

**Filter area:**
- Show a review-cycle selector.
- Show a status selector.
- Keep filters in one compact horizontal row on desktop and stack them on mobile.

**Goals table:**
Display one row per goal with these columns:
- Goal title.
- Goal type.
- Weight.
- Progress bar and percentage.
- Due date.
- Status chip.
- Row action/open affordance.

**Visual details:**
- Use readable title text with smaller secondary type information if needed.
- Use a thin progress bar with the percentage displayed alongside it.
- Pending-approval goals show a small lock icon beside the status or title.
- Overdue goals use a visible warning treatment with text/icon, not color alone.

**Mobile:** Convert each row into a goal card. Show title/status first, progress next, then weight and due date.

## 4.4 Create goal — `/employee/goals/new`

**Page composition:**
- Breadcrumb: My Goals / New Goal.
- Page title: **Create a goal**.
- Use a single main form card, with clearly separated sections.

**Form layout:**
- Goal title: full-width text field.
- Description: full-width multiline text area.
- Goal type: selectable control for KPI, Objective, or Key Result.
- Metric unit: text/select field.
- Start value and target value: paired numeric fields.
- Direction: selectable control indicating the intended direction of improvement.
- Weight: numeric/percentage field.
- Due date: date picker.
- Parent goal: searchable selector for alignment.
- Review cycle: selector.

**Bottom actions:**
- Place **Save draft** as a secondary button.
- Place **Submit for approval** as the primary button.
- Keep both actions together at the bottom of the form; on mobile, stack or make them full width.

## 4.5 Edit goal — `/employee/goals/[id]/edit`

Use the same visual structure and field arrangement as Create Goal. Change the page heading to **Edit goal** and prefill the visible fields with the existing goal information. Keep the same bottom action placement and button hierarchy. Do not introduce additional fields beyond those on the create-goal form.

## 4.6 Goal detail — `/employee/goals/[id]`

**Page header:**
- Breadcrumb: My Goals / [Goal title].
- Show the goal title prominently.
- Place the current status chip near the title.
- Show the due date and goal type as secondary metadata.

**Main layout:** Use a two-column layout on desktop.

**Left/main column:**
- **Goal summary** card with description, type, weight, start value, target value, current value, and due date.
- **Progress over time** card with a line chart showing historical progress updates.
- **Update progress** card with a value field, short note area, and evidence-link field, plus a clear update button.
- **Update history** timeline showing each recorded progress update, date, value, note, and evidence link where present.

**Right/secondary column:**
- **Alignment** card showing the parent/child goal relationship as a simple tree.
- **Manager comments** card showing approval or rejection comments, with date and author.

**Visual states:**
- For a goal that is not active, the progress-update area should appear visibly disabled or replaced by a non-editable explanation.
- Keep completion confirmation visually distinct from ordinary progress updates.

## 4.7 My Reviews — `/employee/reviews`

**Page header:** **My Reviews** with a short description that reviews are organized by review cycle.

**Review-cycle cards:**
- Display one card per review cycle.
- Each card shows the cycle name and date range.
- Show the review status using the shared review status stepper.
- Include due-date information for the user's next action.
- Show one contextual action button per card: **Start self-assessment**, **View result**, or **Acknowledge**, according to the current visible state.

Use a responsive two-column card grid on desktop and a single-column list on mobile. Keep completed cycles visually quieter than cycles requiring action.

## 4.8 Review detail — `/employee/reviews/[id]`

**Page header:**
- Breadcrumb: My Reviews / [Cycle name].
- Show cycle name, review period, and current review status.
- Place the review status stepper near the top so the employee can see the current stage.

**Self-assessment view:** When the visible review stage is Self-assessment, show a four-step wizard with a clear step indicator.

- **Step 1 — Goal results:** show goal results as read-only rows/cards, including goal name, score snapshot, and notes.
- **Step 2 — Competency ratings:** show each competency as a separate row/card with its description and an anchored rating control.
- **Step 3 — Overall self-rating:** show the overall rating control and a large comments text area.
- **Step 4 — Review and submit:** show a read-only summary of all entered information, followed by the submit action.

Keep wizard navigation consistent with Back/Continue controls and show the current step clearly.

**Completed result view:** When the review is completed or later, show:
- A prominent final-rating card.
- Manager comments in a separate card.
- Goal-score snapshot.
- Competency comparison section with self-rating and manager-rating shown side by side.
- Development suggestions in a readable list.
- A review timeline showing status changes and dates.

**Bottom actions:** Show **Acknowledge** and **Dispute** as distinct actions when those actions are available. The dispute reason should appear in a focused dialog or inline form rather than adding another page.

## 4.9 My Skills — `/employee/skills`

**Page header:** **My Skills** with a short explanation that the list contains self-reported and validated skills.

**Main skills table:**
Columns:
- Skill name.
- Category.
- Self-assessed level.
- Validated level.
- Last validated date.
- Status badge.
- Row action to edit/view history.

Use small level indicators or labelled numeric levels so proficiency is easy to scan. Do not use color alone to distinguish levels.

**Add/update skill experience:**
- Show the add/update skill form in a dialog or side drawer.
- Include skill selection, a 1–5 level selector with descriptive labels, and an evidence note/link field.
- Make pending validation status visible near the relevant skill row.

**History drawer:**
- Show assessment history for the selected skill in a right-side drawer on desktop and a full-height sheet on mobile.
- Use a chronological timeline/list with date, level, source, and validation state.

## 4.10 Skill Gap — `/employee/skill-gap`

**Page header:** **Skill Gap Analysis** with a short explanation that current validated skills are compared with a selected target role.

**Top controls:**
- Place a **Target role** selector near the top of the page.
- Show the selected role name clearly beside or below the selector.

**Summary area:**
- Show a **Skill coverage** card with a percentage and a compact progress visualization.
- Show a **Must-have skills remaining** summary.

**Main visualization:**
- Use a large radar chart comparing **Required** and **Validated** skill levels.
- Include a small legend with clear labels and distinguishable line styles/markers.
- Provide an accessible tabular alternative below or adjacent to the chart.

**Gap table:**
Columns:
- Skill.
- Required level.
- Validated level.
- Self-assessed level.
- Gap.
- Weight.
- Status.
- Priority.

Sort the most important gaps near the top. Use a visible must-have marker and an unvalidated marker. Add small information tooltips for the **Why this matters** explanations.

**Learning call-to-action:**
- Place a clear **Recommended learning** action near the gap table or summary area.
- The optional AI summary panel, if included as part of the specified later phase, should appear as a clearly labelled side panel within this page, not as a separate page.

## 4.11 Learning — `/employee/learning`

**Page header:** **Learning** with a short description about recommended courses and available learning content.

**Tabs:**
- Recommended
- Catalog
- My Enrollments

Keep the tabs directly below the page header and maintain the same selected-tab treatment throughout.

**Recommended tab:**
- Display course recommendations as cards.
- Each card shows course title, provider, duration, difficulty, related skill, and a short recommendation reason.
- The reason should be visually prominent enough to explain why the course is relevant, for example, that it addresses a named skill gap.
- Include an **Enroll** action on each recommendation card.

**Catalog tab:**
- Place a search field above the results.
- Show filters for skill, difficulty, format, and duration.
- Display courses in a responsive card grid.
- Course cards show title, provider, skills taught, difficulty, format, and duration.
- Each card has a clear action to open its course detail.

## 4.12 Course detail — `/employee/learning/[courseId]`

**Page header:**
- Breadcrumb: Learning / [Course title].
- Show course title and provider.
- Show compact metadata for difficulty, format, and duration.

**Main layout:**
- Use a main content column and a narrower summary/action column on desktop.
- Main column: course description, learning overview, and skills taught.
- Skills section: list each skill with its starting and ending level range.
- Side column: provider link, key course metadata, and a prominent **Enroll** button.
- On mobile, stack the summary/action card beneath the course heading and above the description.

## 4.13 Enrollments — `/employee/enrollments`

**Page header:** **My Enrollments**.

**Enrollment list:**
- Show each enrolled course as a card or table row.
- Include course title, provider, related skill, enrollment date, progress bar, completion status, and certificate link where available.
- Place the progress percentage beside the progress bar.
- Show a clear **Update progress** action for in-progress courses.
- Show a **Mark complete** action for courses ready to be marked complete.
- Completed courses should have a quieter completed-state treatment while retaining the certificate link where present.

## 4.14 Career — `/employee/career`

**Page header:** **My Career** with a brief explanation that the page shows possible career progression.

**Career path visualization:**
- Place a horizontal or vertical career-path graph in the main upper section.
- Show the current role as the starting node.
- Show possible next roles as connected nodes.
- Make the selected target role visually distinct from other possible roles.
- Each role node should show its role title and level/track context where available.

**Readiness section:**
- Show a prominent readiness card with the status label: Developing, Near ready, or Ready for review.
- Include a criteria checklist beneath the status. Each row shows the criterion, pass/fail or met/not-met treatment, and a short detail.
- Make the criteria easy to scan and avoid using color alone.

**Target role control:**
- Show a target-role selector in a clearly labelled card or toolbar.
- Display the currently selected target role.

**Disclaimer:**
- Include the exact advisory message near the readiness card: “Readiness is advisory and reviewed by your manager and HR.”
- Present it as subdued informational text, not a warning.

## 4.15 Development Plan — `/employee/development-plan`

**Page header:** **My Development Plan**.

**Plan summary card:**
- Show target role.
- Show plan start date and target date.
- Show the development-plan status chip.
- Use a small progress summary if the plan contains progress information.

**Plan items section:**
- Display items in a table on desktop and stacked cards on mobile.
- Columns/fields: item type, related skill, due date, status, and rationale.
- Use a compact status chip for each item.
- Include a **Propose new item** action near the section heading.
- Each item should expose a clear progress action for the employee.

Keep the overall page focused on the selected plan and its items. Do not add separate learning or career pages here.

## 4.16 Feedback — `/employee/feedback`

**Page header:** **Feedback**.

**Top action:** Show a **Request feedback** button near the title.

**Feedback list:**
- Display received feedback as separate cards or a clean vertical list.
- Each entry shows the feedback type, author where visibility allows, date, and feedback text.
- Use a small type label to distinguish feedback categories.
- Keep entries with different visibility levels visually consistent while showing only content the employee is allowed to see.

**Filters:**
- Include type and date filters in a compact filter row.

**Request feedback dialog:**
- Show a modal with a colleague/manager selector and a short request-message field.
- Keep the dialog focused and compact.

## 4.17 Recognition — `/employee/recognition`

**Page header:** **Recognition** with a short subtitle about celebrating contributions and achievements.

**Give recognition area:**
- Show a visible **Give recognition** action near the top.
- Display a recognition dialog containing colleague selection, badge selection, and message field.

**Received badges:**
- Show received recognition as badge tiles/cards.
- Each tile shows the badge icon/artwork, badge name, sender, date, and message where available.

**Recognition wall:**
- Show organization-visible recognition items in a feed or responsive card grid.
- Keep the feed visually positive but professional; avoid oversized celebratory graphics that reduce readability.

## 4.18 1:1 Meetings — `/employee/one-on-ones`

**Page header:** **1:1 Meetings**.

**Upcoming meetings section:**
- List upcoming meetings with manager/participant name, date, time, and meeting status.
- Use compact meeting cards with a calendar or clock icon.

**Past meetings section:**
- Show previous meetings in a chronological list.
- Each row/card shows date, participant, and access to shared notes.

**Shared notes and action items:**
- Display shared notes in a readable text panel.
- Show action items in a checklist/table with item title, owner, due date, and status.
- Make the employee's own action items visually identifiable.
- Do not show manager-private notes anywhere in the employee interface.

## 4.19 Directory — `/employee/directory`

**Page header:** **People Directory** or **Directory**, matching the navigation label.

**Search and list:**
- Place a prominent search field above the directory list.
- Show employees in a table on desktop and compact profile cards on mobile.
- Visible fields: employee name, role/designation, department, and manager.
- Use an avatar or initials beside each employee name.
- Keep the displayed information limited and uncluttered.

## 4.20 Profile — `/employee/profile`

**Page header:** **My Profile**.

**Profile header card:**
- Show a larger avatar/photo or initials.
- Show preferred name, employee name, designation, and department.
- Use a clear **Edit profile** action for the fields that can be edited.

**Employment details section:**
- Present employment information in a two-column definition-list layout on desktop.
- Show read-only fields with clear labels and values.
- Keep editable personal fields visually distinguishable: photo, phone, bio, and preferred name.

**Account section:**
- Show a **Change password** link/action.
- Do not add unrelated profile sections beyond the listed information.

---

# 5. Manager portal (`/manager`)

## 5.1 Manager sidebar

Display these navigation items in this exact order:

1. Dashboard
2. My Team
3. Goals
4. Reviews
5. Skill Validation
6. Feedback
7. 1:1 Meetings
8. Development Plans
9. Team Analytics

A manager's personal Employee portal is accessed through **Switch to My Portal** in the profile menu; do not add a separate manager sidebar destination for it.

## 5.2 Manager dashboard — `/manager`

**Page header:** **Manager Dashboard** with the team name or department as supporting context where available.

**Pending actions strip:**
- Show four compact action cards: goal approvals, reviews due, skill validations, and development plans awaiting approval.
- Each card shows a count, a concise label, and a link/action to the relevant area.
- Use a subtle attention treatment for non-zero counts.

**Main dashboard grid:**
- **Team goal progress:** compact summary with an overall progress visualization and team-level breakdown.
- **Review cycle progress:** show a progress bar or stepper-style summary for the team's current cycle.
- **Top team skill gaps:** show a ranked short list of the most common gaps.
- **Career readiness:** show team-member counts or compact cards for Near ready and Ready for review.
- **Upcoming 1:1s:** show date, time, and employee for the next meetings.

Keep the first viewport focused on items requiring manager attention.

## 5.3 My Team — `/manager/team`

**Page header:** **My Team**.

**Filter/search row:**
- Search by employee name.
- Provide filters for role/department or review status where displayed by the source data.
- Keep the filter row compact.

**Team table:**
Columns:
- Employee.
- Role.
- Goal score.
- Review status.
- Readiness status.
- Open actions.

Show an avatar or initials beside each employee name. Use status chips for review and readiness. Keep the open-actions column compact, using an icon/button with a clear accessible label.

**Mobile:** Convert employee rows into cards with employee identity at the top and the score/status details below.

## 5.4 Team member detail — `/manager/team/[id]`

**Page header:**
- Breadcrumb: My Team / [Employee name].
- Show employee avatar, name, role, department, and current manager context.
- Keep the employee identity visible above the tabs.

**Tabs:** Overview · Goals · Reviews · Skills · Development Plan · Feedback · Career.

**Overview tab:**
- Show a profile summary card.
- Show current goal score as a prominent KPI card.
- Show latest performance rating.
- Show top skill gaps in a short list.
- Show career-readiness status in a readiness card.
- Use a balanced two-column grid for these summaries.

**Goals tab:**
- Show the employee's goals in a table/list with title, cycle, progress, due date, and status.

**Reviews tab:**
- Show review-cycle cards or a list with status, rating where visible, and review date.

**Skills tab:**
- Show skills in a table with employee-reported level, validated level, status, and last assessment date.
- Provide a compact assessment-history view and a **Validate** action for pending skills.

**Development Plan tab:**
- Show the employee's current development plan summary and plan items.
- Include actions to create a plan from identified gaps, edit plan items, and approve the plan where available.

**Feedback tab:**
- Show feedback entries for this employee according to the manager's visible permissions.
- Distinguish shared feedback from any other permitted manager view through clear labels.

**Career tab:**
- Show current role, target role, career path, and readiness criteria.
- Include a visible control to set or confirm the target role.
- Show **Flag ready for promotion review** as a distinct action. Present its result as a note/notification to HR; do not imply that promotion occurs automatically.

## 5.5 Goals — `/manager/goals`

**Page header:** **Team Goals**.

**Filter row:**
- Employee selector.
- Review-cycle selector.
- Status selector.
- Search field if the table requires it.

**Main content:**
- Show the team goals table with employee, goal title, type, weight, progress, due date, and status.
- Place an **Approval queue** section or tab prominently near the top.
- Pending goals in the queue should show employee, goal title, submitted date, and current status.
- Provide visible **Approve** and **Reject** actions on each pending goal.
- Show rejection comments in a focused dialog or inline area.
- Include an **Assign goal** action that opens a dialog with team-member selection and the goal details.

**Goal alignment view:**
- Provide a clear view or toggle to display how team goals roll up into parent goals.
- Use a tree/connected-card visual rather than a dense paragraph.

## 5.6 Reviews — `/manager/reviews`

**Page header:** **Team Reviews**.

**Review list:**
- Show reviews in a table grouped or filterable by status.
- Visible columns: employee, review cycle, current status, due date, and next action.
- Use the shared review status chip/stepper language.
- Make overdue self-assessments visually clear with an icon and text label.
- Include a **Send reminders** or bulk reminder action when overdue self-assessments are listed.

## 5.7 Review form — `/manager/reviews/[id]`

**Page header:**
- Breadcrumb: Reviews / [Employee name].
- Show employee name, role, review cycle, and current status.
- Show a compact review progress/status stepper below the heading.

**Desktop two-column composition:**

**Left column — employee context:**
- Employee self-assessment card with the employee's comments and submitted date.
- Goals section showing goal names, snapshot scores, and notes.
- Feedback section showing feedback the manager is authorized to view.

**Right column — manager review form:**
- Competency ratings displayed as clearly separated rows/cards.
- Each competency includes its name, descriptive anchor text, and rating control.
- Overall rating shown in a visually prominent section with the rating scale descriptions accessible nearby.
- Comments field as a large multiline text area.
- Development recommendations in a structured text/list area.

**Actions:**
- Place **Save draft** as a secondary action.
- Place **Submit to calibration** as the primary action.
- Show the optional AI draft panel within the manager form area only when that supplied feature is enabled. It should be labelled as AI-generated and visually separate from the manager's own final text.

## 5.8 Skill Validation — `/manager/skill-validation`

**Page header:** **Skill Validation** with a short explanation that this queue contains employee-submitted skills awaiting review.

**Pending validation table:**
Columns:
- Employee.
- Skill.
- Claimed level.
- Evidence.
- Source.
- Status/action.

**Row presentation:**
- Show employee avatar/name.
- Show the claimed proficiency level as a compact level indicator with a text label.
- Show evidence as a link or short preview.
- Use a pending status chip.
- Provide **Validate** and **Reject** actions.

**Validation interaction:**
- The validate dialog/drawer should show the claimed level, evidence, and an optional adjusted-level selector with a note field.
- The reject dialog should show a reason field.
- A bulk validation control may appear above the table for low-risk items, visually separated from individual row actions.

## 5.9 Feedback — `/manager/feedback`

**Page header:** **Team Feedback**.

**Give feedback area:**
- Show a clear **Give feedback** action near the page title.
- Use a dialog or side drawer containing employee selector, feedback type, feedback text, and a visibility selector.
- The visibility selector must include nearby helper text explaining who can see the feedback.

**Feedback history:**
- Display feedback records in a table or vertical list.
- Include employee, type, date, visibility label, and a short preview of the feedback text.
- Provide a clear way to view the full feedback entry.
- Include a small **Recognize** quick action where specified.

## 5.10 1:1 Meetings — `/manager/one-on-ones`

**Page header:** **1:1 Meetings**.

**Meeting list:**
- Show upcoming and past meetings in separate sections or tabs.
- Each meeting item shows employee, date, time, and meeting status.
- Include a **Schedule meeting** action near the page heading.

**Meeting detail area within the page:**
- Show shared notes in a clearly labelled editor/view panel.
- Show a separate private-notes panel with a prominent label: **Only you can see this**.
- Keep the private-notes panel visually distinct from shared notes.
- Show action items for both the manager and employee with owner, due date, and completion status.
- Show the recurring meeting template as a compact form/dialog when used.

## 5.11 Development Plans — `/manager/development-plans`

**Page header:** **Team Development Plans**.

**Plan overview:**
- Show a table/list of team members and their development plans.
- Visible information: employee, target role, plan dates, status, progress, and open action.
- Use status filters and a compact employee search.

**Pending approvals section:**
- Make plans awaiting approval easy to identify.
- Show plan summary and item count.
- Include **Review/Approve** actions.

**Assign course dialog:**
- Provide a course selector and the relevant employee/plan context.
- Keep the dialog focused on assigning a course to the selected development plan.

## 5.12 Team Analytics — `/manager/analytics`

**Page header:** **Team Analytics**.

**Dashboard layout:**
- Use a filter row at the top for review cycle and relevant team scope.
- **Goal progress distribution:** use a bar chart or distribution chart showing team goal progress.
- **Rating trend by cycle:** use a line chart with review cycles on the horizontal axis and rating trend on the vertical axis.
- **Team skill heatmap:** show team members or skill categories against proficiency levels using a readable heatmap table.
- **Training completion:** use a compact bar/donut visualization with completion counts or percentages.
- Add clear chart titles, legends, and axis labels. Keep the four analytics blocks visually consistent.

---

# 6. HR Admin portal (`/hr`)

## 6.1 HR sidebar

Display these navigation items in this exact order:

1. Dashboard
2. Employees
3. Departments
4. Review Cycles
5. Calibration
6. Skills
7. Roles
8. Courses
9. Analytics
10. Reports
11. Audit Logs
12. Settings

## 6.2 HR dashboard — `/hr`

**Page header:** **HR Dashboard** with a short organization-level overview description.

**KPI row:**
Show six compact KPI cards:
- Total employees.
- Departments.
- Active cycle completion percentage.
- Overdue reviews.
- Average goal score.
- Open skill validations.

Each card contains a clear label, large value, and small supporting context where available.

**Main dashboard grid:**
- **Review cycle progress by department:** horizontal progress bars or a grouped chart.
- **Organization-wide top skill gaps:** ranked list with skill names and compact gap indicators.
- **Readiness distribution:** chart or status-count cards for Developing, Near ready, and Ready for review.
- **Recent audit highlights:** compact chronological list with actor, action, and time.

**Quick actions:**
- Add employee.
- Launch cycle.
- Import CSV.

Place quick actions in a visible card or toolbar without competing with the KPI row.

## 6.3 Employees — `/hr/employees`

**Page header:** **Employees**.

**Primary actions:**
- **Add employee** button.
- **Import CSV** button.

**Filter/search toolbar:**
- Search employees.
- Department filter.
- Role filter.
- Manager filter.
- Employment status filter.

**Employees table:**
Columns:
- Employee.
- Employee code.
- Department.
- Job role/designation.
- Manager.
- Status.
- Row actions.

Show avatar/initials and employee name in the first column. Use status chips. The row action menu contains the supplied actions: view, edit, change manager, and deactivate.

**Mobile:** Convert rows into stacked employee cards with identity, department, role, status, and a visible actions menu.

## 6.4 Create employee — `/hr/employees/new`

**Page header:** Breadcrumb Employees / Add Employee; title **Add employee**.

**Form card sections:**

**Account details:**
- Email.
- Account role.

**Employment details:**
- Employee code.
- Department selector.
- Job role selector.
- Manager selector.
- Joining date.

**Profile details:**
- The profile fields supplied by the source employee/profile information.
- Keep the form grouped into clear sections with section headings.

**Footer actions:**
- Primary create/save action.
- Secondary cancel action.
- Show the invite or temporary-password option in the account section as a clearly labelled choice or information row.

Keep the form single-column or two-column by section on desktop; use one column on mobile.

## 6.5 Employee detail — `/hr/employees/[id]`

**Page header:**
- Breadcrumb Employees / [Employee name].
- Show avatar, employee name, employee code, role, department, and employment status.
- Place the main employee actions near the heading.

**Tabs:** Overview · Employment · Manager history · Reviews · Skills · Goals · Audit.

**Overview tab:**
- Show a compact identity/profile card.
- Show current role and department.
- Show manager information.
- Show concise performance and career summary cards where present in the employee record.

**Employment tab:**
- Display employment details in labelled rows or a two-column definition list.
- Keep the information clean and easy to scan.

**Manager history tab:**
- Show manager assignments as a chronological timeline or table with manager, start date, and end date.

**Reviews tab:**
- Show review cycles and review status/rating summaries in a table or card list.

**Skills tab:**
- Show the employee skill list with self-assessed level, validated level, and validation status.

**Goals tab:**
- Show the employee's goals with title, cycle, progress, due date, and status.

**Audit tab:**
- Show HR-visible activity history in a chronological table/list with action, actor, and timestamp.

## 6.6 Employee import — `/hr/employees/import`

**Page header:** Breadcrumb Employees / Import; title **Import employees**.

**Step-based layout:**
- Show a compact three-stage progress indicator: Download template, Upload CSV, Review import.
- **Template section:** short explanation and a **Download CSV template** button.
- **Upload section:** large bordered drag-and-drop area with upload icon, accepted file label, and a browse-file button.
- **Preview section:** show a table preview of uploaded rows before processing.
- **Import progress section:** show a progress bar and clear current status while the import is running.
- **Row-level errors:** show a table with row number, field, error message, and supplied row details. Include a **Download error file** action.

Keep each stage visually distinct while remaining on the same import page.

## 6.7 Departments — `/hr/departments`

**Page header:** **Departments** with an **Add department** action.

**Department hierarchy:**
- Display departments as a tree view with clear indentation and connector lines.
- Each node shows department name and department head where available.
- Show compact row actions for edit and delete.
- If drag-reordering is used, show a clear drag handle and restrained hover treatment.

**Create/edit department dialog:**
- Department name.
- Parent department selector where hierarchy is supported.
- Department head selector.
- Save and cancel actions.

**Delete confirmation:**
- Use a confirmation dialog that clearly identifies the department.
- When deletion is unavailable because employees are assigned, show an explanatory message instead of an enabled delete action.

## 6.8 Review Cycles — `/hr/review-cycles`

**Page header:** **Review Cycles** with a **Create review cycle** button.

**Review cycle list:**
- Show each cycle as a table row or card.
- Include cycle name, type, date range, included departments, status, completion percentage, and open action.
- Use clear status chips and progress bars.
- Keep draft, active, calibration, and closed cycles visually distinguishable.

**Create/edit cycle form:**
- Use a focused form page/dialog consistent with the existing route inventory.
- Fields: cycle name, cycle type, start/end dates, self-assessment deadline, manager-review deadline, included departments, and rating-scale reference.
- Group cycle timing fields together and department selection in its own section.

## 6.9 Review cycle detail — `/hr/review-cycles/[id]`

**Page header:**
- Breadcrumb Review Cycles / [Cycle name].
- Show cycle name, date range, status chip, and included departments.
- Place cycle-level actions in the top-right action area: Activate, Start calibration, and Close, as appropriate to the displayed cycle state.

**Progress board:**
- Show review statuses as columns or clearly separated groups.
- Each column heading includes the status and a count.
- Employee review cards show employee name, department/role, due date, and status.
- Keep cards compact so the board remains scannable.

**Overdue list:**
- Below or beside the progress board, show overdue reviews in a table with employee, review stage, due date, and reminder action.

**Confirmation dialogs:**
- For Activate, Start calibration, and Close, use distinct confirmation dialogs.
- The dialog should list the visible consequences in plain language before the final action.

## 6.10 Calibration — `/hr/calibration`

**Page header:** **Performance Calibration**.

**Calibration table:**
Columns:
- Employee.
- Manager.
- Self rating.
- Manager rating.
- Goal score.
- Proposed calibrated rating.
- Action.

Use compact rating indicators and consistent numeric/text treatment. Keep employee and manager names easy to identify.

**Rating distribution visualization:**
- Show rating distribution by department or manager in a chart beside or above the table.
- Use consistent axes, legend, and labels so differences in rating patterns are easy to compare.
- Avoid visually implying wrongdoing; the chart is for spotting differences in rating patterns.

**Adjust rating interaction:**
- Show the calibrated-rating selector and mandatory comment field in a dialog or side drawer.
- Include a clear employee/review summary at the top of the panel.
- Show **Finalize** as a visually significant action with a confirmation step.
- Show a **Reopen disputed review** action for relevant records.

## 6.11 Skills library — `/hr/skills`

**Page header:** **Skills Library**.

**Top actions:**
- **Add skill** button.
- **Import CSV** button.

**Skills table:**
Columns:
- Skill name.
- Category.
- Description or short summary.
- Usage indicator where available.
- Status.
- Row actions.

**Filters:** Category filter and search field.

**Add/edit skill dialog:**
- Skill name.
- Category.
- Description.
- Save/cancel actions.

**Bulk import area:**
- Use a compact upload dialog/panel with a CSV upload area and an import preview.
- For skills already used, show a deactivation-oriented status/action rather than a destructive delete presentation.

## 6.12 Roles — `/hr/roles`

**Page header:** **Job Roles** with an **Add role** action.

**Role list:**
- Show roles grouped or filterable by track and level.
- Each row/card shows role title, track, level, department where applicable, and number of employees currently in the role.
- Include a clear action to open role detail.
- Keep filters for track and level near the top.

## 6.13 Role detail — `/hr/roles/[id]`

**Page header:** Breadcrumb Roles / [Role title]; show role title, track, and level.

**Role description section:**
- Display the role description in a readable text card.
- Show minimum months in role as a compact metadata item.

**Requirements editor:**
- Present skill requirements in a table.
- Columns: skill, required level, weight, and must-have indicator.
- Provide inline or dialog-based editing with clear controls.

**Career steps editor:**
- Show next roles as connected cards or a simple career progression tree.
- Make the relationship between the current role and next roles visually clear.

**Employees in this role:**
- Show a compact employee list/table with name and department.

## 6.14 Courses — `/hr/courses`

**Page header:** **Course Catalog** with an **Add course** action.

**Filter/search row:**
- Search courses.
- Filter by skill.
- Filter by difficulty.
- Filter by format.
- Filter by active status.

**Course table or card list:**
- Course title.
- Provider.
- Mapped skills.
- Difficulty.
- Format.
- Duration.
- Active/inactive status.
- Usage statistics.
- Row actions.

**Create/edit course form:**
- Course title and description.
- Provider.
- Format.
- Difficulty.
- Duration.
- Skill mapping section with skill selector and from-level/to-level controls.
- Active toggle.

**Usage stats:**
- Show enrollment count and completion rate as compact metrics on each course row or in its expanded detail area; do not create a separate page for them.

## 6.15 Analytics — `/hr/analytics`

**Page header:** **HR Analytics**.

**Global filter row:**
- Department.
- Role.
- Review cycle.
- Date range.
- Export current view action.

**Tabs:** Performance · Skills · Training · Readiness · Nine-box.

**Performance tab:**
- Rating distribution chart.
- Performance trend chart over review cycles.
- Use clear legends and labels.

**Skills tab:**
- Skills-by-department heatmap.
- Skill shortage list/ranking.
- Show the data labels and legend needed to interpret levels.

**Training tab:**
- Course/training completion visualization.
- Training effectiveness summary.
- Use concise metric cards and charts.

**Readiness tab:**
- Readiness status by role.
- Internal mobility pipeline visualization.
- Show status counts and clear labels.

**Nine-box tab:**
- Show the nine-box grid with labelled axes.
- Use aggregated counts in each cell.
- Include a suppression indicator where small groups are hidden or combined.

Keep all tabs visually consistent and preserve the global filter placement when switching tabs.

## 6.16 Reports — `/hr/reports`

**Page header:** **Reports**.

**Request report card:**
- Report type selector.
- Filters area for the selected report.
- Format selector for CSV or PDF.
- Primary **Generate report** button.

**Report jobs table:**
Columns:
- Report name/type.
- Requested date.
- Format.
- Status.
- Download action.

**History:**
- Show previous report requests in a chronological table/list.
- In-progress jobs show a progress/status indicator.
- Completed jobs show a visible download link/action.
- Failed jobs show a compact error status and the available retry affordance.

## 6.17 Audit Logs — `/hr/audit-logs`

**Page header:** **Audit Logs** with an **Export** action.

**Filter bar:**
- Actor.
- Action.
- Entity.
- Date range.
- Search where appropriate.

**Audit table:**
Columns:
- Date/time.
- Actor.
- Action.
- Entity/record.
- Summary.
- Detail/open action.

**Detail drawer:**
- Show the selected audit event's actor, timestamp, action, and affected entity.
- Show before/after differences in a two-column comparison layout.
- Use labels and subtle highlighting to distinguish changed values.
- Keep the drawer read-only.

## 6.18 Settings — `/hr/settings`

**Page header:** **Organization Settings**.

Use a settings-page layout with a vertical section navigation or clearly separated stacked cards. Keep all supplied settings on this one page; do not create separate settings pages.

**Organization section:**
- Organization name.
- Basic branding fields.

**Performance section:**
- Rating scale configuration.
- Rating anchor descriptions.
- Goal score cap.
- Goal weight rules.
- Goal approval requirement control.

**Career section:**
- Readiness thresholds.
- Setting that controls whether self-assessed skills appear as provisional.

**Privacy section:**
- Confidential feedback visibility policy.
- AI enablement toggle.
- Retention notes.

**Users and roles section:**
- Role assignment list/table.
- Controls to manage role assignments.
- Visually protect the last HR administrator account from removal.

Use clear section headings, short helper descriptions, aligned labels, and a consistent Save action for each settings group or for the page, matching the existing product style.

---

# 7. Executive portal (`/executive`)

## 7.1 Executive sidebar

Display these navigation items in this exact order:

1. Dashboard
2. Performance
3. Skills & Shortages
4. Readiness & Succession
5. Reports

## 7.2 Executive dashboard — `/executive`

**Page header:** **Executive Dashboard** with a short organization-performance summary.

**KPI row:**
- Headcount.
- Average goal score.
- Review completion.
- Training completion.
- Percentage of employees Near ready or Ready for next role.

Use large readable values with concise labels and small supporting context.

**Charts grid:**
- Performance by department.
- Top skill shortages.
- Readiness pipeline.
- Trend over review cycles.

Use a clean two-column chart grid on desktop and stack charts on smaller screens. Each chart must have a title, readable labels, and a legend where needed. Keep the dashboard aggregated and strategic rather than showing individual employee details.

## 7.3 Performance — `/executive/performance`

**Page header:** **Organization Performance**.

**Main visualizations:**
- Rating distribution by review cycle.
- Rating trend across review cycles.
- Department comparison chart.
- Goal achievement rates.

Use consistent rating labels and department names. Place visualizations in separate cards with clear headings and enough space for the chart labels.

**Small-group display treatment:**
- Show only aggregated data.
- When a group has fewer than five people, suppress or merge it.
- Display an information tooltip or inline note explaining why some groups are hidden or combined.
- Do not display individual employee names or individual review records on this page.

## 7.4 Skills & Shortages — `/executive/skills`

**Page header:** **Skills & Shortages**.

**Main content grid:**
- **Skill distribution heatmap:** show skills against departments with a clear proficiency legend.
- **Shortage ranking:** ranked list of skills most often below role requirements, with a compact severity/shortage indicator.
- **Training effectiveness:** chart or metric card showing the supplied training-effectiveness view.
- **Workforce-development focus areas:** concise list of suggested focus areas based on the displayed shortages.

Keep the page strategic and aggregated. Use explanatory labels so an executive can understand each chart without technical knowledge of the underlying skill model.

## 7.5 Readiness & Succession — `/executive/readiness`

**Page header:** **Readiness & Succession**.

**Readiness summary:**
- Show readiness status counts by role and department.
- Use compact cards or stacked bars for Developing, Near ready, and Ready for review.

**Critical-role bench strength:**
- Show critical roles and the number of Near-ready/Ready candidates for each.
- Use a clear role label and candidate-count visualization.

**Nine-box summary:**
- Show an aggregated nine-box grid with labelled axes and counts.
- Use no individual employee names.

**Internal mobility trends:**
- Show a trend chart or compact summary visualization of internal mobility over time.

Keep this page focused on succession depth and workforce readiness at an aggregate level.

## 7.6 Reports — `/executive/reports`

**Page header:** **Executive Reports**.

**Pre-defined reports section:**
- Display available executive summaries as report cards or a clean table.
- Each item shows report name, short description, available format, and download action for PDF/CSV where available.

**Request history:**
- Show prior report requests in a table with report name, requested date, status, and download action.

**Scheduled reports:**
- The source describes scheduled reports as a future capability.
- If this area is shown as part of the supplied page design, present it as a clearly labelled future/coming-soon section only; do not create a separate page or imply the feature is already active.

---

# 8. Shared component appearance reference

Use these visual patterns consistently wherever the corresponding component appears in the pages above.

## 8.1 Data table

- Clear column headers with consistent alignment.
- Comfortable row height and subtle dividers.
- Sort indicators in sortable headers.
- Pagination at the bottom.
- Filter controls above the table.
- Row actions aligned consistently at the far right.
- Mobile version becomes labelled cards rather than a horizontally compressed table.

## 8.2 Filter bar

- Search field first when the page has search.
- Select filters grouped beside it on desktop.
- Clear/reset control visible when filters are applied.
- On mobile, filters wrap or stack without overlapping page actions.

## 8.3 Status chip

- Small pill-shaped label.
- Semantic color plus readable status text.
- Optional icon for quick recognition.
- Consistent size and capitalization throughout the application.

## 8.4 Status stepper

- Horizontal stepper on desktop and a compact vertical or scrollable version on mobile.
- Each step shows a label and optional date/time.
- Completed, current, and upcoming stages are visually distinct.
- Do not rely on color alone; use check marks and labels.

## 8.5 Rating input

- Use the organization's rating scale.
- Display the numeric/labelled rating clearly.
- Make anchor descriptions available beside the control or in a hover/focus tooltip.
- Keep rating choices evenly spaced and easy to select.

## 8.6 Skill level selector

- Show levels 1–5 with descriptive labels.
- Use a segmented selector or five-step control.
- Keep the selected level visibly distinct.
- Make the meaning of each level available through text or helper descriptions.

## 8.7 Skill radar chart

- Compare required and validated levels.
- Use a legend with explicit series names.
- Avoid overly dense labels; allow wrapping or a table alternative.
- Include a readable data-table alternative for accessibility.

## 8.8 Gap table

- Sort important gaps near the top.
- Make must-have skills visually identifiable.
- Make unvalidated skill levels visibly provisional.
- Keep current, required, and gap values aligned for comparison.

## 8.9 Readiness card

- Show the readiness status prominently.
- Include coverage/summary information where provided.
- Show a criteria checklist with clear met/not-met indicators and supporting details.
- Keep advisory context visible where specified.

## 8.10 Recommendation card

- Show course title and provider.
- Show relevant skill, duration, and difficulty.
- Explain the recommendation reason in a short readable line.
- Place the Enroll action in a consistent position.

## 8.11 Goal card and progress bar

- Show goal title, type, weight, status, and due date.
- Display a labelled progress bar and percentage.
- Use warning text/icon for overdue items.

## 8.12 Alignment tree

- Display parent and child goals as connected nodes/cards.
- Use indentation and connector lines to communicate hierarchy.
- Keep labels readable when the tree is narrow.

## 8.13 Nine-box grid

- Use a clear 3×3 grid.
- Label both axes.
- Show aggregated counts in each cell where the page requires aggregation.
- Include a clear note/indicator when a group is suppressed.

## 8.14 Confirmation dialog

- Use a clear title describing the action.
- Explain the consequence in plain language.
- Keep Cancel visually secondary and the confirming action visually primary or destructive as appropriate.
- Do not make the dialog excessively wide.

## 8.15 AI draft panel

- Clearly label the content as AI-generated.
- Show the editable draft in a bordered panel.
- Show its source/context references where supplied by the page.
- Provide **Accept** and **Discard** actions.
- Keep it visually separate from the user's own final content.

## 8.16 Toast

- Use a compact floating message with a status icon, short text, and optional dismiss control.
- Do not cover primary form controls or important content.
- Use accessible announcement behavior.

---

# 9. Page inventory checklist — do not add pages

Use this checklist to confirm that the UI work covers the supplied page inventory only.

## Auth and shared
- [ ] `/login`
- [ ] `/forgot-password`
- [ ] `/reset-password?token=`
- [ ] `/change-password`
- [ ] `/forbidden`
- [ ] `/not-found`
- [ ] Error boundary page
- [ ] `/notifications`
- [ ] `/settings/notifications`

## Employee
- [ ] `/employee`
- [ ] `/employee/goals`
- [ ] `/employee/goals/new`
- [ ] `/employee/goals/[id]/edit`
- [ ] `/employee/goals/[id]`
- [ ] `/employee/reviews`
- [ ] `/employee/reviews/[id]`
- [ ] `/employee/skills`
- [ ] `/employee/skill-gap`
- [ ] `/employee/learning`
- [ ] `/employee/learning/[courseId]`
- [ ] `/employee/enrollments`
- [ ] `/employee/career`
- [ ] `/employee/development-plan`
- [ ] `/employee/feedback`
- [ ] `/employee/recognition`
- [ ] `/employee/one-on-ones`
- [ ] `/employee/directory`
- [ ] `/employee/profile`

## Manager
- [ ] `/manager`
- [ ] `/manager/team`
- [ ] `/manager/team/[id]` (tabs: Overview, Goals, Reviews, Skills, Development Plan, Feedback, Career)
- [ ] `/manager/goals`
- [ ] `/manager/reviews`
- [ ] `/manager/reviews/[id]`
- [ ] `/manager/skill-validation`
- [ ] `/manager/feedback`
- [ ] `/manager/one-on-ones`
- [ ] `/manager/development-plans`
- [ ] `/manager/analytics`

## HR Admin
- [ ] `/hr`
- [ ] `/hr/employees`
- [ ] `/hr/employees/new`
- [ ] `/hr/employees/[id]` (tabs: Overview, Employment, Manager history, Reviews, Skills, Goals, Audit)
- [ ] `/hr/employees/import`
- [ ] `/hr/departments`
- [ ] `/hr/review-cycles`
- [ ] `/hr/review-cycles/[id]`
- [ ] `/hr/calibration`
- [ ] `/hr/skills`
- [ ] `/hr/roles`
- [ ] `/hr/roles/[id]`
- [ ] `/hr/courses`
- [ ] `/hr/analytics`
- [ ] `/hr/reports`
- [ ] `/hr/audit-logs`
- [ ] `/hr/settings`

## Executive
- [ ] `/executive`
- [ ] `/executive/performance`
- [ ] `/executive/skills`
- [ ] `/executive/readiness`
- [ ] `/executive/reports`

---

**Final instruction to the UI agent:** Implement the screens described above as visual interfaces using the exact existing route/page inventory. Focus on faithfully presenting the specified information with clean hierarchy, consistent components, and responsive layouts. Do not invent additional pages, modules, sections, or features that are not listed in this document or the supplied original page inventory.
