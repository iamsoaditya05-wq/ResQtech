/**
 * Global Express error handler — must be registered last (after all routes).
 * Catches any error passed via next(err) and returns a consistent JSON response.
 */
function errorHandler(err, req, res, next) {
  const status  = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[ERROR] ${req.method} ${req.path} → ${status}: ${message}`);
  if (status === 500) console.error(err.stack);

  res.status(status).json({ error: message });
}

module.exports = { errorHandler };
