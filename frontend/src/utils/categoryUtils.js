export const ALLOWED_CATEGORIES = ['NIC', 'Student ID', 'Bank Card', 'Wallet', 'Other'];

// Fallback images for each category (can be SVG data URLs or placeholder URLs)
export const CATEGORY_FALLBACK_IMAGE = {
  'NIC': 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 120%22%3E%3Crect fill=%22%23E8E8E8%22 width=%22200%22 height=%22120%22/%3E%3Ctext x=%2250%22 y=%2260%22 font-size=%2216%22 fill=%22%23666%22%3ENational ID%3C/text%3E%3C/svg%3E',
  'Student ID': 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 120%22%3E%3Crect fill=%22%23E8F5E9%22 width=%22200%22 height=%22120%22/%3E%3Ctext x=%2240%22 y=%2260%22 font-size=%2216%22 fill=%22%23666%22%3EStudent ID%3C/text%3E%3C/svg%3E',
  'Bank Card': 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 120%22%3E%3Crect fill=%22%23E3F2FD%22 width=%22200%22 height=%22120%22/%3E%3Ctext x=%2245%22 y=%2260%22 font-size=%2216%22 fill=%22%23666%22%3EBank Card%3C/text%3E%3C/svg%3E',
  'Wallet': 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 120%22%3E%3Crect fill=%22%23FFF3E0%22 width=%22200%22 height=%22120%22/%3E%3Ctext x=%2255%22 y=%2260%22 font-size=%2216%22 fill=%22%23666%22%3EWallet%3C/text%3E%3C/svg%3E',
  'Other': 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 120%22%3E%3Crect fill=%22%23F5F5F5%22 width=%22200%22 height=%22120%22/%3E%3Ctext x=%2260%22 y=%2260%22 font-size=%2216%22 fill=%22%23666%22%3EItem%3C/text%3E%3C/svg%3E'
};

const CATEGORY_ALIAS_MAP = {
  nic: 'NIC',
  'national id': 'NIC',
  'student id': 'Student ID',
  'staff id': 'Student ID',
  id: 'Student ID',
  'bank card': 'Bank Card',
  'bank cards': 'Bank Card',
  debit: 'Bank Card',
  credit: 'Bank Card',
  wallet: 'Wallet',
  purse: 'Wallet',
  'purse / wallet': 'Wallet',
  electronics: 'Other',
  accessories: 'Other',
  bags: 'Other',
  bag: 'Other',
  keys: 'Other',
  key: 'Other',
  other: 'Other'
};

export const normalizeCategory = (category, itemName = '') => {
  const normalized = category
    ? CATEGORY_ALIAS_MAP[String(category).trim().toLowerCase()]
    : undefined;

  if (normalized && normalized !== 'Other') {
    return normalized;
  }

  const itemText = String(itemName || '').toLowerCase();

  if (itemText.includes('nic') || itemText.includes('national id')) return 'NIC';
  if (itemText.includes('student id') || itemText.includes('staff id') || itemText.includes('id card')) return 'Student ID';
  if (itemText.includes('bank card') || itemText.includes('credit card') || itemText.includes('debit card') || itemText.includes('atm card')) return 'Bank Card';
  if (itemText.includes('wallet') || itemText.includes('purse')) return 'Wallet';

  return normalized || 'Other';
};
