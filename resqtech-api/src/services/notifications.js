// Notification service — creates + emits notifications from anywhere in the app
// Handles both demo (in-memory) and live (Supabase) modes

const { state, uid } = require('../mockData');

/**
 * Create and emit a notification.
 * @param {object} io       - Socket.io server instance (from app.get('io'))
 * @param {object} payload  - { user_id, type, message, payload, channel }
 */
async function createNotification(io, { user_id = null, type = 'system', message, payload = {}, channel = 'push' }) {
  const notif = {
    id:      uid(),
    user_id,
    type,
    message,
    payload,
    channel,
    sent_at: new Date().toISOString(),
    read:    false,
  };

  if (process.env.DEMO_MODE === 'true') {
    state.notifications.unshift(notif);
  } else {
    const { query } = require('../db');
    await query((sb) => sb.from('notifications').insert(notif));
  }

  if (io) io.emit('notification:new', notif);
  return notif;
}

/**
 * Send outbound SMS via Twilio (or log in demo mode).
 */
async function sendSms(to, message) {
  if (process.env.TWILIO_SID && process.env.TWILIO_TOKEN && process.env.TWILIO_PHONE) {
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
    const msg = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE,
      to,
    });
    console.log(`[SMS] Sent to ${to}: ${msg.sid}`);
    return msg.sid;
  }
  console.log(`[DEMO SMS] → ${to}: ${message}`);
  return 'demo_' + Date.now();
}

module.exports = { createNotification, sendSms };
