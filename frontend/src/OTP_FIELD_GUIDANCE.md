# OTP Field Guidance Implementation Guide

## Overview
This guide explains when and how to add "Not used for OTP" notes to form fields in the Findora app.

## Core Principle
Users may confuse certain user-facing fields with OTP delivery channels. Add clarifying notes to prevent confusion while avoiding unnecessary clutter.

---

## Field Classification

### ✅ ADD "Not used for OTP" Note

| Field | Type | Location | Reason | Placement |
|-------|------|----------|--------|-----------|
| **Phone Number** | Contact | Signup.jsx, Profile | Looks like OTP channel but isn't | Label-hint or Placeholder |
| **Alternate Phone** | Contact | Profile, Settings | Backup contact, not for OTP | Label-hint |
| **Student ID** | Identifier | ReportFoundItem, ReportLostItem, Purse Claims | Looks like auth field | Placeholder |
| **Staff ID** | Identifier | ReportFoundItem, ReportLostItem | Same as Student ID | Placeholder |
| **NIC (National ID)** | Identifier | ReportFoundItem, ReportLostItem | High-security identifier | Placeholder |

### ❌ DON'T ADD Note (Already OTP Channel)

| Field | Type | Location | Reason |
|-------|------|----------|--------|
| **Email** | Auth/OTP | Signup, Login, ForgotPassword, Profile | Primary OTP channel |
| **OTP Code** | OTP Input | ResetPassword, VerifyEmail | IS the OTP, obviously |

### ❌ DON'T ADD Note (Internal/Technical)

| Field | Type | Location | Reason |
|-------|------|----------|--------|
| **Admin Notes** | Internal | AdminDashboard | Not user-facing |
| **Item ID** | Internal | Backend/API | Internal identifier |
| **Upload Path** | Internal | Backend/Database | Technical field |
| **User ID** | Internal | Backend | Never shown to users |

---

## Implementation Patterns

### Pattern 1: Using FormFieldWithOtpNote Component (Recommended)

```jsx
import FormFieldWithOtpNote from '../components/FormFieldWithOtpNote';

// In your form:
<FormFieldWithOtpNote
  fieldType="phone"
  label="Phone Number"
  placeholder="Enter your phone number"
  value={formData.phone}
  onChange={handleChange}
  type="tel"
  required={false}
  placement="label-hint"
/>
```

### Pattern 2: Manual Note in Label (Quick Fix)

```jsx
<div className="form-group">
  <label>
    Phone Number <span style={{ color: '#9CA3AF' }}>(Not used for OTP)</span>
  </label>
  <input
    type="tel"
    name="phone"
    placeholder="Enter your phone number"
    value={formData.phone}
    onChange={handleChange}
  />
</div>
```

### Pattern 3: Placeholder-only Note

```jsx
<div className="form-group">
  <label>Student ID</label>
  <input
    type="text"
    name="studentOrStaffId"
    placeholder="e.g. 123456A - Not used for OTP"
    value={formData.studentId}
    onChange={handleChange}
  />
</div>
```

### Pattern 4: Helper Text Below Label

```jsx
<div className="form-group">
  <label>Alternate Phone Number</label>
  <small style={{ color: '#6B7280', marginBottom: '0.5rem', display: 'block' }}>
    Not used for OTP verification
  </small>
  <input
    type="tel"
    name="alternatePhone"
    placeholder="Enter backup phone number"
    value={formData.alternatePhone}
    onChange={handleChange}
  />
</div>
```

---

## Current Implementation Status

### ✅ Already Implemented

**Signup.jsx (Line ~98)**
```jsx
<label>Phone Number <span style={{ color: '#9CA3AF' }}>(Optional - for contact only)</span></label>
<input
  type="tel"
  name="phone"
  value={formData.phone}
  onChange={handleChange}
  placeholder="Contact number (not used for OTP)"
/>
```
Status: ✅ **Good** - Has both label hint and placeholder note

### ⚠️ Needs Implementation

**ReportFoundItem.jsx - NIC Section (~Line 380)**
```jsx
<div className="form-group">
  <label className="required">NIC Number</label>
  <input
    name="nicNumber"
    value={formData.nicNumber}
    onChange={handleInputChange}
    maxLength={12}
    placeholder="123456789V or 199001234567 - Not used for OTP"
    // Add: "- Not used for OTP" to placeholder
  />
</div>
```

**ReportFoundItem.jsx - Student ID Section (~Line 395)**
```jsx
<div className="form-group">
  <label className="required">Student ID or Staff ID</label>
  <input
    name="studentOrStaffId"
    value={formData.studentOrStaffId}
    onChange={handleInputChange}
    placeholder="e.g. 123456A - Not used for OTP"
    // Add: "- Not used for OTP" to placeholder
  />
</div>
```

**ReportFoundItem.jsx - Purse with ID (~Line 500)**
```jsx
<div className="form-group">
  <label className="required">Student ID or NIC number</label>
  <input
    name="purseIdNumber"
    value={formData.purseIdNumber}
    onChange={handleInputChange}
    placeholder="NIC: 200012345678 / Student ID: 123456A - Not used for OTP"
  />
</div>
```

**ReportLostItem.jsx - Similar fields**
- NIC Section (Line ~140)
- Student/Staff ID Section (Line ~165)
- Purse with-id Section (Line ~320)

---

## CSS Enhancement

Add these classes to App.css for consistent OTP note styling:

```css
.otp-note {
  color: #9CA3AF;
  font-size: 0.875rem;
  font-weight: 400;
  font-style: italic;
}

.otp-note-label {
  display: block;
  margin-bottom: 0.375rem;
  color: #6B7280;
}

.form-group .otp-note-inline {
  color: #9CA3AF;
}
```

---

## Usage Examples by Role

### Student Role
- **Phone**: Backup contact (not for OTP)
- **Student ID**: Used for claiming found items (not for OTP)

### Staff Role
- **Phone**: Backup contact (not for OTP)
- **Staff ID**: Used for claiming found items (not for OTP)

### Security Officer Role
- **Phone**: Backup contact (not for OTP)
- **Note**: Security roles typically only use email for OTP

### Admin Role
- **Phone**: Backup contact (not for OTP)
- **Note**: Admin accounts may have enhanced security

---

## Best Practices

### ✅ DO
- Add notes for fields that LOOK like OTP channels but aren't
- Use consistent language: "Not used for OTP"
- Place notes in placeholders for non-required fields
- Place notes below label for important/required fields
- Use muted gray color (#9CA3AF or #6B7280) for notes
- Keep notes short and actionable

### ❌ DON'T
- Add notes to every field (only problematic ones)
- Use technical language users won't understand
- Hide notes in tiny font
- Add notes to fields that ARE used for OTP
- Clutter auth flow forms unnecessarily

---

## Testing Checklist

- [ ] Phone field shows note and is optional
- [ ] Student/Staff ID fields show note in claim flows
- [ ] NIC fields show note in report flows
- [ ] All notes are visible but unobtrusive
- [ ] Email fields DO NOT have OTP note (they're used for OTP)
- [ ] OTP input fields DO NOT have "not used" note
- [ ] Mobile: Notes are readable on small screens
- [ ] Dark mode: Notes remain visible and styled correctly

---

## Related Files

- **Utility**: `src/utils/otpFieldGuidance.js` - Logic for determining note display
- **Component**: `src/components/FormFieldWithOtpNote.jsx` - Reusable field component
- **Implementation**: `src/pages/Signup.jsx` - Already implemented reference
- **To-Do**: `src/pages/ReportFoundItem.jsx` - Needs updating
- **To-Do**: `src/pages/ReportLostItem.jsx` - Needs updating
- **Styles**: `src/App.css` - Contains form field styles
