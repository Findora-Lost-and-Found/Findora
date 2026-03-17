const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Generate OTP
exports.generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send verification email
exports.sendVerificationEmail = async (email, fullName, otp) => {
  const mailOptions = {
    from: `"Findora" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verify Your Findora Account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Welcome to Findora!</h2>
        <p>Hi ${fullName},</p>
        <p>Thank you for signing up. Please use the following OTP to verify your account:</p>
        <div style="background-color: #F3F4F6; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #4F46E5; margin: 0; letter-spacing: 5px;">${otp}</h1>
        </div>
        <p>This OTP will expire in 10 minutes.</p>
        <p>If you didn't create an account with Findora, please ignore this email.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
        <p style="color: #6B7280; font-size: 12px;">This is an automated email. Please do not reply.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
};

// Send password reset email
exports.sendPasswordResetEmail = async (email, fullName, otp) => {
  const mailOptions = {
    from: `"Findora" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Reset Your Findora Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Password Reset Request</h2>
        <p>Hi ${fullName},</p>
        <p>We received a request to reset your password. Use the following OTP to reset your password:</p>
        <div style="background-color: #F3F4F6; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #4F46E5; margin: 0; letter-spacing: 5px;">${otp}</h1>
        </div>
        <p>This OTP will expire in 10 minutes.</p>
        <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
        <p style="color: #6B7280; font-size: 12px;">This is an automated email. Please do not reply.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}`);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};

// Send claim OTP email
exports.sendClaimOTPEmail = async (email, fullName, itemName, otp) => {
  const mailOptions = {
    from: `"Findora" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Item Claim Verification - Findora',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Item Claim Verification</h2>
        <p>Hi ${fullName},</p>
        <p>You have initiated a claim for: <strong>${itemName}</strong></p>
        <p>Please provide this OTP to the security officer to collect your item:</p>
        <div style="background-color: #F3F4F6; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #4F46E5; margin: 0; letter-spacing: 5px;">${otp}</h1>
        </div>
        <p>This OTP will expire in 24 hours.</p>
        <p><strong>Important:</strong> Only share this OTP with authorized security personnel.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
        <p style="color: #6B7280; font-size: 12px;">This is an automated email. Please do not reply.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Claim OTP email sent to ${email}`);
  } catch (error) {
    console.error('Error sending claim OTP email:', error);
    throw new Error('Failed to send claim OTP email');
  }
};

// Send match notification email
exports.sendMatchNotificationEmail = async (email, fullName, matchType, lostItemName, foundItemName) => {
  const mailOptions = {
    from: `"Findora" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `${matchType} - Findora`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">${matchType}!</h2>
        <p>Hi ${fullName},</p>
        <p>Great news! We found a ${matchType === 'Item Found' ? 'match' : 'possible match'} for your lost item.</p>
        <div style="background-color: #F3F4F6; padding: 20px; margin: 20px 0; border-left: 4px solid #4F46E5;">
          <p style="margin: 5px 0;"><strong>Your Lost Item:</strong> ${lostItemName}</p>
          <p style="margin: 5px 0;"><strong>Matched Found Item:</strong> ${foundItemName}</p>
        </div>
        <p>Please log in to your Findora account to view more details and initiate a claim if this is your item.</p>
        <a href="${process.env.FRONTEND_URL}/login" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">View Details</a>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
        <p style="color: #6B7280; font-size: 12px;">This is an automated email. Please do not reply.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Match notification sent to ${email}`);
  } catch (error) {
    console.error('Error sending match notification:', error);
    throw new Error('Failed to send match notification');
  }
};

// Send approval notification
exports.sendApprovalEmail = async (email, fullName, approved) => {
  const mailOptions = {
    from: `"Findora" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: approved ? 'Account Approved - Findora' : 'Account Rejected - Findora',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${approved ? '#10B981' : '#EF4444'};">${approved ? 'Account Approved!' : 'Account Rejected'}</h2>
        <p>Hi ${fullName},</p>
        ${approved 
          ? '<p>Your account has been approved by an administrator. You can now access all features of Findora.</p><a href="' + process.env.FRONTEND_URL + '/login" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Login Now</a>'
          : '<p>Unfortunately, your account application has been rejected. If you believe this is a mistake, please contact support.</p>'
        }
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
        <p style="color: #6B7280; font-size: 12px;">This is an automated email. Please do not reply.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Approval notification sent to ${email}`);
  } catch (error) {
    console.error('Error sending approval notification:', error);
    throw new Error('Failed to send approval notification');
  }
};
