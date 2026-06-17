const http = require('http');
const mongoose = require('mongoose');
const app = require('./app');
const env = require('./config/env');
const { logger } = require('./config/logger');
const { connectDB } = require('./config/db');
const { initSockets } = require('./sockets');
const { verifyConnection } = require('./services/mailer.service');

async function start() {
  await connectDB();

  // Verify SMTP early so misconfiguration surfaces at boot, not at first OTP.
  try {
    await verifyConnection();
    logger.info('SMTP connection verified');
  } catch (err) {
    logger.warn(`SMTP not ready: ${err.message}`);
  }

  const server = http.createServer(app);
  const io = initSockets(server);

  server.listen(env.port, () => {
    logger.info(`TaxiLik API listening on :${env.port} (${env.nodeEnv})`);
  });

  // Graceful shutdown: stop accepting connections, close sockets + DB, then exit.
  const shutdown = (signal) => {
    logger.info(`${signal} received — shutting down`);
    io.close();
    server.close(() => {
      mongoose.connection.close(false).finally(() => process.exit(0));
    });
    // Hard stop if it hangs.
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  logger.error({ err }, 'Failed to start');
  process.exit(1);
});
