const LOST_TIME_REGEX = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export const validateLostTime = (value = '') => {
  const normalized = String(value).trim();
  return LOST_TIME_REGEX.test(normalized)
    ? true
    : 'Invalid time. Please enter a valid time in HH:MM format';
};

export const validateLostTimeWithDate = (lostDate = '', lostTime = '') => {
  const timeValidation = validateLostTime(lostTime);
  if (timeValidation !== true) {
    return timeValidation;
  }

  const normalizedDate = String(lostDate).trim();
  if (!normalizedDate) {
    return true;
  }

  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  if (normalizedDate !== todayString) {
    return true;
  }

  const [hours, minutes] = String(lostTime).trim().split(':').map(Number);
  const selectedTotalMinutes = (hours * 60) + minutes;
  const currentTotalMinutes = (today.getHours() * 60) + today.getMinutes();

  return selectedTotalMinutes > currentTotalMinutes
    ? 'Invalid time. Please select the past time'
    : true;
};