const { HotelbedsError } = require('../../../adapters/hotelbeds');

function errorHandler(err, req, res, next) {
  if (err instanceof HotelbedsError) {
    console.error('[hotel-service] upstream error:', err.message);
    return res.status(502).json({
      error: 'UPSTREAM_ERROR',
      message: 'Unable to reach hotel availability provider. Please try again.',
    });
  }

  console.error('[hotel-service] unexpected error:', err);
  return res.status(500).json({ error: 'INTERNAL_ERROR' });
}

module.exports = errorHandler;
