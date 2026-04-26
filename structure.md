# Project Structure

This is a monorepo with two independent packages — a React admin dashboard and a Node.js API server.

```
resqtech/
├── resqtech-admin/          # Frontend — React + Vite admin dashboard
│   ├── src/
│   │   ├── api.js           # Centralised fetch wrapper + all API calls
│   │   ├── App.jsx          # Root component — BrowserRouter + route definitions
│   │   ├── main.jsx         # Vite entry point
│   │   ├── index.css        # Global styles
│   │   ├── components/      # Shared/reusable UI components
│   │   │   ├── Header.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── StatsBar.jsx
│   │   │   ├── MapView.jsx
│   │   │   ├── EmergencyCard.jsx
│   │   │   └── TriagePanel.jsx
│   │   └── pages/           # One file per route/page
│   │       ├── Dashboard.jsx
│   │       ├── Hospitals.jsx
│   │       ├── Responders.jsx
│   │       ├── Analytics.jsx
│   │       ├── TriageDemo.jsx
│   │       ├── Earnings.jsx
│   │       ├── Training.jsx
│   │       └── Notifications.jsx
│   └── vite.config.js
│
└── resqtech-api/            # Backend — Express REST API
    └── src/
        ├── index.js         # App entry — Express setup + route mounting
        ├── mockData.js      # In-memory state used when DEMO_MODE=true
        ├── routes/          # One file per resource (matches /api/<resource>)
        │   ├── emergencies.js
        │   ├── responders.js
        │   ├── hospitals.js
        │   ├── triage.js
        │   ├── analytics.js
        │   ├── earnings.js
        │   ├── relay.js
        │   ├── sms.js
        │   ├── training.js
        │   └── notifications.js
        └── services/
            └── matching.js  # Responder geo-matching (Haversine / Supabase RPC)
```

## Conventions

### Frontend
- All API calls go through `src/api.js` — never call `fetch` directly in components
- Pages live in `src/pages/`, reusable UI in `src/components/`
- Data fetching uses TanStack Query (`useQuery` / `useMutation`) inside pages
- Routes are defined once in `App.jsx`

### Backend
- Each resource gets its own file under `src/routes/` and is mounted in `index.js`
- Routes use CommonJS (`require` / `module.exports`) — no ES module syntax
- Business logic beyond simple CRUD goes in `src/services/`
- All routes must handle both `DEMO_MODE=true` (mock data from `mockData.js`) and live Supabase mode
- Mock state is a single mutable object exported from `mockData.js`; mutate it directly in demo mode
