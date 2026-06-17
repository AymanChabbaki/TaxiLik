const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { verifyToken } = require('../utils/jwt');
const { getRedis } = require('../config/redis');
const User = require('../models/User');
const { setIO, emitToRide } = require('./io');

// Ride-offer viewers. With Redis the counts are correct across replicas; without
// it we fall back to per-instance memory (fine for a single instance).
const redis = getRedis();
const memViewers = new Map(); // rideId -> Set(driverId)
const rk = (rideId) => `rv:${rideId}`; // set of viewers for a ride
const rdk = (driverId) => `rvd:${driverId}`; // set of rides a driver is viewing

async function addViewer(rideId, driverId) {
  if (redis) {
    await redis.sadd(rk(rideId), driverId);
    await redis.expire(rk(rideId), 600);
    await redis.sadd(rdk(driverId), rideId);
    return redis.scard(rk(rideId));
  }
  if (!memViewers.has(rideId)) memViewers.set(rideId, new Set());
  memViewers.get(rideId).add(driverId);
  return memViewers.get(rideId).size;
}
async function removeViewer(rideId, driverId) {
  if (redis) {
    await redis.srem(rk(rideId), driverId);
    await redis.srem(rdk(driverId), rideId);
    return redis.scard(rk(rideId));
  }
  const set = memViewers.get(rideId);
  if (set) {
    set.delete(driverId);
    if (set.size === 0) memViewers.delete(rideId);
  }
  return set ? set.size : 0;
}
async function dropViewerEverywhere(driverId) {
  if (redis) {
    const rides = await redis.smembers(rdk(driverId));
    for (const rideId of rides) {
      await redis.srem(rk(rideId), driverId);
      emitToRide(rideId, 'ride:viewers', { rideId, count: await redis.scard(rk(rideId)) });
    }
    await redis.del(rdk(driverId));
    return;
  }
  for (const [rideId, set] of memViewers) {
    if (set.delete(driverId)) {
      if (set.size === 0) memViewers.delete(rideId);
      emitToRide(rideId, 'ride:viewers', { rideId, count: set.size });
    }
  }
}

function initSockets(httpServer) {
  const io = new Server(httpServer, { cors: { origin: '*' } });
  setIO(io);

  // Horizontal scaling: fan out events across replicas via Redis pub/sub.
  if (redis) {
    try {
      io.adapter(createAdapter(redis, redis.duplicate()));
      console.log('[socket] Redis adapter enabled');
    } catch (e) {
      console.error('[socket] Redis adapter failed, single-instance only:', e.message);
    }
  }

  // Authenticate each socket via JWT passed in handshake auth.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Missing token'));
      const payload = verifyToken(token);
      const user = await User.findById(payload.sub).select('_id role isBlocked');
      if (!user || user.isBlocked) return next(new Error('Unauthorized'));
      socket.userId = String(user._id);
      socket.role = user.role;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);

    socket.on('ride:join', (rideId) => {
      if (rideId) socket.join(`ride:${rideId}`);
    });
    socket.on('ride:leave', (rideId) => {
      if (rideId) socket.leave(`ride:${rideId}`);
    });

    // Driver is viewing a pending offer -> passenger sees "N drivers viewing".
    socket.on('ride:viewing', async (rideId) => {
      if (socket.role !== 'driver' || !rideId) return;
      const count = await addViewer(rideId, socket.userId);
      emitToRide(rideId, 'ride:viewers', { rideId, count });
    });
    socket.on('ride:unview', async (rideId) => {
      if (!rideId) return;
      const count = await removeViewer(rideId, socket.userId);
      emitToRide(rideId, 'ride:viewers', { rideId, count });
    });

    // WebRTC voice-call signaling — relayed to the other peer in the ride room.
    for (const ev of ['call:invite', 'call:offer', 'call:answer', 'call:ice', 'call:end', 'call:decline']) {
      socket.on(ev, (payload = {}) => {
        if (!payload.rideId) return;
        socket.to(`ride:${payload.rideId}`).emit(ev, { ...payload, from: socket.role });
      });
    }

    // In-app chat between the passenger and the assigned driver (ride room).
    socket.on('chat:message', ({ rideId, text } = {}) => {
      if (!rideId || !text) return;
      emitToRide(rideId, 'chat:message', {
        rideId,
        text: String(text).slice(0, 1000),
        from: socket.role,
        senderId: socket.userId,
        at: new Date().toISOString(),
      });
    });

    // Driver streams live location; persisted + relayed to the active ride room.
    socket.on('driver:location', async ({ lng, lat, rideId } = {}) => {
      if (socket.role !== 'driver') return;
      if (typeof lng !== 'number' || typeof lat !== 'number') return;
      await User.updateOne(
        { _id: socket.userId },
        { $set: { 'driver.lastLocation': { type: 'Point', coordinates: [lng, lat] }, 'driver.lastSeenAt': new Date() } }
      );
      if (rideId) emitToRide(rideId, 'driver:location', { rideId, lng, lat });
    });

    socket.on('disconnect', () => {
      if (socket.role === 'driver') {
        dropViewerEverywhere(socket.userId).catch(() => {});
        User.updateOne({ _id: socket.userId }, { $set: { 'driver.isOnline': false } }).catch(() => {});
      }
    });
  });

  return io;
}

module.exports = { initSockets };
