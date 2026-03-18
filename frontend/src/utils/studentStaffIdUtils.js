export const STUDENT_STAFF_ID_REGEX = /^\d{6}[A-Z]$/;

export const STUDENT_STAFF_ID_VALIDATION_MESSAGE = 'ID must be 6 digits followed by 1 letter (e.g. 240574S).';
export const STUDENT_STAFF_ID_HELPER_TEXT = 'Allowed format: 6 digits + 1 letter (A-Z).';

export const sanitizeStudentStaffIdInput = (value = '') => {
  const raw = String(value).toUpperCase().replace(/\s+/g, '');
  let digits = '';
  let letter = '';

  // Extract digits and letter, limiting to max 6 digits and 1 letter
  for (const char of raw) {
    if (/\d/.test(char) && digits.length < 6) {
      digits += char;
    } else if (/[A-Z]/.test(char) && letter.length === 0) {
      letter = char;
    }
  }

  // Combine: digits first, then letter
  return digits + letter;
};

export const normalizeStudentStaffId = (value = '') => String(value).toUpperCase().replace(/\s+/g, '');

export const isValidStudentStaffId = (value = '') => {
  return STUDENT_STAFF_ID_REGEX.test(normalizeStudentStaffId(value));
};