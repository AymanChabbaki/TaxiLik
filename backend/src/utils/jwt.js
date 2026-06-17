const jwt = require('jsonwebtoken');
const env = require('../config/env');

// Short-lived access token. Refresh tokens are opaque + stored (see RefreshToken).
function signToken(user) {
  return jwt.sign(
    { sub: String(user._id), role: user.role, email: user.email },
    env.jwt.secret,
    { expiresIn: env.jwt.accessExpiresIn }
  );
}

function verifyToken(token) {
  return jwt.verify(token, env.jwt.secret);
}

module.exports = { signToken, verifyToken };
