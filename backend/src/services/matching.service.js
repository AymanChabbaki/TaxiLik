const User = require('../models/User');
const env = require('../config/env');
const { emitToUser } = require('../sockets/io');

/**
 * Find online, approved, unblocked drivers within the match radius of a pickup,
 * excluding any drivers the ride has already been declined by.
 * @param {[number,number]} pickupCoords [lng, lat]
 * @param {string[]} excludeIds driver ids to skip
 */
async function findNearbyDrivers(pickupCoords, excludeIds = []) {
  return User.find({
    role: 'driver',
    isBlocked: false,
    'driver.approvalStatus': 'approved',
    'driver.isOnline': true,
    _id: { $nin: excludeIds },
    'driver.lastLocation': {
      $near: {
        $geometry: { type: 'Point', coordinates: pickupCoords },
        $maxDistance: env.matchRadiusMeters,
      },
    },
  }).limit(20);
}

/**
 * Broadcast a ride to all eligible nearby drivers via their personal socket room.
 * Returns the number of drivers notified.
 */
async function broadcastRide(ride) {
  const drivers = await findNearbyDrivers(
    ride.pickup.location.coordinates,
    ride.declinedBy || []
  );

  const payload = {
    rideId: String(ride._id),
    pickup: ride.pickup,
    destination: ride.destination,
    fare: ride.fare,
    passengers: ride.passengers,
    createdAt: ride.createdAt,
  };

  for (const driver of drivers) {
    emitToUser(driver._id, 'ride:new', payload);
  }

  return drivers.length;
}

module.exports = { findNearbyDrivers, broadcastRide };
