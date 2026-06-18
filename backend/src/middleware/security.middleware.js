const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { getRedis } = require('../config/redis');

// Security headers. crossOriginResourcePolicy is relaxed so uploaded images
// (served from /uploads) load in the app/browser from a different origin.
const securityHeaders = helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

// Recursively strip keys that could drive NoSQL/operator injection. We mutate
// req.body / req.params in place (NOT req.query, which is read-only in Express 5).
function strip(obj) {
  if (!obj || typeof obj !== 'object') return;
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
    } else {
      strip(obj[key]);
    }
  }
}
// Express 5 makes req.query read-only, so we rebuild a sanitised plain object
// and shadow it via Object.defineProperty instead of mutating in place.
function sanitizeQuery(req) {
  try {
    const clean = JSON.parse(JSON.stringify(req.query)); // plain object copy
    strip(clean);
    Object.defineProperty(req, 'query', { value: clean, writable: true, configurable: true });
  } catch {
    // If query can't be cloned just leave it; strip(req.query) would throw anyway.
  }
}

function sanitize(req, _res, next) {
  strip(req.body);
  strip(req.params);
  sanitizeQuery(req);
  next();
}

// Build a rate limiter backed by Redis when available (so limits are shared
// across replicas), otherwise in-memory.
function makeLimiter({ windowMs, max, prefix }) {
  const redis = getRedis();
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
    store: redis
      ? new RedisStore({ prefix, sendCommand: (...args) => redis.call(...args) })
      : undefined,
  });
}

// Generous global limit; tight limit for auth/OTP (brute-force / abuse).
const globalLimiter = makeLimiter({ windowMs: 60 * 1000, max: 300, prefix: 'rl:all:' });
const authLimiter = makeLimiter({ windowMs: 15 * 60 * 1000, max: 20, prefix: 'rl:auth:' });

module.exports = { securityHeaders, sanitize, globalLimiter, authLimiter };
