require('dotenv').config();
const client = require('../../../../shared/redis-cluster');

async function get(key) {
  try {
    const raw = await client.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn('[redis] GET failed:', err.message);
    return null;
  }
}

async function setex(key, ttlSeconds, data) {
  try {
    await client.setex(key, ttlSeconds, JSON.stringify(data));
  } catch (err) {
    console.warn('[redis] SETEX failed:', err.message);
  }
}

async function del(key) {
  try {
    await client.del(key);
  } catch (err) {
    console.warn('[redis] DEL failed:', err.message);
  }
}

module.exports = { get, setex, del };
