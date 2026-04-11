'use strict';
require('dotenv').config();
const app  = require('./app');
const PORT = process.env.PORT || 3013;
app.listen(PORT, () => console.log(`[sales-service] listening on port ${PORT}`));
