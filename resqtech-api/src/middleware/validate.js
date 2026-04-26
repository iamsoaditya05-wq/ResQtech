// Lightweight validation middleware factory
// Usage: router.post('/', validate({ lat: 'number', lng: 'number' }), handler)

function validate(schema) {
  return (req, res, next) => {
    const errors = [];

    for (const [field, type] of Object.entries(schema)) {
      const val = req.body[field];

      if (val === undefined || val === null || val === '') {
        errors.push(`${field} is required`);
        continue;
      }

      if (type === 'number' && isNaN(parseFloat(val))) {
        errors.push(`${field} must be a number`);
      }

      if (type === 'string' && typeof val !== 'string') {
        errors.push(`${field} must be a string`);
      }
    }

    if (errors.length) {
      return res.status(400).json({ error: errors.join(', ') });
    }

    next();
  };
}

module.exports = { validate };
