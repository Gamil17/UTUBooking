'use strict';

require('dotenv').config();

const express  = require('express');
const path     = require('path');
const jwt      = require('jsonwebtoken');
const { Pool } = require('pg');
const http     = require('http');

const app  = express();
app.use(express.json({ limit: '64kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── DB pool ───────────────────────────────────────────────────────────────────
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

// ── Auth middleware ───────────────────────────────────────────────────────────
const ADMIN_ROLES = new Set(['admin', 'country_admin', 'super_admin']);

// Service-to-service secret check (constant-time to prevent timing attacks)
const { timingSafeEqual } = require('crypto');
function checkAdminSecret(req) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  const provided = req.headers['x-admin-secret'] ?? '';
  if (!provided) return false;
  try {
    const a = Buffer.from(secret);
    const b = Buffer.alloc(a.length);
    Buffer.from(provided).copy(b);
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// Internal service account injected when called via x-admin-secret
const SERVICE_ACCOUNT = { sub: 'system', email: 'system@internal', role: 'super_admin', name: 'System', admin_country: null };

function requireAdmin(req, res, next) {
  // Allow server-side BFF calls using shared admin secret
  if (checkAdminSecret(req)) { req.user = SERVICE_ACCOUNT; return next(); }

  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'UNAUTHORIZED' });
  try {
    const payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    if (!ADMIN_ROLES.has(payload.role)) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Admin role required' });
    }
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'INVALID_TOKEN' });
  }
}

function requireSuperAdmin(req, res, next) {
  // Allow server-side BFF calls using shared admin secret
  if (checkAdminSecret(req)) { req.user = SERVICE_ACCOUNT; return next(); }

  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'UNAUTHORIZED' });
  try {
    const payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    if (payload.role !== 'super_admin') {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Super admin role required' });
    }
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'INVALID_TOKEN' });
  }
}

// ── Country scope helper ──────────────────────────────────────────────────────
// Returns a WHERE fragment to scope queries for country_admin
function countryScope(user, tableAlias = '') {
  const col = tableAlias ? `${tableAlias}.country` : 'country';
  return user.role === 'country_admin' && user.admin_country
    ? { clause: `AND ${col} = $`, value: user.admin_country }
    : { clause: '', value: null };
}

// ── Audit log helper ──────────────────────────────────────────────────────────
async function auditLog(adminId, action, targetUserId, meta = null) {
  await pool.query(
    `INSERT INTO admin_audit_log (admin_id, action, target_user_id, meta) VALUES ($1, $2, $3, $4)`,
    [adminId, action, targetUserId, meta ? JSON.stringify(meta) : null]
  ).catch(err => console.error('[audit_log]', err.message));
}

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: 'admin-service' })
);

// ── Serve pages ───────────────────────────────────────────────────────────────
app.get('/', (_req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'portal.html'))
);
app.get('/admin', (_req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
);

// ── Admin login ───────────────────────────────────────────────────────────────
app.post('/admin/api/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const bcrypt = require('bcryptjs');
    const { rows } = await pool.query(
      `SELECT id, email, password_hash, role, name, admin_country
         FROM users WHERE email = $1 AND COALESCE(status, 'active') = 'active'`,
      [email]
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (!ADMIN_ROLES.has(user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role,
        name: user.name, admin_country: user.admin_country },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({ token, role: user.role, name: user.name, email: user.email,
               admin_country: user.admin_country });
  } catch (err) {
    console.error('[admin/login]', err.message);
    res.status(500).json({ error: 'Login failed', detail: err.message });
  }
});

// ── Portal: user-facing login/register (proxies to auth-service) ──────────────
app.post('/api/portal/login', async (req, res) => {
  _proxyToAuth('/api/v1/auth/login', req.body, res);
});

app.post('/api/portal/register', async (req, res) => {
  _proxyToAuth('/api/v1/auth/register', req.body, res);
});

function _proxyToAuth(path, body, res) {
  const AUTH_HOST = process.env.AUTH_SERVICE_HOST || 'auth-service';
  const AUTH_PORT = parseInt(process.env.AUTH_SERVICE_PORT || '3001', 10);
  const payload   = JSON.stringify(body);
  const options   = {
    hostname: AUTH_HOST, port: AUTH_PORT, path,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
  };
  const req2 = http.request(options, (authRes) => {
    let data = '';
    authRes.on('data', chunk => { data += chunk; });
    authRes.on('end', () => {
      res.status(authRes.statusCode).json(JSON.parse(data));
    });
  });
  req2.on('error', (err) => {
    console.error('[portal proxy]', err.message);
    res.status(502).json({ error: 'AUTH_SERVICE_UNAVAILABLE' });
  });
  req2.write(payload);
  req2.end();
}

// ── Stats (scoped) ────────────────────────────────────────────────────────────
app.get('/admin/api/stats', requireAdmin, async (req, res) => {
  try {
    const scope = countryScope(req.user);
    const countryFilter = scope.value ? `WHERE country = '${scope.value}'` : '';
    const [users, pending, hotels, flights, cars] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM users ${countryFilter}`),
      pool.query(`SELECT COUNT(*) FROM users WHERE COALESCE(status,'active') = 'pending'${scope.value ? ` AND country = '${scope.value}'` : ''}`),
      pool.query(`SELECT COUNT(*) FROM hotel_offers WHERE is_active = true`),
      pool.query(`SELECT COUNT(*) FROM flight_offers WHERE is_active = true`),
      pool.query(`SELECT COUNT(*) FROM car_offers WHERE is_active = true`),
    ]);
    const revenue = await pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) AS total FROM payments WHERE status = 'completed'`
    ).catch(() => ({ rows: [{ total: 0 }] }));
    res.json({
      users:    parseInt(users.rows[0].count),
      pending:  parseInt(pending.rows[0].count),
      hotels:   req.user.role === 'country_admin' ? null : parseInt(hotels.rows[0].count),
      flights:  req.user.role === 'country_admin' ? null : parseInt(flights.rows[0].count),
      cars:     req.user.role === 'country_admin' ? null : parseInt(cars.rows[0].count),
      revenue:  req.user.role === 'super_admin' ? parseFloat(revenue.rows[0].total) : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Pending users ─────────────────────────────────────────────────────────────
app.get('/admin/api/pending-users', requireAdmin, async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit ?? 50), 100);
  const offset = parseInt(req.query.offset ?? 0);
  try {
    const countryFilter = req.user.role === 'country_admin' && req.user.admin_country
      ? `AND country = '${req.user.admin_country}'` : '';
    const { rows } = await pool.query(
      `SELECT id, email, name, country, COALESCE(status,'active') AS status, created_at
         FROM users
        WHERE COALESCE(status,'active') = 'pending' ${countryFilter}
        ORDER BY created_at ASC
        LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const total = await pool.query(
      `SELECT COUNT(*) FROM users WHERE COALESCE(status,'active') = 'pending' ${countryFilter}`
    );
    res.json({ total: parseInt(total.rows[0].count), rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Approve user ──────────────────────────────────────────────────────────────
app.post('/admin/api/users/:id/approve', requireAdmin, async (req, res) => {
  try {
    // country_admin can only approve users in their country
    let whereExtra = '';
    if (req.user.role === 'country_admin' && req.user.admin_country) {
      whereExtra = `AND country = '${req.user.admin_country}'`;
    }
    const { rows } = await pool.query(
      `UPDATE users SET status = 'active', updated_at = NOW()
        WHERE id = $1 AND COALESCE(status,'active') = 'pending' ${whereExtra}
        RETURNING id, email, name, status`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found or not in pending state' });
    await auditLog(req.user.sub, 'approve_user', req.params.id);
    res.json({ message: 'User approved', user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Reject user ───────────────────────────────────────────────────────────────
app.post('/admin/api/users/:id/reject', requireAdmin, async (req, res) => {
  const { reason } = req.body ?? {};
  try {
    let whereExtra = '';
    if (req.user.role === 'country_admin' && req.user.admin_country) {
      whereExtra = `AND country = '${req.user.admin_country}'`;
    }
    const { rows } = await pool.query(
      `UPDATE users SET status = 'rejected', suspension_reason = $2, updated_at = NOW()
        WHERE id = $1 AND COALESCE(status,'active') = 'pending' ${whereExtra}
        RETURNING id, email, name, status`,
      [req.params.id, reason || null]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found or not in pending state' });
    await auditLog(req.user.sub, 'reject_user', req.params.id, { reason: reason || null });
    res.json({ message: 'User rejected', user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Users (scoped) ────────────────────────────────────────────────────────────
app.get('/admin/api/users', requireAdmin, async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit ?? 50), 100);
  const offset = parseInt(req.query.offset ?? 0);
  const search = req.query.search ? `%${req.query.search}%` : null;
  const statusFilter = req.query.status || null;
  try {
    const conditions = [];
    const vals       = [];
    let   i          = 1;
    if (req.user.role === 'country_admin' && req.user.admin_country) {
      conditions.push(`country = $${i++}`); vals.push(req.user.admin_country);
    }
    if (search) {
      conditions.push(`(email ILIKE $${i} OR name ILIKE $${i})`); vals.push(search); i++;
    }
    if (statusFilter) {
      conditions.push(`COALESCE(status,'active') = $${i++}`); vals.push(statusFilter);
    }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const { rows } = await pool.query(
      `SELECT id, email, role, name, country, preferred_currency, preferred_lang,
              COALESCE(status,'active') AS status, is_active, created_at, last_seen_at
         FROM users ${where}
        ORDER BY created_at DESC LIMIT $${i} OFFSET $${i+1}`,
      [...vals, limit, offset]
    );
    const totalRes = await pool.query(
      `SELECT COUNT(*) FROM users ${where}`, vals
    );
    res.json({ total: parseInt(totalRes.rows[0].count), rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Hotels ────────────────────────────────────────────────────────────────────
app.get('/admin/api/hotels', requireAdmin, async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit ?? 50), 100);
  const offset = parseInt(req.query.offset ?? 0);
  const search = req.query.search ? `%${req.query.search}%` : null;
  try {
    const q = search
      ? `SELECT id, hotel_id, name, name_ar, stars, location, distance_haram_m, price_per_night, currency,
                is_hajj_package, is_umrah_package, is_halal_friendly, is_active, created_at
           FROM hotel_offers WHERE name ILIKE $1 OR location ILIKE $1 ORDER BY location, stars DESC LIMIT $2 OFFSET $3`
      : `SELECT id, hotel_id, name, name_ar, stars, location, distance_haram_m, price_per_night, currency,
                is_hajj_package, is_umrah_package, is_halal_friendly, is_active, created_at
           FROM hotel_offers ORDER BY location, stars DESC LIMIT $1 OFFSET $2`;
    const { rows } = await pool.query(q, search ? [search, limit, offset] : [limit, offset]);
    const total = await pool.query(
      search ? `SELECT COUNT(*) FROM hotel_offers WHERE name ILIKE $1 OR location ILIKE $1` : `SELECT COUNT(*) FROM hotel_offers`,
      search ? [search] : []
    );
    res.json({ total: parseInt(total.rows[0].count), rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Flights ───────────────────────────────────────────────────────────────────
app.get('/admin/api/flights', requireAdmin, async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit ?? 50), 100);
  const offset = parseInt(req.query.offset ?? 0);
  try {
    const { rows } = await pool.query(
      `SELECT id, flight_num, airline_code, origin, dest, departure, arrival,
              cabin_class, seats_available, price, currency, is_active
         FROM flight_offers ORDER BY departure ASC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const total = await pool.query(`SELECT COUNT(*) FROM flight_offers`);
    res.json({ total: parseInt(total.rows[0].count), rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Cars ──────────────────────────────────────────────────────────────────────
app.get('/admin/api/cars', requireAdmin, async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit ?? 50), 100);
  const offset = parseInt(req.query.offset ?? 0);
  try {
    const { rows } = await pool.query(
      `SELECT id, vendor_name, vehicle_type, model, seats, transmission,
              pickup_location, available_from, available_to, price_per_day, currency, is_active
         FROM car_offers ORDER BY pickup_location, price_per_day ASC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const total = await pool.query(`SELECT COUNT(*) FROM car_offers`);
    res.json({ total: parseInt(total.rows[0].count), rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Toggle hotel ──────────────────────────────────────────────────────────────
app.patch('/admin/api/hotels/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE hotel_offers SET is_active = NOT is_active WHERE id = $1 RETURNING id, name, is_active`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Toggle user active ────────────────────────────────────────────────────────
app.patch('/admin/api/users/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE users SET is_active = NOT is_active WHERE id = $1 RETURNING id, email, is_active`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Country Admins (super_admin only) ─────────────────────────────────────────
app.get('/admin/api/country-admins', requireSuperAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, email, name, admin_country, created_at, COALESCE(status,'active') AS status
         FROM users WHERE role = 'country_admin' ORDER BY admin_country ASC`
    );
    res.json({ total: rows.length, rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/admin/api/country-admins', requireSuperAdmin, async (req, res) => {
  const { user_id, country } = req.body ?? {};
  if (!user_id || !country) return res.status(400).json({ error: 'user_id and country required' });
  try {
    const { rows } = await pool.query(
      `UPDATE users SET role = 'country_admin', admin_country = $2, updated_at = NOW()
        WHERE id = $1
        RETURNING id, email, name, role, admin_country`,
      [user_id, country.toUpperCase()]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    await auditLog(req.user.sub, 'create_country_admin', user_id, { country });
    res.json({ message: 'Country admin assigned', user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/admin/api/country-admins/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE users SET role = 'user', admin_country = NULL, updated_at = NOW()
        WHERE id = $1 AND role = 'country_admin'
        RETURNING id, email, name, role`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Country admin not found' });
    await auditLog(req.user.sub, 'remove_country_admin', req.params.id);
    res.json({ message: 'Country admin removed', user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Audit log ─────────────────────────────────────────────────────────────────
app.get('/admin/api/audit-log', requireSuperAdmin, async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit ?? 50), 100);
  const offset = parseInt(req.query.offset ?? 0);
  try {
    const { rows } = await pool.query(
      `SELECT l.id, l.action, l.meta, l.created_at,
              a.email AS admin_email, a.name AS admin_name,
              t.email AS target_email, t.name AS target_name
         FROM admin_audit_log l
         LEFT JOIN users a ON a.id = l.admin_id
         LEFT JOIN users t ON t.id = l.target_user_id
        ORDER BY l.created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const total = await pool.query(`SELECT COUNT(*) FROM admin_audit_log`);
    res.json({ total: parseInt(total.rows[0].count), rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin notes on customer profile ──────────────────────────────────────────

app.patch('/admin/api/users/:id/notes', requireAdmin, async (req, res) => {
  const { notes } = req.body ?? {};
  if (typeof notes !== 'string') {
    return res.status(400).json({ error: 'INVALID_BODY', message: 'notes must be a string' });
  }
  try {
    const { rows } = await pool.query(
      `UPDATE users
          SET admin_notes            = $2,
              admin_notes_updated_at = NOW(),
              updated_at             = NOW()
        WHERE id = $1
        RETURNING id, admin_notes, admin_notes_updated_at`,
      [req.params.id, notes.trim() || null],
    );
    if (!rows.length) return res.status(404).json({ error: 'USER_NOT_FOUND' });
    await auditLog(req.user.sub, 'update_admin_notes', req.params.id);
    return res.json({ data: rows[0] });
  } catch (err) {
    console.error('[admin/users/:id/notes]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── Customer 360 profile ──────────────────────────────────────────────────────
// Aggregates user, bookings, payments, loyalty, and support enquiries for one customer.

app.get('/admin/api/users/:id/profile', requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const [userRes, bookingsRes, loyaltyRes, enquiriesRes] = await Promise.all([
      // User profile
      pool.query(
        `SELECT id, email, name, country, preferred_currency, preferred_lang,
                role, is_active, COALESCE(status, 'active') AS status,
                admin_notes, admin_notes_updated_at,
                created_at, last_seen_at
           FROM users
          WHERE id = $1
          LIMIT 1`,
        [id],
      ),
      // Last 20 bookings with payment info
      pool.query(
        `SELECT b.id, b.reference_no, b.product_type, b.status,
                b.total_price, b.currency, b.created_at, b.confirmed_at, b.meta,
                p.id       AS payment_id,
                p.method   AS payment_method,
                p.status   AS payment_status,
                p.amount   AS payment_amount,
                p.currency AS payment_currency,
                p.paid_at,
                p.refunded_at,
                p.refund_amount
           FROM bookings b
           LEFT JOIN payments p ON p.booking_id = b.id
          WHERE b.user_id = $1
          ORDER BY b.created_at DESC
          LIMIT 20`,
        [id],
      ),
      // Loyalty account
      pool.query(
        `SELECT tier, points, lifetime_points, created_at
           FROM loyalty_accounts
          WHERE user_id = $1
          LIMIT 1`,
        [id],
      ),
      // Support enquiries matched by email
      pool.query(
        `SELECT ce.id, ce.topic, ce.message, ce.booking_ref, ce.status, ce.admin_notes, ce.created_at
           FROM contact_enquiries ce
          WHERE ce.email = (SELECT email FROM users WHERE id = $1 LIMIT 1)
          ORDER BY ce.created_at DESC
          LIMIT 10`,
        [id],
      ),
    ]);

    if (!userRes.rows[0]) {
      return res.status(404).json({ error: 'USER_NOT_FOUND' });
    }

    return res.json({
      data: {
        user:      userRes.rows[0],
        bookings:  bookingsRes.rows,
        loyalty:   loyaltyRes.rows[0] ?? null,
        enquiries: enquiriesRes.rows,
      },
    });
  } catch (err) {
    console.error('[admin/users/:id/profile]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── Infrastructure routes ─────────────────────────────────────────────────────
const infraHealthRouter   = require('./src/routes/infrastructure.health');
const iranIsolationRouter = require('./src/routes/iran.isolation');
app.use('/api/admin/infrastructure', infraHealthRouter);
app.use('/api/admin/infrastructure', iranIsolationRouter);

// ── Marketing routes ──────────────────────────────────────────────────────────
const marketingRouter = require('./src/routes/marketing.router');
app.use('/api/admin/marketing', marketingRouter);

// CRM routes removed — now served by sales-service on port 3013
// See backend/services/sales/ for all /api/sales/* endpoints

// ── Finance routes ────────────────────────────────────────────────────────────
const financeRouter = require('./src/routes/finance.router');
app.use('/api/admin/finance', financeRouter);

// ── HR routes ─────────────────────────────────────────────────────────────────
const hrRouter = require('./src/routes/hr.router');
app.use('/api/admin/hr', hrRouter);

// ── Compliance routes ──────────────────────────────────────────────────────────
const complianceRouter = require('./src/routes/compliance.router');
app.use('/api/admin/compliance', complianceRouter);

// ── Legal routes ───────────────────────────────────────────────────────────────
const legalRouter = require('./src/routes/legal.router');
app.use('/api/admin/legal', legalRouter);

// ── Ops routes ────────────────────────────────────────────────────────────────
const opsRouter = require('./src/routes/ops.router');
app.use('/api/admin/ops', opsRouter);

// ── Dev routes ────────────────────────────────────────────────────────────────
const devRouter = require('./src/routes/dev.router');
app.use('/api/admin/dev', devRouter);

// ── Products routes ───────────────────────────────────────────────────────────
const productsRouter = require('./src/routes/products.router');
app.use('/api/admin/products', productsRouter);

// ── Business Development routes ───────────────────────────────────────────────
const bizdevRouter = require('./src/routes/bizdev.router');
app.use('/api/admin/bizdev', bizdevRouter);

// ── Revenue Management routes ─────────────────────────────────────────────────
const revenueRouter = require('./src/routes/revenue.router');
app.use('/api/admin/revenue', revenueRouter);

// ── Customer Success routes ───────────────────────────────────────────────────
const customerSuccessRouter = require('./src/routes/customer-success.router');
app.use('/api/admin/customer-success', customerSuccessRouter);

// ── Procurement routes ────────────────────────────────────────────────────────
const procurementRouter = require('./src/routes/procurement.router');
app.use('/api/admin/procurement', procurementRouter);

// ── Fraud & Risk routes ───────────────────────────────────────────────────────
const fraudRouter = require('./src/routes/fraud.router');
app.use('/api/admin/fraud', fraudRouter);

// ── Analytics / BI routes ─────────────────────────────────────────────────────
const analyticsRouter = require('./src/routes/analytics.router');
app.use('/api/admin/analytics', analyticsRouter);

// ── 404 / Error ───────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND' }));
app.use((err, _req, res, _next) => {
  console.error('[admin]', err);
  res.status(500).json({ error: 'INTERNAL_ERROR' });
});

module.exports = app;
