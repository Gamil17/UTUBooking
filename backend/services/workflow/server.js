'use strict';

require('dotenv').config();

const app  = require('./app');
const PORT = parseInt(process.env.WORKFLOW_SERVICE_PORT || '3014', 10);

const server = app.listen(PORT, () => {
  console.log(`[workflow-service] listening on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[workflow-service] SIGTERM received — shutting down');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('[workflow-service] SIGINT received — shutting down');
  server.close(() => process.exit(0));
});
