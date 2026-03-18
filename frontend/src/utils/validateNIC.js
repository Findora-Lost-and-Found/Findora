/**
 * Validates a NIC number format
 * Accepts two formats:
 * 1) 12-digit NIC (numbers only)
 * 2) 9-digit NIC followed by 'V' or 'X' (case-insensitive)
 * 
 * @param {string} nicInput - The NIC number to validate
 * @returns {boolean|string} - Returns true if valid, or error message if invalid
 */
export const validateNIC = (nicInput) => {
  if (!nicInput || typeof nicInput !== 'string') {
    return "Invalid NIC. Enter 12 digits or 9 digits followed by 'V'";
  }

  // Remove whitespace and convert to uppercase
  const normalizedNIC = nicInput.trim().toUpperCase();

  // Check format 1: Exactly 12 digits
  const isFormat1 = /^\d{12}$/.test(normalizedNIC);

  // Check format 2: 9 digits followed by V or X
  const isFormat2 = /^\d{9}[VX]$/.test(normalizedNIC);

  if (isFormat1 || isFormat2) {
    return true;
  }

  return "Invalid NIC. Enter 12 digits or 9 digits followed by 'V'";
};

/**
 * Sanitizes NIC input to allow only valid characters
 * Allows typing digits and V/X letters freely
 * Enforces format constraints (max 12 digits, or 9 digits + V/X)
 * 
 * @param {string} value - The raw input value
 * @returns {string} - Sanitized NIC value
 */
export const sanitizeNICInput = (value = '') => {
  const rawValue = String(value).toUpperCase().replace(/\s+/g, '');
  let sanitized = '';

  for (const char of rawValue) {
    // Allow digits (up to 12 total, or 9 if V/X will follow)
    if (/\d/.test(char)) {
      if (sanitized.length < 12 && !/[VX]$/.test(sanitized)) {
        sanitized += char;
      }
      continue;
    }

    // Allow V or X after exactly 9 digits
    if ((char === 'V' || char === 'X') && sanitized.length === 9 && !/[VX]/.test(sanitized)) {
      sanitized += char;
    }
  }

  return sanitized;
};

/**
 * Formats a NIC number for display
 * Adds spaces for readability (e.g., "123456789V" → "123456789 V")
 * 
 * @param {string} nicNumber - The NIC number to format
 * @returns {string} - Formatted NIC number
 */
export const formatNICDisplay = (nicNumber = '') => {
  const normalized = String(nicNumber).trim().toUpperCase();
  
  // Format 9-digit + V/X: "123456789V"
  if (/^\d{9}[VX]$/.test(normalized)) {
    return `${normalized.slice(0, 9)} ${normalized.slice(9)}`;
  }

  // Format 12-digit: add spacing every 4 digits
  if (/^\d{12}$/.test(normalized)) {
    return `${normalized.slice(0, 4)} ${normalized.slice(4, 8)} ${normalized.slice(8, 12)}`;
  }

  return normalized;
};

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*
// Example 1: Simple validation
const result1 = validateNIC('123456789V');
console.log(result1); // true

const result2 = validateNIC('199001234567');
console.log(result2); // true

const result3 = validateNIC('123456');
console.log(result3); // "Invalid NIC. Enter 12 digits or 9 digits followed by 'V'"

// Example 2: Using with form input (allow free typing, validate on submit)
const handleNICInputChange = (newValue) => {
  // Sanitize as user types - allows all characters, enforces format limits
  const sanitized = sanitizeNICInput(newValue);
  setFormData(prev => ({ ...prev, nicNumber: sanitized }));
};

const handleSubmit = (e) => {
  e.preventDefault();
  
  // Validate on submit - check if format is correct
  const validation = validateNIC(formData.nicNumber);
  
  if (validation === true) {
    console.log('NIC is valid! Format:', formatNICDisplay(formData.nicNumber));
    // Proceed with form submission
  } else {
    console.error(validation); // "Invalid NIC. Enter 12 digits or 9 digits followed by 'V'"
    setError(validation);
  }
};

// Example 3: Form input field configuration
// <input 
//   type="text" 
//   value={formData.nicNumber}
//   onChange={(e) => handleNICInputChange(e.target.value)}
//   placeholder="Enter NIC: 9 digits+V or 12 digits"
//   maxLength="13"  // Safety limit
// />

// Example 4: Real-world form submission
const exampleFormData = {
  name: 'John Doe',
  nicNumber: '123456789V',
  category: 'NIC'
};

const nicValidation = validateNIC(exampleFormData.nicNumber);
if (nicValidation === true) {
  console.log('✓ Form ready to submit');
  console.log('Display format:', formatNICDisplay(exampleFormData.nicNumber));
} else {
  console.log('✗ Form validation failed:', nicValidation);
}
*/
