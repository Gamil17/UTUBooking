'use strict';

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode ?? err.status ?? 500;

  if (statusCode >= 500) {
    console.error('[flight-service] unhandled error:', err);
  }

  const body = { error: err.name ?? 'INTERNAL_ERROR', message: err.message };

  if (statusCode === 502) {
    body.error = 'UPSTREAM_ERROR';
  } else if (statusCode === 500) {
    body.error   = 'INTERNAL_ERROR';
    body.message = 'An unexpected error occurred';
  }

  return res.status(statusCode).json(body);
}

module.exports = errorHandler;
