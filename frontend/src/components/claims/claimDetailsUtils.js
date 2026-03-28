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
  }

  if (!details.fromTime) {
    errors.fromTime = 'From Time is required';
  }

  if (!details.toTime) {
    errors.toTime = 'To Time is required';
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
