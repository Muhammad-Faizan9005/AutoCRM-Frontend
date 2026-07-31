# AutoCRM Frontend Implementation (Detailed)

Last updated: 2026-07-28

This document describes the current frontend implementation. For each feature you will see:
- Why: the business or UX reason the capability exists.
- How: the runtime behavior and UI flow.
- Where: the exact source files that implement the behavior.

Paths are relative to this file (`docs/`).

## 1) Frontend architecture overview

Why
- Provide a modern, responsive CRM UI that mirrors backend permissions and workflows.

How
- React 19 + Vite 7 with client-side routing via React Router 7.
- One CRM shell for day-to-day operations and a separate admin console.
- API client handles auth, CSRF, refresh, caching, de-duplication, and error normalization.
- Tailwind CSS 4 with theme tokens in `index.css`, supporting light and dark.

Where
- App shell and routing: [../src/App.jsx](../src/App.jsx)
- API client: [../src/api/client.js](../src/api/client.js)
- Theme tokens: [../src/index.css](../src/index.css)

## 2) Session bootstrap and authentication

Why
- Keep users signed in with refresh rotation and enforce account status changes quickly.

How
- Auth is **cookie-based**: the backend sets HttpOnly `access_token` and
  `refresh_token` cookies plus a readable `csrf_token` cookie. The frontend never
  sees or stores the tokens.
- On app load the UI calls `/api/auth/me` to establish the session and the
  caller's permission set.
- A background check pings `/api/auth/me` every 6 seconds to detect accounts
  disabled mid-session; a `403` mentioning "inactive" dispatches
  `autocrm-inactive` and the shell shows the disabled-account modal.
- On `401` the client refreshes once and retries; on failure it dispatches
  `autocrm-logout` and clears client state.
- Logout calls the backend, which revokes both tokens and clears the cookies.
- The only value persisted in `localStorage` is the theme preference.

Where
- Bootstrap, auth checks, auto-logout, inactive notice: [../src/App.jsx](../src/App.jsx)
- Cookie/CSRF handling and refresh: [../src/api/client.js](../src/api/client.js)
- Theme persistence: [../src/hooks/useTheme.jsx](../src/hooks/useTheme.jsx)

## 3) API client, caching, and error handling

Why
- Provide consistent backend interaction, limit redundant fetches, and degrade
  gracefully when the network is unreliable.

How
- `apiFetch` sends `credentials: "include"` on every request and attaches
  `X-CSRF-Token` (read from the `csrf_token` cookie) to all mutating requests.
- GET responses are cached by prefix (leads, deals, orgs, notes, tasks,
  dashboard, admin), with per-prefix TTLs — 20s for dashboard, 120s for the rest.
- The cache is an LRU bounded at 250 entries and is **keyed by user id**, so data
  cached under one identity is never served to another in the same tab.
- Concurrent identical GETs share one in-flight promise instead of duplicating
  the request.
- Non-GET requests invalidate related prefixes — a lead write also clears deals,
  tasks, notes, and dashboard.
- Requests time out at 15s; GETs retry once. On network failure the client can
  serve stale cached data, emit a `autocrm-stale-data` event, and show an
  "outdated data" toast rather than blanking the page.
- Timeout, network, and server errors are normalized into thrown Errors carrying
  `status` and `data`.

Where
- API client implementation: [../src/api/client.js](../src/api/client.js)
- Logger (sanitized metadata): [../src/utils/logger.js](../src/utils/logger.js)

## 4) Permissions model and route gating

Why
- Match backend permissions and ensure users only see allowed modules.

How
- Default permissions are applied based on role and stored overrides.
- UI checks `permissions[key]` to decide which routes render, and the landing
  route is chosen from the first module the user may access.
- Admin console routes use a separate permission gate.
- These are UX helpers only — the backend remains the enforcement boundary.

Where
- Permission store and defaults: [../src/admin/permissionsStore.js](../src/admin/permissionsStore.js)
- Role helpers: [../src/admin/roles.js](../src/admin/roles.js)
- Route guards and CRM shell: [../src/App.jsx](../src/App.jsx)
- Admin gating: [../src/admin/AdminLayout.jsx](../src/admin/AdminLayout.jsx)
- Access denied view: [../src/pages/AccessDenied.jsx](../src/pages/AccessDenied.jsx)

## 5) Authentication pages

### 5.1 Login

Why
- Provide entry point for operators.

How
- Submits email + password to `/api/auth/login` with `credentials: "include"`.
- The response body carries only the user object; the session lives in cookies.
- Links to the forgot-password flow.

Where
- Login UI and submission: [../src/pages/Login.jsx](../src/pages/Login.jsx)

### 5.2 Forgot password

Why
- Allow users to request password reset by email.

How
- Sends `/api/auth/forgot-password` with email.
- Displays a generic success notice regardless of whether the account exists.

Where
- Forgot password page: [../src/pages/ForgotPassword.jsx](../src/pages/ForgotPassword.jsx)

### 5.3 Reset password

Why
- Let invited or existing users complete password reset using a token.

How
- Reads token from query string and submits `/api/auth/reset-password`.
- Enforces minimum length and confirmation match.

Where
- Reset password page: [../src/pages/ResetPassword.jsx](../src/pages/ResetPassword.jsx)

### 5.4 Accept invite

Why
- Complete the invite flow for new users.

How
- Validates the invite token with `/api/invites/validate`.
- Submits `/api/invites/accept` with full name + password.

Where
- Accept invite page: [../src/pages/AcceptInvite.jsx](../src/pages/AcceptInvite.jsx)

## 6) CRM shell and main routes

Why
- Provide a consistent navigation layout for daily CRM usage.

How
- The CRM shell wraps sidebar and page routes.
- Access is filtered by permission keys (dashboard, leads, deals, contacts,
  organizations, notes, tasks, import_data).
- Note the route naming: `/tasks` renders the Notes page and `/todo` renders the
  Tasks page — a historical mapping worth knowing before editing routes.

Where
- CRM shell and routes: [../src/App.jsx](../src/App.jsx)
- Sidebar component: [../src/components/Sidebar.jsx](../src/components/Sidebar.jsx)
- Profile settings modal: [../src/components/ProfileSettingsModal.jsx](../src/components/ProfileSettingsModal.jsx)

## 7) CRM modules

### 7.1 Dashboard

Why
- Provide KPI and trend visualization at a glance.

How
- Fetches summary and activity data from `/api/dashboard/summary` and
  `/api/dashboard/activity`; metrics are role-scoped by the backend.
- Renders KPIs, pipeline chart, and activity trend charts.
- Surfaces the latest AI daily summary from `/api/dashboard/ai-summary/latest`.

Where
- Dashboard UI: [../src/pages/Dashboard.jsx](../src/pages/Dashboard.jsx)
- Chart palette hook: [../src/hooks/useChartColors.jsx](../src/hooks/useChartColors.jsx)
- Animated counters: [../src/components/CountUp.jsx](../src/components/CountUp.jsx)

### 7.2 Leads

Why
- Track pipeline prospects and ownership workflows.

How
- Table and kanban views with drag-drop status changes (dnd-kit).
- Assign reps using `/api/leads/assignment-reps` and `PATCH /api/leads/{id}`;
  the dropdown is scoped so managers only see their own reps.
- Create new leads via modal; export to Excel.

Where
- Leads page: [../src/pages/Leads.jsx](../src/pages/Leads.jsx)

### 7.3 Lead detail

Why
- Centralize lead activity, tasks, notes, and calling.

How
- Loads everything in **one** request via `/api/leads/{id}/workspace`, which
  returns the lead, owner, emails, calls, tasks, and notes together — this
  replaced a fan-out of parallel fetches that caused a visible waterfall.
- Creates notes and tasks tied to the lead.
- Starts call sessions, uploads recordings in chunks, and plays back stored
  recordings and transcripts.
- Converts lead to deal and can discard deal back to qualification.
- Shows AI history and insights for the lead.

Where
- Lead detail page: [../src/pages/LeadDetail.jsx](../src/pages/LeadDetail.jsx)
- Call session hook: [../src/hooks/useCallSession.js](../src/hooks/useCallSession.js)
- Call recording hook: [../src/hooks/useCallRecording.js](../src/hooks/useCallRecording.js)
- AI insights panel: [../src/components/AIInsights.jsx](../src/components/AIInsights.jsx)

### 7.4 Deals

Why
- Manage active opportunities and stage progression.

How
- Table and kanban views with stage-based drag-drop, backed by
  `/api/deals/workspace`.
- Creates organizations and leads as needed when a deal is created.
- Assignment dropdowns are scoped for admins and managers.
- Exports deals to Excel.

Where
- Deals page: [../src/pages/Deals.jsx](../src/pages/Deals.jsx)
- Deal detail page: [../src/pages/DealDetail.jsx](../src/pages/DealDetail.jsx)

### 7.5 Contacts (Customers)

Why
- Maintain a directory of customers for outreach and support.

How
- Lists customers, supports creation and deletion, and exports to Excel.

Where
- Contacts page: [../src/pages/Contacts.jsx](../src/pages/Contacts.jsx)

### 7.6 Organizations

Why
- Track company accounts and their metadata.

How
- Card grid view, search, create, and delete.
- Detail view shows the org's related leads and deals.

Where
- Organizations page: [../src/pages/Organizations.jsx](../src/pages/Organizations.jsx)
- Organization detail: [../src/pages/OrganizationDetail.jsx](../src/pages/OrganizationDetail.jsx)

### 7.7 Notes

Why
- Capture internal notes linked to leads.

How
- Loads lead directory to show note context.
- Create/edit/delete notes in modal workflows.
- Routed at `/tasks`.

Where
- Notes page: [../src/pages/Notes.jsx](../src/pages/Notes.jsx)

### 7.8 Tasks

Why
- Track follow-ups and assignments tied to leads.

How
- Managers can create/update tasks and assign reps.
- Reps can only update status values allowed by backend.
- Routed at `/todo`.

Where
- Tasks page: [../src/pages/Tasks.jsx](../src/pages/Tasks.jsx)

### 7.9 Import data

Why
- Allow admin and authorized users to upload CSV/XLSX data.

How
- Select entity type (leads or tickets), upload file, show summary and failures.
- Displays the expected column template for the selected entity.

Where
- Import page: [../src/pages/ImportData.jsx](../src/pages/ImportData.jsx)

## 8) Call join page

Why
- Allow external participants to join audio calls securely.

How
- Uses room + token query params from invite URL.
- Establishes WebRTC session via WebSocket signaling.

Where
- Call join page: [../src/pages/CallJoin.jsx](../src/pages/CallJoin.jsx)
- WebRTC signaling hook: [../src/hooks/useCallSession.js](../src/hooks/useCallSession.js)

## 9) Admin console modules

### 9.1 Admin layout and navigation

Why
- Provide a dedicated governance space for admins and managers.

How
- Admin routes are gated by permissions.
- Admins land on admin overview; managers land on team management.

Where
- Admin layout and routing: [../src/admin/AdminLayout.jsx](../src/admin/AdminLayout.jsx)
- Admin sidebar: [../src/admin/AdminSidebar.jsx](../src/admin/AdminSidebar.jsx)

### 9.2 Admin dashboard

Why
- Monitor user access and import activity at a glance.

How
- Calls `/api/admin/overview` and renders highlights, coverage, queues, and activity.

Where
- Admin dashboard: [../src/admin/AdminDashboard.jsx](../src/admin/AdminDashboard.jsx)
- Admin API helper: [../src/admin/adminApi.js](../src/admin/adminApi.js)

### 9.3 User management

Why
- Create, invite, enable/disable, and delete CRM operators.

How
- Uses `/api/admin/users` and related invite endpoints.
- Shows failed invites and deleted users.

Where
- Admin users UI: [../src/admin/AdminUsers.jsx](../src/admin/AdminUsers.jsx)
- Admin API helper: [../src/admin/adminApi.js](../src/admin/adminApi.js)

### 9.4 Permission management

Why
- Allow per-user toggles for CRM and admin features.

How
- Loads permissions for a selected user and persists changes immediately.
- Updates local app state via an event to refresh permissions.

Where
- Admin permissions UI: [../src/admin/AdminPermissions.jsx](../src/admin/AdminPermissions.jsx)
- Local permission snapshot helpers: [../src/admin/adminStorage.js](../src/admin/adminStorage.js)

### 9.5 Teams (admin)

Why
- Allow admins to create and manage multiple sales teams.

How
- Create, rename, delete teams and manage members.
- View per-rep stats for leads, deals, and open tasks.

Where
- Admin teams UI: [../src/admin/AdminTeams.jsx](../src/admin/AdminTeams.jsx)
- Teams API helper: [../src/admin/teamsApi.js](../src/admin/teamsApi.js)

### 9.6 Team management (manager)

Why
- Allow a sales manager to operate their own team.

How
- Managers can create and rename their team, add reps, and remove reps.

Where
- Manager team UI: [../src/admin/ManagerTeam.jsx](../src/admin/ManagerTeam.jsx)

### 9.7 Admin imports

Why
- Give admins a dedicated import workflow with context.

How
- Wraps the shared import page with admin copy.

Where
- Admin imports UI: [../src/admin/AdminImports.jsx](../src/admin/AdminImports.jsx)

### 9.8 Activity log

Why
- Give admins an audit trail of who changed what.

How
- Reads `/api/admin/activity-log` and renders a filterable feed.

Where
- Activity log UI: [../src/admin/AdminActivityLog.jsx](../src/admin/AdminActivityLog.jsx)

### 9.9 AI Control Center

Why
- Give administrators oversight of the autonomous AI service: what it ran, what
  it wants to change, and whether to allow it.

How
- Talks to the backend `/api/agent/*` endpoints for runs, step traces,
  approvals, settings, team stats, AI agent registry, and service credentials.
- Run lists are paginated; a run expands into its ordered trace steps with
  failure detail.
- Approvals can be approved or rejected; only on approval does the backend apply
  the CRM write.
- Service credentials are issued here — the raw token is displayed once and only
  its hash is stored server-side.
- Token usage is summarized with a small client-side helper.
- These views are intended for administrators or users with AI/admin
  permissions; backend routes remain the source of truth for access decisions.

Where
- AI control center UI: [../src/admin/AIControlCenter.jsx](../src/admin/AIControlCenter.jsx)
- AI control API helper: [../src/admin/aiControlApi.js](../src/admin/aiControlApi.js)
- AI content formatting: [../src/utils/aiContentFormatter.js](../src/utils/aiContentFormatter.js)

## 10) UI utilities and shared components

Why
- Provide consistent UX patterns across modules.

How
- Toasts are emitted through a small pub/sub system and rendered by a provider.
- Page transitions and skeleton loaders are used for perceived performance.
- Light/dark theming is driven by CSS custom properties and a theme hook.
- Confirm dialogs and empty states standardize destructive actions and zero-data views.

Where
- Toast system: [../src/utils/toast.js](../src/utils/toast.js), [../src/components/ToastProvider.jsx](../src/components/ToastProvider.jsx)
- Transitions: [../src/components/PageTransition.jsx](../src/components/PageTransition.jsx)
- Skeletons: [../src/components/Skeleton.jsx](../src/components/Skeleton.jsx)
- Loading screen: [../src/components/LoadingScreen.jsx](../src/components/LoadingScreen.jsx)
- Empty states: [../src/components/EmptyState.jsx](../src/components/EmptyState.jsx)
- Confirm dialog: [../src/components/ConfirmDialog.jsx](../src/components/ConfirmDialog.jsx)
- Entity cards: [../src/components/EntityCard.jsx](../src/components/EntityCard.jsx)
- Theme hook: [../src/hooks/useTheme.jsx](../src/hooks/useTheme.jsx)
- Outside-click dismiss: [../src/hooks/useOutsideDismiss.js](../src/hooks/useOutsideDismiss.js)

## 11) Known limits

- No committed test suite. `npm run build` and `npm run lint` are the current gates.
- The lead email timeline renders backend mock data; there is no email-sync integration.
- Caching is per-tab and in-memory — a hard refresh drops it.
