const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validator');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  createItem,
  getAllItems,
  getItem,
  getMyItems,
  updateItemStatus,
  deleteItem,
  getItemStats
} = require('../controllers/itemController');

// All routes are protected
router.use(protect);

// Create item with optional image upload
router.post(
  '/',
  upload.single('image'),
  [
    body('type').isIn(['lost', 'found']).withMessage('Type must be lost or found'),
    body('category').isIn(['NIC', 'Student ID', 'Bank Card', 'Wallet', 'Other']).withMessage('Invalid category'),
    body('item_name').trim().notEmpty().withMessage('Item name is required'),
    body('location').trim().notEmpty().withMessage('Location is required'),
    body('date').isDate().withMessage('Invalid date format'),
    body('time').notEmpty().withMessage('Time is required'),
    validate
  ],
  createItem
);

// Get all items with filters
router.get('/', getAllItems);

// Get user's own items
router.get('/my/items', getMyItems);

// Get item statistics (admin only)
router.get('/stats', authorize('admin'), getItemStats);

// Get single item
router.get('/:id', getItem);

// Update item status
router.put(
  '/:id/status',
  [
    body('status').isIn(['active', 'claimed', 'closed']).withMessage('Invalid status'),
    validate
  ],
  updateItemStatus
);

// Delete item
router.delete('/:id', deleteItem);

module.exports = router;
