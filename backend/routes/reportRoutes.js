const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validator');
const { protect } = require('../middleware/auth');
const {
  createReport,
  getMyReports
} = require('../controllers/reportController');

// All routes are protected
router.use(protect);

// Create a report
router.post(
  '/',
  [
    body('item_id').isInt().withMessage('Invalid item ID'),
    body('reason').trim().notEmpty().withMessage('Reason is required'),
    validate
  ],
  createReport
);

// Get user's reports
router.get('/my', getMyReports);

module.exports = router;
