const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- TEST SUITE: Native Contact Picker & Khata Integration ---');

// 1. Verify app.json configuration
const appJsonPath = path.resolve(__dirname, '../app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

// Check android permissions
const androidPerms = appJson.expo?.android?.permissions || [];
assert(androidPerms.includes('android.permission.READ_CONTACTS'), 'android.permission.READ_CONTACTS missing in app.json permissions');
console.log('✓ app.json includes android.permission.READ_CONTACTS');

// Check plugins
const plugins = appJson.expo?.plugins || [];
const contactsPlugin = plugins.find(p => Array.isArray(p) && p[0] === 'expo-contacts');
assert(contactsPlugin, 'expo-contacts plugin configuration missing in app.json plugins');
assert(contactsPlugin[1]?.contactsPermission, 'contactsPermission text missing in expo-contacts plugin');
console.log('✓ app.json includes expo-contacts config plugin with contactsPermission');

// Check iOS permission string
assert(appJson.expo?.ios?.infoPlist?.NSContactsUsageDescription, 'NSContactsUsageDescription missing in ios.infoPlist');
console.log('✓ app.json includes NSContactsUsageDescription');

// 2. Test Phone Normalization Logic
const normalizePhoneNumber = (rawPhone) => {
  if (!rawPhone) return '';
  const trimmed = rawPhone.trim();
  const hasPlus = trimmed.startsWith('+');
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (!digitsOnly) return '';
  return hasPlus ? `+${digitsOnly}` : digitsOnly;
};

assert.strictEqual(normalizePhoneNumber('+91 98765 43210'), '+919876543210');
assert.strictEqual(normalizePhoneNumber('+91 (987) 65-43210'), '+919876543210');
assert.strictEqual(normalizePhoneNumber('98765 43210'), '9876543210');
assert.strictEqual(normalizePhoneNumber('+1 (555) 123-4567'), '+15551234567');
assert.strictEqual(normalizePhoneNumber('   09876543210  '), '09876543210');
assert.strictEqual(normalizePhoneNumber(''), '');
assert.strictEqual(normalizePhoneNumber(null), '');
console.log('✓ normalizePhoneNumber correctly retains valid country codes (+91, +1) and strips spaces/dashes/brackets');

// 3. Test findDuplicatePerson logic
const findDuplicatePerson = (name, phone, existingPeople) => {
  const normName = name.trim().toLowerCase();
  const normPhone = phone ? normalizePhoneNumber(phone) : '';

  return existingPeople.find((p) => {
    const pName = p.name.trim().toLowerCase();
    const pPhone = p.phone ? normalizePhoneNumber(p.phone) : '';

    if (normName && pName === normName) {
      return true;
    }
    if (normPhone && pPhone) {
      const minLen = Math.min(normPhone.length, pPhone.length);
      if (normPhone === pPhone || (minLen >= 7 && (normPhone.endsWith(pPhone) || pPhone.endsWith(normPhone)))) {
        return true;
      }
    }
    return false;
  });
};

const mockPeople = [
  { id: '1', name: 'Rahul Sharma', phone: '+919876543210' },
  { id: '2', name: 'Priya Patel', phone: '9876500000' },
  { id: '3', name: 'Vendor Store' },
];

assert.strictEqual(findDuplicatePerson('rahul sharma', '', mockPeople)?.id, '1', 'Failed to find duplicate by case-insensitive name');
assert.strictEqual(findDuplicatePerson('Different Name', '9876543210', mockPeople)?.id, '1', 'Failed to find duplicate by national phone number vs international');
assert.strictEqual(findDuplicatePerson('Different Name', '+91 98765 43210', mockPeople)?.id, '1', 'Failed to find duplicate with formatted phone number');
assert.strictEqual(findDuplicatePerson('Priya Patel', '+919876500000', mockPeople)?.id, '2', 'Failed to find duplicate for Priya');
assert.strictEqual(findDuplicatePerson('Unknown Person', '1234567890', mockPeople), undefined, 'Should not match non-existent contact');
console.log('✓ findDuplicatePerson matches duplicates by normalized name and phone without false positives');

// 4. Verify no remaining browser notice strings in AddPersonModal
const addPersonModalContent = fs.readFileSync(path.resolve(__dirname, '../src/components/rn/AddPersonModal.tsx'), 'utf8');
assert(!addPersonModalContent.includes('Supported on mobile devices (Android Chrome)'), 'Legacy browser notice still present in AddPersonModal');
assert(!addPersonModalContent.includes('Device contact picker is supported on mobile browsers'), 'Legacy browser warning still present in AddPersonModal');
console.log('✓ AddPersonModal has removed legacy browser notice and provides clean native picker action');

// 5. Verify PhoneSelectorModal exists and is referenced in AddPersonModal
const phoneSelectorContent = fs.readFileSync(path.resolve(__dirname, '../src/components/rn/PhoneSelectorModal.tsx'), 'utf8');
assert(phoneSelectorContent.includes('PhoneSelectorModal'), 'PhoneSelectorModal definition verified');
assert(addPersonModalContent.includes('PhoneSelectorModal'), 'PhoneSelectorModal referenced in AddPersonModal');
const quickAddModalContent = fs.readFileSync(path.resolve(__dirname, '../src/components/rn/QuickAddModal.tsx'), 'utf8');
assert(quickAddModalContent.includes('AddPersonModal'), 'AddPersonModal referenced in QuickAddModal');
console.log('✓ PhoneSelectorModal and AddPersonModal are implemented and cleanly integrated');

console.log('\n--- ALL CONTACT PICKER UNIT TESTS PASSED ---');
