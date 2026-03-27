/**
 * OTP Field Guidance - Decision Tree & Quick Reference
 * 
 * Use this flowchart to quickly determine if a field needs an OTP note.
 */

export const OTP_FIELD_DECISION_TREE = `
┌─────────────────────────────────────────────────────────────┐
│     SHOULD THIS FIELD HAVE AN "OTP NOTE"?                  │
└─────────────────────────────────────────────────────────────┘

START: Looking at a form input field
│
├─ Question 1: Is this field VISIBLE TO USERS?
│  ├── NO → (End) Don't add note (internal field)
│  └─ YES → Go to Question 2
│
├─ Question 2: Does the field contain user contact/identity info?
│  │         (email, phone, student ID, NIC, staff ID, etc.)
│  ├─ NO → (End) Don't add note (not OTP-confused)
│  └─ YES → Go to Question 3
│
├─ Question 3: Is this field ALREADY USED FOR OTP?
│  │           (email account address, OTP code input)
│  ├─ YES → (End) Don't add note (field IS for OTP)
│  └─ NO → Go to Question 4
│
├─ Question 4: Could a user reasonably expect OTP here?
│  │           (Does it look like an auth/identity field?)
│  ├─ NO → (End) Don't add note
│  └─ YES → Go to Question 5
│
├─ Question 5: What's the best placement?
│  ├─ If IMPORTANT or REQUIRED field
│  │  → ✅ ADD NOTE (Label-hint placement)
│  │
│  ├─ If OPTIONAL field with plenty of space
│  │  → ✅ ADD NOTE (Placeholder placement)
│  │
│  └─ If SMALL/CRAMPED form
│     → ✅ ADD NOTE (Compact label with note in parentheses)
│
└─ Use consistent message: "Not used for OTP"

═══════════════════════════════════════════════════════════════
`;

export const QUICK_REFERENCE = {
  'ADD NOTE': {
    icon: '✅',
    fields: [
      { name: 'Phone Number', placement: 'Label-hint or Placeholder', context: 'Looks like OTP channel' },
      { name: 'Alternate Phone', placement: 'Label-hint', context: 'Secondary contact' },
      { name: 'Student ID', placement: 'Placeholder', context: 'Identity field' },
      { name: 'Staff ID', placement: 'Placeholder', context: 'Identity field' },
      { name: 'NIC (National ID)', placement: 'Label-hint', context: 'High-security identifier' },
    ]
  },
  'SKIP NOTE': {
    icon: '❌',
    fields: [
      { name: 'Email (Account)', reason: 'IS the OTP channel' },
      { name: 'OTP Code Input', reason: 'Field IS for OTP' },
      { name: 'Password', reason: 'Not OTP-related' },
      { name: 'Admin Notes', reason: 'Internal field' },
      { name: 'Item ID', reason: 'Technical identifier' },
      { name: 'Upload Path', reason: 'Backend field' },
    ]
  }
};

/**
 * Field Type Classification
 */
export const FIELD_CLASSIFICATION = {
  // Tier 1: User-Facing, Not OTP, Looks Like Auth → ADD NOTE
  TIER_1_ADD_NOTE: {
    phone: 'Phone Number',
    alternatePhone: 'Alternate Phone',
    studentId: 'Student ID',
    staffId: 'Staff ID',
    nic: 'National ID (NIC)',
  },

  // Tier 2: User-Facing, IS OTP Channel → SKIP NOTE
  TIER_2_SKIP_NOTE: {
    emailOtp: 'Email (OTP channel)',
    otpCode: 'OTP Code Input',
  },

  // Tier 3: User-Facing, Not Auth → SKIP NOTE
  TIER_3_SKIP_NOTE: {
    password: 'Password',
    username: 'Username',
    fullName: 'Full Name',
    itemName: 'Item Name',
    description: 'Description',
  },

  // Tier 4: Internal/Technical → SKIP NOTE
  TIER_4_INTERNAL: {
    userId: 'User ID (backend)',
    itemId: 'Item ID (backend)',
    adminNotes: 'Admin Notes',
    uploadPath: 'Upload Path',
    timestamp: 'Timestamp',
  }
};

/**
 * Placement Strategy
 */
export const PLACEMENT_STRATEGY = {
  'LABEL_HINT': {
    icon: '📌',
    usage: 'For important/required fields where clarity is critical',
    placement: 'Below label, above input, gray italicized text',
    example: `
      <label>Student ID Number</label>
      <small style="color: #6B7280; margin-bottom: 0.25rem; display: block;">
        Not used for OTP
      </small>
      <input type="text" ... />
    `,
    pros: ['Clear visibility', 'Professional look', 'Mobile-friendly'],
    cons: ['Takes extra vertical space'],
  },

  'PLACEHOLDER': {
    icon: '💬',
    usage: 'For optional fields or fields with space constraints',
    placement: 'Inline in placeholder text',
    example: `
      <input 
        type="tel"
        placeholder="Contact number - Not used for OTP"
      />
    `,
    pros: ['Compact', 'Integrated into field', 'No extra space'],
    cons: ['Disappears when typing', 'May be overlooked'],
  },

  'LABEL_SUFFIX': {
    icon: '🏷️',
    usage: 'Quick note in label for less-critical fields',
    placement: 'In label after field name',
    example: `
      <label>
        Phone Number 
        <span style="color: #9CA3AF;">(Not used for OTP)</span>
      </label>
      <input type="tel" ... />
    `,
    pros: ['Compact', 'Always visible', 'Light visual weight'],
    cons: ['Less prominent than label-hint'],
  },

  'HELPER_TEXT': {
    icon: '❓',
    usage: 'Detailed explanation for complex fields',
    placement: 'Below input as help text',
    example: `
      <input type="text" name="studentId" ... />
      <small style="color: #6B7280; margin-top: 0.25rem; display: block;">
        Your Student ID is not used for OTP verification. 
        OTP is sent to your registered email.
      </small>
    `,
    pros: ['Detailed', 'Educational', 'Flexible'],
    cons: ['Takes space', 'May clutter form'],
  },
};

/**
 * Real-World Examples
 */
export const REAL_WORLD_EXAMPLES = {
  // ✅ GOOD - Signup form phone field
  'Signup - Phone (GOOD)': {
    component: `
      <div className="form-group">
        <label>
          Phone Number{' '}
          <span style={{ color: '#9CA3AF' }}>(Optional - for contact only)</span>
        </label>
        <input
          type="tel"
          name="phone"
          placeholder="Contact number (not used for OTP)"
        />
      </div>
    `,
    notes: 'Has both label hint and placeholder note - very clear',
    rating: '⭐⭐⭐⭐⭐'
  },

  // ✅ GOOD - ReportLostItem Student ID field
  'ReportLostItem - Student ID (GOOD)': {
    component: `
      <div className="form-group">
        <label className="required">Student ID or Staff ID</label>
        <input
          name="studentOrStaffId"
          placeholder="e.g. 123456A - Not used for OTP"
        />
      </div>
    `,
    notes: 'Simple, clear hint in placeholder for required field',
    rating: '⭐⭐⭐⭐'
  },

  // ❌ BAD - No note when needed
  'ReportFoundItem - NIC (BAD)': {
    component: `
      <div className="form-group">
        <label className="required">NIC Number</label>
        <input
          name="nicNumber"
          placeholder="123456789V or 199001234567"
        />
      </div>
    `,
    notes: 'Should add note - NIC looks like identity field',
    rating: '⭐⭐',
    fix: 'Add label-hint: "Not used for OTP"'
  },

  // ❌ BAD - Note on OTP email
  'ForgotPassword - Email (BAD)': {
    component: `
      <div className="form-group">
        <label>Email (Not used for OTP)</label>
        <input type="email" placeholder="Enter your email" />
      </div>
    `,
    notes: 'WRONG - Email IS the OTP channel, DO NOT add this note',
    rating: '⭐',
  },
};

/**
 * Copy-Paste Messages
 */
export const OTP_NOTE_MESSAGES = {
  CONCISE: 'Not used for OTP',
  FRIENDLY: 'This field is not used for OTP',
  DETAILED: 'Not used for OTP verification',
  EDUCATIONAL: 'Not used for OTP - OTP is sent to your email',
};

/**
 * Validation Checklist
 */
export const VALIDATION_CHECKLIST = [
  '✓ Does field look like OTP channel?',
  '✓ Is field actually used for OTP?',
  '✓ Is note placement clear but unobtrusive?',
  '✓ Is note text consistent with others?',
  '✓ Is note visible on mobile devices?',
  '✓ Does note work in light and dark mode?',
  '✓ Is note grammatically correct?',
  '✓ Does form still look professional with note?',
];
