const User = require('../models/User');
const Item = require('../models/Item');
const Report = require('../models/Report');
const SecurityTransaction = require('../models/SecurityTransaction');
const Notification = require('../models/Notification');
const { sendApprovalEmail } = require('../utils/email');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin)
exports.getUsers = async (req, res) => {
  try {
    const filters = {
      role: req.query.role,
      is_banned: req.query.is_banned
    };

    const users = await User.getAllUsers(filters);

    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get pending approvals
// @route   GET /api/admin/pending-approvals
// @access  Private (Admin)
exports.getPendingApprovals = async (req, res) => {
  try {
    const { role } = req.query;

    const securityApprovals = await User.getPendingApprovals('security');
    const adminApprovals = await User.getPendingApprovals('admin');

    let approvals = [...securityApprovals, ...adminApprovals];

    if (role) {
      approvals = approvals.filter(u => u.role === role);
    }

    res.json({
      success: true,
      count: approvals.length,
      approvals
    });
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Approve user signup
// @route   PUT /api/admin/approve-user/:id
// @access  Private (Admin)
exports.approveUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.is_approved) {
      return res.status(400).json({
        success: false,
        message: 'User is already approved'
      });
    }

    await User.approveUser(userId);

    // Send approval notification email
    try {
      await sendApprovalEmail(user.email, user.full_name, true);
    } catch (error) {
      console.error('Email sending failed:', error);
    }

    // Create in-app notification
    await Notification.create({
      user_id: userId,
      type: 'approval',
      title: 'Account Approved',
      message: 'Your account has been approved by an administrator.',
      related_id: null
    });

    res.json({
      success: true,
      message: 'User approved successfully'
    });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Ban/Unban user
// @route   PUT /api/admin/ban-user/:id
// @access  Private (Admin)
exports.banUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { banned } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await User.banUser(userId, banned);

    // Create notification
    await Notification.create({
      user_id: userId,
      type: 'system',
      title: banned ? 'Account Banned' : 'Account Unbanned',
      message: banned 
        ? 'Your account has been banned by an administrator.' 
        : 'Your account ban has been lifted.',
      related_id: null
    });

    res.json({
      success: true,
      message: banned ? 'User banned successfully' : 'User unbanned successfully'
    });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Suspend/Unsuspend user
// @route   PUT /api/admin/suspend-user/:id
// @access  Private (Admin)
exports.suspendUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { suspended } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await User.suspendUser(userId, suspended);

    // Create notification
    await Notification.create({
      user_id: userId,
      type: 'system',
      title: suspended ? 'Account Suspended' : 'Suspension Lifted',
      message: suspended 
        ? 'Your account has been suspended by an administrator.' 
        : 'Your account suspension has been lifted.',
      related_id: null
    });

    res.json({
      success: true,
      message: suspended ? 'User suspended successfully' : 'User suspension lifted'
    });
  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get all reports
// @route   GET /api/admin/reports
// @access  Private (Admin)
exports.getReports = async (req, res) => {
  try {
    const { status } = req.query;
    const reports = await Report.findAll(status);

    res.json({
      success: true,
      count: reports.length,
      reports
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Handle report
// @route   PUT /api/admin/reports/:id
// @access  Private (Admin)
exports.handleReport = async (req, res) => {
  try {
    const reportId = req.params.id;
    const { status, admin_notes, action } = req.body;

    const report = await Report.findById(reportId);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    await Report.updateStatus(reportId, status, admin_notes);

    // If action is to delete the item
    if (action === 'delete_item') {
      await Item.delete(report.item_id);
    }

    // If action is to ban the user
    if (action === 'ban_user') {
      await User.banUser(report.item_owner_id, true);
    }

    // Notify reporter
    await Notification.create({
      user_id: report.reporter_id,
      type: 'report',
      title: 'Report Reviewed',
      message: `Your report has been reviewed and marked as ${status}.`,
      related_id: reportId
    });

    res.json({
      success: true,
      message: 'Report handled successfully'
    });
  } catch (error) {
    console.error('Handle report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/admin/stats
// @access  Private (Admin)
exports.getDashboardStats = async (req, res) => {
  try {
    // Get item stats
    const itemStats = await Item.getStats();

    // Get user counts
    const allUsers = await User.getAllUsers();
    const userStats = {
      total: allUsers.length,
      students: allUsers.filter(u => u.role === 'student').length,
      staff: allUsers.filter(u => u.role === 'staff').length,
      security: allUsers.filter(u => u.role === 'security').length,
      admin: allUsers.filter(u => u.role === 'admin').length,
      banned: allUsers.filter(u => u.is_banned).length
    };

    // Get transaction stats
    const transactionStats = await SecurityTransaction.getStats();

    // Get pending reports
    const pendingReports = await Report.getPendingCount();

    // Get pending approvals
    const securityApprovals = await User.getPendingApprovals('security');
    const adminApprovals = await User.getPendingApprovals('admin');
    const pendingApprovals = securityApprovals.length + adminApprovals.length;

    res.json({
      success: true,
      stats: {
        items: itemStats,
        users: userStats,
        transactions: transactionStats,
        pendingReports,
        pendingApprovals
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get all items (admin view)
// @route   GET /api/admin/items
// @access  Private (Admin)
exports.getAllItems = async (req, res) => {
  try {
    const filters = {
      type: req.query.type,
      status: req.query.status,
      category: req.query.category
    };

    const items = await Item.findAll(filters);

    res.json({
      success: true,
      count: items.length,
      items
    });
  } catch (error) {
    console.error('Get all items error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get all transactions (admin view)
// @route   GET /api/admin/transactions
// @access  Private (Admin)
exports.getAllTransactions = async (req, res) => {
  try {
    const filters = {
      transaction_type: req.query.type,
      date: req.query.date
    };

    const transactions = await SecurityTransaction.findAll(filters);

    res.json({
      success: true,
      count: transactions.length,
      transactions
    });
  } catch (error) {
    console.error('Get all transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
