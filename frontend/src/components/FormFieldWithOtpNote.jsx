import React from 'react';
import { shouldShowOtpNote, getFieldLabelWithOtpNote, getPlaceholderWithOtpNote } from '../../utils/otpFieldGuidance';

/**
 * FormFieldWithOtpNote Component
 * 
 * Renders a form field with optional "Not used for OTP" guidance.
 * Handles both label-hint and placeholder placements.
 * 
 * Props:
 * - fieldType: 'phone', 'studentId', 'nic', 'staffId', 'alternatePhone', etc.
 * - label: Field label text
 * - placeholder: Input placeholder text
 * - value: Field value
 * - onChange: Change handler
 * - type: Input type (default: 'text')
 * - required: Is field required
 * - isOtpChannel: Override - set true if field is used for OTP
 * - placement: Override - 'label-hint' or 'placeholder' or null
 * - error: Error message if validation failed
 */
const FormFieldWithOtpNote = ({
  fieldType,
  label,
  placeholder = '',
  value,
  onChange,
  type = 'text',
  required = false,
  isOtpChannel = false,
  placement = null,
  error = null,
  ...props
}) => {
  const guidanceConfig = shouldShowOtpNote(fieldType, { isOtpChannel });
  const finalPlacement = placement || guidanceConfig.placement;
  const showNote = guidanceConfig.showNote;
  const noteMessage = guidanceConfig.message;

  // Determine label text based on placement
  const labelText = finalPlacement === 'label-hint'
    ? getFieldLabelWithOtpNote(label, showNote, noteMessage)
    : label;

  // Determine placeholder based on placement
  const placeholderText = finalPlacement === 'placeholder'
    ? getPlaceholderWithOtpNote(placeholder, showNote, noteMessage)
    : placeholder;

  return (
    <div className="form-group">
      <label>
        {labelText}
        {required && <span className="required-asterisk">*</span>}
      </label>

      {/* Label-hint placement: Shows note in gray below label */}
      {finalPlacement === 'label-hint' && showNote && (
        <small style={{ color: '#6B7280', display: 'block', marginBottom: '0.25rem', fontStyle: 'italic' }}>
          {noteMessage}
        </small>
      )}

      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholderText}
        required={required}
        className={error ? 'input-error' : ''}
        {...props}
      />

      {/* Error message display */}
      {error && (
        <small style={{ color: '#DC2626', display: 'block', marginTop: '0.25rem' }}>
          {error}
        </small>
      )}
    </div>
  );
};

export default FormFieldWithOtpNote;
