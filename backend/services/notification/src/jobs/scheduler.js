'use strict';

const { notificationQueue } = require('./queue');

async function registerScheduledJobs() {
  // Remove stale repeatable jobs first (safe on restart)
  const existing = await notificationQueue.getRepeatableJobs();
  for (const job of existing) {
    await notificationQueue.removeRepeatableByKey(job.key);
  }

  // Abandoned booking recovery — scan every hour
  await notificationQueue.add(
    'scan-abandoned-bookings',
    {},
    { repeat: { cron: '0 * * * *' }, jobId: 'scan-abandoned-bookings' },
  );

  // 24-hour check-in reminder — scan every 15 minutes for accuracy
  await notificationQueue.add(
    'scan-checkin-reminders',
    {},
    { repeat: { cron: '*/15 * * * *' }, jobId: 'scan-checkin-reminders' },
  );

  // Price change alert — scan every 6 hours
  await notificationQueue.add(
    'scan-price-change-alerts',
    {},
    { repeat: { cron: '0 */6 * * *' }, jobId: 'scan-price-change-alerts' },
  );

  // Campaign dispatcher — picks up scheduled campaigns every 5 minutes
  await notificationQueue.add(
    'dispatch-campaigns',
    {},
    { repeat: { cron: '*/5 * * * *' }, jobId: 'dispatch-campaigns' },
  );

  console.log('[scheduler] Registered 4 recurring jobs');
}

module.exports = { registerScheduledJobs };
