import { Supplier } from '../types';

/**
 * Generates the next sequential Supplier ID (e.g. SUP-001, SUP-002, SUP-003)
 * based on all existing suppliers in the system, avoiding large Unix timestamps.
 */
export const getNextSupplierId = (suppliers: Supplier[] = []): string => {
  let maxNum = 0;

  // Search for clean sequential SUP-XXX format first
  suppliers.forEach(s => {
    const candidates = [s.code, s.supplierId, s.id];
    candidates.forEach(val => {
      if (!val) return;
      const cleanMatch = val.match(/^sup-(\d{1,4})$/i);
      if (cleanMatch) {
        const num = parseInt(cleanMatch[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
  });

  // Fallback: search for any reasonable numeric supplier code < 1000
  if (maxNum === 0) {
    suppliers.forEach(s => {
      const candidates = [s.code, s.supplierId, s.id];
      candidates.forEach(val => {
        if (!val) return;
        const match = val.match(/sup[-_]?(\d+)/i) || val.match(/^(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num < 1000 && num > maxNum) {
            maxNum = num;
          }
        }
      });
    });
  }

  return `SUP-${String(maxNum + 1).padStart(3, '0')}`;
};
