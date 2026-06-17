const { Router } = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');
const {
  register,
  verifyEmail,
  login,
  refresh,
  logout,
  resendOtp,
  uploadAvatar,
  me,
  updateMe,
  deleteMe,
} = require('../controllers/auth.controller');

const router = Router();

router.post('/register', register);
router.post('/verify-email', verifyEmail);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/resend-otp', resendOtp);

router.get('/me', authenticate, me);
router.patch('/me', authenticate, updateMe);
router.delete('/me', authenticate, deleteMe);
router.post('/avatar', authenticate, upload.single('file'), uploadAvatar);

module.exports = router;
