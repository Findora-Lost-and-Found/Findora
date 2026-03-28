const CARD_NUMBER_REGEX = /^\d{16}$/;
const CARD_LAST4_REGEX = /^[A-Za-z0-9]{4}$/;

export const normalizeCardNumber = (value = '') => String(value).replace(/\D/g, '').slice(0, 16);

export const normalizeCardLast4 = (value = '') => String(value).trim().slice(0, 4);

export const formatCardNumber = (value = '') => {
  const digits = normalizeCardNumber(value);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
};

export const maskCardDigitsForDisplay = (value = '') => {
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length <= 4) return digits;

  const maskedPrefix = '*'.repeat(Math.max(digits.length - 4, 0));
  const maskedGroups = maskedPrefix.match(/.{1,4}/g) || [];
  return [...maskedGroups, digits.slice(-4)].join(' ');
};

export const maskCardNumber = (value = '') => {
  const digits = normalizeCardNumber(value);
  return maskCardDigitsForDisplay(digits);
};

export const getCardCursorPosition = (formattedValue = '', digitsBeforeCursor = 0) => {
  if (digitsBeforeCursor <= 0) return 0;

  let seenDigits = 0;
  for (let i = 0; i < formattedValue.length; i += 1) {
    if (/\d/.test(formattedValue[i])) {
      seenDigits += 1;
      if (seenDigits >= digitsBeforeCursor) {
        return i + 1;
      }
    }
  }

  return formattedValue.length;
};

export const isValidCardNumber = (value = '') => CARD_NUMBER_REGEX.test(normalizeCardNumber(value));

export const isValidCardLast4 = (value = '') => CARD_LAST4_REGEX.test(normalizeCardLast4(value));

export const getCardLast4 = (value = '') => {
  const digits = normalizeCardNumber(value);
  return digits.length >= 4 ? digits.slice(-4) : '';
};
