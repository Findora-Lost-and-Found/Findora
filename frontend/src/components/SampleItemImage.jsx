// ---------------------------------------------------------------------------
// SampleItemImage – renders an SVG illustration for each item category.
// Shown when no real photo has been uploaded.
// For NIC: the NIC number is displayed with all but the last 4 chars masked.
// For Bank Card / Student ID: same masking applied to the identifier.
// ---------------------------------------------------------------------------

// ── helpers ──────────────────────────────────────────────────────────────────

/** Extract a masked NIC string from item data.
 *  Handles both raw ("199012345678") and already-masked ("XXXXXXXX5678") values.
 */
const buildMaskedNic = (item) => {
  const text = `${item?.description || ''} ${item?.item_name || ''}`;
  const match = text.match(/NIC\s*(?:Number)?[:\s]+([A-Za-z0-9X*]{5,})/i);
  if (match) {
    const num = match[1].toUpperCase().replace(/\*/g, 'X');
    // Already masked (contains X) – use as-is
    if (/X/.test(num)) return num;
    // Raw number – mask all but last 4
    if (num.length <= 4) return num;
    return 'X'.repeat(num.length - 4) + num.slice(-4);
  }
  return 'XXXXXXXXX????';
};

/** Return the 4-digit suffix for a bank card. */
const buildBankLast4 = (item) => {
  const desc = item?.description || '';
  const m = desc.match(/Last\s*4\s*(?:digits)?[:\s]+(\d{4})/i) || desc.match(/\b(\d{4})\b/);
  return m ? m[1] : '????';
};

/** Extract card type and bank name from item_name. */
const buildBankDetails = (item) => {
  const name = String(item?.item_name || item?.name || '').trim();
  const cardTypeMatch = name.match(/\b(Visa|MasterCard|Master|Credit|Debit|ATM)\b/i);

  // Supports:
  // 1) "Debit Card - BOC"
  // 2) "BOC Debit Card"
  // 3) Free text containing known bank names.
  const dashBank = name.match(/[-–]\s*(.+)$/i)?.[1]?.trim();
  const beforeCard = name.match(/^(.*?)\s+(?:Visa|MasterCard|Master|Credit|Debit|ATM)\s+Card\b/i)?.[1]?.trim();

  const knownBankMatch = name.match(/\b(BOC|Bank\s*of\s*Ceylon|Commercial\s*Bank|People'?s\s*Bank|Seylan\s*Bank|Seylan)\b/i);
  const knownBank = knownBankMatch?.[1]?.trim();

  const bankName = dashBank || beforeCard || knownBank || 'Bank';
  return {
    cardType: cardTypeMatch ? cardTypeMatch[1] : 'Card',
    bankName,
  };
};

const resolveBankTheme = (bankName = '') => {
  const lower = String(bankName).toLowerCase();

  if (lower.includes('bank of ceylon') || lower.includes('boc')) {
    return {
      key: 'boc',
      label: 'BOC',
      start: '#1B5E20',
      end: '#2E7D32',
      text: '#FFFFFF',
      subText: 'rgba(255,255,255,0.6)',
      split: false,
    };
  }

  if (lower.includes('commercial')) {
    return {
      key: 'commercial',
      label: 'COMMERCIAL BANK',
      start: '#0B3D91',
      end: '#1565C0',
      text: '#FFFFFF',
      subText: 'rgba(255,255,255,0.62)',
      split: false,
    };
  }

  if (lower.includes("people") || lower.includes('peoples')) {
    return {
      key: 'peoples',
      label: "PEOPLE'S BANK",
      start: '#B71C1C',
      end: '#D32F2F',
      text: '#FFFFFF',
      subText: 'rgba(255,255,255,0.62)',
      split: false,
    };
  }

  if (lower.includes('seylan')) {
    return {
      key: 'seylan',
      label: 'SEYLAN BANK',
      start: '#8B1A1A',
      end: '#A42323',
      text: '#FFFFFF',
      subText: 'rgba(255,255,255,0.65)',
      split: true,
    };
  }

  return {
    key: 'generic',
    label: bankName ? bankName.toUpperCase() : 'BANK',
    start: '#1B5E20',
    end: '#2E7D32',
    text: '#FFFFFF',
    subText: 'rgba(255,255,255,0.6)',
    split: false,
  };
};

/** Masked student / staff ID – last 4 visible. */
const buildStudentIdMasked = (item) => {
  const desc = item?.description || '';
  const m = desc.match(/ID:\s*([A-Za-z0-9]+)/i);
  if (m) {
    const id = m[1].toUpperCase();
    if (id.length <= 4) return id;
    return 'X'.repeat(id.length - 4) + id.slice(-4);
  }
  return 'XXXXX????';
};

/** Brief wallet contents string. */
const buildWalletContents = (item) => {
  const desc = item?.description || '';
  const m = desc.match(/Contains(?:\s*[^:]*)?:\s*(.+)/i);
  if (!m) return null;
  const val = m[1].trim();
  return val.length > 40 ? val.slice(0, 40) + '…' : val;
};

// ── SVG card illustrations ────────────────────────────────────────────────────

const NICCard = ({ maskedNumber }) => (
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 300 190"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Sample NIC card"
  >
    <defs>
      <linearGradient id="nicBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0D47A1" />
        <stop offset="100%" stopColor="#1565C0" />
      </linearGradient>
    </defs>

    {/* Card base */}
    <rect width="300" height="190" rx="12" fill="url(#nicBg)" />

    {/* Decorative diagonal stripe */}
    <polygon points="210,0 300,0 300,90" fill="rgba(255,255,255,0.04)" />

    {/* Gold accent lines */}
    <rect width="300" height="3" rx="0" fill="#FBC02D" opacity="0.55" />
    <rect y="187" width="300" height="3" rx="0" fill="#FBC02D" opacity="0.55" />

    {/* Header band */}
    <rect width="300" height="46" rx="12" fill="rgba(0,0,0,0.22)" />
    <rect y="34" width="300" height="12" fill="rgba(0,0,0,0.22)" />

    {/* Header text */}
    <text x="150" y="14" textAnchor="middle" fill="#FBC02D" fontSize="8" fontWeight="bold" fontFamily="Georgia,serif">
      DEMOCRATIC SOCIALIST REPUBLIC OF SRI LANKA
    </text>
    <text x="150" y="26" textAnchor="middle" fill="#FFF9C4" fontSize="7.5" fontFamily="Georgia,serif">
      ශ්‍රී ලංකා ප්‍රජාතාන්ත්‍රික සමාජවාදී ජනරජය
    </text>
    <text x="150" y="37" textAnchor="middle" fill="#FFF9C4" fontSize="7" fontFamily="Georgia,serif">
      இலங்கை ஜனநாயக சோஷலிஸ்ட் குடியரசு
    </text>
    <text x="150" y="52" textAnchor="middle" fill="white" fontSize="8.5" fontWeight="bold" letterSpacing="1.5" fontFamily="Arial,sans-serif">
      NATIONAL IDENTITY CARD
    </text>

    {/* National emblem-style watermark */}
    <g transform="translate(150 103)" opacity="0.1">
      <circle cx="0" cy="0" r="42" fill="none" stroke="#FBC02D" strokeWidth="2" />
      <circle cx="0" cy="0" r="32" fill="none" stroke="#FBC02D" strokeWidth="1" />
      <polygon points="0,-26 6,-8 25,-8 10,3 16,21 0,10 -16,21 -10,3 -25,-8 -6,-8" fill="#FBC02D" />
      <circle cx="0" cy="0" r="6" fill="#FBC02D" />
    </g>

    {/* Sample structure shown, values hidden with X placeholders */}
    <rect x="14" y="60" width="272" height="85" rx="8" fill="rgba(0,0,0,0.12)" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />

    {/* Blank photo area */}
    <rect x="22" y="68" width="56" height="70" rx="4" fill="rgba(255,255,255,0.12)" stroke="rgba(251,192,45,0.45)" strokeWidth="1" strokeDasharray="4,2" />
    <text x="50" y="105" textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="8" fontFamily="Arial">PHOTO</text>
    <text x="50" y="116" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="7" fontFamily="Arial">BLANK</text>

    {/* Divider */}
    <line x1="86" y1="68" x2="86" y2="138" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />

    {/* Hidden sample details */}
    <text x="92" y="77" fill="rgba(255,255,255,0.55)" fontSize="6.8" fontFamily="Arial" letterSpacing="0.5">FULL NAME</text>
    <text x="92" y="87" fill="rgba(255,255,255,0.7)" fontSize="8" fontFamily="Courier New,monospace" letterSpacing="1.2">XXXXXXXX XXXXXXXX XXXXX</text>

    <text x="92" y="98" fill="rgba(255,255,255,0.55)" fontSize="6.8" fontFamily="Arial" letterSpacing="0.5">DATE OF BIRTH</text>
    <text x="92" y="108" fill="rgba(255,255,255,0.7)" fontSize="8" fontFamily="Courier New,monospace" letterSpacing="1.2">XX / XX / XXXX</text>

    <text x="92" y="119" fill="rgba(255,255,255,0.55)" fontSize="6.8" fontFamily="Arial" letterSpacing="0.5">ADDRESS</text>
    <text x="92" y="129" fill="rgba(255,255,255,0.7)" fontSize="8" fontFamily="Courier New,monospace" letterSpacing="1.2">XXXXXXXXXXXXXXXXXXXXXXXX</text>

    <text x="92" y="139" fill="rgba(255,255,255,0.55)" fontSize="6.8" fontFamily="Arial" letterSpacing="0.5">SIGNATURE</text>

    {/* NIC number section */}
    <line x1="14" y1="155" x2="286" y2="155" stroke="rgba(255,215,0,0.3)" strokeWidth="0.8" />
    <text x="14" y="166" fill="rgba(251,192,45,0.75)" fontSize="6.5" fontFamily="Arial" letterSpacing="0.5">NIC NUMBER</text>
    <text x="14" y="181" fill="#FBC02D" fontSize="14" fontWeight="bold" fontFamily="Courier New,monospace" letterSpacing="2">
      {maskedNumber}
    </text>

    {/* Emblem watermark only for NIC sample */}
  </svg>
);

const StudentIDCard = ({ maskedId }) => (
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 300 190"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Sample Student ID card"
  >
    <defs>
      <linearGradient id="idHdr" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#5A0F1F" />
        <stop offset="100%" stopColor="#7A1A2D" />
      </linearGradient>
    </defs>

    {/* Card base */}
    <rect width="300" height="190" rx="12" fill="#FFFFFF" />

    {/* Header band */}
    <rect width="300" height="48" rx="12" fill="url(#idHdr)" />
    <rect y="36" width="300" height="12" fill="url(#idHdr)" />

    {/* Header text */}
    <text x="150" y="21" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold" fontFamily="Arial,sans-serif">
      UNIVERSITY OF MORATUWA
    </text>
    <text x="150" y="34" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="8" fontFamily="Arial,sans-serif" letterSpacing="0.7">
      FACULTY OF XXXXX
    </text>
    <text x="150" y="53" textAnchor="middle" fill="#5A0F1F" fontSize="8.5" fontWeight="bold" fontFamily="Arial,sans-serif" letterSpacing="1">
      UNIVERSITY / SECURITY ID CARD
    </text>

    {/* Photo box */}
    <rect x="14" y="62" width="68" height="84" rx="4" fill="#F7F7F7" stroke="#9E9E9E" strokeWidth="1" strokeDasharray="4,2" />
    <text x="48" y="103" textAnchor="middle" fill="#8E8E8E" fontSize="9" fontFamily="Arial">PHOTO</text>
    <text x="48" y="114" textAnchor="middle" fill="#A8A8A8" fontSize="7" fontFamily="Arial">BLANK</text>

    {/* Divider */}
    <line x1="92" y1="62" x2="92" y2="146" stroke="#D0D0D0" strokeWidth="0.8" />

    {/* Hidden sample fields */}
    <text x="97" y="76" fill="#5A0F1F" fontSize="6.8" fontFamily="Arial" letterSpacing="0.5">NAME</text>
    <text x="97" y="86" fill="#7C7C7C" fontSize="8" fontFamily="Courier New,monospace" letterSpacing="1.2">XXXXXXXX XXXXXXX</text>

    <text x="97" y="98" fill="#5A0F1F" fontSize="6.8" fontFamily="Arial" letterSpacing="0.5">FACULTY</text>
    <text x="97" y="108" fill="#7C7C7C" fontSize="8" fontFamily="Courier New,monospace" letterSpacing="1.2">FACULTY OF XXXXX</text>

    <text x="97" y="120" fill="#5A0F1F" fontSize="6.8" fontFamily="Arial" letterSpacing="0.5">STUDENT / STAFF ID</text>
    <text x="97" y="136" fill="#5A0F1F" fontSize="14" fontWeight="bold" fontFamily="Courier New,monospace" letterSpacing="1.5">
      {maskedId}
    </text>

    {/* Valid period */}
    <text x="97" y="151" fill="#8E8E8E" fontSize="7.5" fontFamily="Arial">Valid: XX / XX / XXXX</text>

    {/* Bottom barcode strip */}
    <rect y="165" width="300" height="25" rx="0" fill="#5A0F1F" opacity="0.08" />
    {[0,3,5,8,11,13,16,19,22,25,27,30,33,36,38].map((x, i) => (
      <rect key={i} x={80 + x} y="168" width={i % 3 === 0 ? 2 : 1} height="16" fill="#5A0F1F" opacity="0.35" />
    ))}

    {/* University of Moratuwa watermark */}
    <g transform="translate(150 112)" opacity="0.1">
      <circle cx="0" cy="0" r="38" fill="none" stroke="#5A0F1F" strokeWidth="2" />
      <circle cx="0" cy="0" r="30" fill="none" stroke="#5A0F1F" strokeWidth="1" />
      <polygon points="0,-18 5,-4 20,-4 8,4 13,18 0,10 -13,18 -8,4 -20,-4 -5,-4" fill="#5A0F1F" />
      <text x="0" y="5" textAnchor="middle" fill="#5A0F1F" fontSize="16" fontWeight="bold" fontFamily="Arial">UOM</text>
      <text x="0" y="50" textAnchor="middle" fill="#5A0F1F" fontSize="6.5" fontFamily="Arial" letterSpacing="0.8">
        UNIVERSITY OF MORATUWA
      </text>
    </g>
  </svg>
);

const BankCardSVG = ({ last4, cardType, bankName }) => (
  (() => {
    const theme = resolveBankTheme(bankName);
    const gradientId = `bankBg-${theme.key}`;

    return (
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 300 190"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Sample bank card"
  >
    <defs>
      <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={theme.start} />
        <stop offset="100%" stopColor={theme.end} />
      </linearGradient>
      <linearGradient id="chipG" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F9A825" />
        <stop offset="100%" stopColor="#F57F17" />
      </linearGradient>
    </defs>

    {/* Card base */}
    {theme.split ? (
      <>
        <rect width="300" height="95" rx="12" fill={theme.start} />
        <rect y="95" width="300" height="95" rx="12" fill="#FFFFFF" />
        <line x1="0" y1="95" x2="300" y2="95" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
      </>
    ) : (
      <rect width="300" height="190" rx="12" fill={`url(#${gradientId})`} />
    )}

    {/* Outer rounded border */}
    <rect x="0.5" y="0.5" width="299" height="189" rx="12" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />

    {/* Decorative circles */}
    <circle cx="250" cy="50" r="85" fill="rgba(255,255,255,0.04)" />
    <circle cx="50" cy="150" r="70" fill="rgba(255,255,255,0.03)" />

    {/* Contactless / NFC icon (top-right) */}
    <text x="272" y="24" fill={theme.split ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.3)'} fontSize="18">📶</text>

    {/* Bank name */}
    <text x="20" y="34" fill={theme.text} fontSize="14" fontWeight="bold" fontFamily="Arial,sans-serif" opacity="0.95">
      {bankName.length > 18 ? bankName.slice(0, 18) : bankName}
    </text>
    <text x="20" y="46" fill={theme.subText} fontSize="7.5" fontFamily="Arial">{theme.label}</text>
    <text x="245" y="35" textAnchor="end" fill={theme.subText} fontSize="9" fontFamily="Arial" fontWeight="bold">ATM CARD</text>

    {/* Chip */}
    <rect x="20" y="62" width="44" height="32" rx="5" fill="url(#chipG)" />
    <rect x="23" y="65" width="38" height="26" rx="3" fill="none" stroke="#c17900" strokeWidth="1" />
    <line x1="42" y1="65" x2="42" y2="91" stroke="#c17900" strokeWidth="0.8" />
    <line x1="23" y1="78" x2="61" y2="78" stroke="#c17900" strokeWidth="0.8" />

    {/* Card number */}
    <text x="20" y="122" fill={theme.split ? '#8B1A1A' : 'rgba(255,255,255,0.88)'} fontSize="17" fontFamily="Courier New,monospace" letterSpacing="2.5">
      XXXX  XXXX  XXXX  {last4}
    </text>

    {/* Valid thru */}
    <text x="20" y="148" fill={theme.split ? 'rgba(139,26,26,0.55)' : 'rgba(255,255,255,0.4)'} fontSize="7" fontFamily="Arial">VALID THRU</text>
    <text x="20" y="160" fill={theme.split ? '#8B1A1A' : 'rgba(255,255,255,0.75)'} fontSize="12" fontFamily="Courier New,monospace">XX / XX</text>

    {/* Cardholder name placeholder */}
    <rect x="100" y="148" width="110" height="8" rx="2" fill={theme.split ? 'rgba(139,26,26,0.2)' : 'rgba(255,255,255,0.18)'} />

    {/* Card type badge */}
    <text x="262" y="162" textAnchor="middle" fill={theme.split ? 'rgba(139,26,26,0.78)' : 'rgba(255,255,255,0.6)'} fontSize="9" fontFamily="Arial" fontWeight="bold">
      {cardType.toUpperCase()}
    </text>

    {/* Bank security watermark */}
    <g transform="translate(152 102)" opacity={theme.split ? 0.08 : 0.07}>
      <circle cx="0" cy="0" r="34" fill="none" stroke={theme.split ? '#8B1A1A' : '#FFFFFF'} strokeWidth="1.6" />
      <circle cx="0" cy="0" r="26" fill="none" stroke={theme.split ? '#8B1A1A' : '#FFFFFF'} strokeWidth="1" />
      <text x="0" y="-2" textAnchor="middle" fill={theme.split ? '#8B1A1A' : '#FFFFFF'} fontSize="11" fontWeight="bold" fontFamily="Arial">BANK</text>
      <text x="0" y="10" textAnchor="middle" fill={theme.split ? '#8B1A1A' : '#FFFFFF'} fontSize="8" fontFamily="Arial">SECURE</text>
    </g>
  </svg>
    );
  })()
);

const WalletCard = ({ contents }) => (
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 300 190"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Sample wallet"
  >
    <defs>
      <linearGradient id="walletBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#EFEBE9" />
        <stop offset="100%" stopColor="#D7CCC8" />
      </linearGradient>
      <linearGradient id="walletBody" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6D4C41" />
        <stop offset="100%" stopColor="#4E342E" />
      </linearGradient>
      <linearGradient id="walletInner" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8D6E63" />
        <stop offset="100%" stopColor="#795548" />
      </linearGradient>
    </defs>

    {/* Background */}
    <rect width="300" height="190" fill="url(#walletBg)" />

    {/* Wallet body */}
    <rect x="35" y="22" width="230" height="138" rx="14" fill="url(#walletBody)" />

    {/* Outer stitching */}
    <rect x="40" y="27" width="220" height="128" rx="12" fill="none" stroke="#8D6E63" strokeWidth="1.5" strokeDasharray="5,3" />

    {/* Wallet flap / shadow */}
    <rect x="42" y="44" width="216" height="8" rx="0" fill="rgba(0,0,0,0.15)" />

    {/* Card slots */}
    <rect x="48" y="52" width="92" height="56" rx="5" fill="url(#walletInner)" />
    <rect x="52" y="56" width="84" height="8" rx="3" fill="rgba(255,255,255,0.12)" />
    <rect x="52" y="70" width="60" height="6" rx="2" fill="rgba(255,255,255,0.08)" />
    <rect x="52" y="80" width="74" height="5" rx="2" fill="rgba(255,255,255,0.06)" />
    <rect x="52" y="89" width="50" height="5" rx="2" fill="rgba(255,255,255,0.06)" />

    {/* Money / bills section */}
    <rect x="150" y="52" width="110" height="56" rx="5" fill="rgba(0,0,0,0.2)" />
    <rect x="155" y="58" width="100" height="38" rx="3" fill="rgba(144,238,144,0.18)" stroke="rgba(144,238,144,0.3)" strokeWidth="1" />
    <text x="205" y="81" textAnchor="middle" fill="rgba(144,238,144,0.5)" fontSize="22">💵</text>

    {/* Clasp button */}
    <ellipse cx="150" cy="138" rx="14" ry="10" fill="#8D6E63" />
    <ellipse cx="150" cy="138" rx="9" ry="6" fill="#5D4037" />
    <ellipse cx="150" cy="138" rx="4" ry="3" fill="#795548" />

    {/* Label */}
    <text x="150" y="173" textAnchor="middle" fill="#5D4037" fontSize="10" fontWeight="bold" fontFamily="Arial">
      WALLET / PURSE
    </text>

    {/* Contents if available */}
    {contents ? (
      <text x="150" y="184" textAnchor="middle" fill="#9E9E9E" fontSize="7" fontFamily="Arial">
        Contains: {contents}
      </text>
    ) : null}

    {/* Wallet watermark */}
    <g transform="translate(150 104)" opacity="0.1">
      <ellipse cx="0" cy="0" rx="30" ry="22" fill="none" stroke="#5D4037" strokeWidth="1.5" />
      <ellipse cx="0" cy="0" rx="22" ry="15" fill="none" stroke="#5D4037" strokeWidth="1" />
      <ellipse cx="8" cy="0" rx="4" ry="3" fill="#5D4037" />
      <text x="0" y="31" textAnchor="middle" fill="#5D4037" fontSize="8" fontFamily="Arial" fontWeight="bold">WALLET</text>
    </g>
  </svg>
);

const OtherItemCard = ({ itemName }) => (
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 300 190"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Sample item"
  >
    <defs>
      <linearGradient id="otherBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#E3F2FD" />
        <stop offset="100%" stopColor="#BBDEFB" />
      </linearGradient>
    </defs>

    <rect width="300" height="190" fill="url(#otherBg)" />

    {/* Dashed box */}
    <rect x="75" y="20" width="150" height="110" rx="10" fill="white" stroke="#90CAF9" strokeWidth="2" strokeDasharray="6,4" />

    {/* Big question mark */}
    <text x="150" y="92" textAnchor="middle" fill="#1565C0" fontSize="58" opacity="0.4" fontFamily="Arial">?</text>

    {/* Label pill */}
    <rect x="65" y="146" width="170" height="28" rx="14" fill="rgba(21,101,192,0.1)" />
    <text x="150" y="165" textAnchor="middle" fill="#1565C0" fontSize="11" fontWeight="bold" fontFamily="Arial">
      {itemName ? itemName.slice(0, 22).toUpperCase() : 'ITEM'}
    </text>

    {/* Generic item watermark */}
    <g transform="translate(150 98)" opacity="0.08">
      <circle cx="0" cy="0" r="34" fill="none" stroke="#1565C0" strokeWidth="1.6" />
      <circle cx="0" cy="0" r="24" fill="none" stroke="#1565C0" strokeWidth="1" />
      <text x="0" y="-1" textAnchor="middle" fill="#1565C0" fontSize="11" fontWeight="bold" fontFamily="Arial">FINDORA</text>
      <text x="0" y="11" textAnchor="middle" fill="#1565C0" fontSize="8" fontFamily="Arial">ITEM</text>
    </g>
  </svg>
);

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * SampleItemImage
 *
 * Props:
 *   category  – normalised category string (NIC | Student ID | Bank Card | Wallet | Other)
 *   item      – raw item object (used to extract masked identifiers)
 *
 * Renders a full-size SVG illustration inside a flex container so it fills
 * whatever parent dimensions are provided (same slot as a regular <img>).
 */
const SampleItemImage = ({ category, item }) => {
  const containerStyle = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'stretch',
  };

  let card;
  switch (category) {
    case 'NIC':
      card = <NICCard maskedNumber={buildMaskedNic(item)} />;
      break;
    case 'Student ID':
      card = <StudentIDCard maskedId={buildStudentIdMasked(item)} />;
      break;
    case 'Bank Card': {
      const { cardType, bankName } = buildBankDetails(item);
      card = <BankCardSVG last4={buildBankLast4(item)} cardType={cardType} bankName={bankName} />;
      break;
    }
    case 'Wallet':
      card = <WalletCard contents={buildWalletContents(item)} />;
      break;
    default:
      card = <OtherItemCard itemName={item?.item_name || item?.name || ''} />;
  }

  return <div style={containerStyle}>{card}</div>;
};

export default SampleItemImage;
