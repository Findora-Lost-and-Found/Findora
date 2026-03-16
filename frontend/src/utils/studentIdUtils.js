const STUDENT_ID_REGEX = /^\d{6}[A-Za-z]$/;

export const normalizeStudentIdNumber = (value = '') => {
	return String(value).trim().toUpperCase();
};

export const validateStudentID = (value = '') => {
	const normalized = normalizeStudentIdNumber(value);
	return STUDENT_ID_REGEX.test(normalized) ? true : 'No valid ID';
};

export const isValidStudentIdNumber = (value = '') => validateStudentID(value) === true;
