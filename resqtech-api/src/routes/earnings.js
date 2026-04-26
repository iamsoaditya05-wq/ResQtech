const express = require('express');
const router  = express.Router();
const { state, uid } = require('../mockData');
const { asyncHandler } = require('../middleware/errorHandler');
const { query }        = require('../db');

const DEMO = () => process.env.DEMO_MODE === 'true';

function emit(req, event, data) {
  const io = req.app.get('io');
  if (io) io.emit(event, data);
}

// ── GET /api/earnings ─────────────────────────────────────────────────────────
router.get('/', asyncHandler(async (req, res) => {
  if (DEMO()) {
    let rides = [...state.rides].sort((a, b) => new Date(b.pickup_time) - new Date(a.pickup_time));
    if (req.query.responder_id) rides = rides.filter((r) => r.responder_id === req.query.responder_id);
    return res.json({ data: rides, count: rides.length });
  }

  let q = (sb) => sb.from('rides').select('*').order('pickup_time', { ascending: false });
  if (req.query.responder_id) {
    q = (sb) => sb.from('rides').select('*').eq('responder_id', req.query.responder_id).order('pickup_time', { ascending: false });
  }
  const data = await query(q);
  res.json({ data, count: data.length });
}));

// ── GET /api/earnings/summary ─────────────────────────────────────────────────
router.get('/summary', asyncHandler(async (req, res) => {
  if (DEMO()) {
    const completed = state.rides.filter((r) => r.status === 'completed');

    const byResponder = {};
    completed.forEach((r) => {
      if (!byResponder[r.responder_id]) {
        byResponder[r.responder_id] = { responder_id: r.responder_id, responder_name: r.responder_name, total_rides: 0, total_inr: 0, total_km: 0 };
      }
      byResponder[r.responder_id].total_rides += 1;
      byResponder[r.responder_id].total_inr   += r.total_inr;
      byResponder[r.responder_id].total_km    += r.distance_km;
    });

    const leaderboard = Object.values(byResponder)
      .sort((a, b) => b.total_inr - a.total_inr)
      .map((r) => ({ ...r, total_km: +r.total_km.toFixed(1) }));

    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const d     = new Date(Date.now() - i * 86400000);
      const label = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
      const dayRides = completed.filter((r) => new Date(r.pickup_time).toDateString() === d.toDateString());
      const earnings  = dayRides.reduce((s, r) => s + r.total_inr, 0);
      trend.push({ day: label, earnings: earnings || Math.floor(Math.random() * 200) + 80 });
    }

    const totalPaid = completed.reduce((s, r) => s + r.total_inr, 0);
    return res.json({
      data: {
        total_paid_inr: totalPaid,
        total_rides:    completed.length,
        avg_per_ride:   completed.length ? Math.round(totalPaid / completed.length) : 0,
        leaderboard,
        trend,
      },
    });
  }

  // Live mode — aggregate from DB
  const rides = await query((sb) => sb.from('rides').select('*').eq('status', 'completed'));

  const byResponder = {};
  rides.forEach((r) => {
    if (!byResponder[r.responder_id]) {
      byResponder[r.responder_id] = { responder_id: r.responder_id, responder_name: r.responder_name, total_rides: 0, total_inr: 0, total_km: 0 };
    }
    byResponder[r.responder_id].total_rides += 1;
    byResponder[r.responder_id].total_inr   += r.total_inr;
    byResponder[r.responder_id].total_km    += r.distance_km;
  });

  const leaderboard = Object.values(byResponder)
    .sort((a, b) => b.total_inr - a.total_inr)
    .map((r) => ({ ...r, total_km: +r.total_km.toFixed(1) }));

  const trend = [];
  for (let i = 6; i >= 0; i--) {
    const d     = new Date(Date.now() - i * 86400000);
    const label = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
    const dayRides = rides.filter((r) => new Date(r.pickup_time).toDateString() === d.toDateString());
    trend.push({ day: label, earnings: dayRides.reduce((s, r) => s + r.total_inr, 0) });
  }

  const totalPaid = rides.reduce((s, r) => s + r.total_inr, 0);
  res.json({
    data: {
      total_paid_inr: totalPaid,
      total_rides:    rides.length,
      avg_per_ride:   rides.length ? Math.round(totalPaid / rides.length) : 0,
      leaderboard,
      trend,
    },
  });
}));

// ── POST /api/earnings/complete/:ride_id ──────────────────────────────────────
router.post('/complete/:ride_id', asyncHandler(async (req, res) => {
  if (DEMO()) {
    const ride = state.rides.find((r) => r.id === req.params.ride_id);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });

    ride.status    = 'completed';
    ride.drop_time = new Date().toISOString();

    const responder = state.respondersLive.find((r) => r.user_id === ride.responder_id);
    if (responder) responder.is_available = true;

    const notif = {
      id:      uid(),
      user_id: ride.responder_id,
      type:    'ride_completed',
      message: `Ride completed. Earnings: ₹${ride.total_inr} credited`,
      payload: { ride_id: ride.id },
      channel: 'push',
      sent_at: new Date().toISOString(),
      read:    false,
    };
    state.notifications.unshift(notif);
    emit(req, 'notification:new', notif);
    return res.json({ data: ride });
  }

  const ride = await query((sb) =>
    sb.from('rides').update({ status: 'completed', drop_time: new Date().toISOString() })
      .eq('id', req.params.ride_id).select().single()
  );

  await query((sb) =>
    sb.from('responders_live').update({ is_available: true }).eq('user_id', ride.responder_id)
  );

  const notif = {
    user_id: ride.responder_id,
    type:    'ride_completed',
    message: `Ride completed. Earnings: ₹${ride.total_inr} credited`,
    payload: { ride_id: ride.id },
    channel: 'push',
    sent_at: new Date().toISOString(),
    read:    false,
  };
  await query((sb) => sb.from('notifications').insert(notif));
  emit(req, 'notification:new', notif);
  res.json({ data: ride });
}));

module.exports = router;
