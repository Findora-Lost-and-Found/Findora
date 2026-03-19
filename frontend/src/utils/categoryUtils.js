export const ALLOWED_CATEGORIES = ['NIC', 'Student ID', 'Bank Card', 'Wallet', 'Other'];

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
