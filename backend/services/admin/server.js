'use strict';

require('dotenv').config();
const app = require('./app');

const PORT = parseInt(process.env.ADMIN_PORT ?? '3012', 10);

app.listen(PORT, () => {
  console.log(`[admin-service] listening on http://0.0.0.0:${PORT}`);
  console.log(`[admin-service] dashboard → http://localhost:${PORT}/admin`);
});
