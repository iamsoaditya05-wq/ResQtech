/**
 * Request body validation middleware factory.
 * Usage: router.post('/', validate(['field1', 'field2']), handler)
 *
 * Returns 400 if any required field is missing from req.body.
 */
function validate(requiredFields) {
  return (req, res, next) => {
    const missing = requiredFields.filter((f) => req.body[f] === undefined || req.body[f] === null);
    if (missing.length) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
    }
    next();
  };
}

module.exports = { validate };
