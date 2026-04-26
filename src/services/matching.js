/**
 * Responder geo-matching service.
 * Supports both DEMO_MODE (in-memory mock data) and live Supabase mode.
 */

const DEMO = () => process.env.DEMO_MODE === 'true';

/**
 * Haversine formula — returns distance in km between two lat/lng points.
 */
function haversine(lat1, lng1, lat2, lng2) {
  const R    = 6371;
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
 * Find the nearest available responders within `radiusKm` of (lat, lng).
 *
 * @param {number} lat        - Incident latitude
 * @param {number} lng        - Incident longitude
 * @param {number} radiusKm  - Search radius in kilometres (default 20)
 * @param {number} limit     - Max results to return (default 5)
 * @param {string} type      - Emergency type (unused in demo; used for Supabase RPC)
 * @returns {Promise<Array>} - Sorted array of responder objects with distance_km
 */
async function findNearestResponders(lat, lng, radiusKm = 20, limit = 5, type = null) {
  if (DEMO()) {
    const { state } = require('../mockData');

    const candidates = state.respondersLive
      .filter((r) => r.is_available)
      .map((r) => ({
        ...r,
        distance_km: +haversine(lat, lng, r.lat, r.lng).toFixed(2),
      }))
      .filter((r) => r.distance_km <= radiusKm)
      .sort((a, b) => a.distance_km - b.distance_km)
      .slice(0, limit);

    return candidates;
  }

  // Live mode — Supabase PostGIS RPC
  const { query } = require('../db');
  return query((sb) =>
    sb.rpc('find_nearest_responders', {
      p_lat:    lat,
      p_lng:    lng,
      p_radius: radiusKm,
      p_limit:  limit,
      p_type:   type,
    })
  );
}

module.exports = { findNearestResponders, haversine };
