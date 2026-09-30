/**
 * Universal Phone Number Utility for Fabriq ERP
 * Ensures all form phone numbers take only numeric characters and strictly 10 digits.
 */

export const sanitizePhoneNumber = (val: string): string => {
  return (val || '').replace(/\D/g, '').slice(0, 10);
};

export const isValidPhoneNumber = (val: string): boolean => {
  return /^\d{10}$/.test(sanitizePhoneNumber(val));
};
