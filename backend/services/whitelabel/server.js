'use strict';

require('dotenv').config();
const app  = require('./app');
const port = process.env.PORT || 3009;

app.listen(port, () => {
  console.log(`[whitelabel-service] listening on port ${port} (${process.env.NODE_ENV ?? 'development'})`);
});
