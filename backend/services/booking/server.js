'use strict';

require('dotenv').config();
const app  = require('./app');
const port = process.env.PORT || 3006;

app.listen(port, () => {
  console.log(`[booking-service] listening on port ${port} (${process.env.NODE_ENV ?? 'development'})`);
});
