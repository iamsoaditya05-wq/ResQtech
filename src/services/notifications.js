/**
 * Notification dispatch service.
 * Handles push (Socket.io) and SMS (Twilio) channels.
 */

const DEMO = () => process.env.DEMO_MODE === 'true';

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Create and dispatch a notification to a user.
 *
 * @param {object} io       - Socket.io server instance
 * @param {object} payload  - { user_id, type, message, channel, extra }
 * @returns {object}        - The created notification record
 */
async function sendNotification(io, { user_id, type, message, channel = 'push', payload = {} }) {
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

  if (DEMO()) {
    const { state } = require('../mockData');
    state.notifications.unshift(notif);
  } else {
    const { query } = require('../db');
    await query((sb) => sb.from('notifications').insert(notif));
  }

  // Emit real-time event regardless of mode
  if (io) {
    io.emit('notification:new', notif);
  }

  // SMS channel — attempt Twilio delivery
  if (channel === 'sms' && process.env.TWILIO_ACCOUNT_SID) {
    try {
      const twilio = require('twilio')(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      // user_id must be a phone number for SMS channel
      if (user_id && user_id.startsWith('+')) {
        await twilio.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to:   user_id,
        });
      }
    } catch (err) {
      console.error('[SMS] Twilio error:', err.message);
    }
  }

  return notif;
}

module.exports = { sendNotification };
