const { Router } = require('express');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const c = require('../controllers/ride.controller');

const router = Router();

router.use(authenticate);

// Estimation is available to any authenticated user.
router.post('/estimate', c.estimate);

// Live map: nearby online drivers around a point.
router.get('/nearby-drivers', c.nearbyDrivers);

// Passenger ride lifecycle.
router.post('/', requireRole('passenger'), c.createRide);
router.get('/active', requireRole('passenger'), c.activeRide);
router.get('/', requireRole('passenger'), c.myRides);
router.get('/:id', c.getRide);
router.post('/:id/cancel', requireRole('passenger'), c.cancelRide);
router.post('/:id/rate', c.rateRide);

module.exports = router;
