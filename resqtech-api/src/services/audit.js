// Audit log service — records every significant action for compliance/debugging
// Stored in-memory (demo) or audit_logs table (live)

const { state, uid } = require('../mockData');

// In-memory audit log for demo mode
if (!state.auditLogs) state.auditLogs = [];

/**
 * Log an action.
 * @param {string} action   - e.g. 'emergency.created', 'responder.matched'
 * @param {object} details  - arbitrary metadata
 * @param {string} actor    - user_id or 'system'
 */
async function log(action, details = {}, actor = 'system') {
  const entry = {
    id:         uid(),
    action,
    details,
    actor,
    created_at: new Date().toISOString(),
  };

  if (process.env.DEMO_MODE === 'true') {
    state.auditLogs.unshift(entry);
    if (state.auditLogs.length > 500) state.auditLogs.pop(); // cap at 500
  } else {
    try {
      const { query } = require('../db');
      await query((sb) => sb.from('audit_logs').insert(entry));
    } catch (e) {
      // Non-fatal — just log to console if table doesn't exist yet
      console.warn('[AUDIT]', action, details);
    }
  }

  return entry;
}

module.exports = { log };
