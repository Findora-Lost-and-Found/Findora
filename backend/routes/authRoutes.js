const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validator');
const { protect } = require('../middleware/auth');
const {
  register,
  verifyEmail,
  resendOTP,
  login,
  forgotPassword,
  resetPassword,
  getMe,
  changePassword
} = require('../controllers/authController');

// Public routes
router.post(
  '/register',
  [
    body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('email').isEmail().withMessage('Invalid email address'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('full_name').trim().notEmpty().withMessage('Full name is required'),
    body('role').isIn(['student', 'staff', 'security', 'admin']).withMessage('Invalid role'),
    validate
  ],
  register
);

router.post(
  '/login',
  [
    body('identifier').notEmpty().withMessage('Email or username is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validate
  ],
  login
);

router.post(
  '/forgot-password',
  [
    body('email').isEmail().withMessage('Invalid email address'),
    validate
  ],
  forgotPassword
);

router.post(
  '/reset-password',
  [
    body('email').isEmail().withMessage('Invalid email address'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
    body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    validate
  ],
  resetPassword
);

// Protected routes
router.post(
  '/verify-email',
  protect,
  [
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
    validate
  ],
  verifyEmail
);

router.post('/resend-otp', protect, resendOTP);

router.put(
  '/change-password',
  protect,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
    body('confirmPassword')
      .notEmpty().withMessage('Confirm new password is required')
      .custom((value, { req }) => value === req.body.newPassword)
      .withMessage('Confirm new password must match new password'),
    validate
  ],
  changePassword
);

router.get('/me', protect, getMe);

module.exports = router;
