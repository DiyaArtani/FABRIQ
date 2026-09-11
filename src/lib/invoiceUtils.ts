// Helper utility to convert numbers into Indian Currency Words (e.g., Rupees Fifty Thousand Only)
export function numberToIndianWords(num: number): string {
  if (isNaN(num) || num === 0) return 'Rupees Zero Only';

  const single = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const double = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n: number): string {
    if (n === 0) return '';
    if (n < 20) return single[n];
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    return `${double[tens]}${ones ? ' ' + single[ones] : ''}`;
  }

  function convertThreeDigits(n: number): string {
    const hundreds = Math.floor(n / 100);
    const rest = n % 100;
    let str = '';
    if (hundreds > 0) {
      str += `${single[hundreds]} Hundred`;
      if (rest > 0) str += ' and ';
    }
    if (rest > 0) {
      str += convertTwoDigits(rest);
    }
    return str;
  }

  const integerPart = Math.floor(Math.abs(num));
  const decimalPart = Math.round((Math.abs(num) - integerPart) * 100);

  let crore = Math.floor(integerPart / 10000000);
  let lakh = Math.floor((integerPart % 10000000) / 100000);
  let thousand = Math.floor((integerPart % 100000) / 1000);
  let hundred = integerPart % 1000;

  const parts: string[] = [];

  if (crore > 0) {
    parts.push(`${convertTwoDigits(crore)} Crore`);
  }
  if (lakh > 0) {
    parts.push(`${convertTwoDigits(lakh)} Lakh`);
  }
  if (thousand > 0) {
    parts.push(`${convertTwoDigits(thousand)} Thousand`);
  }
  if (hundred > 0) {
    parts.push(convertThreeDigits(hundred));
  }

  let words = 'Rupees ' + parts.join(' ');
  if (decimalPart > 0) {
    words += ` and ${convertTwoDigits(decimalPart)} Paise`;
  }
  words += ' Only';

  return words;
}

export interface TaxBreakdown {
  taxableAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
  grandTotal: number;
}

export function calculateGSTBreakdown(
  totalInclusiveOrExclusive: number,
  isInterState: boolean = false,
  gstRatePercent: number = 5 // default 5% for apparel/textile under INR 1000 / standard slab
): TaxBreakdown {
  // If base amount is taxable value
  const taxableAmount = Math.round((totalInclusiveOrExclusive / (1 + gstRatePercent / 100)) * 100) / 100;
  const totalTax = Math.round((totalInclusiveOrExclusive - taxableAmount) * 100) / 100;

  if (isInterState) {
    return {
      taxableAmount,
      cgstRate: 0,
      cgstAmount: 0,
      sgstRate: 0,
      sgstAmount: 0,
      igstRate: gstRatePercent,
      igstAmount: totalTax,
      totalTax,
      grandTotal: totalInclusiveOrExclusive
    };
  } else {
    const halfRate = gstRatePercent / 2;
    const halfAmount = Math.round((totalTax / 2) * 100) / 100;
    return {
      taxableAmount,
      cgstRate: halfRate,
      cgstAmount: halfAmount,
      sgstRate: halfRate,
      sgstAmount: totalTax - halfAmount,
      igstRate: 0,
      igstAmount: 0,
      totalTax,
      grandTotal: totalInclusiveOrExclusive
    };
  }
}
