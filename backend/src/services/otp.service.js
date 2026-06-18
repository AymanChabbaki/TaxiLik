const crypto = require('crypto');
const Otp = require('../models/Otp');
const env = require('../config/env');
const { sendMail, otpEmailTemplate, resetPasswordEmailTemplate } = require('./mailer.service');

function generateCode(length = env.otp.length) {
  const max = 10 ** length;
  const n = crypto.randomInt(0, max);
  return String(n).padStart(length, '0');
}

function hashCode(code) {
  return crypto.createHmac('sha256', env.otpSecret).update(code).digest('hex');
}

/**
 * Create an OTP for an email, persist its hash, and email the plaintext code.
 * Any previous unconsumed OTPs for the email are invalidated.
 */
async function requestOtp(email, role = 'passenger') {
  await Otp.deleteMany({ email, consumedAt: null });

  const code = generateCode();
  const expiresAt = new Date(Date.now() + env.otp.ttlMinutes * 60 * 1000);

  await Otp.create({ email, codeHash: hashCode(code), role, expiresAt });

  const { text, html } = otpEmailTemplate(code, env.otp.ttlMinutes);
  await sendMail({ to: email, subject: 'Votre code TaxiLik.ma', text, html });

  return { expiresAt };
}

/**
 * Verify a submitted code. Returns { ok, reason }.
 */
async function verifyOtp(email, code) {
  const otp = await Otp.findOne({ email, consumedAt: null }).sort({ createdAt: -1 });
  if (!otp) return { ok: false, reason: 'no_otp' };
  if (otp.expiresAt < new Date()) return { ok: false, reason: 'expired' };
  if (otp.attempts >= env.otp.maxAttempts) return { ok: false, reason: 'too_many_attempts' };

  const matches = crypto.timingSafeEqual(
    Buffer.from(otp.codeHash),
    Buffer.from(hashCode(code))
  );

  if (!matches) {
    otp.attempts += 1;
    await otp.save();
    return { ok: false, reason: 'invalid' };
  }

  otp.consumedAt = new Date();
  await otp.save();
  return { ok: true, role: otp.role };
}

async function requestPasswordResetOtp(email, role = 'passenger') {
  await Otp.deleteMany({ email, consumedAt: null });
  const code = generateCode();
  const expiresAt = new Date(Date.now() + env.otp.ttlMinutes * 60 * 1000);
  await Otp.create({ email, codeHash: hashCode(code), role, expiresAt });
  const { text, html } = resetPasswordEmailTemplate(code, env.otp.ttlMinutes);
  await sendMail({ to: email, subject: 'Réinitialisation de mot de passe — TaxiLik.ma', text, html });
  return { expiresAt };
}

module.exports = { requestOtp, verifyOtp, requestPasswordResetOtp };
