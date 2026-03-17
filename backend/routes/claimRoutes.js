const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validator');
const { protect, authorize } = require('../middleware/auth');
const {
  createClaim,
  getMyClaims,
  getClaim,
  getPendingClaims
} = require('../controllers/claimController');

// All routes are protected
router.use(protect);

// Create a claim
router.post(
  '/',
  [
    body('item_id').isInt().withMessage('Invalid item ID'),
    validate
  ],
  createClaim
);

// Get user's claims
router.get('/my', getMyClaims);

// Get pending claims (security and admin only)
router.get('/pending', authorize('security', 'admin'), getPendingClaims);

// Get specific claim
router.get('/:id', getClaim);

module.exports = router;
