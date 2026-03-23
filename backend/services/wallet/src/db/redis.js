const Redis = require('ioredis');

function createRedisClient() {
  if (process.env.REDIS_CLUSTER_URLS) {
    const nodes = process.env.REDIS_CLUSTER_URLS.split(',').map((hp) => {
      const [host, port] = hp.trim().split(':');
      return { host, port: Number(port) || 6379 };
    });
    return new Redis.Cluster(nodes, {
      redisOptions: {
        password:             process.env.REDIS_AUTH_TOKEN,
        tls:                  { rejectUnauthorized: false }, // ElastiCache self-signed cert
        connectTimeout:       5000,
        maxRetriesPerRequest: 1,
      },
      clusterRetryStrategy: (times) => {
        if (times > 5) return null;
        return Math.min(times * 200, 2000);
      },
      enableOfflineQueue: false,
      lazyConnect:        true,
    });
  }

  return new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    lazyConnect:          true,
    maxRetriesPerRequest: 1,
    connectTimeout:       5000,
  });
}

const client = createRedisClient();

client.on('error', (err) => {
  console.warn('[wallet/redis] connection error — cache disabled:', err.message);
});

module.exports = client;
