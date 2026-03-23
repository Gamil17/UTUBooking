const express = require('express');

const app = express();
app.use(express.json());

app.use('/api/v1/wallet', require('./routes/wallet.routes'));

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', service: 'wallet' }));

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error('[wallet] unhandled error:', err);
  res.status(500).json({ error: 'INTERNAL_ERROR' });
});

const PORT = process.env.PORT ?? 3010;
app.listen(PORT, () => console.log(`[wallet] listening on ${PORT}`));
