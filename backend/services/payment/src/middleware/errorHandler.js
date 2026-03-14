function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Stripe errors
  if (err.type && err.type.startsWith('Stripe')) {
    console.error('[payment-service] Stripe error:', err.type, err.message);
    return res.status(502).json({
      error:   'GATEWAY_ERROR',
      gateway: 'stripe',
      message: err.message,
    });
  }

  // Axios errors from STC Pay or Moyasar
  if (err.isAxiosError) {
    const gateway = err.config?.url?.includes('stcpay') ? 'stcpay' : 'moyasar';
    console.error(`[payment-service] ${gateway} HTTP error:`, err.response?.status, err.message);
    return res.status(502).json({
      error:   'GATEWAY_ERROR',
      gateway,
      message: 'Payment provider unavailable. Please try again.',
    });
  }

  // PostgreSQL unique violation
  if (err.code === '23505') {
    return res.status(409).json({ error: 'DUPLICATE_ENTRY' });
  }

  // PostgreSQL connection error
  if (err.code === 'ECONNREFUSED' || err.code === '57P03') {
    console.error('[payment-service] database unavailable:', err.message);
    return res.status(503).json({ error: 'SERVICE_UNAVAILABLE' });
  }

  console.error('[payment-service] unhandled error:', err);
  return res.status(500).json({ error: 'INTERNAL_ERROR' });
}

module.exports = errorHandler;
