const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validator');
const { protect, authorize } = require('../middleware/auth');
const {
  getUsers,
  getPendingApprovals,
  approveUser,
  banUser,
  suspendUser,
  getReports,
  handleReport,
  getDashboardStats,
  getAllItems,
  getAllTransactions
} = require('../controllers/adminController');

// All routes are protected and require admin role
router.use(protect);
router.use(authorize('admin'));

// User management
router.get('/users', getUsers);
router.get('/pending-approvals', getPendingApprovals);
router.put('/approve-user/:id', approveUser);

router.put(
  '/ban-user/:id',
  [
    body('banned').isBoolean().withMessage('Banned must be a boolean'),
    validate
  ],
  banUser
);

router.put(
  '/suspend-user/:id',
  [
    body('suspended').isBoolean().withMessage('Suspended must be a boolean'),
    validate
  ],
  suspendUser
);

// Report management
router.get('/reports', getReports);

router.put(
  '/reports/:id',
  [
    body('status').isIn(['pending', 'reviewed', 'resolved']).withMessage('Invalid status'),
    validate
  ],
  handleReport
);

// Dashboard statistics
router.get('/stats', getDashboardStats);

// Items and transactions (admin view)
router.get('/items', getAllItems);
router.get('/transactions', getAllTransactions);

module.exports = router;
