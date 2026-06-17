const mongoose = require('mongoose');
const env = require('./env');

mongoose.set('strictQuery', true);

async function connectDB() {
  mongoose.connection.on('connected', () => {
    console.log('[db] MongoDB connected');
  });
  mongoose.connection.on('error', (err) => {
    console.error('[db] MongoDB error:', err.message);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('[db] MongoDB disconnected');
  });

  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 8000,
  });
  return mongoose.connection;
}

module.exports = { connectDB };
