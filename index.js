require('dotenv').config();
const express    = require('express');
const http       = require('http');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const { Server } = require('socket.io');
const cron       = require('node-cron');

const { errorHandler } = require('./middleware/errorHandler');

const app    = express();
const server = http.createServer(app);
const PORT   = process.env.PORT || 3001;
const DEMO   = () => process.env.DEMO_MODE === 'true';

// ── Socket.io ─────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PATCH'] },
});
app.set('io', io);

io.on('connection', (socket) => {
  console.log(`[WS] connected: ${socket.id}`);
  socket.on('disconnect', () => console.log(`[WS] disconnected: ${socket.id}`));
});

// ── Security & Middleware ─────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting — 200 req/min per IP
app.use('/api', rateLimit({
  windowMs: 60 * 1000,
  max:      200,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Too many requests, please slow down.' },
}));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/emergencies',   require('./routes/emergencies'));
// Mount timeline as sub-route of emergencies
app.use('/api/emergencies/:id/timeline', require('./routes/timeline'));
app.use('/api/responders',    require('./routes/responders'));
app.use('/api/triage',        require('./routes/triage'));
app.use('/api/hospitals',     require('./routes/hospitals'));
app.use('/api/analytics',     require('./routes/analytics'));
app.use('/api/sms',           require('./routes/sms'));
app.use('/api/earnings',      require('./routes/earnings'));
app.use('/api/relay',         require('./routes/relay'));
app.use('/api/training',      require('./routes/training'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/audit',         require('./routes/audit'));
app.use('/api/health',        require('./routes/health'));
app.use('/api/chat',          require('./routes/chat'));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    service:  'ResQtech API',
    version:  '3.0.0',
    mode:     DEMO() ? 'DEMO (mock data)' : 'LIVE (Supabase)',
    status:   'running',
    realtime: 'socket.io',
    routes: [
      'GET|POST        /api/emergencies',
      'GET             /api/emergencies/active',
      'GET|PATCH       /api/emergencies/:id',
      'GET|PATCH       /api/responders',
      'PATCH           /api/responders/:id/location',
      'PATCH           /api/responders/:id/availability',
      'GET|PATCH       /api/hospitals',
      'PATCH           /api/hospitals/:id/beds',
      'POST|GET        /api/triage',
      'GET             /api/analytics',
      'GET             /api/earnings',
      'GET             /api/earnings/summary',
      'POST            /api/earnings/complete/:ride_id',
      'GET|POST        /api/relay',
      'POST            /api/relay/plan',
      'PATCH           /api/relay/:id',
      'GET|POST        /api/training',
      'POST            /api/training/:id/complete',
      'GET             /api/training/progress/:user_id',
      'GET|POST        /api/notifications',
      'PATCH           /api/notifications/:id/read',
      'POST            /api/notifications/read-all',
      'POST            /api/sms/webhook',
      'POST            /api/sms/send',
      'GET|POST|PATCH  /api/users',
    ],
  });
});

// ── Global error handler (must be last) ───────────────────────────────────────
app.use(errorHandler);

// ── Auto-escalation cron (every 60s) ─────────────────────────────────────────
// Re-matches emergencies stuck in 'pending' for > 3 minutes
cron.schedule('* * * * *', async () => {
  if (!DEMO()) return; // Live mode: handled by Supabase edge functions / triggers

  const { state, uid } = require('./mockData');
  const { findNearestResponders } = require('./services/matching');

  const stale = state.emergencies.filter((e) => {
    if (e.status !== 'pending') return false;
    return Date.now() - new Date(e.created_at).getTime() > 3 * 60 * 1000;
  });

  for (const em of stale) {
    em._escalation_count = (em._escalation_count || 0) + 1;
    const radius = 20 + em._escalation_count * 10;

    try {
      const candidates = await findNearestResponders(em.lat, em.lng, radius, 5, em.type);
      if (!candidates.length) {
        console.log(`[ESCALATE] No responders within ${radius}km for ${em.id}`);
        io.emit('emergency:escalation_failed', { emergency_id: em.id, village: em.village, radius });
        continue;
      }

      const best = candidates[0];
      em.status         = 'matched';
      em.responder_id   = best.user_id;
      em.responder_name = best.name;
      em.eta_minutes    = Math.round((best.distance_km / 30) * 60);

      const r = state.respondersLive.find((r) => r.user_id === best.user_id);
      if (r) r.is_available = false;

      const notif = {
        id: uid(), user_id: best.user_id,
        type: 'emergency_assigned',
        message: `[ESCALATED] ${em.type} in ${em.village} — ETA ${em.eta_minutes} min`,
        payload: { emergency_id: em.id },
        channel: 'push', sent_at: new Date().toISOString(), read: false,
      };
      state.notifications.unshift(notif);

      io.emit('emergency:updated', em);
      io.emit('notification:new', notif);
      console.log(`[ESCALATE] ${em.id} → ${best.name} (radius ${radius}km)`);
    } catch (err) {
      console.error(`[ESCALATE] Error for ${em.id}:`, err.message);
    }
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\n🚑 ResQtech API v3.0 — http://localhost:${PORT}`);
  console.log(`   ${DEMO() ? '🟡 DEMO MODE (mock data)' : '🟢 LIVE MODE (Supabase)'}`);
  console.log(`   🔌 Socket.io real-time`);
  console.log(`   🛡️  Rate limiting: 200 req/min`);
  console.log(`   ⏱️  Auto-escalation cron active\n`);
});
