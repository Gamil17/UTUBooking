'use strict';
const { timingSafeEqual } = require('crypto');

function salesAuth(req, res, next) {
  const secret = process.env.SALES_SECRET ?? process.env.ADMIN_SECRET ?? '';
  if (!secret) return res.status(500).json({ error: 'SALES_SECRET not configured' });

  const auth = req.headers['authorization'] ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';

  if (!token) return res.status(401).json({ error: 'UNAUTHORIZED' });

  try {
    const a = Buffer.from(token.padEnd(64));
    const b = Buffer.from(secret.padEnd(64));
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }
  } catch {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }

  next();
}

module.exports = salesAuth;
