'use strict';

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.statusCode ?? err.status ?? 500;
  if (status >= 500) console.error('[whitelabel-service] error:', err);
  return res.status(status).json({
    error:   status === 500 ? 'INTERNAL_ERROR' : (err.name ?? 'ERROR'),
    message: status === 500 ? 'An unexpected error occurred' : err.message,
  });
}

module.exports = errorHandler;
