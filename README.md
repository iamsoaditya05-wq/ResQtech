# 🚑 ResQtech — On-Demand Emergency Ambulance Network

> Turning every nearby vehicle into a potential ambulance for rural India.

ResQtech is a full-stack emergency dispatch platform for rural Maharashtra. It connects patients to local community responders (bikes/cars) when no ambulance is available, using AI triage, real-time tracking, and SMS fallback.

---

## 🚀 Run Locally (2 minutes)

### Prerequisites
- Node.js 18+
- npm

### 1. Start the API (Demo Mode — no credentials needed)

```bash
cd resqtech-api
npm install
npm run dev:demo
```

API runs at **http://localhost:3001**

### 2. Start the Admin Dashboard

```bash
cd resqtech-admin
npm install
npm run dev
```

Dashboard runs at **http://localhost:5173**

Open your browser → **http://localhost:5173**

---

## 📱 Pages

| Route | Description |
|---|---|
| `/` | Live Dashboard — map, active emergencies, SOS trigger |
| `/hospitals` | Bed availability management + incoming emergencies |
| `/responders` | Fleet tracking, availability toggle, GPS simulation |
| `/analytics` | Charts: trends, hourly, geography, performance |
| `/triage` | AI triage demo (Claude API or mock) |
| `/earnings` | Ride history, leaderboard, UPI payouts |
| `/training` | First aid modules with quiz |
| `/notifications` | Real-time alerts with filter + delete |
| `/history` | Full searchable 30-day emergency history + CSV export |
| `/register` | Onboard new community responders |
| `/audit` | System event timeline |
| `/settings` | Live health check, SMS test, env vars guide |
| `/patient/:id` | Shareable live tracking page for a specific emergency |

---

## 🏗️ Architecture

```
resqtech/
├── resqtech-api/        # Node.js + Express backend
│   ├── src/
│   │   ├── index.js     # Entry — Express + Socket.io + cron
│   │   ├── mockData.js  # 70+ emergencies, 30-day history
│   │   ├── routes/      # 14 route files
│   │   ├── services/    # matching, notifications, audit
│   │   └── middleware/  # errorHandler, validate
│   ├── supabase_schema.sql  # Full DB schema for live mode
│   └── railway.toml     # Railway deployment config
│
└── resqtech-admin/      # React + Vite frontend
    ├── src/
    │   ├── pages/       # 13 pages
    │   ├── components/  # EmergencyCard, MapView, Modal, etc.
    │   ├── hooks/       # useToast, useEtaCountdown
    │   └── socket.js    # Socket.io client
    └── vercel.json      # Vercel deployment config
```

---

## 🔌 API Endpoints

```
GET|POST        /api/emergencies
GET             /api/emergencies/active
GET             /api/emergencies/search?q=&status=&type=
GET             /api/emergencies/export          (CSV)
GET|PATCH       /api/emergencies/:id
POST            /api/emergencies/:id/assign
GET             /api/emergencies/:id/timeline
GET|PATCH       /api/responders
GET             /api/responders/:id/history
PATCH           /api/responders/:id/location
PATCH           /api/responders/:id/availability
GET|POST        /api/hospitals
GET             /api/hospitals/:id/incoming
PATCH           /api/hospitals/:id/beds
POST            /api/triage
GET             /api/triage/:emergency_id
GET             /api/analytics
GET             /api/earnings + /summary
POST            /api/earnings/complete/:ride_id
GET|POST        /api/relay + /plan
GET|POST        /api/training
POST            /api/training/:id/complete
GET             /api/training/progress/:user_id
GET|POST        /api/notifications
PATCH           /api/notifications/:id/read
DELETE          /api/notifications/:id
POST            /api/notifications/read-all
POST            /api/sms/webhook
POST            /api/sms/send
GET|POST|PATCH  /api/users
GET             /api/audit
GET             /api/health
```

---

## 🌐 Deploy to Production

### Backend → Railway

```bash
cd resqtech-api
npm install -g @railway/cli
railway login
railway init
railway up
# Set env vars in Railway dashboard
```

**Required env vars on Railway:**
```
DEMO_MODE=false
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
ANTHROPIC_API_KEY=sk-ant-...        (optional)
TWILIO_SID=ACxxx                    (optional)
TWILIO_TOKEN=xxx                    (optional)
TWILIO_PHONE=+1234567890            (optional)
```

### Frontend → Vercel

```bash
cd resqtech-admin
npm install -g vercel
vercel --prod
# Set VITE_API_URL=https://your-railway-url.up.railway.app
```

### Database → Supabase

1. Create project at [supabase.com](https://supabase.com) → Mumbai region
2. Run `resqtech-api/supabase_schema.sql` in SQL Editor
3. Copy URL + service key to Railway env vars
4. Set `DEMO_MODE=false`

---

## ⚡ Features

- **Real-time** — Socket.io events for emergency create/update, responder location, notifications
- **Auto-matching** — Weighted scoring (distance + training + vehicle type)
- **Auto-escalation** — Cron re-matches pending emergencies every 60s with widening radius
- **AI Triage** — Claude Sonnet assesses severity 1-5, gives Hindi first aid instructions
- **SMS SOS** — Twilio webhook: send `SOS Shirur` to trigger emergency without internet
- **Outbound SMS** — Matched responder gets patient location via SMS
- **Relay transport** — Multi-leg handoff planning for long-distance transport
- **Live tracking** — `/patient/:id` shareable link with countdown timer
- **30-day history** — 70+ mock emergencies for realistic analytics
- **CSV export** — Download full emergency history

---

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite 5, TanStack Query, Leaflet, Recharts |
| Backend | Node.js, Express 4, Socket.io, node-cron |
| Database | Supabase (PostgreSQL + PostGIS) |
| AI | Anthropic Claude Sonnet |
| SMS | Twilio |
| Deploy | Vercel (frontend) + Railway (backend) |

---

*Team: Keerti · Leena · Aditya · Aryan — InnovX Season II Hackathon*
