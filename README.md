# AutoCRM Frontend

A modern Customer Relationship Management (CRM) interface built with React and Vite. The UI focuses on admin operations, team management, and a full CRM workspace for leads, deals, customers, and tasks.

## 🚀 Features

- **Admin Console**: dashboard, user invites, enable/disable, delete, activity log, and permission matrix
- **Failed Invites**: view, re-invite, or delete failed invites
- **Team Management**: create teams, assign reps, remove members, delete teams
- **CRM Workspace**: leads, deals, contacts, organizations, notes, tasks
- **AI Insights**: lead/deal summaries, risk alerts, recommended actions, and dashboard AI summary
- **AI Control Center**: run history, step traces, approvals, agent settings, and service credentials
- **Call Experience**: live call join/start flows and authenticated recording playback
- **Imports**: CSV/XLSX import UI for leads, customers, and tickets
- **Theming**: light/dark with persisted preference
- **Responsive Design**: optimized for desktop and mobile

## 🛠️ Tech Stack

- **React 19** - Modern UI library (with the React Compiler babel plugin)
- **Vite 7** - Fast build tool and dev server
- **React Router 7** - Client-side routing
- **Tailwind CSS 4** - Styling, via the `@tailwindcss/vite` plugin
- **Framer Motion** - Motion and layout transitions
- **Chart.js + Recharts** - Dashboard and analytics charts
- **dnd-kit** - Drag-and-drop for the deal pipeline board
- **Phosphor / Lucide** - Icon sets
- **SheetJS (xlsx)** - Client-side spreadsheet parsing for imports
- **ESLint** - Code linting and quality assurance

## 📋 Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn package manager
- A running AutoCRM backend (default `http://localhost:8000`)

## 🔧 Installation

This frontend is its own repository. Clone it directly:

```bash
git clone <repository-url>
cd AutoCRM-Frontend
npm install
```

## 🚀 Getting Started

### Environment

Create `.env` in the project root:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Falls back to `http://localhost:8000` when unset. The backend must allow-list
this app's origin in its CORS config — cookies are rejected otherwise.

### Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Linting

```bash
npm run lint
```

## 📁 Project Structure

```
AutoCRM-Frontend/
├── public/                # Static assets and brand marks
├── docs/                  # Frontend implementation notes
├── src/
│   ├── admin/             # Admin console pages, AI control center, API helpers
│   ├── api/               # API client (auth, CSRF, caching, retries)
│   ├── components/        # Shared UI components
│   ├── hooks/             # Call recording/session, theme, chart colors
│   ├── pages/             # CRM workspace pages
│   ├── utils/             # AI content formatting, logger, toast
│   ├── lib/               # Small shared helpers
│   ├── App.jsx            # App shell, routing, and route guards
│   ├── App.css            # App-level styles
│   ├── main.jsx           # Entry point
│   └── index.css          # Global styles + theme tokens
├── index.html             # HTML template
├── package.json           # Dependencies and scripts
├── vite.config.js         # Vite configuration
├── tailwind.config.js     # Tailwind configuration
└── eslint.config.js       # ESLint configuration
```

## 🔑 Key Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## 🎨 Development Notes

### Authentication

- Auth is **cookie-based**. The backend issues HttpOnly `access_token` and
  `refresh_token` cookies plus a readable `csrf_token` cookie.
- `apiFetch` sends `credentials: "include"` on every request and attaches
  `X-CSRF-Token` (read from the `csrf_token` cookie) to all mutating requests.
- No tokens are stored in `localStorage` — they aren't readable from JS by
  design. The only thing this app persists locally is the theme preference.
- On `401`, `apiFetch` refreshes once and retries the original request; on
  failure it dispatches `autocrm-logout`. It does not refresh on `403`.
- A `403` mentioning "inactive" dispatches `autocrm-inactive` so the shell can
  show the disabled-account modal. `App.jsx` also polls `/api/auth/me` every
  6 seconds to catch accounts disabled mid-session.

### Data fetching

- `apiFetch` keeps a bounded in-memory cache (LRU, 250 entries) for selected read
  prefixes, with per-prefix TTLs — 20s for dashboard, 120s for CRM lists.
- The cache is keyed by user id and cleared on identity change, so cached data
  from one login is never served to another in the same tab.
- Concurrent identical GETs are de-duplicated into one in-flight request.
- On a network failure it can serve stale cached data and surface a
  "showing outdated data" toast rather than blanking the page.
- Mutations invalidate related prefixes (e.g. a lead write clears deals, tasks,
  notes, and dashboard).

### Other

- Permission checks are enforced by backend endpoints and mirrored in UI access
  guards. Treat UI permission checks as UX helpers only; backend authorization
  remains the enforcement boundary.
- Call recordings are fetched as authenticated blobs from the backend instead of
  being loaded from public static URLs.
- Admin and manager consoles use the same permission matrix and user list APIs.
- There is currently no committed frontend test suite. Run `npm run build` and
  `npm run lint` before shipping changes.

## AI Control Center

The admin AI control center talks to backend `/api/agent/*` endpoints for runs, traces, approvals, settings, team stats, and AI agent credentials. These views are intended for administrators or users with AI/admin permissions; backend routes should remain the source of truth for access decisions.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is part of a Final Year Project (FYP).

## 👥 Authors

| | Name |
|---|---|
| 👤 | Muhammad Faizan Haider |
| 👤 | Muhammad Tayyab |
| 👤 | Umer Shahid |
| 👤 | Iqra Mubarik |

## 📞 Support

For support, please open an issue in the repository or contact the development team.

---

Built with ❤️ using React and Vite
