const User = require('../models/User');
const Ride = require('../models/Ride');
const Otp = require('../models/Otp');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { requestOtp, verifyOtp, requestPasswordResetOtp } = require('../services/otp.service');
const { hashPassword, verifyPassword } = require('../utils/password');
const { issueTokens, rotate, revoke, revokeAll } = require('../services/token.service');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/register  { email, password, fullName?, phone?, role? }
// Creates an unverified account with a password and emails an OTP to confirm
// the address. The account is usable for login only after email verification.
const register = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  const password = String(req.body.password || '');
  const role = ['passenger', 'driver'].includes(req.body.role) ? req.body.role : 'passenger';
  const fullName = req.body.fullName ? String(req.body.fullName).trim() : undefined;
  const phone = req.body.phone ? String(req.body.phone).trim() : undefined;

  if (!EMAIL_RE.test(email)) throw ApiError.badRequest('A valid email is required');
  if (password.length < 8) throw ApiError.badRequest('Password must be at least 8 characters');
  if (password.length > 128) throw ApiError.badRequest('Password is too long');
  if (fullName && fullName.length > 100) throw ApiError.badRequest('Full name is too long');
  if (phone && phone.length > 20) throw ApiError.badRequest('Phone number is too long');

  const existing = await User.findOne({ email });
  if (existing && existing.emailVerified) {
    throw ApiError.conflict('This email is already registered. Please sign in.');
  }

  const passwordHash = hashPassword(password);
  if (existing) {
    // Re-registering an unverified account: update its details + password.
    existing.passwordHash = passwordHash;
    existing.role = role;
    if (fullName) existing.fullName = fullName;
    if (phone) existing.phone = phone;
    await existing.save();
  } else {
    await User.create({ email, passwordHash, role, fullName, phone, emailVerified: false });
  }

  const { expiresAt } = await requestOtp(email, role);
  res.json({ message: 'OTP sent', email, expiresAt });
});

// POST /api/auth/verify-email  { email, code }
// Confirms the email via OTP and signs the user in (auto-login after register).
const verifyEmail = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  const code = String(req.body.code || '').trim();

  if (!EMAIL_RE.test(email)) throw ApiError.badRequest('A valid email is required');
  if (!code) throw ApiError.badRequest('Code is required');

  const result = await verifyOtp(email, code);
  if (!result.ok) {
    const map = {
      no_otp: 'No active code. Request a new one.',
      expired: 'Code expired. Request a new one.',
      too_many_attempts: 'Too many attempts. Request a new code.',
      invalid: 'Invalid code.',
    };
    throw ApiError.badRequest(map[result.reason] || 'Verification failed');
  }

  const user = await User.findOne({ email });
  if (!user) throw ApiError.badRequest('Please register first.');
  if (user.isBlocked) throw ApiError.forbidden('Account is blocked');

  if (!user.emailVerified) {
    user.emailVerified = true;
    await user.save();
  }

  const { token, refreshToken } = await issueTokens(user);
  res.json({ token, refreshToken, user: user.toPublic() });
});

// POST /api/auth/login  { email, password }
const login = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  const password = String(req.body.password || '');

  if (!EMAIL_RE.test(email) || !password) {
    throw ApiError.badRequest('Email and password are required');
  }

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  if (user.isBlocked) throw ApiError.forbidden('Account is blocked');
  if (!user.emailVerified) {
    // Re-send a verification code so they can finish onboarding.
    await requestOtp(email, user.role);
    throw new ApiError(403, 'Please verify your email. A new code has been sent.', { needsVerification: true });
  }

  const { token, refreshToken } = await issueTokens(user);
  res.json({ token, refreshToken, user: user.toPublic() });
});

// POST /api/auth/refresh  { refreshToken }  -> rotated { token, refreshToken }
const refresh = asyncHandler(async (req, res) => {
  const result = await rotate(req.body.refreshToken);
  if (!result) throw ApiError.unauthorized('Invalid or expired refresh token');
  res.json({ token: result.token, refreshToken: result.refreshToken, user: result.user.toPublic() });
});

// POST /api/auth/logout  { refreshToken }
const logout = asyncHandler(async (req, res) => {
  await revoke(req.body.refreshToken);
  res.json({ message: 'Logged out' });
});

// POST /api/auth/resend-otp  { email }
const resendOtp = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  if (!EMAIL_RE.test(email)) throw ApiError.badRequest('A valid email is required');
  const user = await User.findOne({ email });
  await requestOtp(email, user?.role || 'passenger');
  res.json({ message: 'OTP sent', email });
});

// POST /api/auth/avatar  (multipart: field "file") -> updated user
const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded');
  req.user.avatarUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  await req.user.save();
  res.json({ user: req.user.toPublic() });
});

// GET /api/auth/me
const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toPublic() });
});

// PATCH /api/auth/me  { fullName, phone }
const updateMe = asyncHandler(async (req, res) => {
  const { fullName, phone } = req.body;
  if (fullName !== undefined) {
    const name = String(fullName).trim();
    if (name.length > 100) throw ApiError.badRequest('Full name is too long');
    req.user.fullName = name;
  }
  if (phone !== undefined) {
    const p = String(phone).trim();
    if (p.length > 20) throw ApiError.badRequest('Phone number is too long');
    req.user.phone = p;
  }
  await req.user.save();
  res.json({ user: req.user.toPublic() });
});

// DELETE /api/auth/me  — permanently delete the account and related data.
const deleteMe = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  await Promise.all([
    Ride.deleteMany({ $or: [{ passenger: userId }, { driver: userId }] }),
    Otp.deleteMany({ email: req.user.email }),
    revokeAll(userId),
  ]);
  await User.deleteOne({ _id: userId });
  res.json({ message: 'Account deleted' });
});

// PATCH /api/auth/push-token  { token }
// Registers the device's Expo push token so the server can send notifications.
const registerPushToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token || typeof token !== 'string') throw ApiError.badRequest('token is required');
  if (!token.startsWith('ExponentPushToken[')) throw ApiError.badRequest('Invalid push token format');
  req.user.pushToken = token;
  await req.user.save();
  res.json({ ok: true });
});

// POST /api/auth/forgot-password  { email }
const forgotPassword = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  if (!EMAIL_RE.test(email)) throw ApiError.badRequest('A valid email is required');

  const user = await User.findOne({ email });
  // Only send if the account exists and is verified — never reveal whether email is registered
  if (user && user.emailVerified && !user.isBlocked) {
    await requestPasswordResetOtp(email, user.role);
  }
  res.json({ message: 'If this email exists, a reset code was sent', email });
});

// POST /api/auth/reset-password  { email, code, newPassword }
const resetPassword = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  const code = String(req.body.code || '').trim();
  const newPassword = String(req.body.newPassword || '');

  if (!EMAIL_RE.test(email) || !code || !newPassword) {
    throw ApiError.badRequest('All fields are required');
  }
  if (newPassword.length < 8) throw ApiError.badRequest('Password must be at least 8 characters');
  if (newPassword.length > 128) throw ApiError.badRequest('Password is too long');

  const result = await verifyOtp(email, code);
  if (!result.ok) {
    const map = {
      no_otp: 'No active code. Request a new one.',
      expired: 'Code expired. Request a new one.',
      too_many_attempts: 'Too many attempts. Request a new code.',
      invalid: 'Invalid code.',
    };
    throw ApiError.badRequest(map[result.reason] || 'Verification failed');
  }

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) throw ApiError.badRequest('Account not found');

  user.passwordHash = hashPassword(newPassword);
  await user.save();
  await revokeAll(user._id);

  res.json({ message: 'Password reset successfully. Please sign in.' });
});

// PATCH /api/auth/me/password  { currentPassword, newPassword }
const changePassword = asyncHandler(async (req, res) => {
  const currentPassword = String(req.body.currentPassword || '');
  const newPassword = String(req.body.newPassword || '');

  if (!currentPassword || !newPassword) {
    throw ApiError.badRequest('Both passwords are required');
  }
  if (newPassword.length < 8) throw ApiError.badRequest('Password must be at least 8 characters');
  if (newPassword.length > 128) throw ApiError.badRequest('Password is too long');

  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!verifyPassword(currentPassword, user.passwordHash)) {
    throw ApiError.unauthorized('Current password is incorrect');
  }

  user.passwordHash = hashPassword(newPassword);
  await user.save();

  // Revoke all sessions then re-issue so this device stays signed in
  await revokeAll(user._id);
  const { token, refreshToken } = await issueTokens(user);

  res.json({ message: 'Password changed', token, refreshToken });
});

module.exports = {
  register,
  verifyEmail,
  login,
  refresh,
  logout,
  resendOtp,
  forgotPassword,
  resetPassword,
  changePassword,
  uploadAvatar,
  me,
  updateMe,
  deleteMe,
  registerPushToken,
};
