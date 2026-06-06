# AutoCRM Frontend Implementation (Detailed)

Last updated: 2026-05-30

This document describes the current frontend implementation. For each feature you will see:
- Why: the business or UX reason the capability exists.
- How: the runtime behavior and UI flow.
- Where: the exact source files that implement the behavior.

## 1) Frontend architecture overview

Why
- Provide a modern, responsive CRM UI that mirrors backend permissions and workflows.

How
- React + Vite with client-side routing.
- One CRM shell for day-to-day operations and a separate admin console.
- API client handles auth, refresh, caching, and error normalization.

Where
- App shell and routing: [forntend/AutoCRM-Frontend/src/App.jsx](forntend/AutoCRM-Frontend/src/App.jsx)
- API client: [forntend/AutoCRM-Frontend/src/api/client.js](forntend/AutoCRM-Frontend/src/api/client.js)

## 2) Session bootstrap and authentication

Why
- Keep users signed in with refresh rotation and enforce account status changes quickly.

How
- On app load, the UI tries /api/auth/me; if it fails it falls back to cached user info.
- Tokens are stored in localStorage.
- A background check pings /api/auth/me every 6 seconds to detect inactive accounts.
- Logout revokes tokens (when possible) and clears local session.

Where
- Bootstrap, auth checks, auto-logout, inactive notice: [forntend/AutoCRM-Frontend/src/App.jsx](forntend/AutoCRM-Frontend/src/App.jsx)
- Token storage: [forntend/AutoCRM-Frontend/src/api/client.js](forntend/AutoCRM-Frontend/src/api/client.js)

## 3) API client, caching, and error handling

Why
- Provide consistent backend interaction and limit redundant fetches.

How
- `apiFetch` injects bearer tokens and refreshes on 401.
- GET responses are cached by prefix (leads, deals, orgs, notes, tasks, dashboard).
- Non-GET requests invalidate cached prefix entries.
- Timeout, network, and server errors are normalized into thrown Errors.

Where
- API client implementation: [forntend/AutoCRM-Frontend/src/api/client.js](forntend/AutoCRM-Frontend/src/api/client.js)
- Logger (sanitized metadata): [forntend/AutoCRM-Frontend/src/utils/logger.js](forntend/AutoCRM-Frontend/src/utils/logger.js)

## 4) Permissions model and route gating

Why
- Match backend permissions and ensure users only see allowed modules.

How
- Default permissions are applied based on role and stored overrides.
- UI checks `permissions[key]` to decide which routes render.
- Admin console routes use a separate permission gate.

Where
- Permission store and defaults: [forntend/AutoCRM-Frontend/src/admin/permissionsStore.js](forntend/AutoCRM-Frontend/src/admin/permissionsStore.js)
- Route guards and CRM shell: [forntend/AutoCRM-Frontend/src/App.jsx](forntend/AutoCRM-Frontend/src/App.jsx)
- Admin gating: [forntend/AutoCRM-Frontend/src/admin/AdminLayout.jsx](forntend/AutoCRM-Frontend/src/admin/AdminLayout.jsx)

## 5) Authentication pages

### 5.1 Login

Why
- Provide entry point for operators with token handling.

How
- Submits email + password to /api/auth/login.
- Stores access/refresh tokens and sets user state.
- Current login view includes a placeholder forgot-password link.

Where
- Login UI and submission: [forntend/AutoCRM-Frontend/src/pages/Login.jsx](forntend/AutoCRM-Frontend/src/pages/Login.jsx)

### 5.2 Forgot password

Why
- Allow users to request password reset by email.

How
- Sends /api/auth/forgot-password with email.
- Displays success or error notice.

Where
- Forgot password page: [forntend/AutoCRM-Frontend/src/pages/ForgotPassword.jsx](forntend/AutoCRM-Frontend/src/pages/ForgotPassword.jsx)

### 5.3 Reset password

Why
- Let invited or existing users complete password reset using a token.

How
- Reads token from query string and submits /api/auth/reset-password.
- Enforces minimum length and confirmation match.

Where
- Reset password page: [forntend/AutoCRM-Frontend/src/pages/ResetPassword.jsx](forntend/AutoCRM-Frontend/src/pages/ResetPassword.jsx)

### 5.4 Accept invite

Why
- Complete the invite flow for new users.

How
- Validates the invite token with /api/invites/validate.
- Submits /api/invites/accept with full name + password.

Where
- Accept invite page: [forntend/AutoCRM-Frontend/src/pages/AcceptInvite.jsx](forntend/AutoCRM-Frontend/src/pages/AcceptInvite.jsx)

## 6) CRM shell and main routes

Why
- Provide a consistent navigation layout for daily CRM usage.

How
- The CRM shell wraps sidebar and page routes.
- Access is filtered by permission keys (dashboard, leads, deals, contacts, organizations, notes, tasks, import_data).

Where
- CRM shell and routes: [forntend/AutoCRM-Frontend/src/App.jsx](forntend/AutoCRM-Frontend/src/App.jsx)
- Sidebar component: [forntend/AutoCRM-Frontend/src/components/Sidebar.jsx](forntend/AutoCRM-Frontend/src/components/Sidebar.jsx)

## 7) CRM modules

### 7.1 Dashboard

Why
- Provide KPI and trend visualization at a glance.

How
- Fetches summary and activity data from /api/dashboard/summary and /api/dashboard/activity.
- Renders KPIs, pipeline chart, and activity trend charts.

Where
- Dashboard UI: [forntend/AutoCRM-Frontend/src/pages/Dashboard.jsx](forntend/AutoCRM-Frontend/src/pages/Dashboard.jsx)

### 7.2 Leads

Why
- Track pipeline prospects and ownership workflows.

How
- Table and kanban views with drag-drop status changes.
- Assign reps using /api/leads/assignment-reps and PATCH /api/leads/{id}.
- Create new leads via modal; export to Excel.

Where
- Leads page: [forntend/AutoCRM-Frontend/src/pages/Leads.jsx](forntend/AutoCRM-Frontend/src/pages/Leads.jsx)

### 7.3 Lead detail

Why
- Centralize lead activity, tasks, notes, and calling.

How
- Fetches lead, owner, emails, calls, tasks, and notes in parallel.
- Creates notes and tasks tied to the lead.
- Starts call sessions and uploads recordings.
- Converts lead to deal and can discard deal back to qualification.

Where
- Lead detail page: [forntend/AutoCRM-Frontend/src/pages/LeadDetail.jsx](forntend/AutoCRM-Frontend/src/pages/LeadDetail.jsx)
- Call session hook: [forntend/AutoCRM-Frontend/src/hooks/useCallSession.js](forntend/AutoCRM-Frontend/src/hooks/useCallSession.js)
- Call recording hook: [forntend/AutoCRM-Frontend/src/hooks/useCallRecording.js](forntend/AutoCRM-Frontend/src/hooks/useCallRecording.js)

### 7.4 Deals

Why
- Manage active opportunities and stage progression.

How
- Table and kanban views with status-based drag-drop.
- Creates organizations and leads as needed when a deal is created.
- Exports deals to Excel.

Where
- Deals page: [forntend/AutoCRM-Frontend/src/pages/Deals.jsx](forntend/AutoCRM-Frontend/src/pages/Deals.jsx)

### 7.5 Contacts (Customers)

Why
- Maintain a directory of customers for outreach and support.

How
- Lists customers, supports creation and deletion, and exports to Excel.

Where
- Contacts page: [forntend/AutoCRM-Frontend/src/pages/Contacts.jsx](forntend/AutoCRM-Frontend/src/pages/Contacts.jsx)

### 7.6 Organizations

Why
- Track company accounts and their metadata.

How
- Card grid view, search, create, and delete.

Where
- Organizations page: [forntend/AutoCRM-Frontend/src/pages/Organizations.jsx](forntend/AutoCRM-Frontend/src/pages/Organizations.jsx)

### 7.7 Notes

Why
- Capture internal notes linked to leads.

How
- Loads lead directory to show note context.
- Create/edit/delete notes in modal workflows.

Where
- Notes page: [forntend/AutoCRM-Frontend/src/pages/Notes.jsx](forntend/AutoCRM-Frontend/src/pages/Notes.jsx)

### 7.8 Tasks

Why
- Track follow-ups and assignments tied to leads.

How
- Managers can create/update tasks and assign reps.
- Reps can only update status values allowed by backend.

Where
- Tasks page: [forntend/AutoCRM-Frontend/src/pages/Tasks.jsx](forntend/AutoCRM-Frontend/src/pages/Tasks.jsx)

### 7.9 Import data

Why
- Allow admin and authorized users to upload CSV/XLSX data.

How
- Select entity type (customers or tickets), upload file, show summary and failures.

Where
- Import page: [forntend/AutoCRM-Frontend/src/pages/ImportData.jsx](forntend/AutoCRM-Frontend/src/pages/ImportData.jsx)

## 8) Call join page

Why
- Allow external participants to join audio calls securely.

How
- Uses room + token query params from invite URL.
- Establishes WebRTC session via WebSocket signaling.

Where
- Call join page: [forntend/AutoCRM-Frontend/src/pages/CallJoin.jsx](forntend/AutoCRM-Frontend/src/pages/CallJoin.jsx)
- WebRTC signaling hook: [forntend/AutoCRM-Frontend/src/hooks/useCallSession.js](forntend/AutoCRM-Frontend/src/hooks/useCallSession.js)

## 9) Admin console modules

### 9.1 Admin layout and navigation

Why
- Provide a dedicated governance space for admins and managers.

How
- Admin routes are gated by permissions.
- Admins land on admin overview; managers land on team management.

Where
- Admin layout and routing: [forntend/AutoCRM-Frontend/src/admin/AdminLayout.jsx](forntend/AutoCRM-Frontend/src/admin/AdminLayout.jsx)

### 9.2 Admin dashboard

Why
- Monitor user access and import activity at a glance.

How
- Calls /api/admin/overview and renders highlights, coverage, queues, and activity.

Where
- Admin dashboard: [forntend/AutoCRM-Frontend/src/admin/AdminDashboard.jsx](forntend/AutoCRM-Frontend/src/admin/AdminDashboard.jsx)
- Admin API helper: [forntend/AutoCRM-Frontend/src/admin/adminApi.js](forntend/AutoCRM-Frontend/src/admin/adminApi.js)

### 9.3 User management

Why
- Create, invite, enable/disable, and delete CRM operators.

How
- Uses /api/admin/users and related invite endpoints.
- Shows failed invites and deleted users.

Where
- Admin users UI: [forntend/AutoCRM-Frontend/src/admin/AdminUsers.jsx](forntend/AutoCRM-Frontend/src/admin/AdminUsers.jsx)
- Admin API helper: [forntend/AutoCRM-Frontend/src/admin/adminApi.js](forntend/AutoCRM-Frontend/src/admin/adminApi.js)

### 9.4 Permission management

Why
- Allow per-user toggles for CRM and admin features.

How
- Loads permissions for a selected user and persists changes immediately.
- Updates local app state via an event to refresh permissions.

Where
- Admin permissions UI: [forntend/AutoCRM-Frontend/src/admin/AdminPermissions.jsx](forntend/AutoCRM-Frontend/src/admin/AdminPermissions.jsx)

### 9.5 Teams (admin)

Why
- Allow admins to create and manage multiple sales teams.

How
- Create, rename, delete teams and manage members.
- View per-rep stats for leads, deals, and open tasks.

Where
- Admin teams UI: [forntend/AutoCRM-Frontend/src/admin/AdminTeams.jsx](forntend/AutoCRM-Frontend/src/admin/AdminTeams.jsx)
- Teams API helper: [forntend/AutoCRM-Frontend/src/admin/teamsApi.js](forntend/AutoCRM-Frontend/src/admin/teamsApi.js)

### 9.6 Team management (manager)

Why
- Allow a sales manager to operate their own team.

How
- Managers can create and rename their team, add reps, and remove reps.

Where
- Manager team UI: [forntend/AutoCRM-Frontend/src/admin/ManagerTeam.jsx](forntend/AutoCRM-Frontend/src/admin/ManagerTeam.jsx)

### 9.7 Admin imports

Why
- Give admins a dedicated import workflow with context.

How
- Wraps the shared import page with admin copy.

Where
- Admin imports UI: [forntend/AutoCRM-Frontend/src/admin/AdminImports.jsx](forntend/AutoCRM-Frontend/src/admin/AdminImports.jsx)

## 10) UI utilities and shared components

Why
- Provide consistent UX patterns across modules.

How
- Toasts are emitted through a small pub/sub system.
- Page transitions and skeleton loaders are used for perceived performance.

Where
- Toast system: [forntend/AutoCRM-Frontend/src/utils/toast.js](forntend/AutoCRM-Frontend/src/utils/toast.js)
- Transitions: [forntend/AutoCRM-Frontend/src/components/PageTransition.jsx](forntend/AutoCRM-Frontend/src/components/PageTransition.jsx)
- Skeletons: [forntend/AutoCRM-Frontend/src/components/Skeleton.jsx](forntend/AutoCRM-Frontend/src/components/Skeleton.jsx)

