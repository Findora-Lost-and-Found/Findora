/**
 * OTP Field Guidance Utility
 * 
 * This module provides guidance on when to display "Not used for OTP" notes
 * for fields that users might confuse with OTP channels.
 * 
 * RULE SET:
 * - Fields that LOOK like OTP channels but AREN'T = Add "Not used for OTP"
 * - Fields that ARE OTP channels = Don't add note
 * - Internal/Technical fields = Don't add note
 */

/**
 * Determines if a field should display an OTP note
 * @param {string} fieldType - Type of field (e.g., 'email', 'phone', 'studentId', 'nic')
 * @param {object} context - Context object with field usage info
 * @returns {object} - {showNote: boolean, message: string, placement: string}
 */
export const shouldShowOtpNote = (fieldType, context = {}) => {
  const { isOtpChannel = false, isInternal = false } = context;

  // If field is already used for OTP, don't show note
  if (isOtpChannel) {
    return { showNote: false, message: '', placement: null };
  }

  // If field is internal/technical, don't show note
  if (isInternal) {
    return { showNote: false, message: '', placement: null };
  }

  // Identify user-facing fields that need clarification
  const userFacingFields = {
    phone: {
      showNote: true,
      message: 'Not used for OTP',
      placement: 'placeholder' // or 'label-hint' for more prominence
    },
    alternatePhone: {
      showNote: true,
      message: 'Not used for OTP',
      placement: 'label-hint'
    },
    studentId: {
      showNote: true,
      message: 'Not used for OTP',
      placement: 'placeholder'
    },
    staffId: {
      showNote: true,
      message: 'Not used for OTP',
      placement: 'placeholder'
    },
    nic: {
      showNote: true,
      message: 'Not used for OTP',
      placement: 'placeholder'
    },
    email: {
      showNote: false, // Email IS used for OTP
      message: '',
      placement: null
    },
    password: {
      showNote: false, // Not an OTP channel
      message: '',
      placement: null
    }
  };

  return userFacingFields[fieldType] || { showNote: false, message: '', placement: null };
};

/**
 * Predefined OTP note messages
 */
export const OTP_NOTES = {
  PHONE: 'Not used for OTP',
  STUDENT_ID: 'Not used for OTP',
  NIC: 'Not used for OTP',
  STAFF_ID: 'Not used for OTP',
  ALTERNATE_CONTACT: 'Not used for OTP verification'
};

/**
 * Helper to format field labels with OTP clarification
 * @param {string} label - Original field label
 * @param {boolean} showNote - Whether to show note
 * @param {string} note - Note text
 * @returns {JSX} React component
 */
export const getFieldLabelWithOtpNote = (label, showNote, note) => {
  if (!showNote || !note) return label;
  return `${label} (${note})`;
};

/**
 * Helper to add OTP note to placeholder
 * @param {string} placeholder - Original placeholder
 * @param {boolean} showNote - Whether to show note
 * @param {string} note - Note text
 * @returns {string} Updated placeholder
 */
export const getPlaceholderWithOtpNote = (placeholder, showNote, note) => {
  if (!showNote || !note) return placeholder;
  return `${placeholder} - ${note}`;
};
