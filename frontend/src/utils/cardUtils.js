const CARD_NUMBER_REGEX = /^\d{16}$/;

export const normalizeCardNumber = (value = '') => String(value).replace(/\D/g, '').slice(0, 16);

export const formatCardNumber = (value = '') => {
  const digits = normalizeCardNumber(value);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
};

export const isValidCardNumber = (value = '') => CARD_NUMBER_REGEX.test(normalizeCardNumber(value));

export const getCardLast4 = (value = '') => {
  const digits = normalizeCardNumber(value);
  return digits.length >= 4 ? digits.slice(-4) : '';
};
