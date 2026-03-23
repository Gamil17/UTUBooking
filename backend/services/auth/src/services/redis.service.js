require('dotenv').config();
const client = require('../../../../../shared/redis-cluster');

// Store a key with TTL (value stored as-is string, not JSON)
async function setex(key, ttlSeconds, value) {
  try {
    await client.setex(key, ttlSeconds, String(value));
  } catch (err) {
    console.warn('[redis] SETEX failed:', err.message);
  }
}

// Returns raw string or null — does not JSON.parse
async function get(key) {
  try {
    return await client.get(key);
  } catch (err) {
    console.warn('[redis] GET failed:', err.message);
    return null;
  }
}

// Returns true if key exists
async function exists(key) {
  try {
    const count = await client.exists(key);
    return count === 1;
  } catch (err) {
    console.warn('[redis] EXISTS failed:', err.message);
    return false;
  }
}

async function del(key) {
  try {
    await client.del(key);
  } catch (err) {
    console.warn('[redis] DEL failed:', err.message);
  }
}

module.exports = { setex, get, exists, del };
