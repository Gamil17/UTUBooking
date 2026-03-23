'use strict';

require('dotenv').config();
const app  = require('./app');
const port = process.env.PORT || 3004;

app.listen(port, () => {
  console.log(`[flight-service] listening on port ${port} (${process.env.NODE_ENV ?? 'development'})`);
});
