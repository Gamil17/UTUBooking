const { Router }    = require('express');
const rateLimit     = require('express-rate-limit');
const controller    = require('../controllers/auth.controller');

const router = Router();

// ── Rate limiters ──────────────────────────────────────────────────────────────
// Strict limit on login + forgot-password to block brute-force and password
// spraying. Per-IP, resets after windowMs.
const loginLimiter = rateLimit({
  windowMs:        15 * 60 * 1000, // 15 minutes
  max:             10,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: 'TOO_MANY_REQUESTS', message: 'Too many login attempts. Please try again later.' },
  skipSuccessfulRequests: true,
});

const forgotLimiter = rateLimit({
  windowMs:        60 * 60 * 1000, // 1 hour
  max:             5,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: 'TOO_MANY_REQUESTS', message: 'Too many password reset requests. Please try again later.' },
});

const registerLimiter = rateLimit({
  windowMs:        60 * 60 * 1000, // 1 hour
  max:             10,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: 'TOO_MANY_REQUESTS', message: 'Too many registration attempts. Please try again later.' },
});

// ── Routes ─────────────────────────────────────────────────────────────────────
router.post('/register',         registerLimiter, controller.register);
router.post('/login',            loginLimiter,    controller.login);
router.post('/refresh',                           controller.refresh);
router.post('/logout',                            controller.logout);
router.post('/forgot-password',  forgotLimiter,   controller.forgotPassword);
router.post('/reset-password',   forgotLimiter,   controller.resetPassword);

module.exports = router;
