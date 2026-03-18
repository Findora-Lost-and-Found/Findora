export const NIC_REGEX = /^(?:\d{9}[VX]|\d{12})$/;

export const NIC_VALIDATION_MESSAGE = 'Enter a valid NIC in 9 digits + V/X or 12 digits format.';
export const NIC_HELPER_TEXT = 'Allowed formats: 123456789V or 199001234567';

export const sanitizeNicInput = (value = '') => {
  const rawValue = String(value).toUpperCase().replace(/\s+/g, '');
  let digits = '';
  let letter = '';

  // Extract digits and letter
  for (const char of rawValue) {
    if (/\d/.test(char) && digits.length < 12) {
      digits += char;
    } else if ((char === 'V' || char === 'X') && letter.length === 0) {
      letter = char;
    }
  }

  // Format: if 9 digits with letter, use short format; otherwise return all digits
  if (digits.length === 9 && letter) {
    return digits + letter;
  }
  // If 12 digits, return them
  if (digits.length === 12 && !letter) {
    return digits;
  }
  // Otherwise return what we have so far (allows typing in progress)
  return digits + letter;
};

export const normalizeNic = (value = '') => String(value).toUpperCase().replace(/\s+/g, '');

export const isValidNic = (value = '') => NIC_REGEX.test(normalizeNic(value));