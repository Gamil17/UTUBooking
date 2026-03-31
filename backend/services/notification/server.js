'use strict';

require('dotenv').config();

const app                        = require('./src/app');
const { registerScheduledJobs }  = require('./src/jobs/scheduler');
const { notificationQueue }      = require('./src/jobs/queue');

const { registerWorkers } = require('./src/jobs/workers/index');

const PORT = process.env.NOTIFICATION_PORT || process.env.PORT || 3002;

async function start() {
  registerWorkers();
  await registerScheduledJobs();

  app.listen(PORT, () => {
    console.log(`[notification-service] listening on port ${PORT} (${process.env.NODE_ENV ?? 'development'})`);
  });
}

process.on('SIGTERM', async () => {
  console.log('[notification-service] SIGTERM — draining queue...');
  await notificationQueue.close();
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  console.error('[notification-service] unhandledRejection:', reason);
});

start().catch((err) => {
  console.error('[notification-service] startup error:', err);
  process.exit(1);
});
