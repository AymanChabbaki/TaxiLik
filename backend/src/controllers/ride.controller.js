const Ride = require('../models/Ride');
const User = require('../models/User');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { estimateFare } = require('../services/fare.service');
const { broadcastRide } = require('../services/matching.service');
const { emitToUser, emitToRide } = require('../sockets/io');
const { sendPushToUser } = require('../services/notifications.service');

const ACTIVE_STATUSES = ['requested', 'accepted', 'arrived', 'started'];

// GET /api/rides/nearby-drivers?lng=&lat=  -> online approved drivers near a point.
// Used by the passenger map to show available cars around (inDrive-style).
const nearbyDrivers = asyncHandler(async (req, res) => {
  const lng = parseFloat(req.query.lng);
  const lat = parseFloat(req.query.lat);
  if (Number.isNaN(lng) || Number.isNaN(lat)) {
    throw ApiError.badRequest('lng and lat query params are required');
  }
  const drivers = await User.find({
    role: 'driver',
    isBlocked: false,
    'driver.approvalStatus': 'approved',
    'driver.isOnline': true,
    'driver.lastLocation': {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: env.matchRadiusMeters,
      },
    },
  })
    .limit(15)
    .select('_id driver.lastLocation');

  res.json({
    drivers: drivers
      .filter((d) => d.driver?.lastLocation?.coordinates)
      .map((d) => ({
        id: String(d._id),
        lng: d.driver.lastLocation.coordinates[0],
        lat: d.driver.lastLocation.coordinates[1],
      })),
  });
});

function parsePlace(place, label) {
  if (!place || typeof place !== 'object') throw ApiError.badRequest(`${label} is required`);
  const { address, lng, lat } = place;
  if (!address) throw ApiError.badRequest(`${label}.address is required`);
  if (typeof lng !== 'number' || typeof lat !== 'number') {
    throw ApiError.badRequest(`${label}.lng and ${label}.lat must be numbers`);
  }
  return { address, location: { type: 'Point', coordinates: [lng, lat] } };
}

// POST /api/rides/estimate  { pickup:{lng,lat}, destination:{lng,lat} }
const estimate = asyncHandler(async (req, res) => {
  const { pickup, destination } = req.body;
  if (
    !pickup || !destination ||
    typeof pickup.lng !== 'number' || typeof pickup.lat !== 'number' ||
    typeof destination.lng !== 'number' || typeof destination.lat !== 'number'
  ) {
    throw ApiError.badRequest('pickup and destination coordinates are required');
  }
  const fare = estimateFare({
    pickup: [pickup.lng, pickup.lat],
    destination: [destination.lng, destination.lat],
  });
  res.json({ fare });
});

// POST /api/rides  { pickup:{address,lng,lat}, destination:{address,lng,lat} }
const createRide = asyncHandler(async (req, res) => {
  const existing = await Ride.findOne({
    passenger: req.user._id,
    status: { $in: ACTIVE_STATUSES },
  });
  if (existing) throw ApiError.conflict('You already have an active ride');

  const pickup = parsePlace(req.body.pickup, 'pickup');
  const destination = parsePlace(req.body.destination, 'destination');
  const passengers = Math.min(3, Math.max(1, parseInt(req.body.passengers, 10) || 1));

  const fare = estimateFare({
    pickup: pickup.location.coordinates,
    destination: destination.location.coordinates,
  });

  const ride = await Ride.create({
    passenger: req.user._id,
    pickup,
    destination,
    fare,
    passengers,
    status: 'requested',
  });

  const notified = await broadcastRide(ride);
  res.status(201).json({ ride, driversNotified: notified });
});

// GET /api/rides/active  -> passenger's current active ride
const activeRide = asyncHandler(async (req, res) => {
  const ride = await Ride.findOne({
    passenger: req.user._id,
    status: { $in: ACTIVE_STATUSES },
  }).populate('driver', 'fullName phone avatarUrl driver.vehicle driver.lastLocation');
  res.json({ ride });
});

// GET /api/rides  -> passenger ride history
const myRides = asyncHandler(async (req, res) => {
  const rides = await Ride.find({ passenger: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50);
  res.json({ rides });
});

// GET /api/rides/:id
const getRide = asyncHandler(async (req, res) => {
  const ride = await Ride.findById(req.params.id)
    .populate('driver', 'fullName phone avatarUrl driver.vehicle driver.lastLocation');
  if (!ride) throw ApiError.notFound('Ride not found');

  const isOwner = String(ride.passenger) === String(req.user._id);
  const isDriver = ride.driver && String(ride.driver._id) === String(req.user._id);
  if (!isOwner && !isDriver) throw ApiError.forbidden();

  res.json({ ride });
});

// POST /api/rides/:id/cancel  (passenger)
const cancelRide = asyncHandler(async (req, res) => {
  const ride = await Ride.findById(req.params.id);
  if (!ride) throw ApiError.notFound('Ride not found');
  if (String(ride.passenger) !== String(req.user._id)) throw ApiError.forbidden();
  if (!ACTIVE_STATUSES.includes(ride.status)) {
    throw ApiError.badRequest('Ride can no longer be cancelled');
  }

  ride.status = 'cancelled';
  ride.cancelledBy = 'passenger';
  ride.cancelReason = req.body.reason;
  await ride.save();

  if (ride.driver) {
    emitToUser(ride.driver, 'ride:cancelled', { rideId: String(ride._id) });
    sendPushToUser(ride.driver, 'Course annulée', 'Le passager a annulé la course.', { screen: 'home' });
  }
  emitToRide(ride._id, 'ride:updated', { ride });
  res.json({ ride });
});

// POST /api/rides/:id/rate  { stars: 1-5, comment? }
// Passenger rates the driver; driver rates the passenger.
const rateRide = asyncHandler(async (req, res) => {
  const ride = await Ride.findById(req.params.id);
  if (!ride) throw ApiError.notFound('Ride not found');
  if (ride.status !== 'completed') throw ApiError.badRequest('Can only rate completed rides');

  const stars = parseInt(req.body.stars, 10);
  if (!stars || stars < 1 || stars > 5) throw ApiError.badRequest('stars must be 1-5');
  const comment = req.body.comment ? String(req.body.comment).slice(0, 300) : undefined;

  const isPassenger = String(ride.passenger) === String(req.user._id);
  const isDriver = ride.driver && String(ride.driver) === String(req.user._id);
  if (!isPassenger && !isDriver) throw ApiError.forbidden();

  if (isPassenger) {
    if (ride.passengerRating?.stars) throw ApiError.conflict('Already rated');
    ride.passengerRating = { stars, comment, ratedAt: new Date() };
    await ride.save();
    if (ride.driver) await _updateUserRating(ride.driver);
  } else {
    if (ride.driverRating?.stars) throw ApiError.conflict('Already rated');
    ride.driverRating = { stars, comment, ratedAt: new Date() };
    await ride.save();
    await _updateUserRating(ride.passenger);
  }

  res.json({ ok: true });
});

async function _updateUserRating(userId) {
  const [asDriver, asPassenger] = await Promise.all([
    Ride.aggregate([
      { $match: { driver: userId, 'passengerRating.stars': { $exists: true } } },
      { $group: { _id: null, avg: { $avg: '$passengerRating.stars' }, count: { $sum: 1 } } },
    ]),
    Ride.aggregate([
      { $match: { passenger: userId, 'driverRating.stars': { $exists: true } } },
      { $group: { _id: null, avg: { $avg: '$driverRating.stars' }, count: { $sum: 1 } } },
    ]),
  ]);
  const dCount = asDriver[0]?.count || 0;
  const pCount = asPassenger[0]?.count || 0;
  const total = dCount + pCount;
  if (total === 0) return;
  const avg = ((asDriver[0]?.avg || 0) * dCount + (asPassenger[0]?.avg || 0) * pCount) / total;
  await User.findByIdAndUpdate(userId, {
    rating: Math.round(avg * 10) / 10,
    ratingCount: total,
  });
}

module.exports = {
  estimate,
  createRide,
  activeRide,
  myRides,
  getRide,
  cancelRide,
  rateRide,
  nearbyDrivers,
  ACTIVE_STATUSES,
};
