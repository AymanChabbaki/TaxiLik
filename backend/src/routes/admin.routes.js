const { Router } = require('express');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const c = require('../controllers/admin.controller');

const router = Router();

router.use(authenticate, requireRole('admin'));

router.get('/stats', c.stats);

router.get('/drivers', c.listDrivers);
router.patch('/drivers/:id/documents/:type', c.reviewDocument);
router.patch('/drivers/:id/approval', c.setApproval);

router.get('/users', c.listUsers);
router.get('/users/:id', c.getUser);
router.patch('/users/:id/block', c.setBlocked);

router.get('/rides', c.listRides);

module.exports = router;
