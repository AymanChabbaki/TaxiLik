const express = require('express');
const cors = require('cors');
const pinoHttp = require('pino-http');

const env = require('./config/env');
const { logger } = require('./config/logger');
const { UPLOAD_DIR } = require('./middleware/upload.middleware');
const { notFound, errorHandler } = require('./middleware/error.middleware');
const { securityHeaders, sanitize, globalLimiter, authLimiter } = require('./middleware/security.middleware');
const authRoutes = require('./routes/auth.routes');
const rideRoutes = require('./routes/ride.routes');
const driverRoutes = require('./routes/driver.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

// Behind Nginx / a load balancer — trust the proxy for correct client IPs (rate
// limiting) and protocol (https in upload URLs).
app.set('trust proxy', 1);

app.use(securityHeaders);
app.use(pinoHttp({ logger }));

// CORS: allow-list in production, permissive in dev.
app.use(
  cors(
    env.corsOrigins.length
      ? { origin: env.corsOrigins, credentials: true }
      : undefined
  )
);

app.use(express.json({ limit: '1mb' }));
app.use(sanitize);
app.use(globalLimiter);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'taxilik-api' }));

// Serve uploaded driver documents / avatars.
app.use('/uploads', express.static(UPLOAD_DIR));

// Stricter limit on auth (login / register / OTP) to blunt brute force.
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
