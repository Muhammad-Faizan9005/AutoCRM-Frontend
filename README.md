# AutoCRM Frontend

A modern Customer Relationship Management (CRM) interface built with React and Vite. The UI focuses on admin operations, team management, and a full CRM workspace for leads, deals, customers, and tasks.

## 🚀 Features

- **Admin Console**: user invites, enable/disable, delete, and permission matrix
- **Failed Invites**: view, re-invite, or delete failed invites
- **Team Management**: create teams, assign reps, remove members, delete teams
- **CRM Workspace**: leads, deals, contacts, organizations, notes, tasks
- **AI Insights**: lead/deal summaries, risk alerts, recommended actions, and dashboard AI summary
- **Call Experience**: live call join/start flows and authenticated recording playback
- **Imports**: CSV/XLSX import UI for customers and tickets
- **Responsive Design**: optimized for desktop and mobile

## 🛠️ Tech Stack

- **React 19** - Modern UI library
- **Vite 7** - Fast build tool and dev server
- **Framer Motion** - Motion and layout transitions
- **ESLint** - Code linting and quality assurance

## 📋 Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn package manager

## 🔧 Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd AutoCRM
```

2. Install dependencies:

```bash
cd forntend/AutoCRM-Frontend
npm install
```

## 🚀 Getting Started

### Environment

Create `.env` in `forntend/AutoCRM-Frontend/`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

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
forntend/AutoCRM-Frontend/
├── public/                # Static assets
├── src/
│   ├── admin/             # Admin console pages and API helpers
│   ├── api/               # API client and auth handling
│   ├── components/        # Shared UI components
│   ├── hooks/             # UI hooks and theme helpers
│   ├── pages/             # CRM workspace pages
│   ├── App.jsx            # App shell and routing
│   ├── App.css            # App-level styles
│   ├── main.jsx           # Entry point
│   └── index.css          # Global styles + theme tokens
├── index.html             # HTML template
├── package.json           # Dependencies and scripts
├── vite.config.js         # Vite configuration
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

- Permission checks are enforced by backend endpoints and mirrored in UI access guards.
- `apiFetch` automatically refreshes tokens on `401` and does not log out on `403`.
- `apiFetch` keeps a bounded in-memory cache and can return stale cached data during transient network failures for selected read endpoints.
- Call recordings are fetched as authenticated blobs from the backend instead of being loaded from public static URLs.
- Admin and manager consoles use the same permission matrix and user list APIs.
- The app still stores access tokens, refresh tokens, cached profile data, and local permission snapshots in browser storage for the current development flow. Treat UI permission checks as UX helpers only; backend authorization remains the enforcement boundary.
- There is currently no committed frontend test suite. Run `npm run build` and `npm run lint` before shipping changes.

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
