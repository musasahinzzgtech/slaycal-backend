const { ZodError } = require('zod');

/**
 * Returns an Express middleware that validates req.body (or req.query for GET).
 * @param {import('zod').ZodSchema} schema
 * @param {'body'|'query'} [source='body']
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const fields = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return res.status(422).json({
          error: { message: 'Validation failed', code: 'VALIDATION_ERROR', fields },
        });
      }
      next(err);
    }
  };
}

module.exports = validate;
