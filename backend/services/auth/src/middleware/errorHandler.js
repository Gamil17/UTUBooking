function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Database constraint violations
  if (err.code === '23505') {
    return res.status(409).json({
      error:   'DUPLICATE_ENTRY',
      message: 'A record with this value already exists.',
    });
  }

  // Database connection errors
  if (err.code === 'ECONNREFUSED' || err.code === '57P03') {
    console.error('[auth-service] database unavailable:', err.message);
    return res.status(503).json({
      error:   'SERVICE_UNAVAILABLE',
      message: 'Database is temporarily unavailable. Please try again shortly.',
    });
  }

  console.error('[auth-service] unhandled error:', err);
  return res.status(500).json({ error: 'INTERNAL_ERROR' });
}

module.exports = errorHandler;
