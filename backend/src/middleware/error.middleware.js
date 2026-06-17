const env = require('../config/env');

function notFound(req, res, next) {
  res.status(404).json({ error: 'Route not found', path: req.originalUrl });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  // Mongoose: duplicate key
  if (err.code === 11000) {
    status = 409;
    message = 'Resource already exists';
  }
  // Mongoose: validation
  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  }
  // Mongoose: bad ObjectId
  if (err.name === 'CastError') {
    status = 400;
    message = `Invalid ${err.path}`;
  }

  if (status >= 500) {
    console.error('[error]', err);
  }

  res.status(status).json({
    error: message,
    details: err.details,
    ...(env.nodeEnv === 'development' && status >= 500 ? { stack: err.stack } : {}),
  });
}

module.exports = { notFound, errorHandler };
