const crypto       = require('crypto');
const tokenService = require('../services/token.service');
const userService  = require('../services/user.service');
const redis        = require('../services/redis.service');
const {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  validate,
} = require('../validators/auth.validator');

const RESET_TTL_SECONDS = 3600; // 1 hour
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';
const SENDGRID_API_KEY    = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL ?? 'noreply@utubooking.com';

function resetTokenKey(hash) {
  return `pwd_reset:${hash}`;
}

async function sendResetEmail(toEmail, resetUrl) {
  if (!SENDGRID_API_KEY) {
    console.warn('[forgot-password] SENDGRID_API_KEY not set — skipping email dispatch');
    console.info('[forgot-password] reset URL:', resetUrl);
    return;
  }
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: toEmail }] }],
      from: { email: SENDGRID_FROM_EMAIL, name: 'UTUBooking' },
      subject: 'Reset your UTUBooking password',
      content: [
        {
          type: 'text/plain',
          value: `You requested a password reset.\n\nClick the link below to set a new password (valid for 1 hour):\n\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.`,
        },
        {
          type: 'text/html',
          value: `<p>You requested a password reset.</p><p><a href="${resetUrl}">Reset my password</a></p><p>This link is valid for 1 hour. If you did not request this, you can safely ignore this email.</p>`,
        },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error('[forgot-password] SendGrid error:', res.status, body);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function validationError(res, details) {
  return res.status(400).json({
    error:   'VALIDATION_ERROR',
    details: details.map((d) => d.message),
  });
}

function tokenResponse(accessToken, refreshToken) {
  return {
    tokenType:    'Bearer',
    accessToken,
    refreshToken,
    expiresIn:    tokenService.ACCESS_TTL, // 900 seconds
  };
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────

async function register(req, res, next) {
  try {
    const { error, value } = validate(registerSchema, req.body);
    if (error) return validationError(res, error.details);

    const taken = await userService.emailExists(value.email);
    if (taken) {
      return res.status(409).json({
        error:   'EMAIL_TAKEN',
        message: 'An account with this email address already exists.',
      });
    }

    const user = await userService.createUser(value);

    return res.status(201).json({
      message: 'Account created successfully. Your registration is pending approval by a country administrator.',
      userId:  user.id,
      status:  'pending',
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

async function login(req, res, next) {
  try {
    const { error, value } = validate(loginSchema, req.body);
    if (error) return validationError(res, error.details);

    const user = await userService.findByEmail(value.email);

    // Use constant-time comparison path regardless of whether user exists
    // to prevent user-enumeration via timing attacks
    const passwordHash = user ? user.password_hash : '$2b$12$invalidhashpaddingtoensureconstanttime000000000000000000';
    const valid = await userService.verifyPassword(value.password, passwordHash);

    if (!user || !valid) {
      return res.status(401).json({
        error:   'INVALID_CREDENTIALS',
        message: 'Incorrect email or password.',
      });
    }

    // Block login for non-active accounts (password verified above to prevent enumeration)
    if (user.status === 'pending') {
      return res.status(403).json({
        error:   'ACCOUNT_PENDING',
        message: 'Your account is awaiting approval by a country administrator. You will be notified once approved.',
      });
    }
    if (user.status === 'rejected') {
      return res.status(403).json({
        error:   'ACCOUNT_REJECTED',
        message: 'Your registration was not approved. Please contact support for more information.',
      });
    }
    if (user.status === 'suspended') {
      return res.status(403).json({
        error:   'ACCOUNT_SUSPENDED',
        message: 'Your account has been suspended. Please contact support.',
      });
    }

    const accessToken = tokenService.generateAccessToken(user);
    const { token: refreshToken, jti } = tokenService.generateRefreshToken(user.id);
    await tokenService.storeRefreshToken(user.id, jti);

    // Non-blocking — update last_seen_at without delaying the login response
    userService.touchLastSeen(user.id).catch(() => {});

    return res.json(tokenResponse(accessToken, refreshToken));
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────

async function refresh(req, res, next) {
  try {
    const { error, value } = validate(refreshSchema, req.body);
    if (error) return validationError(res, error.details);

    // Verify signature and expiry
    let payload;
    try {
      payload = tokenService.verifyRefreshToken(value.refreshToken);
    } catch {
      return res.status(401).json({
        error:   'INVALID_TOKEN',
        message: 'Refresh token is invalid or has expired.',
      });
    }

    if (payload.type !== 'refresh') {
      return res.status(401).json({ error: 'INVALID_TOKEN', message: 'Wrong token type.' });
    }

    // Check Redis — key must exist (proves it hasn't been revoked)
    const valid = await tokenService.isRefreshTokenValid(payload.sub, payload.jti);
    if (!valid) {
      return res.status(401).json({
        error:   'TOKEN_REVOKED',
        message: 'Refresh token has been revoked. Please log in again.',
      });
    }

    // Rotate: atomically revoke old token before issuing new one
    await tokenService.revokeRefreshToken(payload.sub, payload.jti);

    // Reload user to pick up any role/status changes since original login
    const user = await userService.findById(payload.sub);
    if (!user) {
      return res.status(401).json({
        error:   'USER_NOT_FOUND',
        message: 'Account no longer exists.',
      });
    }

    const accessToken = tokenService.generateAccessToken(user);
    const { token: newRefreshToken, jti: newJti } = tokenService.generateRefreshToken(user.id);
    await tokenService.storeRefreshToken(user.id, newJti);

    return res.json(tokenResponse(accessToken, newRefreshToken));
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/auth/logout ────────────────────────────────────────────────────

async function logout(req, res, next) {
  try {
    const { error, value } = validate(logoutSchema, req.body);
    if (error) return validationError(res, error.details);

    // Best-effort: verify token to extract jti. If already expired or invalid,
    // treat as already-logged-out — logout must always succeed from UX perspective.
    let payload;
    try {
      payload = tokenService.verifyRefreshToken(value.refreshToken);
    } catch {
      // Token invalid/expired → already effectively logged out
      return res.json({ message: 'Logged out.' });
    }

    if (payload.jti) {
      await tokenService.revokeRefreshToken(payload.sub, payload.jti);
    }

    return res.json({ message: 'Logged out.' });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────

async function forgotPassword(req, res, next) {
  try {
    const { error, value } = validate(forgotPasswordSchema, req.body);
    if (error) return validationError(res, error.details);

    // Always return 200 regardless of whether the email exists — prevents enumeration
    const user = await userService.findByEmail(value.email);
    if (user) {
      const rawToken  = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await redis.setex(resetTokenKey(tokenHash), RESET_TTL_SECONDS, user.id);

      const resetUrl = `${FRONTEND_URL}/reset-password?token=${rawToken}`;
      sendResetEmail(user.email, resetUrl).catch((err) =>
        console.error('[forgot-password] email dispatch failed:', err.message)
      );
    }

    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/auth/reset-password ───────────────────────────────────────────

async function resetPassword(req, res, next) {
  try {
    const { error, value } = validate(resetPasswordSchema, req.body);
    if (error) return validationError(res, error.details);

    const tokenHash = crypto.createHash('sha256').update(value.token).digest('hex');
    const userId    = await redis.get(resetTokenKey(tokenHash));

    if (!userId) {
      return res.status(400).json({
        error:   'INVALID_OR_EXPIRED_TOKEN',
        message: 'This reset link is invalid or has expired. Please request a new one.',
      });
    }

    await userService.updatePassword(userId, value.password);
    await redis.del(resetTokenKey(tokenHash));

    return res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/auth/change-password ──────────────────────────────────────────
// Authenticated endpoint — requires valid Bearer access token.
// Verifies the current password before updating to the new one.

async function changePassword(req, res, next) {
  try {
    // Extract and verify the access token
    const authHeader = req.headers.authorization ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header.' });
    }
    let claims;
    try {
      claims = tokenService.verifyAccessToken(authHeader.slice(7).trim());
    } catch {
      return res.status(401).json({ error: 'INVALID_TOKEN', message: 'Access token is invalid or has expired.' });
    }

    const { error, value } = validate(changePasswordSchema, req.body);
    if (error) return validationError(res, error.details);

    const user = await userService.findById(claims.sub);
    if (!user) {
      return res.status(404).json({ error: 'USER_NOT_FOUND', message: 'Account not found.' });
    }

    // Verify the current password
    const valid = await userService.verifyPassword(value.current_password, user.password_hash);
    if (!valid) {
      return res.status(400).json({ error: 'WRONG_CURRENT_PASSWORD', message: 'Current password is incorrect.' });
    }

    if (value.current_password === value.new_password) {
      return res.status(400).json({ error: 'SAME_PASSWORD', message: 'New password must be different from your current password.' });
    }

    await userService.updatePassword(user.id, value.new_password);

    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, refresh, logout, forgotPassword, resetPassword, changePassword };
