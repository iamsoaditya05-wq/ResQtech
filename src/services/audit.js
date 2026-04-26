/**
 * Audit logging service.
 * Records all significant state changes for compliance and debugging.
 */

const DEMO = () => process.env.DEMO_MODE === 'true';

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Append an audit log entry.
 *
 * @param {string} action   - Dot-namespaced action string, e.g. 'emergency.created'
 * @param {object} details  - Arbitrary details object
 * @param {string} actor    - Who triggered the action ('system', user_id, etc.)
 */
async function logAudit(action, details = {}, actor = 'system') {
  const entry = {
    id:         uid(),
    action,
    details,
    actor,
    created_at: new Date().toISOString(),
  };

  if (DEMO()) {
    const { state } = require('../mockData');
    state.auditLogs.unshift(entry);
  } else {
    const { query } = require('../db');
    await query((sb) => sb.from('audit_logs').insert(entry));
  }

  return entry;
}

module.exports = { logAudit };
