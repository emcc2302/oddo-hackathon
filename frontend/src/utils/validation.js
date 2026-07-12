// Client-side validation helpers.
// These mirror/anticipate the server's rules so the user gets instant feedback
// instead of waiting for a round trip — the API still re-validates everything.

export const PHONE_REGEX = /^[6-9]\d{9}$/; // 10 digits, Indian mobile prefix 6-9
export const REG_NUMBER_REGEX = /^[A-Z]{2}[- ]?\d{1,2}[- ]?[A-Z]{1,3}[- ]?\d{3,4}$/i;

export function validatePhone(value) {
  if (!value) return null; // optional field
  const digitsOnly = value.replace(/\D/g, '');
  if (digitsOnly.length !== 10) return 'Contact number must be exactly 10 digits.';
  if (!PHONE_REGEX.test(digitsOnly)) return 'Enter a valid 10-digit mobile number.';
  return null;
}

export function validateRegistrationNumber(value, existingVehicles = [], excludeId = null) {
  if (!value || !value.trim()) return 'Registration number is required.';
  const normalized = value.trim().toUpperCase();
  if (!REG_NUMBER_REGEX.test(normalized)) {
    return 'Format looks off — expected something like WB-05-AB-1201.';
  }
  const duplicate = existingVehicles.some(
    (v) => v.id !== excludeId && v.registration_number.trim().toUpperCase() === normalized
  );
  if (duplicate) return 'That registration number is already registered.';
  return null;
}

export function validateLicenseNumber(value, existingDrivers = [], excludeId = null) {
  if (!value || !value.trim()) return 'License number is required.';
  const normalized = value.trim().toUpperCase();
  const duplicate = existingDrivers.some(
    (d) => d.id !== excludeId && d.license_number.trim().toUpperCase() === normalized
  );
  if (duplicate) return 'That license number is already registered to another driver.';
  return null;
}

export function validateSafetyScore(value) {
  if (value === '' || value === null || value === undefined) return null;
  const num = Number(value);
  if (Number.isNaN(num)) return 'Safety score must be a number.';
  if (num < 0 || num > 100) return 'Safety score must be between 0 and 100.';
  return null;
}

export function validateMaxLoad(value) {
  const num = Number(value);
  if (!value || Number.isNaN(num) || num <= 0) return 'Max load capacity must be greater than 0.';
  return null;
}

export function validateCargoWeight(value, maxCapacity) {
  const num = Number(value);
  if (!value || Number.isNaN(num) || num <= 0) return 'Cargo weight must be greater than 0.';
  if (maxCapacity && num > Number(maxCapacity)) {
    return `Cargo weight exceeds this vehicle's max capacity of ${maxCapacity}kg.`;
  }
  return null;
}

export function validateLicenseExpiry(value) {
  if (!value) return 'License expiry date is required.';
  return null;
}

export function validatePositiveNumber(value, label = 'This field') {
  const num = Number(value);
  if (value === '' || value === null || value === undefined || Number.isNaN(num) || num < 0) {
    return `${label} must be a valid number of 0 or more.`;
  }
  return null;
}
