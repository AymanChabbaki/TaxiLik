const crypto = require('crypto');
const RefreshToken = require('../models/RefreshToken');
const env = require('../config/env');
const { signToken } = require('../utils/jwt');

const hash = (t) => crypto.createHash('sha256').update(t).digest('hex');

// Issue a fresh access token + a new opaque refresh token (stored hashed).
async function issueTokens(user) {
  const raw = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + env.jwt.refreshTtlDays * 86400000);
  await RefreshToken.create({ user: user._id, tokenHash: hash(raw), expiresAt });
  return { token: signToken(user), refreshToken: raw, user };
}

// Validate + single-use rotate a refresh token. Returns null if invalid/expired.
async function rotate(rawToken) {
  if (!rawToken) return null;
  const doc = await RefreshToken.findOne({ tokenHash: hash(rawToken) }).populate('user');
  if (!doc) return null;
  await doc.deleteOne(); // single-use: always consume
  if (doc.expiresAt < new Date()) return null;
  const user = doc.user;
  if (!user || user.isBlocked) return null;
  return issueTokens(user);
}

async function revoke(rawToken) {
  if (rawToken) await RefreshToken.deleteOne({ tokenHash: hash(rawToken) });
}

async function revokeAll(userId) {
  await RefreshToken.deleteMany({ user: userId });
}

module.exports = { issueTokens, rotate, revoke, revokeAll };
