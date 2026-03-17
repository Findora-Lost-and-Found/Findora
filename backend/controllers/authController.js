const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const { generateOTP, sendVerificationEmail, sendPasswordResetEmail, sendApprovalEmail } = require('../utils/email');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { username, email, password, full_name, role, phone } = req.body;

    // Check if user exists
    const existingUser = await User.findByEmailOrUsername(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user (auto-verified for testing)
    const userId = await User.create({
      username,
      email,
      password: hashedPassword,
      full_name,
      role,
      phone,
      is_verified: true  // Auto-verify for testing (OTP disabled)
    });

    // Generate token
    const token = generateToken(userId);

    res.status(201).json({
      success: true,
      message: role === 'security' || role === 'admin' 
        ? 'Registration successful. Your account is pending admin approval.' 
        : 'Registration successful! You can now access the application.',
      token,
      user: {
        id: userId,
        username,
        email,
        full_name,
        role,
        is_approved: role === 'student' || role === 'staff',
        is_verified: true
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message
    });
  }
};

// @desc    Verify email with OTP
// @route   POST /api/auth/verify-email
// @access  Private
exports.verifyEmail = async (req, res) => {
  try {
    const { otp } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.is_verified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified'
      });
    }

    // Check OTP
    if (user.verification_otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    // Check if OTP expired
    if (new Date() > new Date(user.otp_expiry)) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired'
      });
    }

    // Verify user
    await User.verifyUser(userId);

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during verification',
      error: error.message
    });
  }
};

// @desc    Resend verification OTP
// @route   POST /api/auth/resend-otp
// @access  Private
exports.resendOTP = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (user.is_verified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified'
      });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await User.updateVerificationOTP(userId, otp, otpExpiry);
    await sendVerificationEmail(user.email, user.full_name, otp);

    res.json({
      success: true,
      message: 'Verification code sent to your email'
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier can be email or username

    // Find user by email or username
    const user = await User.findByEmailOrUsername(identifier);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is banned
    if (user.is_banned) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been banned'
      });
    }

    // Check if user is suspended
    if (user.is_suspended) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended'
      });
    }

    // Check if user is approved (for security and admin)
    if ((user.role === 'security' || user.role === 'admin') && !user.is_approved) {
      return res.status(403).json({
        success: false,
        message: 'Your account is pending approval'
      });
    }

    // Generate token
    const token = generateToken(user.id);

    // Remove password from response
    delete user.password;
    delete user.verification_otp;
    delete user.reset_otp;
    delete user.otp_expiry;

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message
    });
  }
};

// @desc    Forgot password - send OTP
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findByEmail(email);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this email'
      });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await User.updateResetOTP(user.id, otp, otpExpiry);
    await sendPasswordResetEmail(email, user.full_name, otp);

    res.json({
      success: true,
      message: 'Password reset OTP sent to your email'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Reset password with OTP
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findByEmail(email);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify OTP
    if (user.reset_otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    // Check if OTP expired
    if (new Date() > new Date(user.otp_expiry)) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await User.updatePassword(user.id, hashedPassword);

    res.json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Change password (authenticated user)
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.user.id;

    // Confirm passwords match (belt-and-suspenders server-side check)
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New passwords do not match'
      });
    }

    // Fetch the full user record (includes hashed password)
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password against the stored hash
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash the new password with a fresh salt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Persist the new password (User.updatePassword clears reset OTP fields too)
    await User.updatePassword(userId, hashedPassword);

    res.json({
      success: true,
      message: 'Password updated successfully.'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while changing password',
      error: error.message
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Remove sensitive data
    delete user.password;
    delete user.verification_otp;
    delete user.reset_otp;
    delete user.otp_expiry;

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
