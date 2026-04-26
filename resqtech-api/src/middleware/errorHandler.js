// Global error handler — catches anything thrown in async routes
// Must be registered LAST in express app

function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  // Supabase / DB errors
  if (err.message?.includes('SUPABASE') || err.message?.includes('supabase')) {
    return res.status(503).json({ error: 'Database unavailable', detail: err.message });
  }

  // Validation errors (thrown manually)
  if (err.status === 400) {
    return res.status(400).json({ error: err.message });
  }

  res.status(500).json({ error: 'Internal server error', detail: err.message });
}

// Wrap async route handlers so they forward errors to errorHandler
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { errorHandler, asyncHandler };
