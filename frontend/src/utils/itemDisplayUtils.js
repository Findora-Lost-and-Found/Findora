import { maskCardDigitsForDisplay } from './cardUtils';

export const FOUND_ITEM_SORT = {
  LATEST: 'latest',
  NAME_ASC: 'name-asc',
  NAME_DESC: 'name-desc'
};

const getTimestamp = (item) => {
  // Prefer server-side timestamps when available, then fall back to item date/time fields.
  const candidates = [
    item.posted_time,
    item.created_at,
    item.updated_at,
    item.date_found,
    item.date
  ];

  for (const value of candidates) {
    if (!value) continue;
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }

  return 0;
};

export const sortFoundItems = (items = [], sortBy = FOUND_ITEM_SORT.LATEST) => {
  const clonedItems = [...items];

  if (sortBy === FOUND_ITEM_SORT.NAME_ASC) {
    return clonedItems.sort((a, b) =>
      (a.name || a.item_name || '').localeCompare(b.name || b.item_name || '', undefined, { sensitivity: 'base' })
    );
  }

  if (sortBy === FOUND_ITEM_SORT.NAME_DESC) {
    return clonedItems.sort((a, b) =>
      (b.name || b.item_name || '').localeCompare(a.name || a.item_name || '', undefined, { sensitivity: 'base' })
    );
  }

  return clonedItems.sort((a, b) => getTimestamp(b) - getTimestamp(a));
};

export const maskNicNumber = (value = '') => {
  const normalized = String(value).trim();
  if (!normalized) return '';
  if (normalized.length <= 4) return normalized;
  return `${'X'.repeat(normalized.length - 4)}${normalized.slice(-4)}`;
};

export const maskNicInText = (text = '') => {
  // Mask alphanumeric NIC-like tokens that contain digits while preserving the last 4 characters.
  return String(text).replace(/\b(?=[A-Za-z0-9]*\d)[A-Za-z0-9]{5,}\b/g, (token) => maskNicNumber(token));
};

export const maskCvvInText = (text = '') => {
  // Hide any explicitly labeled CVV value inside free-form descriptions.
  return String(text).replace(/(CVV(?:\s*number)?(?:\s*\(provided\))?\s*:\s*)(\d{1,4})/gi, '$1***');
};

export const maskCardInText = (text = '') => {
  const withMaskedRawCards = String(text).replace(/\b(?:\d[ -]?){13,19}\b/g, (token) => {
    const digits = token.replace(/\D/g, '');
    if (digits.length < 4) return token;
    return maskCardDigitsForDisplay(digits);
  });

  // If backend stores private marker in description, keep only masked last 4 for display.
  return withMaskedRawCards.replace(/__PRIVATE_CARD__=(\d{13,19})/gi, (_, cardNumber) => `Card: ${maskCardDigitsForDisplay(cardNumber)}`);
};

export const maskSensitiveDescription = (text = '', category = '') => {
  const maskedCvv = maskCvvInText(text);
  const maskedCard = maskCardInText(maskedCvv);
  return String(category).toUpperCase() === 'NIC' ? maskNicInText(maskedCard) : maskedCard;
};
