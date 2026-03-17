const Claim = require('../models/Claim');
const Item = require('../models/Item');
const { generateOTP, sendClaimOTPEmail } = require('../utils/email');
const Notification = require('../models/Notification');

// @desc    Create a claim
// @route   POST /api/claims
// @access  Private
exports.createClaim = async (req, res) => {
  try {
    const { item_id } = req.body;
    const claimer_id = req.user.id;

    // Check if item exists and is a found item
    const item = await Item.findById(item_id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    if (item.type !== 'found') {
      return res.status(400).json({
        success: false,
        message: 'You can only claim found items'
      });
    }

    if (item.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'This item is no longer available for claiming'
      });
    }

    // Check if user has already claimed this item
    const existingClaims = await Claim.findByItemId(item_id);
    const userClaim = existingClaims.find(c => c.claimer_id === claimer_id && c.status === 'pending');

    if (userClaim) {
      return res.status(400).json({
        success: false,
        message: 'You have already claimed this item'
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const claimId = await Claim.create({
      item_id,
      claimer_id,
      otp,
      otp_expiry: otpExpiry
    });

    // Send OTP email
    try {
      await sendClaimOTPEmail(req.user.email, req.user.full_name, item.item_name, otp);
    } catch (error) {
      console.error('Email sending failed:', error);
    }

    // Notify item owner
    await Notification.create({
      user_id: item.user_id,
      type: 'claim',
      title: 'Someone claimed your found item',
      message: `${req.user.full_name} has claimed your found item: ${item.item_name}`,
      related_id: claimId
    });

    res.status(201).json({
      success: true,
      message: 'Claim created successfully. OTP sent to your email.',
      claimId
    });
  } catch (error) {
    console.error('Create claim error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get user's claims
// @route   GET /api/claims/my
// @access  Private
exports.getMyClaims = async (req, res) => {
  try {
    const claims = await Claim.findByClaimerId(req.user.id);

    res.json({
      success: true,
      count: claims.length,
      claims
    });
  } catch (error) {
    console.error('Get claims error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get claim by ID
// @route   GET /api/claims/:id
// @access  Private
exports.getClaim = async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.id);

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found'
      });
    }

    // Check authorization
    if (claim.claimer_id !== req.user.id && 
        req.user.role !== 'security' && 
        req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this claim'
      });
    }

    res.json({
      success: true,
      claim
    });
  } catch (error) {
    console.error('Get claim error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get all pending claims (for security)
// @route   GET /api/claims/pending
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
