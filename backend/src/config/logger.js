const pino = require('pino');
const env = require('./env');

// Structured JSON logs in production; pretty (if available) in dev.
const logger = pino({
  level: process.env.LOG_LEVEL || (env.isProd ? 'info' : 'debug'),
  redact: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.passwordHash'],
  ...(env.isProd
    ? {}
    : { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } } }),
});

module.exports = { logger };
