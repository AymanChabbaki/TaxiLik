const { verifyToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');

// Authenticates via Bearer token and loads the user onto req.user.
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw ApiError.unauthorized('Missing bearer token');

    const payload = verifyToken(token);
    const user = await User.findById(payload.sub);
    if (!user) throw ApiError.unauthorized('User no longer exists');
    if (user.isBlocked) throw ApiError.forbidden('Account is blocked');

    req.user = user;
    next();
  } catch (err) {
    if (err.isApiError) return next(err);
    return next(ApiError.unauthorized('Invalid or expired token'));
  }
}

// Restricts a route to specific roles. Use after authenticate.
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(ApiError.forbidden('Insufficient permissions'));
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
