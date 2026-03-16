const NIC_REGEX = /^(?:\d{12}|\d{9}[Vv])$/;

export const normalizeNicNumber = (value = '') => {
	return String(value).trim().toUpperCase();
};

export const isValidNicNumber = (value = '') => NIC_REGEX.test(normalizeNicNumber(value));
