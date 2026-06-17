const User = require('../models/User');
const Ride = require('../models/Ride');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { broadcastRide } = require('../services/matching.service');
const { emitToUser, emitToRide } = require('../sockets/io');

const DOC_TYPES = ['cin', 'permis', 'carte_grise', 'assurance', 'permis_confiance'];

// POST /api/driver/upload  (multipart: field "file") -> { url }
// Stores the file and returns an absolute URL to submit as a document.
const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded');
  const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.status(201).json({ url });
});

// PUT /api/driver/documents  { type, url }  (upsert a document, resets it to pending)
const submitDocument = asyncHandler(async (req, res) => {
  const { type, url } = req.body;
  if (!DOC_TYPES.includes(type)) throw ApiError.badRequest('Invalid document type');
  if (!url) throw ApiError.badRequest('Document url is required');

  const driver = req.user;
  const existing = driver.driver.documents.find((d) => d.type === type);
  if (existing) {
    existing.url = url;
    existing.status = 'pending';
    existing.rejectionReason = undefined;
    existing.reviewedBy = undefined;
    existing.reviewedAt = undefined;
  } else {
    driver.driver.documents.push({ type, url, status: 'pending' });
  }

  // Once all required docs are submitted, move to pending review.
  const submittedTypes = new Set(driver.driver.documents.map((d) => d.type));
  if (DOC_TYPES.every((t) => submittedTypes.has(t)) && driver.driver.approvalStatus === 'incomplete') {
    driver.driver.approvalStatus = 'pending';
  }

  await driver.save();
  res.json({ driver: driver.toPublic() });
});

// PUT /api/driver/vehicle  { plate, licenseNumber }
const updateVehicle = asyncHandler(async (req, res) => {
  const { plate, licenseNumber } = req.body;
  req.user.driver.vehicle = {
    plate: plate?.trim(),
    licenseNumber: licenseNumber?.trim(),
  };
  await req.user.save();
  res.json({ driver: req.user.toPublic() });
});

// POST /api/driver/status  { isOnline, lng?, lat? }
const setStatus = asyncHandler(async (req, res) => {
  const driver = req.user;
  if (driver.driver.approvalStatus !== 'approved') {
    throw ApiError.forbidden('Your account is not yet approved to go online');
  }

  const { isOnline, lng, lat } = req.body;
  driver.driver.isOnline = Boolean(isOnline);
  if (typeof lng === 'number' && typeof lat === 'number') {
    driver.driver.lastLocation = { type: 'Point', coordinates: [lng, lat] };
    driver.driver.lastSeenAt = new Date();
  }
  await driver.save();
  res.json({ isOnline: driver.driver.isOnline });
});

// GET /api/driver/rides/available  -> requested rides near the driver
const availableRides = asyncHandler(async (req, res) => {
  const driver = req.user;
  if (!driver.driver.lastLocation) return res.json({ rides: [] });

  const rides = await Ride.find({
    status: 'requested',
    declinedBy: { $ne: driver._id },
    'pickup.location': {
      $near: {
        $geometry: driver.driver.lastLocation,
        $maxDistance: require('../config/env').matchRadiusMeters,
      },
    },
  }).limit(20);
  res.json({ rides });
});

// POST /api/driver/rides/:id/accept
const acceptRide = asyncHandler(async (req, res) => {
  const driver = req.user;
  if (driver.driver.approvalStatus !== 'approved') throw ApiError.forbidden('Not approved');

  // Atomic claim: only succeeds if still requested and unassigned.
  const ride = await Ride.findOneAndUpdate(
    { _id: req.params.id, status: 'requested', driver: { $exists: false } },
    { $set: { driver: driver._id, status: 'accepted', acceptedAt: new Date() } },
    { returnDocument: 'after' }
  );
  if (!ride) throw ApiError.conflict('Ride is no longer available');

  emitToUser(ride.passenger, 'ride:accepted', {
    rideId: String(ride._id),
    driver: {
      id: String(driver._id),
      fullName: driver.fullName,
      phone: driver.phone,
      avatarUrl: driver.avatarUrl,
      vehicle: driver.driver.vehicle,
      location: driver.driver.lastLocation,
    },
  });

  // Return the ride with passenger contact so the driver can call/message them.
  await ride.populate('passenger', 'fullName phone avatarUrl');
  res.json({ ride });
});

// POST /api/driver/rides/:id/decline
const declineRide = asyncHandler(async (req, res) => {
  const ride = await Ride.findById(req.params.id);
  if (!ride) throw ApiError.notFound('Ride not found');
  if (ride.status !== 'requested') return res.json({ ride });

  if (!ride.declinedBy.some((id) => String(id) === String(req.user._id))) {
    ride.declinedBy.push(req.user._id);
    await ride.save();
  }
  // Re-broadcast to remaining eligible drivers.
  await broadcastRide(ride);
  res.json({ ok: true });
});

// POST /api/driver/rides/:id/:action  where action in arrive|start|complete
const TRANSITIONS = {
  arrive: { from: 'accepted', to: 'arrived', stamp: 'arrivedAt' },
  start: { from: 'arrived', to: 'started', stamp: 'startedAt' },
  complete: { from: 'started', to: 'completed', stamp: 'completedAt' },
};

const advanceRide = asyncHandler(async (req, res) => {
  const t = TRANSITIONS[req.params.action];
  if (!t) throw ApiError.badRequest('Unknown action');

  const ride = await Ride.findById(req.params.id);
  if (!ride) throw ApiError.notFound('Ride not found');
  if (!ride.driver || String(ride.driver) !== String(req.user._id)) throw ApiError.forbidden();
  if (ride.status !== t.from) {
    throw ApiError.badRequest(`Cannot ${req.params.action} a ride in status ${ride.status}`);
  }

  ride.status = t.to;
  ride[t.stamp] = new Date();
  await ride.save();

  emitToUser(ride.passenger, 'ride:updated', { ride });
  emitToRide(ride._id, 'ride:status', { rideId: String(ride._id), status: ride.status });
  res.json({ ride });
});

// GET /api/driver/rides  -> driver's ride history
const driverRides = asyncHandler(async (req, res) => {
  const rides = await Ride.find({ driver: req.user._id }).sort({ createdAt: -1 }).limit(50);
  res.json({ rides });
});

module.exports = {
  uploadFile,
  submitDocument,
  updateVehicle,
  setStatus,
  availableRides,
  acceptRide,
  declineRide,
  advanceRide,
  driverRides,
};
