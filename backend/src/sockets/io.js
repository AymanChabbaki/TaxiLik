// Holds the Socket.io server instance and helpers to emit into user/ride rooms.
// Rooms: `user:<id>` for a specific user, `ride:<id>` for everyone on a ride.

let io = null;

function setIO(instance) {
  io = instance;
}

function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

function emitToUser(userId, event, payload) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
}

function emitToRide(rideId, event, payload) {
  if (!io) return;
  io.to(`ride:${rideId}`).emit(event, payload);
}

module.exports = { setIO, getIO, emitToUser, emitToRide };
