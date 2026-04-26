# Tech Stack

## Frontend (`resqtech-admin`)
- **Framework**: React 18 with JSX
- **Build tool**: Vite 5
- **Routing**: React Router v6
- **Data fetching**: TanStack Query v5
- **Maps**: Leaflet + react-leaflet
- **Charts**: Recharts
- **No TypeScript** — plain `.jsx` / `.js` throughout

## Backend (`resqtech-api`)
- **Runtime**: Node.js (CommonJS — `require`/`module.exports`)
- **Framework**: Express 4
- **Database**: Supabase (PostgreSQL + PostGIS for geo queries)
- **AI**: Anthropic Claude via `@anthropic-ai/sdk`
- **SMS**: Twilio
- **Scheduling**: node-cron
- **Dev server**: nodemon

## External Services
| Service | Purpose | Env var(s) |
|---|---|---|
| Supabase | Database + geo RPC | `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` |
| Anthropic | Triage AI | `ANTHROPIC_API_KEY` |
| Twilio | SMS dispatch | `TWILIO_SID`, `TWILIO_TOKEN`, `TWILIO_PHONE` |
| Google Maps | Mapping (future) | `GOOGLE_MAPS_KEY` |

## Common Commands

### Frontend
```bash
cd resqtech-admin
npm install        # install deps
npm run dev        # dev server (Vite, default port 5173)
npm run build      # production build → dist/
npm run preview    # preview production build
```

### Backend
```bash
cd resqtech-api
npm install        # install deps
npm run dev        # dev server with nodemon (port 3001)
npm start          # production start
```

## Environment
Copy `resqtech-api/.env.example` to `resqtech-api/.env` and fill in credentials.
Set `DEMO_MODE=true` to run without any cloud credentials.

## API Base URL
The frontend proxies all `/api/*` requests to the backend. In dev, configure Vite proxy or run both servers and point the frontend at `http://localhost:3001`.
