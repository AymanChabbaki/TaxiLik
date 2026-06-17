const Redis = require('ioredis');
const env = require('./env');

// Single shared Redis client (and a lazy duplicate for the Socket.IO pub/sub
// adapter). Returns null when REDIS_URL isn't set so the app still runs on a
// single instance in development.
let client = null;

function getRedis() {
  if (!env.redisUrl) return null;
  if (!client) {
    client = new Redis(env.redisUrl, { maxRetriesPerRequest: null, lazyConnect: false });
    client.on('error', (e) => console.error('[redis] error:', e.message));
    client.on('connect', () => console.log('[redis] connected'));
  }
  return client;
}

module.exports = { getRedis };
