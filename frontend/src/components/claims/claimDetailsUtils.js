export const createInitialClaimDetails = () => ({
  primaryLocation: '',
  location2: '',
  location3: '',
  description: '',
  lostDate: '',
  fromTime: '',
  toTime: ''
});

export const validateClaimDetails = (details) => {
  const errors = {};

  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const isFutureDate = (dateValue) => {
    if (!dateValue) return false;
    const selectedDate = new Date(`${dateValue}T00:00:00`);
    const currentDay = new Date();
    currentDay.setHours(0, 0, 0, 0);
    return selectedDate > currentDay;
  };

  const isFutureTimeOnDate = (dateValue, timeValue) => {
    if (!dateValue || !timeValue || dateValue !== todayString) {
      return false;
    }

    const match = String(timeValue).match(/^(\d{2}):(\d{2})$/);
    if (!match) {
      return false;
    }

    const selectedTotalMinutes = (Number(match[1]) * 60) + Number(match[2]);
    const currentTotalMinutes = (today.getHours() * 60) + today.getMinutes();
    return selectedTotalMinutes > currentTotalMinutes;
  };

  if (!details.primaryLocation?.trim()) {
    errors.primaryLocation = 'Primary location is required';
  }

  const description = details.description?.trim() || '';
  if (!description) {
    errors.description = 'Description is required';
  } else if (description.length < 5) {
    errors.description = 'Description must be at least 5 characters';
  }

  if (!details.lostDate) {
    errors.lostDate = 'Date is required';
  } else if (isFutureDate(details.lostDate)) {
    errors.lostDate = 'Invalid date. Please select today or a past date.';
  }

  if (!details.fromTime) {
    errors.fromTime = 'From Time is required';
  } else if (isFutureTimeOnDate(details.lostDate, details.fromTime)) {
    errors.fromTime = 'Invalid time. Please select current time or a past time.';
  }

  if (!details.toTime) {
    errors.toTime = 'To Time is required';
  } else if (isFutureTimeOnDate(details.lostDate, details.toTime)) {
    errors.toTime = 'Invalid time. Please select current time or a past time.';
  }

  return errors;
};

export const buildClaimDetailsPayload = (details) => {
  const primaryLocation = details.primaryLocation?.trim() || '';
  const location2 = details.location2?.trim() || '';
  const location3 = details.location3?.trim() || '';

  return {
    locations: [primaryLocation, location2, location3],
    description: details.description?.trim() || '',
    lostDate: details.lostDate,
    fromTime: details.fromTime,
    toTime: details.toTime,
    // Compatibility keys for current backend claim profile parser.
    location1: primaryLocation,
    location2,
    location3,
    date: details.lostDate
  };
};
