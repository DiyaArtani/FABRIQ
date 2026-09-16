/**
 * Universal Latest-First Sorting Utility
 * Ensures all tables, ledgers, directories, and card views display
 * the latest record first followed by the rest.
 */

function extractTimestamp(item: any): number {
  if (!item || typeof item !== 'object') return 0;

  // 1. Direct chronological date/timestamp fields
  const dateFields = [
    'createdAt',
    'timestamp',
    'purchaseDate',
    'orderDate',
    'date',
    'issueDate',
    'startDate',
    'completionDate',
    'dueDate',
    'updatedAt'
  ];

  for (const field of dateFields) {
    const val = item[field];
    if (val) {
      const time = new Date(val).getTime();
      if (!isNaN(time) && time > 0) {
        return time;
      }
    }
  }

  // 2. Extract embedded millisecond timestamp from id (e.g. "po-1741675200000", "u-1741675200000")
  if (typeof item.id === 'string') {
    const match = item.id.match(/(\d{10,14})/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > 1000000000000) {
        return num;
      }
    }
  }

  return 0;
}

function extractSequenceNumber(code: string | undefined | null): number {
  if (!code || typeof code !== 'string') return 0;
  // Match numbers in codes like "BILL-2026-0042", "WH-005", "CH-2026-0012", "PRD-2026-003", "CUST-009"
  const match = code.match(/(\d+)/g);
  if (match && match.length > 0) {
    // If multiple numbers (e.g. 2026 and 0042), join or use last sequence number
    if (match.length > 1) {
      return parseInt(match[match.length - 1], 10) + (parseInt(match[0], 10) * 100000);
    }
    return parseInt(match[0], 10);
  }
  return 0;
}

export function sortLatest<T = any>(items: T[] | readonly T[]): T[] {
  if (!Array.isArray(items) || items.length <= 1) return items as T[];

  return [...items].sort((a: any, b: any) => {
    // 1. Compare extracted timestamps
    const timeA = extractTimestamp(a);
    const timeB = extractTimestamp(b);

    if (timeA > 0 && timeB > 0 && timeA !== timeB) {
      return timeB - timeA; // Descending: newest first
    }

    // If one has a valid timestamp and the other doesn't, valid timestamp comes first
    if (timeA > 0 && (!timeB || timeB === 0)) return -1;
    if (timeB > 0 && (!timeA || timeA === 0)) return 1;

    // 2. Sequential code comparison (BILL-002 > BILL-001, WH-05 > WH-01, EMP-03 > EMP-01)
    const codeFields = [
      'billNumber',
      'invoiceNumber',
      'invoiceCode',
      'challanNumber',
      'orderCode',
      'poCode',
      'saleCode',
      'code',
      'employeeId',
      'id'
    ];

    for (const field of codeFields) {
      const codeA = a[field];
      const codeB = b[field];
      if (codeA && codeB && codeA !== codeB) {
        const numA = extractSequenceNumber(String(codeA));
        const numB = extractSequenceNumber(String(codeB));
        if (numA !== numB && numA > 0 && numB > 0) {
          return numB - numA; // Higher sequence number first
        }
        return String(codeB).localeCompare(String(codeA), undefined, { numeric: true, sensitivity: 'base' });
      }
    }

    return 0;
  });
}
