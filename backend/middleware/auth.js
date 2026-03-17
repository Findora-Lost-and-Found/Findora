const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from database
      req.user = await User.findById(decoded.id);

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if user is banned or suspended
      if (req.user.is_banned) {
        return res.status(403).json({
          success: false,
          message: 'Your account has been banned'
        });
      }

      if (req.user.is_suspended) {
        return res.status(403).json({
          success: false,
          message: 'Your account has been suspended'
        });
      }

      // Check if user is approved (for security and admin roles)
      if ((req.user.role === 'security' || req.user.role === 'admin') && !req.user.is_approved) {
        return res.status(403).json({
          success: false,
          message: 'Your account is pending approval'
        });
      }

      next();
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Token is invalid or expired'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error in authentication',
      error: error.message
    });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`
      });
    }
    next();
  };
};

// Middleware to require email verification
exports.requireEmailVerification = (req, res, next) => {
  if (!req.user.is_verified) {
    return res.status(403).json({
      success: false,
      message: 'Please verify your email address to access this feature',
      needsVerification: true
    });
  }
  next();
};
