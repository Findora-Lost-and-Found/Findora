const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validator');
const { protect, authorize } = require('../middleware/auth');
const {
  verifyClaim,
  receiveItem,
  getTransactions,
  getSecurityStats,
  getPendingClaims
} = require('../controllers/securityController');

// All routes are protected and require security or admin role
router.use(protect);
router.use(authorize('security', 'admin'));

// Verify claim with OTP and release item
router.post(
  '/verify-claim',
  [
    body('claim_id').isInt().withMessage('Invalid claim ID'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
    validate
  ],
  verifyClaim
);

// Receive item
router.post(
  '/receive-item',
  [
    body('item_id').isInt().withMessage('Invalid item ID'),
    body('received_from').trim().notEmpty().withMessage('Received from is required'),
    validate
  ],
  receiveItem
);

// Get transactions
router.get('/transactions', getTransactions);

// Get security statistics
router.get('/stats', getSecurityStats);

// Get pending claims
router.get('/pending-claims', getPendingClaims);

module.exports = router;
