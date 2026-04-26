const express = require('express');
const router  = express.Router();

const DEMO = () => process.env.DEMO_MODE === 'true';

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// POST /api/sms/webhook — Twilio inbound SMS (SOS trigger)
router.post('/webhook', async (req, res, next) => {
  try {
    const { From, Body } = req.body;
    const io = req.app.get('io');

    console.log(`[SMS] Inbound from ${From}: ${Body}`);

    // Parse SOS message — expected format: "SOS <village> <type>"
    const parts   = (Body || '').trim().split(/\s+/);
    const keyword = parts[0]?.toUpperCase();

    if (keyword !== 'SOS') {
      // Not an SOS — acknowledge and ignore
      return res.type('text/xml').send('<Response></Response>');
    }

    const village = parts[1] || 'Unknown';
    const type    = parts[2]?.toLowerCase() || 'general';

    const notif = {
      id:      uid(),
      user_id: null,
      type:    'system',
      message: `SMS SOS received from ${From} — ${village}`,
      payload: { from: From, body: Body },
      channel: 'sms',
      sent_at: new Date().toISOString(),
      read:    false,
    };

    if (DEMO()) {
      const { state } = require('../mockData');
      state.notifications.unshift(notif);
    } else {
      const { query } = require('../db');
      await query((sb) => sb.from('notifications').insert(notif));
    }

    io?.emit('notification:new', notif);
    io?.emit('sms:sos', { from: From, village, type });

    // Respond to Twilio with TwiML
    res.type('text/xml').send(`<Response><Message>SOS received. Help is on the way to ${village}.</Message></Response>`);
  } catch (err) {
    next(err);
  }
});

// POST /api/sms/send — outbound SMS
router.post('/send', async (req, res, next) => {
  try {
    const { to, message } = req.body;
    if (!to || !message) {
      return res.status(400).json({ error: 'to and message are required' });
    }

    if (!process.env.TWILIO_ACCOUNT_SID) {
      // No Twilio configured — log and return success in demo
      console.log(`[SMS] (no Twilio) Would send to ${to}: ${message}`);
      return res.json({ success: true, demo: true });
    }

    const twilio = require('twilio')(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const msg = await twilio.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });

    res.json({ success: true, sid: msg.sid });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
