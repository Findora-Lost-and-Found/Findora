const CARD_NUMBER_REGEX = /^\d{16}$/;
const CARD_LAST4_REGEX = /^[A-Za-z0-9]{4}$/;

export const normalizeCardNumber = (value = '') => String(value).replace(/\D/g, '').slice(0, 16);

export const normalizeCardLast4 = (value = '') => String(value).trim().slice(0, 4);

export const formatCardNumber = (value = '') => {
  const digits = normalizeCardNumber(value);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
};

export const isValidCardNumber = (value = '') => CARD_NUMBER_REGEX.test(normalizeCardNumber(value));

export const isValidCardLast4 = (value = '') => CARD_LAST4_REGEX.test(normalizeCardLast4(value));

export const getCardLast4 = (value = '') => {
  const digits = normalizeCardNumber(value);
  return digits.length >= 4 ? digits.slice(-4) : '';
};
