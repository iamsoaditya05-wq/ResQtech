# ResQtech — Product Overview

ResQtech is an on-demand ambulance network for rural India. It addresses the infrastructure gap in rural medical emergencies by recruiting local community members as potential drivers/responders.

## Core Concepts

- **Emergencies**: Incoming medical distress calls that need a responder dispatched
- **Responders**: Local community members who act as ambulance drivers
- **Hospitals**: Partner facilities that receive patients; track bed availability
- **Triage**: AI-assisted (Claude) severity assessment of incoming emergencies
- **Relay**: Multi-leg transport planning when a single responder can't complete a full trip
- **Earnings**: Compensation tracking for responders per completed ride
- **Training**: Module-based training system for responder certification
- **Notifications**: Real-time alerts for dispatchers and hospital staff

## Operating Modes

- **DEMO_MODE=true** — runs entirely on in-memory mock data; no cloud credentials needed
- **DEMO_MODE=false** — live mode backed by Supabase (PostGIS for geo queries), Twilio for SMS, Anthropic Claude for triage AI
