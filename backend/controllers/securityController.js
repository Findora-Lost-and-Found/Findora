const Claim = require('../models/Claim');
const Item = require('../models/Item');
const SecurityTransaction = require('../models/SecurityTransaction');
const Notification = require('../models/Notification');

// @desc    Verify OTP and release item
// @route   POST /api/security/verify-claim
// @access  Private (Security, Admin)
exports.verifyClaim = async (req, res) => {
  try {
    const { claim_id, otp } = req.body;
    const security_officer_id = req.user.id;

    const claim = await Claim.findById(claim_id);

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found'
      });
    }

    if (claim.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Claim is not in pending status'
      });
    }

    // Verify OTP
    if (claim.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    // Check if OTP expired
    if (new Date() > new Date(claim.otp_expiry)) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired'
      });
    }

    // Mark claim as collected
    await Claim.markCollected(claim_id, security_officer_id);

    // Update item status
    await Item.updateStatus(claim.item_id, 'claimed');

    // Create security transaction
    await SecurityTransaction.create({
      security_officer_id,
      item_id: claim.item_id,
      claim_id: claim_id,
      transaction_type: 'release',
      released_to: claim.claimer_name,
      notes: 'Item released to claimer after OTP verification'
    });

    // Notify claimer
    await Notification.create({
      user_id: claim.claimer_id,
      type: 'claim',
      title: 'Item Released',
      message: `Your claimed item "${claim.item_name}" has been released to you.`,
      related_id: claim_id
    });

    res.json({
      success: true,
      message: 'Item released successfully'
    });
  } catch (error) {
    console.error('Verify claim error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Receive item
// @route   POST /api/security/receive-item
// @access  Private (Security, Admin)
exports.receiveItem = async (req, res) => {
  try {
    const { item_id, received_from, notes } = req.body;
    const security_officer_id = req.user.id;

    const item = await Item.findById(item_id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Create security transaction
    const transactionId = await SecurityTransaction.create({
      security_officer_id,
      item_id,
      transaction_type: 'receive',
      received_from,
      notes
    });

    res.status(201).json({
      success: true,
      message: 'Item received successfully',
      transactionId
    });
  } catch (error) {
    console.error('Receive item error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get security transactions
// @route   GET /api/security/transactions
// @access  Private (Security, Admin)
exports.getTransactions = async (req, res) => {
  try {
    const filters = {
      transaction_type: req.query.type,
      date: req.query.date
    };

    // If security officer, only show their transactions
    if (req.user.role === 'security') {
      filters.officer_id = req.user.id;
    }

    const transactions = await SecurityTransaction.findAll(filters);

    res.json({
      success: true,
      count: transactions.length,
      transactions
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get security statistics
// @route   GET /api/security/stats
// @access  Private (Security, Admin)
exports.getSecurityStats = async (req, res) => {
  try {
    let stats;
    
    // If security officer, only show their stats
    if (req.user.role === 'security') {
      stats = await SecurityTransaction.getStats(req.user.id);
    } else {
      stats = await SecurityTransaction.getStats();
    }

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get security stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get pending claims for security
// @route   GET /api/security/pending-claims
// @access  Private (Security, Admin)
exports.getPendingClaims = async (req, res) => {
  try {
    const claims = await Claim.getPendingClaims();

    res.json({
      success: true,
      count: claims.length,
      claims
    });
  } catch (error) {
    console.error('Get pending claims error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
