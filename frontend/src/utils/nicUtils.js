export const NIC_REGEX = /^(?:\d{9}[VX]|\d{12})$/;

export const normalizeNicNumber = (value = '') => {
  return String(value).trim().toUpperCase();
};

export const NIC_VALIDATION_MESSAGE = 'Enter a valid NIC in 9 digits + V/X or 12 digits format.';
export const NIC_HELPER_TEXT = 'Allowed formats: 123456789V or 199001234567';

export const sanitizeNicInput = (value = '') => {
  const rawValue = String(value).toUpperCase().replace(/\s+/g, '');
  let sanitized = '';

  for (const char of rawValue) {
    if (/\d/.test(char)) {
      if (sanitized.length < 12 && !/[VX]$/.test(sanitized)) {
        sanitized += char;
      }
      continue;
    }

    if ((char === 'V' || char === 'X') && sanitized.length === 9 && !/[VX]/.test(sanitized)) {
      sanitized += char;
    }
  }

  return sanitized;
};

export const normalizeNic = (value = '') => sanitizeNicInput(value);

export const isValidNic = (value = '') => NIC_REGEX.test(normalizeNic(value));

export const isValidNicNumber = (value = '') => isValidNic(value);