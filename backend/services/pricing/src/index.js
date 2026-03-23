'use strict';

const express = require('express');

const app = express();
app.use(express.json());

app.use('/api/v1/pricing', require('./routes/pricing.routes'));

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', service: 'pricing' }));

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error('[pricing] unhandled error:', err);
  const status = err.statusCode ?? 500;
  res.status(status).json({ error: err.name ?? 'INTERNAL_ERROR', message: err.message });
});

const PORT = process.env.PORT ?? 3011;
app.listen(PORT, () => console.log(`[pricing] listening on ${PORT}`));
