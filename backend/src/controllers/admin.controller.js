const User = require('../models/User');
const Ride = require('../models/Ride');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { emitToUser } = require('../sockets/io');

// GET /api/admin/drivers?status=pending
const listDrivers = asyncHandler(async (req, res) => {
  const filter = { role: 'driver' };
  if (req.query.status) filter['driver.approvalStatus'] = req.query.status;
  const drivers = await User.find(filter).sort({ createdAt: -1 }).limit(100);
  res.json({ drivers: drivers.map((d) => d.toPublic()) });
});

// GET /api/admin/users?role=passenger
const listUsers = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  const users = await User.find(filter).sort({ createdAt: -1 }).limit(200);
  res.json({ users: users.map((u) => u.toPublic()) });
});

// GET /api/admin/users/:id
const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  res.json({ user: user.toPublic() });
});

// PATCH /api/admin/drivers/:id/documents/:type  { status, rejectionReason? }
const reviewDocument = asyncHandler(async (req, res) => {
  const { status, rejectionReason } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    throw ApiError.badRequest('status must be approved or rejected');
  }

  const driver = await User.findOne({ _id: req.params.id, role: 'driver' });
  if (!driver) throw ApiError.notFound('Driver not found');

  const doc = driver.driver.documents.find((d) => d.type === req.params.type);
  if (!doc) throw ApiError.notFound('Document not submitted');

  doc.status = status;
  doc.rejectionReason = status === 'rejected' ? rejectionReason : undefined;
  doc.reviewedBy = req.user._id;
  doc.reviewedAt = new Date();

  await driver.save();
  res.json({ driver: driver.toPublic() });
});

// PATCH /api/admin/drivers/:id/approval  { status, reason? }
// Approves/rejects a driver overall. Approval requires all docs approved.
const setApproval = asyncHandler(async (req, res) => {
  const { status, reason } = req.body;
  if (!['approved', 'rejected', 'pending'].includes(status)) {
    throw ApiError.badRequest('Invalid approval status');
  }

  const driver = await User.findOne({ _id: req.params.id, role: 'driver' });
  if (!driver) throw ApiError.notFound('Driver not found');

  const REQUIRED = ['cin', 'permis', 'carte_grise', 'assurance', 'permis_confiance'];
  if (status === 'approved') {
    const allApproved = REQUIRED.every((t) =>
      driver.driver.documents.find((d) => d.type === t && d.status === 'approved')
    );
    if (!allApproved) throw ApiError.badRequest('All required documents must be approved first');
  }

  driver.driver.approvalStatus = status;
  if (status !== 'approved') driver.driver.isOnline = false;
  await driver.save();

  emitToUser(driver._id, 'driver:approval', { status, reason });
  res.json({ driver: driver.toPublic() });
});

// PATCH /api/admin/users/:id/block  { isBlocked }
const setBlocked = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  user.isBlocked = Boolean(req.body.isBlocked);
  if (user.isBlocked && user.role === 'driver') user.driver.isOnline = false;
  await user.save();
  res.json({ user: user.toPublic() });
});

// GET /api/admin/rides?status=&from=&to=
const listRides = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const rides = await Ride.find(filter)
    .populate('passenger', 'email fullName')
    .populate('driver', 'email fullName')
    .sort({ createdAt: -1 })
    .limit(200);
  res.json({ rides });
});

// GET /api/admin/stats
const stats = asyncHandler(async (req, res) => {
  const [passengers, drivers, pendingDrivers, onlineDrivers] = await Promise.all([
    User.countDocuments({ role: 'passenger' }),
    User.countDocuments({ role: 'driver' }),
    User.countDocuments({ role: 'driver', 'driver.approvalStatus': 'pending' }),
    User.countDocuments({ role: 'driver', 'driver.isOnline': true }),
  ]);

  const ridesByStatus = await Ride.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const revenueAgg = await Ride.aggregate([
    { $match: { status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$fare.total' }, count: { $sum: 1 } } },
  ]);

  res.json({
    users: { passengers, drivers, pendingDrivers, onlineDrivers },
    rides: {
      byStatus: ridesByStatus.reduce((a, r) => ({ ...a, [r._id]: r.count }), {}),
      completed: revenueAgg[0]?.count || 0,
      revenue: revenueAgg[0]?.total || 0,
    },
  });
});

module.exports = {
  listDrivers,
  listUsers,
  getUser,
  reviewDocument,
  setApproval,
  setBlocked,
  listRides,
  stats,
};
