/**
 * OTP Field Guidance - Code Snippets & Implementation Examples
 * 
 * This file contains copy-paste ready code for adding OTP clarification notes
 * to form fields across the Findora application.
 */

// ============================================================================
// PATTERN A: Two-Part Note (Label + Placeholder)
// Use this for important fields or when note needs emphasis
// ============================================================================

export const PhoneFieldExample = () => (
  <div className="form-group">
    <label>
      Phone Number{' '}
      <span style={{ color: '#9CA3AF' }}>(Optional - for contact only)</span>
    </label>
    <input
      type="tel"
      name="phone"
      placeholder="Contact number (not used for OTP)"
      required={false}
    />
  </div>
);

// ============================================================================
// PATTERN B: Placeholder-Only Note
// Use this for less critical fields where space is limited
// ============================================================================

export const StudentIdFieldExample = () => (
  <div className="form-group">
    <label className="required">Student ID or Staff ID</label>
    <input
      type="text"
      name="studentOrStaffId"
      placeholder="e.g. 123456A - Not used for OTP"
      required
    />
  </div>
);

// ============================================================================
// PATTERN C: Label-Hint Only
// Use this when placeholder would be too cluttered
// ============================================================================

export const NicFieldExample = () => (
  <div className="form-group">
    <label className="required">
      NIC Number
    </label>
    <small style={{ color: '#6B7280', display: 'block', marginBottom: '0.25rem', fontStyle: 'italic' }}>
      Not used for OTP
    </small>
    <input
      type="text"
      name="nicNumber"
      placeholder="123456789V or 199001234567"
      maxLength={12}
      required
    />
  </div>
);

// ============================================================================
// PATTERN D: Using FormFieldWithOtpNote Component (RECOMMENDED)
// Most reusable and maintainable approach
// ============================================================================

import FormFieldWithOtpNote from '../components/FormFieldWithOtpNote';

export const UsingComponentExample = () => (
  <>
    {/* Phone with label-hint placement */}
    <FormFieldWithOtpNote
      fieldType="phone"
      label="Phone Number"
      placeholder="Enter your phone number"
      type="tel"
      required={false}
      placement="label-hint"
    />

    {/* Student ID with placeholder placement */}
    <FormFieldWithOtpNote
      fieldType="studentId"
      label="Student ID or Staff ID"
      placeholder="e.g. 123456A"
      required
      placement="placeholder"
    />

    {/* NIC with label-hint placement */}
    <FormFieldWithOtpNote
      fieldType="nic"
      label="NIC Number"
      placeholder="123456789V or 199001234567"
      type="text"
      required
      placement="label-hint"
    />
  </>
);

// ============================================================================
// SPECIFIC IMPLEMENTATION LOCATIONS
// ============================================================================

/*
 * LOCATION 1: ReportFoundItem.jsx - NIC Section
 * Line: ~376-388
 * Current:
 */
const BEFORE_NIC_FOUND = `
{category === 'NIC' && (
  <div className="category-section">
    <h3>NIC Details</h3>
    <div className="form-group">
      <label className="required">Name</label>
      <input name="nicName" value={formData.nicName} onChange={handleInputChange} />
      {errors.nicName && <p className="error-text">{errors.nicName}</p>}
    </div>
    <div className="form-group">
      <label className="required">NIC Number</label>
      <input
        name="nicNumber"
        value={formData.nicNumber}
        onChange={handleInputChange}
        maxLength={12}
        autoComplete="off"
        placeholder="123456789V or 199001234567"
      />
      <small style={{ color: '#6B7280' }}>{NIC_HELPER_TEXT}</small>
      {errors.nicNumber && <p className="error-text">{errors.nicNumber}</p>}
    </div>
  </div>
)}
`;

const AFTER_NIC_FOUND = `
{category === 'NIC' && (
  <div className="category-section">
    <h3>NIC Details</h3>
    <div className="form-group">
      <label className="required">Name</label>
      <input name="nicName" value={formData.nicName} onChange={handleInputChange} />
      {errors.nicName && <p className="error-text">{errors.nicName}</p>}
    </div>
    <div className="form-group">
      <label className="required">NIC Number</label>
      <small style={{ color: '#6B7280', display: 'block', marginBottom: '0.25rem' }}>
        Not used for OTP
      </small>
      <input
        name="nicNumber"
        value={formData.nicNumber}
        onChange={handleInputChange}
        maxLength={12}
        autoComplete="off"
        placeholder="123456789V or 199001234567"
      />
      <small style={{ color: '#6B7280' }}>{NIC_HELPER_TEXT}</small>
      {errors.nicNumber && <p className="error-text">{errors.nicNumber}</p>}
    </div>
  </div>
)}
`;

/*
 * LOCATION 2: ReportFoundItem.jsx - Student/Staff ID Section
 * Line: ~390-404
 * Current:
 */
const BEFORE_STUDENT_ID_FOUND = `
{category === 'Student / Staff ID' && (
  <div className="category-section">
    <h3>Student / Staff ID Details</h3>
    <div className="form-group">
      <label className="required">Name</label>
      <input name="idName" value={formData.idName} onChange={handleInputChange} />
      {errors.idName && <p className="error-text">{errors.idName}</p>}
    </div>
    <div className="form-group">
      <label className="required">Student ID or Staff ID</label>
      <input
        name="studentOrStaffId"
        value={formData.studentOrStaffId}
        onChange={handleInputChange}
        placeholder="e.g. 123456A"
      />
      {errors.studentOrStaffId && <p className="error-text">{errors.studentOrStaffId}</p>}
    </div>
  </div>
)}
`;

const AFTER_STUDENT_ID_FOUND = `
{category === 'Student / Staff ID' && (
  <div className="category-section">
    <h3>Student / Staff ID Details</h3>
    <div className="form-group">
      <label className="required">Name</label>
      <input name="idName" value={formData.idName} onChange={handleInputChange} />
      {errors.idName && <p className="error-text">{errors.idName}</p>}
    </div>
    <div className="form-group">
      <label className="required">Student ID or Staff ID</label>
      <input
        name="studentOrStaffId"
        value={formData.studentOrStaffId}
        onChange={handleInputChange}
        placeholder="e.g. 123456A - Not used for OTP"
      />
      {errors.studentOrStaffId && <p className="error-text">{errors.studentOrStaffId}</p>}
    </div>
  </div>
)}
`;

/*
 * LOCATION 3: ReportFoundItem.jsx - Purse with-id Section
 * Line: ~499-510
 * Add note to purseIdNumber field
 */
const PURSE_ID_FOUND = `
{purseOption === 'with-id' && (
  <>
    <div className="form-group">
      <label className="required">Name</label>
      <input name="purseName" value={formData.purseName} onChange={handleInputChange} />
      {errors.purseName && <p className="error-text">{errors.purseName}</p>}
    </div>
    <div className="form-group">
      <label className="required">Student ID or NIC number</label>
      <input
        name="purseIdNumber"
        value={formData.purseIdNumber}
        onChange={handleInputChange}
        placeholder="NIC: 200012345678 / Student ID: 123456A - Not used for OTP"
      />
      {errors.purseIdNumber && <p className="error-text">{errors.purseIdNumber}</p>}
    </div>
  </>
)}
`;

// ============================================================================
// FIELDS TO SKIP (NO OTP NOTE NEEDED)
// ============================================================================

/*
 * Email fields - SKIP adding note (email IS used for OTP)
 * Examples:
 * - Signup.jsx email field
 * - ForgotPassword.jsx email field
 * - ResetPassword.jsx email field
 */
export const EmailFieldCorrect = () => (
  <div className="form-group">
    <label>Email Address</label>
    <input
      type="email"
      name="email"
      placeholder="Enter your email"
      // NO note - email is the OTP channel
    />
  </div>
);

/*
 * OTP code input - SKIP adding note (field IS for OTP)
 * Example: ResetPassword.jsx OTP field
 */
export const OtpCodeFieldCorrect = () => (
  <div className="form-group">
    <label>OTP</label>
    <input
      type="text"
      placeholder="Enter 6-digit OTP"
      maxLength={6}
      // NO note - this IS the OTP field
    />
  </div>
);

/*
 * Password fields - SKIP adding note (not OTP related)
 * Examples:
 * - Any password field
 * - Confirm password field
 */
export const PasswordFieldCorrect = () => (
  <div className="form-group">
    <label>Password</label>
    <input
      type="password"
      placeholder="Enter password"
      // NO note - not related to OTP
    />
  </div>
);

// ============================================================================
// SUMMARY TABLE
// ============================================================================

export const IMPLEMENTATION_SUMMARY = {
  'Signup.jsx': {
    'Phone': { status: '✅ DONE', pattern: 'Two-part note' },
  },
  'ReportFoundItem.jsx': {
    'NIC Number': { status: '⚠️ TODO', pattern: 'Label-hint', line: '~380' },
    'Student/Staff ID': { status: '⚠️ TODO', pattern: 'Placeholder', line: '~395' },
    'Purse ID Number': { status: '⚠️ TODO', pattern: 'Placeholder', line: '~505' },
  },
  'ReportLostItem.jsx': {
    'NIC Number': { status: '⚠️ TODO', pattern: 'Label-hint', line: '~140' },
    'Student/Staff ID': { status: '⚠️ TODO', pattern: 'Placeholder', line: '~165' },
    'Purse ID Number': { status: '⚠️ TODO', pattern: 'Placeholder', line: '~320' },
  },
  'Profile.jsx': {
    'Phone': { status: '✅ NO NOTE NEEDED', reason: 'Technical change password form' },
  },
  'Login.jsx': {
    'Email': { status: '✅ NO NOTE NEEDED', reason: 'Email is OTP channel' },
  },
  'ForgotPassword.jsx': {
    'Email': { status: '✅ NO NOTE NEEDED', reason: 'Email is OTP channel' },
  },
  'ResetPassword.jsx': {
    'Email': { status: '✅ NO NOTE NEEDED', reason: 'Email is OTP channel' },
    'OTP': { status: '✅ NO NOTE NEEDED', reason: 'Field IS for OTP' },
  },
};
