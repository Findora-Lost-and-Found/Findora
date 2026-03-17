import { normalizeCategory } from './categoryUtils';

const BANK_THEMES = [
  { key: /commercial/i, background: '#1747a6', accent: '#0f2d70', label: 'COMMERCIAL BANK' },
  { key: /bank of ceylon|\bboc\b/i, background: '#1e7a43', accent: '#14512d', label: 'BANK OF CEYLON' },
  { key: /seylan/i, background: '#7b2034', accent: '#551724', label: 'SEYLAN BANK' },
  { key: /people/i, background: '#be1c24', accent: '#8a1318', label: "PEOPLE'S BANK" }
];

const escapeXml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const toDataUri = (svg) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const maskKeepLast4 = (value = '') => {
  const raw = String(value).trim();
  if (!raw) return '';

  const compact = raw.replace(/\s+/g, '');
  if (compact.length <= 4) return compact;

  return `${'X'.repeat(compact.length - 4)}${compact.slice(-4)}`;
};

const extractAfterPrefix = (text = '', regex) => {
  const match = String(text).match(regex);
  return match?.[1]?.trim() || '';
};

const buildNicSvg = ({ name, nicNumber }) => {
  const maskedNic = maskKeepLast4(nicNumber || '');

  const waveU = 'q 7.5,-3.5 15,0 q 7.5,3.5 15,0 q 7.5,-3.5 15,0 q 7.5,3.5 15,0 q 7.5,-3.5 15,0 q 7.5,3.5 15,0 q 7.5,-3.5 15,0 q 7.5,3.5 15,0 q 7.5,-3.5 15,0 q 7.5,3.5 15,0 q 7.5,-3.5 15,0 q 7.5,3.5 15,0 q 7.5,-3.5 15,0 q 7.5,3.5 15,0 q 7.5,-3.5 15,0 q 7.5,3.5 15,0 q 7.5,-3.5 15,0 q 7.5,3.5 15,0 q 7.5,-3.5 15,0 q 7.5,3.5 15,0';
  const waveD = 'q 7.5,3.5 15,0 q 7.5,-3.5 15,0 q 7.5,3.5 15,0 q 7.5,-3.5 15,0 q 7.5,3.5 15,0 q 7.5,-3.5 15,0 q 7.5,3.5 15,0 q 7.5,-3.5 15,0 q 7.5,3.5 15,0 q 7.5,-3.5 15,0 q 7.5,3.5 15,0 q 7.5,-3.5 15,0 q 7.5,3.5 15,0 q 7.5,-3.5 15,0 q 7.5,3.5 15,0 q 7.5,-3.5 15,0 q 7.5,3.5 15,0 q 7.5,-3.5 15,0 q 7.5,3.5 15,0 q 7.5,-3.5 15,0';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="190" viewBox="0 0 300 190">
  <defs>
    <linearGradient id="nicBg" x1="0" y1="0" x2="0.2" y2="1">
      <stop offset="0%" stop-color="#ddf0ff"/>
      <stop offset="100%" stop-color="#b8dcf8"/>
    </linearGradient>
    <radialGradient id="emblGold" cx="42%" cy="38%">
      <stop offset="0%" stop-color="#e8c840"/>
      <stop offset="100%" stop-color="#9a6e08"/>
    </radialGradient>
  </defs>

  <rect width="300" height="190" rx="10" fill="url(#nicBg)"/>
  <rect x="1" y="1" width="298" height="188" rx="9" fill="none" stroke="#5aaee8" stroke-width="1.5"/>

  <!-- Emblem -->
  <circle cx="265" cy="37" r="27" fill="url(#emblGold)"/>
  <circle cx="265" cy="37" r="21" fill="#5e1100"/>
  <circle cx="265" cy="37" r="27" fill="none" stroke="#7a5800" stroke-width="1.5"/>
  <circle cx="265" cy="37" r="23" fill="none" stroke="#d8a820" stroke-width="0.6" opacity="0.5"/>
  <ellipse cx="265" cy="41" rx="8" ry="9" fill="#d8a835"/>
  <circle cx="265" cy="28" r="7" fill="#d8a835"/>
  <circle cx="265" cy="28" r="9.2" fill="#b07820" opacity="0.65"/>
  <ellipse cx="274" cy="32" rx="3.5" ry="2.8" fill="#d8a835"/>
  <ellipse cx="258" cy="43" rx="2.8" ry="2" fill="#d8a835"/>
  <path d="M 273 40 Q 281 33 278 24" fill="none" stroke="#d8a835" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="274" y1="29" x2="283" y2="19" stroke="#e8d060" stroke-width="2" stroke-linecap="round"/>
  <path d="M 252 57 Q 255 53 259 57 Q 262 53 265 57 Q 268 53 271 57 Q 275 53 278 57" fill="none" stroke="#d0a020" stroke-width="1.2"/>
  <text x="265" y="73" font-family="Arial,sans-serif" font-size="7" font-weight="bold" fill="#1a3570" text-anchor="middle" letter-spacing="1.2">SRI LANKA</text>

  <!-- Titles -->
  <text x="133" y="15" font-family="Arial,sans-serif" font-size="8.5" fill="#1a3570" text-anchor="middle">ජාතික හැඳුනුම්පත</text>
  <text x="133" y="27" font-family="Arial,sans-serif" font-size="7.5" fill="#1a3570" text-anchor="middle">தேசிய அடையாள அட்டை</text>
  <text x="133" y="41" font-family="Arial,sans-serif" font-size="10.5" font-weight="bold" fill="#0f1f55" text-anchor="middle" letter-spacing="0.5">NATIONAL IDENTITY CARD</text>
  <text x="133" y="53" font-family="Arial,sans-serif" font-size="7.5" fill="#1a3570" text-anchor="middle" letter-spacing="1.5">SRI LANKA</text>

  <line x1="6" y1="60" x2="294" y2="60" stroke="#5aaee8" stroke-width="0.7"/>

  <!-- Photo box -->
  <rect x="8" y="64" width="63" height="76" rx="3" fill="#d4d0c2" stroke="#9a9080" stroke-width="0.8"/>
  <circle cx="40" cy="86" r="11" fill="#b4b0a6"/>
  <path d="M 12 140 Q 12 114 40 114 Q 68 114 68 140" fill="#b4b0a6"/>
  <text x="40" y="145" font-family="Arial,sans-serif" font-size="7" fill="#777" text-anchor="middle">PHOTO</text>

  <!-- NIC Number -->
  <text x="79" y="73" font-family="Arial,sans-serif" font-size="5.8" fill="#2a4a8a">No. / ජා.හැ.අ. / தே.அ.அ. எண்</text>
  <text x="79" y="86" font-family="Courier New,monospace" font-size="13.5" font-weight="bold" fill="#0a0a0a" letter-spacing="1.2">${escapeXml(maskedNic || 'XXXXXXXXX0000')}</text>

  <!-- Name -->
  <text x="79" y="99" font-family="Arial,sans-serif" font-size="5.8" fill="#2a4a8a">Name / නම / பெயர்</text>
  <text x="79" y="111" font-family="Arial,sans-serif" font-size="10.5" font-weight="bold" fill="#0a0a0a">${escapeXml(name || 'UNKNOWN')}</text>

  <!-- Date of Birth -->
  <text x="79" y="122" font-family="Arial,sans-serif" font-size="5.8" fill="#2a4a8a">Date of Birth / ජන්ම දිනය / பிறந்த திகதி</text>
  <text x="79" y="134" font-family="Arial,sans-serif" font-size="10" fill="#0a0a0a">— — —</text>

  <!-- Sex -->
  <text x="192" y="122" font-family="Arial,sans-serif" font-size="5.8" fill="#2a4a8a">Sex / ලිං. / பால்</text>
  <text x="192" y="134" font-family="Arial,sans-serif" font-size="10" fill="#0a0a0a">—</text>

  <!-- Signature box -->
  <text x="8" y="147" font-family="Arial,sans-serif" font-size="5.8" fill="#2a4a8a">Holder&apos;s Signature</text>
  <rect x="8" y="150" width="63" height="26" rx="2" fill="none" stroke="#9a9080" stroke-width="0.8"/>

  <!-- Wave security pattern -->
  <g fill="none" stroke="#3377bb" stroke-width="0.75" opacity="0.3">
    <path d="M 0,150 ${waveU}"/>
    <path d="M 0,154 ${waveD}"/>
    <path d="M 0,158 ${waveU}"/>
    <path d="M 0,162 ${waveD}"/>
    <path d="M 0,166 ${waveU}"/>
    <path d="M 0,170 ${waveD}"/>
    <path d="M 0,174 ${waveU}"/>
    <path d="M 0,178 ${waveD}"/>
    <path d="M 0,182 ${waveU}"/>
  </g>

  <rect x="0" y="184" width="300" height="6" rx="4" fill="#c85000" opacity="0.6"/>
</svg>`;

  return toDataUri(svg);
};

const buildBankCardSvg = ({ bankName, cardType, last4 }) => {
  const theme = BANK_THEMES.find((entry) => entry.key.test(bankName || '')) || {
    background: '#123a8a',
    accent: '#0a1f55',
    label: (bankName || 'BANK CARD').toUpperCase()
  };

  const numberBlock = last4 ? `XXXX XXXX XXXX ${last4}` : 'XXXX XXXX XXXX XXXX';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="190" viewBox="0 0 300 190">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${theme.background}"/>
      <stop offset="100%" stop-color="${theme.accent}"/>
    </linearGradient>
    <pattern id="linePattern" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(255,255,255,0.06)" stroke-width="2"/>
    </pattern>
  </defs>

  <rect width="300" height="190" rx="14" fill="url(#bg)"/>
  <rect x="0" y="0" width="300" height="190" rx="14" fill="url(#linePattern)"/>
  <rect x="16" y="16" width="268" height="158" rx="11" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1"/>

  <text x="18" y="27" font-family="Arial,sans-serif" font-size="13" font-weight="bold" fill="white">${escapeXml(theme.label)}</text>
  <text x="18" y="44" font-family="Arial,sans-serif" font-size="9" fill="rgba(255,255,255,0.8)">${escapeXml((cardType || 'CARD').toUpperCase())}</text>

  <rect x="18" y="52" width="46" height="34" rx="4" fill="#d9bd67"/>
  <text x="18" y="120" font-family="Courier New,monospace" font-size="14" letter-spacing="2" fill="white">${escapeXml(numberBlock)}</text>

  <text x="18" y="141" font-family="Arial,sans-serif" font-size="7" fill="rgba(255,255,255,0.7)">CARD NUMBER SHOWN AS MASKED FORMAT</text>
  <text x="260" y="174" font-family="Arial,sans-serif" font-size="20" fill="white" font-style="italic" font-weight="bold" text-anchor="middle">VISA</text>
</svg>`;

  return toDataUri(svg);
};

const buildStudentIdSvg = ({ name, idNumber, faculty, idType }) => {
  const isStaffId = /staff/i.test(idType || '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="220" viewBox="0 0 340 220">
  <defs>
    <linearGradient id="cardPaper" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fffef7"/>
      <stop offset="100%" stop-color="#f6f0dd"/>
    </linearGradient>
    <linearGradient id="topBar" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#8e1f2f"/>
      <stop offset="100%" stop-color="#6b1a2a"/>
    </linearGradient>
  </defs>

  <rect width="340" height="220" rx="12" fill="url(#cardPaper)"/>
  <rect x="1" y="1" width="338" height="218" rx="11" fill="none" stroke="#d2b997" stroke-width="1.2"/>

  <!-- Top maroon title bar -->
  <rect x="0" y="0" width="340" height="64" rx="12" fill="url(#topBar)"/>
  <rect x="0" y="52" width="340" height="12" fill="url(#topBar)"/>
  <circle cx="28" cy="32" r="16" fill="rgba(255,255,255,0.14)"/>
  <text x="28" y="35" font-family="Arial,sans-serif" font-size="8" text-anchor="middle" fill="#f3dfb1">UOM</text>

  <text x="188" y="23" font-family="Arial,sans-serif" font-size="14" font-weight="bold" fill="#f8e9c6" text-anchor="middle">University of Moratuwa</text>
  <text x="188" y="39" font-family="Arial,sans-serif" font-size="10" fill="#f3dfb1" text-anchor="middle">${escapeXml(faculty || 'Faculty of XXXXXX')}</text>

  <!-- Left details area -->
  <rect x="16" y="76" width="86" height="102" rx="6" fill="#efece2" stroke="#c5b9a0" stroke-width="1"/>
  <circle cx="59" cy="115" r="16" fill="#d4cec0"/>
  <path d="M 30 168 Q 30 138 59 138 Q 88 138 88 168" fill="#d4cec0"/>
  <text x="59" y="173" font-family="Arial,sans-serif" font-size="8" text-anchor="middle" fill="#9a9487">PHOTO</text>

  <text x="16" y="193" font-family="Arial,sans-serif" font-size="8" font-weight="bold" fill="#6b1a2a">${escapeXml(idType || 'STUDENT / STAFF ID')}</text>

  <text x="112" y="100" font-family="Arial,sans-serif" font-size="7" fill="#7b7264">NAME</text>
  <text x="112" y="115" font-family="Arial,sans-serif" font-size="12" font-weight="bold" fill="#1a1a1a">${escapeXml(name || 'UNKNOWN')}</text>

  <text x="112" y="135" font-family="Arial,sans-serif" font-size="7" fill="#7b7264">ID NUMBER</text>
  <text x="112" y="150" font-family="Arial,sans-serif" font-size="12" font-weight="bold" fill="#1a1a1a">${escapeXml(idNumber || 'N/A')}</text>

  <text x="112" y="170" font-family="Arial,sans-serif" font-size="7" fill="#7b7264">FACULTY</text>
  <text x="112" y="185" font-family="Arial,sans-serif" font-size="10" fill="#1a1a1a">${escapeXml(faculty || 'Faculty of XXXXXX')}</text>

  ${isStaffId ? `<text x="16" y="208" font-family="Arial,sans-serif" font-size="7" fill="#7b7264">Valid Until</text>
  <text x="74" y="208" font-family="Arial,sans-serif" font-size="9" font-weight="bold" fill="#1a1a1a">DEC 2029</text>` : ''}

  <rect x="170" y="202" width="68" height="8" fill="#111"/>
  <rect x="172" y="202" width="2" height="8" fill="#fff"/>
  <rect x="176" y="202" width="1" height="8" fill="#fff"/>
  <rect x="180" y="202" width="2" height="8" fill="#fff"/>
  <rect x="185" y="202" width="1" height="8" fill="#fff"/>
  <rect x="189" y="202" width="2" height="8" fill="#fff"/>
  <rect x="195" y="202" width="1" height="8" fill="#fff"/>
  <rect x="200" y="202" width="2" height="8" fill="#fff"/>
  <rect x="206" y="202" width="1" height="8" fill="#fff"/>
  <rect x="212" y="202" width="2" height="8" fill="#fff"/>
  <rect x="218" y="202" width="1" height="8" fill="#fff"/>
  <rect x="224" y="202" width="2" height="8" fill="#fff"/>
  <rect x="231" y="202" width="1" height="8" fill="#fff"/>
</svg>`;

  return toDataUri(svg);
};

export const buildIdentityPreviewImage = (item = {}) => {
  const category = normalizeCategory(item.category, item.name || item.item_name || '');
  const itemName = item.name || item.item_name || '';
  const description = item.description || '';

  if (category === 'NIC') {
    const nicName = extractAfterPrefix(itemName, /^NIC\s*-\s*(.+)$/i)
      || extractAfterPrefix(description, /Name\s*:\s*([^|,\n]+)/i)
      || 'UNKNOWN';
    const nicNumber = extractAfterPrefix(description, /NIC\s*Number\s*:\s*([A-Za-z0-9]+)/i);
    return buildNicSvg({ name: nicName, nicNumber });
  }

  if (category === 'Bank Card') {
    const bankName = extractAfterPrefix(itemName, /^(.*?)\s+(?:Credit|Debit|ATM)\s+Card$/i) || extractAfterPrefix(itemName, /^(.*?)\s+Card$/i) || 'BANK CARD';
    const cardType = extractAfterPrefix(itemName, /\b(Credit|Debit|ATM)\s+Card\b/i) || 'CARD';
    const last4 = extractAfterPrefix(description, /Last\s*4\s*digits\s*:\s*(\d{4})/i);
    return buildBankCardSvg({ bankName, cardType, last4 });
  }

  if (category === 'Student ID') {
    const name = extractAfterPrefix(itemName, /Student\/?Staff\s+ID\s*-\s*(.+)$/i)
      || extractAfterPrefix(description, /Name\s*:\s*([^|,\n]+)/i)
      || 'UNKNOWN';
    const idNumber = extractAfterPrefix(description, /ID\s*Number\s*:\s*([A-Za-z0-9\-]+)/i)
      || extractAfterPrefix(description, /Staff\s*ID\s*:\s*([A-Za-z0-9\-]+)/i)
      || extractAfterPrefix(description, /Registration\s*No\s*:\s*([A-Za-z0-9\-]+)/i)
      || 'N/A';
    const faculty = extractAfterPrefix(description, /Faculty\s*:\s*([^|,\n]+)/i) || 'Faculty of XXXXXX';
    const idTypeFromDescription = extractAfterPrefix(description, /ID\s*Type\s*:\s*(Student|Staff)/i);
    const isExplicitStaff = /staff\s*id\s*:/i.test(description)
      || /\bstaff\s+id\b/i.test(itemName)
      || /\bstaff\s*-/.test(itemName.toLowerCase())
      || /^sf[-\s]?\d+/i.test(idNumber)
      || /staff/i.test(idTypeFromDescription);
    const idType = isExplicitStaff ? 'STAFF ID' : 'STUDENT ID';
    return buildStudentIdSvg({ name, idNumber, faculty, idType });
  }

  return null;
};
