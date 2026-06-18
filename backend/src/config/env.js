require('dotenv').config();
const path = require('path');

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT || '5000', 10),
  mongoUri: required('MONGO_URI', 'mongodb://127.0.0.1:27017/taxilik'),

  // Redis powers Socket.IO fan-out across replicas, rate-limit counters, and the
  // ride-viewers set. Optional in dev (single instance) — falls back to memory.
  redisUrl: process.env.REDIS_URL || '',

  // CORS allow-list (comma-separated origins). Empty => allow all (dev only).
  corsOrigins: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  // Where uploaded driver docs / avatars are stored (mount a volume in prod).
  uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads'),

  // Separate secret for OTP HMAC — rotating JWT_SECRET won't invalidate pending OTPs.
  otpSecret: required('OTP_SECRET', 'dev-otp-secret-change-me'),

  jwt: {
    secret: required('JWT_SECRET', 'dev-insecure-secret-change-me'),
    // Short-lived access token; long-lived rotating refresh token.
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshTtlDays: parseInt(process.env.JWT_REFRESH_TTL_DAYS || '30', 10),
  },

  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || 'TaxiLik.ma <no-reply@taxilik.ma>',
  },

  otp: {
    length: parseInt(process.env.OTP_LENGTH || '6', 10),
    ttlMinutes: parseInt(process.env.OTP_TTL_MINUTES || '10', 10),
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10),
  },

  // Legal Moroccan petit-taxi tariff (Casablanca). All amounts in DH.
  fare: {
    perKm: parseFloat(process.env.FARE_PER_KM || '0.50'),
    pickupDay: parseFloat(process.env.FARE_PICKUP_DAY || '2.00'),
    pickupNight: parseFloat(process.env.FARE_PICKUP_NIGHT || '4.00'),
    nightStartHour: parseInt(process.env.FARE_NIGHT_START_HOUR || '20', 10), // 20:00
    nightEndHour: parseInt(process.env.FARE_NIGHT_END_HOUR || '6', 10), // 06:00
    minFare: parseFloat(process.env.FARE_MIN || '0'),
  },

  // Radius (meters) within which a ride request is broadcast to drivers.
  matchRadiusMeters: parseInt(process.env.MATCH_RADIUS_METERS || '3000', 10),
};

module.exports = env;
