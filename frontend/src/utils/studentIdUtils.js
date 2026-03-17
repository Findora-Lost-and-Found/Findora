const STUDENT_ID_REGEX = /^\d{6}[A-Za-z]$/;

export const normalizeStudentIdNumber = (value = '') => String(value).replace(/[\s-]/g, '').toUpperCase();

export const isValidStudentIdNumber = (value = '') => STUDENT_ID_REGEX.test(normalizeStudentIdNumber(value));
