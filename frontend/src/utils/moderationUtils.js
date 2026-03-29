const BLOCKED_TERMS = [
  'fuck',
  'bitch',
  'shit',
  'asshole',
  'bastard',
  'slut',
  'whore',
  'nigger',
  'nigga',
  'faggot',
  'motherfucker'
];

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const TERM_PATTERNS = BLOCKED_TERMS.map((term) => new RegExp(`\\b${escapeRegex(term)}\\b`, 'i'));

export const containsBlockedLanguage = (...segments) => {
  const text = segments
    .filter((segment) => segment !== null && segment !== undefined)
    .map((segment) => String(segment).trim())
    .filter(Boolean)
    .join(' ');

  if (!text) {
    return false;
  }

  return TERM_PATTERNS.some((pattern) => pattern.test(text));
};

export const BLOCKED_LANGUAGE_MESSAGE = 'Inappropriate language is not allowed. Please remove offensive words and try again.';
