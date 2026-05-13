/**
 * Middleware to validate request body against a Zod schema.
 * Returns a 400 response with detailed errors if validation fails.
 */
const validate = (schema) => (req, res, next) => {
  try {
    // Attempt to parse and validate the request body
    const validData = schema.parse(req.body);
    // Replace the request body with the validated/sanitized data
    req.body = validData;
    next();
  } catch (err) {
    // If it's a ZodError, format it nicely
    if (err.errors) {
      const formattedErrors = err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message
      }));
      return res.status(400).json({ error: 'Validation failed', details: formattedErrors });
    }
    // Fallback for other errors
    return res.status(400).json({ error: 'Invalid request data' });
  }
};

module.exports = { validate };
