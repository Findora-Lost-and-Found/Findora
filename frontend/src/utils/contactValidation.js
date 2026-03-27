const EMAIL_REGEX = /^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const PHONE_REGEX = /^\d{10}$/;

export const normalizeEmail = (value = '') => String(value).trim().toLowerCase();

export const normalizePhone = (value = '') => String(value).replace(/\D/g, '').slice(0, 10);

export const isValidEmail = (value = '') => EMAIL_REGEX.test(normalizeEmail(value));

export const isValidPhone = (value = '') => PHONE_REGEX.test(normalizePhone(value));
