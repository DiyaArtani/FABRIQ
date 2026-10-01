import { Invoice, SaleOrder } from '../types';

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

// Auto-generate Sales Invoice Number sequence: INV-YYYY-XXXX (just like purchase BILL-YYYY-XXXX)
export function getNextInvoiceNumber(
  invoices: Array<{ invoiceNumber?: string; invoiceCode?: string }> = [],
  sales?: Array<{ invoiceNumber?: string; invoiceCode?: string }>
): string {
  const year = new Date().getFullYear();
  let maxNum = 0;
  const pool = [...(invoices || []), ...(sales || [])];
  pool.forEach(item => {
    const code = item?.invoiceNumber || item?.invoiceCode || '';
    if (code) {
      const match = code.match(/INV-(\d{4})-(\d+)/i) || code.match(/INV-(\d+)/i);
      if (match) {
        const num = match[2] ? parseInt(match[2], 10) : parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }
  });
  return `INV-${year}-${String(maxNum + 1).padStart(4, '0')}`;
}

// Uniform resolver to get an Invoice object from a SaleOrder
export function resolveInvoiceForSale(
  s: SaleOrder,
  invoices: Invoice[] = [],
  customerPhone?: string
): Invoice {
  const matched = (invoices || []).find(inv =>
    (s.invoiceId && inv.id === s.invoiceId) ||
    (inv.saleId && inv.saleId === s.id) ||
    (s.invoiceNumber && (inv.invoiceNumber === s.invoiceNumber || inv.invoiceCode === s.invoiceNumber))
  );

  const phone = customerPhone || (s as any).customerPhone || matched?.customerPhone || '';

  const totalAmount = Number(s.totalAmount ?? (s as any).grandTotal ?? 0);
  const paidAmount = Number(s.paidAmount ?? (s.paymentStatus === 'Paid' ? totalAmount : 0));
  const outstandingBalance = Math.max(0, totalAmount - paidAmount);

  if (matched) {
    const matchedTotal = Number(matched.amount || matched.totalAmount || totalAmount);
    const matchedPaid = Number(matched.paidAmount ?? s.paidAmount ?? (matched.status === 'Paid' || s.paymentStatus === 'Paid' ? matchedTotal : 0));
    const matchedOutstanding = Math.max(0, matchedTotal - matchedPaid);
    const resolvedStatus: InvoiceStatus = matchedPaid >= matchedTotal 
      ? 'Paid' 
      : (matchedPaid > 0 ? 'Partial' : (matched.status || (s.paymentStatus === 'Partial' ? 'Partial' : 'Pending')));

    return {
      ...matched,
      paidAmount: matchedPaid,
      outstandingBalance: matchedOutstanding,
      status: resolvedStatus,
      customerPhone: matched.customerPhone || phone
    };
  }

  const items = (s.items || (s as any).lineItems || []).map((it: any) => ({
    finishedInventoryId: it.finishedInventoryId || 'item',
    productName: it.productName || it.itemName || 'Garment Item',
    quantity: Number(it.quantity || 1),
    unitPrice: Number(it.unitPrice || 0),
    total: Number(it.total || (Number(it.quantity || 1) * Number(it.unitPrice || 0)))
  }));

  const gstAmount = Number(s.gstAmount ?? 0);
  const subtotal = Number(s.subtotal ?? (totalAmount - gstAmount));
  const invNum = s.invoiceNumber || (s.invoiceId ? `INV-${s.invoiceId}` : `INV-${s.id}`);

  const resolvedStatus: InvoiceStatus = paidAmount >= totalAmount
    ? 'Paid'
    : (paidAmount > 0 || s.paymentStatus === 'Partial' ? 'Partial' : 'Pending');

  return {
    id: s.invoiceId || `inv-${s.id}`,
    invoiceCode: invNum,
    invoiceNumber: invNum,
    saleId: s.id,
    customerId: s.customerId,
    customerName: s.customerName,
    customerPhone: phone,
    client: s.customerName,
    amount: totalAmount,
    totalAmount: totalAmount,
    paidAmount: paidAmount,
    outstandingBalance: outstandingBalance,
    subtotal: subtotal,
    taxRate: s.gstRate || 0,
    taxAmount: gstAmount,
    date: s.saleDate || (s as any).orderDate || (s.createdAt ? new Date(s.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
    issueDate: s.saleDate || (s as any).orderDate || (s.createdAt ? new Date(s.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
    status: resolvedStatus,
    items: items,
    lineItems: items,
    paymentMode: s.paymentMode || s.paymentMethod || 'Bank Transfer'
  };
}


