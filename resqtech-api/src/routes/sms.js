const express = require('express');
const router  = express.Router();
const { state, uid, VILLAGES } = require('../mockData');
const { assignResponder }  = require('../services/matching');
const { asyncHandler }     = require('../middleware/errorHandler');
const { query }            = require('../db');

const DEMO = () => process.env.DEMO_MODE === 'true';

function emit(req, event, data) {
  const io = req.app.get('io');
  if (io) io.emit(event, data);
}

async function sendSms(to, message) {
  if (process.env.TWILIO_SID && process.env.TWILIO_TOKEN && process.env.TWILIO_PHONE) {
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
    return client.messages.create({ body: message, from: process.env.TWILIO_PHONE, to });
  }
  console.log(`[DEMO SMS] → ${to}: ${message}`);
  return { sid: 'demo_' + Date.now() };
}

// ── POST /api/sms/webhook — Twilio incoming SMS ───────────────────────────────
router.post('/webhook', asyncHandler(async (req, res) => {
  const body = (req.body.Body || '').trim().toUpperCase();
  const from = req.body.From || 'unknown';

  console.log(`[SMS] from ${from}: ${body}`);

  if (!body.startsWith('SOS')) {
    return res.type('text/xml').send(
      '<Response><Message>Send "SOS [village name]" to request emergency help. Example: SOS Shirur</Message></Response>'
    );
  }

  const locationPart = body.replace(/^SOS\s*/, '').trim();
  let lat, lng, village = 'Unknown';

  const coordMatch = locationPart.match(/([\d.]+)\s+([\d.]+)/);
  if (coordMatch) {
    lat     = parseFloat(coordMatch[1]);
    lng     = parseFloat(coordMatch[2]);
    village = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } else {
    const matched = VILLAGES.find((v) =>
      v.name.toUpperCase().includes(locationPart) || locationPart.includes(v.name.toUpperCase())
    );
    if (matched) { lat = matched.lat; lng = matched.lng; village = matched.name; }
    else         { lat = 18.5204; lng = 73.8567; village = locationPart || 'Unknown'; }
  }

  const newEmergency = {
    id: uid(), patient_id: 'sms_' + from.replace(/\D/g, ''),
    patient_name: `SMS User (${from})`,
    lat, lng, village, type: 'general', status: 'pending', severity: 3,
    responder_id: null, responder_name: null, eta_minutes: null,
    source: 'sms', created_at: new Date().toISOString(),
  };

  if (DEMO()) {
    state.emergencies.unshift(newEmergency);
    // Log as system notification
    state.notifications.unshift({
      id: uid(), user_id: null, type: 'system',
      message: `SMS SOS from ${from} — ${village}`,
      payload: { emergency_id: newEmergency.id }, channel: 'sms',
      sent_at: new Date().toISOString(), read: false,
    });
  } else {
    await query((sb) => sb.from('emergencies').insert(newEmergency));
    await query((sb) => sb.from('notifications').insert({
      user_id: null, type: 'system',
      message: `SMS SOS from ${from} — ${village}`,
      payload: { emergency_id: newEmergency.id }, channel: 'sms',
      sent_at: new Date().toISOString(), read: false,
    }));
  }

  emit(req, 'emergency:created', newEmergency);

  let replyMsg = `Emergency registered for ${village}. Help is being dispatched. Stay safe.`;

  try {
    const responder = await assignResponder(newEmergency);
    if (responder) {
      replyMsg = `Help found! ${responder.name} is ${responder.distance_km?.toFixed(1) || '?'} km away. ETA: ${responder.eta_minutes} min. Stay where you are.`;
      emit(req, 'emergency:updated', newEmergency);
    }
  } catch (err) {
    console.error('[SMS] Matching error:', err.message);
  }

  res.type('text/xml').send(`<Response><Message>${replyMsg}</Message></Response>`);
}));

// ── POST /api/sms/send — manual send (testing / outbound dispatch) ────────────
router.post('/send', asyncHandler(async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) return res.status(400).json({ error: 'to and message required' });

  const result = await sendSms(to, message);
  res.json({ success: true, sid: result.sid, demo: !process.env.TWILIO_SID });
}));

module.exports = router;
