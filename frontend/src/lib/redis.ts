import Redis from 'ioredis';

// Prevent multiple connections during Next.js hot-module replacement in dev
declare global {
  var __redis: Redis | undefined;
}

const redis: Redis =
  global.__redis ??
  new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    lazyConnect: false,
  });

if (process.env.NODE_ENV === 'development') {
  global.__redis = redis;
}

export default redis;
