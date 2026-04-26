// Supabase client — singleton, used in all live-mode routes
// In DEMO_MODE=true this module is never called

let _client = null;

function getClient() {
  if (_client) return _client;

  const { createClient } = require('@supabase/supabase-js');

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env for live mode');
  }

  _client = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    {
      auth: { persistSession: false },
      db:   { schema: 'public' },
    }
  );

  return _client;
}

/**
 * Thin wrapper — throws on Supabase errors so routes don't need to check { data, error }
 */
async function query(fn) {
  const supabase = getClient();
  const result   = await fn(supabase);
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

module.exports = { getClient, query };
