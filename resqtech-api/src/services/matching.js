// Responder matching service
// In DEMO_MODE: uses weighted scoring on mock data
// In LIVE mode: calls Supabase find_nearest_responders() PostGIS function
//
// Scoring factors:
//   - Distance (primary): Haversine km
//   - Training bonus: trained responders get a 20% effective-distance reduction
//   - Vehicle bonus: 'car' preferred for cardiac/delivery (smoother ride)

const { state } = require('../mockData');

/**
 * Haversine distance between two lat/lng points (returns km)
 */
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Compute a weighted score for a responder candidate.
 * Lower score = better match.
 *
 * @param {object} responder  - respondersLive entry
 * @param {number} distanceKm - raw Haversine distance
 * @param {string} emergencyType - cardiac|accident|delivery|general
 */
function weightedScore(responder, distanceKm, emergencyType) {
  let score = distanceKm;

  // Training bonus: reduce effective distance by 20% for trained responders
  const user = state.users.find((u) => u.id === responder.user_id);
  if (user?.is_trained) score *= 0.8;

  // Vehicle preference for high-stakes emergencies
  const carPreferred = ['cardiac', 'delivery'].includes(emergencyType);
  if (carPreferred && responder.vehicle_type === 'car') score *= 0.85;
  if (carPreferred && responder.vehicle_type === 'bike') score *= 1.1;

  return score;
}

/**
 * Find nearest available responders within radius_km, sorted by weighted score.
 * Returns top N candidates.
 */
async function findNearestResponders(lat, lng, radiusKm = 15, limit = 5, emergencyType = 'general') {
  const demoMode = process.env.DEMO_MODE === 'true';

  if (demoMode) {
    const results = state.respondersLive
      .filter((r) => r.is_available)
      .map((r) => ({
        ...r,
        distance_km: haversine(lat, lng, r.lat, r.lng),
      }))
      .filter((r) => r.distance_km <= radiusKm)
      .map((r) => ({
        ...r,
        score: weightedScore(r, r.distance_km, emergencyType),
      }))
      .sort((a, b) => a.score - b.score)
      .slice(0, limit);

    return results;
  }

  // Live Supabase mode
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  const { data, error } = await supabase.rpc('find_nearest_responders', {
    lat,
    lng,
    radius_km: radiusKm,
  });
  if (error) throw error;
  return data;
}

/**
 * Assign best available responder to an emergency.
 * Also sends outbound SMS to the matched responder if Twilio is configured.
 */
async function assignResponder(emergency) {
  const candidates = await findNearestResponders(
    emergency.lat,
    emergency.lng,
    20,
    5,
    emergency.type
  );
  if (!candidates.length) return null;

  const best = candidates[0];

  if (process.env.DEMO_MODE === 'true') {
    const responder = state.respondersLive.find((r) => r.user_id === best.user_id);
    if (responder) responder.is_available = false;

    const em = state.emergencies.find((e) => e.id === emergency.id);
    if (em) {
      em.status         = 'matched';
      em.responder_id   = best.user_id;
      em.responder_name = best.name;
      em.eta_minutes    = Math.round((best.distance_km / 30) * 60);
    }
  }

  const eta = Math.round((best.distance_km / 30) * 60);

  // Outbound SMS to responder (fire-and-forget)
  _smsResponder(best, emergency, eta).catch((e) =>
    console.error('[SMS] Failed to notify responder:', e.message)
  );

  return { ...best, eta_minutes: eta };
}

/**
 * Send SMS to the matched responder with patient location.
 */
async function _smsResponder(responder, emergency, eta) {
  const user = state.users.find((u) => u.id === responder.user_id);
  if (!user?.phone) return;

  const msg =
    `ResQtech ALERT: ${emergency.type.toUpperCase()} emergency in ${emergency.village}. ` +
    `Patient: ${emergency.patient_name}. ` +
    `Location: https://maps.google.com/?q=${emergency.lat},${emergency.lng} ` +
    `ETA: ~${eta} min. Reply ACCEPT to confirm.`;

  if (process.env.TWILIO_SID && process.env.TWILIO_TOKEN && process.env.TWILIO_PHONE) {
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
    await client.messages.create({ body: msg, from: process.env.TWILIO_PHONE, to: user.phone });
    console.log(`[SMS] Sent dispatch to ${user.name} (${user.phone})`);
  } else {
    console.log(`[DEMO SMS] → ${user.name} (${user.phone}): ${msg}`);
  }
}

module.exports = { findNearestResponders, assignResponder, haversine, weightedScore };
