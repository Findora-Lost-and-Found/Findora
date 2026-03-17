export const STUDENT_STAFF_ID_REGEX = /^\d{6}[A-Z]$/;

export const STUDENT_STAFF_ID_VALIDATION_MESSAGE = 'ID must be 6 digits followed by 1 letter (e.g. 240574S).';
export const STUDENT_STAFF_ID_HELPER_TEXT = 'Allowed format: 6 digits + 1 letter (A-Z).';

export const sanitizeStudentStaffIdInput = (value = '') => {
  const raw = String(value).toUpperCase().replace(/\s+/g, '');
  let sanitized = '';

  for (const char of raw) {
    if (sanitized.length < 6 && /\d/.test(char)) {
      sanitized += char;
      continue;
    }

    if (sanitized.length === 6 && /[A-Z]/.test(char)) {
      sanitized += char;
      break;
    }
  }

  return sanitized;
};

export const normalizeStudentStaffId = (value = '') => sanitizeStudentStaffIdInput(value);

export const isValidStudentStaffId = (value = '') => {
  return STUDENT_STAFF_ID_REGEX.test(normalizeStudentStaffId(value));
};