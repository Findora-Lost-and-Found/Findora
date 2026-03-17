const Report = require('../models/Report');
const Item = require('../models/Item');
const Notification = require('../models/Notification');

// @desc    Create a report
// @route   POST /api/reports
// @access  Private
exports.createReport = async (req, res) => {
  try {
    const { item_id, reason } = req.body;
    const reporter_id = req.user.id;

    // Check if item exists
    const item = await Item.findById(item_id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // User cannot report their own item
    if (item.user_id === reporter_id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot report your own item'
      });
    }

    const reportId = await Report.create({
      reporter_id,
      item_id,
      reason
    });

    // Notify admin (get all admins)
    // For simplicity, we'll create a generic notification
    // In production, you'd want to notify specific admins

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      reportId
    });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get user's reports
// @route   GET /api/reports/my
// @access  Private
exports.getMyReports = async (req, res) => {
  try {
    const allReports = await Report.findAll();
    const myReports = allReports.filter(r => r.reporter_id === req.user.id);

    res.json({
      success: true,
      count: myReports.length,
      reports: myReports
    });
  } catch (error) {
    console.error('Get my reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
