'use strict';

const Bull = require('bull');

const redisConfig = {
  host:     process.env.REDIS_HOST     || 'redis',
  port:     parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_AUTH_TOKEN || undefined,
  tls:      process.env.REDIS_TLS === 'true' ? {} : undefined,
};

const notificationQueue = new Bull('notifications', {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail:     200,
    attempts:         3,
    backoff: { type: 'exponential', delay: 5_000 },
  },
});

notificationQueue.on('error',  (err) => console.error('[queue] error:', err.message));
notificationQueue.on('failed', (job, err) => console.error(`[queue] job ${job.name} failed:`, err.message));
notificationQueue.on('stalled', (job) => console.warn(`[queue] job ${job.name} stalled`));

module.exports = { notificationQueue };
