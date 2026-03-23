'use strict';

/**
 * Shared Redis client factory for all UTUBooking microservices.
 *
 * Production (REDIS_CLUSTER_URLS set):
 *   Uses ioredis.Cluster connecting to ElastiCache cluster mode.
 *   REDIS_CLUSTER_URLS = "cfg.xxx.cache.amazonaws.com:6379"
 *   REDIS_AUTH_TOKEN   = ElastiCache auth token (PCI DSS required)
 *
 * Development / local (REDIS_CLUSTER_URLS not set):
 *   Falls back to single-node ioredis using REDIS_URL (docker-compose Redis).
 */

const Redis = require('ioredis');

function createRedisClient() {
  if (process.env.REDIS_CLUSTER_URLS) {
    // ElastiCache cluster mode: parse "host:port,host:port,..." or single config endpoint
    const nodes = process.env.REDIS_CLUSTER_URLS.split(',').map((hp) => {
      const [host, port] = hp.trim().split(':');
      return { host, port: Number(port) || 6379 };
    });

    return new Redis.Cluster(nodes, {
      redisOptions: {
        password:            process.env.REDIS_AUTH_TOKEN,
        tls:                 { rejectUnauthorized: false }, // ElastiCache self-signed cert
        connectTimeout:      5000,
        maxRetriesPerRequest: 1,
      },
      clusterRetryStrategy: (times) => {
        if (times > 5) return null;   // stop retrying after 5 attempts
        return Math.min(times * 200, 2000);
      },
      enableOfflineQueue: false,
      lazyConnect: true,
    });
  }

  // Single-node fallback (local docker-compose, CI, test envs)
  return new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    lazyConnect:          true,
    maxRetriesPerRequest: 1,
    connectTimeout:       5000,
  });
}

const client = createRedisClient();

client.on('error', (err) => {
  console.warn('[redis] connection error — cache disabled:', err.message);
});

client.on('connect', () => {
  const mode = process.env.REDIS_CLUSTER_URLS ? 'cluster' : 'single-node';
  console.info(`[redis] connected (${mode})`);
});

module.exports = client;
