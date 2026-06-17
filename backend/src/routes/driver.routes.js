const { Router } = require('express');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');
const c = require('../controllers/driver.controller');

const router = Router();

router.use(authenticate, requireRole('driver'));

// Onboarding
router.post('/upload', upload.single('file'), c.uploadFile);
router.put('/documents', c.submitDocument);
router.put('/vehicle', c.updateVehicle);

// Availability
router.post('/status', c.setStatus);

// Rides
router.get('/rides', c.driverRides);
router.get('/rides/available', c.availableRides);
router.post('/rides/:id/accept', c.acceptRide);
router.post('/rides/:id/decline', c.declineRide);
router.post('/rides/:id/:action', c.advanceRide); // arrive | start | complete

module.exports = router;
