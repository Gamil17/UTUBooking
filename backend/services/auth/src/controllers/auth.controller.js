const tokenService = require('../services/token.service');
const userService  = require('../services/user.service');
const {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
  validate,
} = require('../validators/auth.validator');

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
      message: 'Account created successfully.',
      userId:  user.id,
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

    const accessToken = tokenService.generateAccessToken(user);
    const { token: refreshToken, jti } = tokenService.generateRefreshToken(user.id);
    await tokenService.storeRefreshToken(user.id, jti);

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

module.exports = { register, login, refresh, logout };
