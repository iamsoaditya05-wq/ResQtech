const express = require('express');
const router  = express.Router();

const DEMO = () => process.env.DEMO_MODE === 'true';

// GET /api/earnings
router.get('/', async (req, res, next) => {
  try {
    if (DEMO()) {
      const { state } = require('../mockData');
      let rides = [...state.rides];

      if (req.query.responder_id) {
        rides = rides.filter((r) => r.responder_id === req.query.responder_id);
      }
      if (req.query.status) {
        rides = rides.filter((r) => r.status === req.query.status);
      }

      rides.sort((a, b) => new Date(b.pickup_time) - new Date(a.pickup_time));
      return res.json({ data: rides });
    }

    const { query } = require('../db');
    const data = await query((sb) =>
      sb.from('rides').select('*').order('pickup_time', { ascending: false })
    );
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// GET /api/earnings/summary
router.get('/summary', async (req, res, next) => {
  try {
    if (DEMO()) {
      const { state } = require('../mockData');
      const completed = state.rides.filter((r) => r.status === 'completed');

      const totalEarnings = completed.reduce((s, r) => s + (r.total_inr || 0), 0);
      const totalRides    = completed.length;
      const avgEarnings   = totalRides ? +(totalEarnings / totalRides).toFixed(2) : 0;

      // Per-responder summary
      const byResponder = {};
      for (const r of completed) {
        if (!byResponder[r.responder_id]) {
          byResponder[r.responder_id] = {
            responder_id:   r.responder_id,
            responder_name: r.responder_name,
            rides:          0,
            total_inr:      0,
            total_km:       0,
          };
        }
        byResponder[r.responder_id].rides     += 1;
        byResponder[r.responder_id].total_inr += r.total_inr || 0;
        byResponder[r.responder_id].total_km  += r.distance_km || 0;
      }

      return res.json({
        totalEarnings,
        totalRides,
        avgEarnings,
        byResponder: Object.values(byResponder).sort((a, b) => b.total_inr - a.total_inr),
      });
    }

    const { query } = require('../db');
    const [summary] = await query((sb) => sb.rpc('get_earnings_summary'));
    res.json(summary || {});
  } catch (err) {
    next(err);
  }
});

// POST /api/earnings/complete/:ride_id
router.post('/complete/:ride_id', async (req, res, next) => {
  try {
    const io = req.app.get('io');

    if (DEMO()) {
      const { state } = require('../mockData');
      const ride = state.rides.find((r) => r.id === req.params.ride_id);
      if (!ride) return res.status(404).json({ error: 'Ride not found' });

      ride.status   = 'completed';
      ride.drop_time = new Date().toISOString();

      // Update emergency status
      if (ride.emergency_id) {
        const em = state.emergencies.find((e) => e.id === ride.emergency_id);
        if (em) em.status = 'done';
      }

      // Mark responder available
      const responder = state.respondersLive.find((r) => r.user_id === ride.responder_id);
      if (responder) responder.is_available = true;

      // Earnings notification
      const notif = {
        id:      Math.random().toString(36).slice(2) + Date.now().toString(36),
        user_id: ride.responder_id,
        type:    'ride_completed',
        message: `Ride completed. Earnings: ₹${ride.total_inr} credited`,
        payload: { ride_id: ride.id },
        channel: 'push',
        sent_at: new Date().toISOString(),
        read:    false,
      };
      state.notifications.unshift(notif);
      io?.emit('notification:new', notif);
      io?.emit('ride:completed', ride);

      return res.json(ride);
    }

    const { query } = require('../db');
    const [updated] = await query((sb) =>
      sb
        .from('rides')
        .update({ status: 'completed', drop_time: new Date().toISOString() })
        .eq('id', req.params.ride_id)
        .select()
    );
    if (!updated) return res.status(404).json({ error: 'Ride not found' });
    io?.emit('ride:completed', updated);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
