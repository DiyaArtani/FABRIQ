import { Invoice, Customer } from '../types';

/**
 * Normalizes phone numbers for WhatsApp API (wa.me/...)
 * Strips non-digit characters and ensures country code.
 * Defaults to India (+91) if 10-digit number is provided.
 */
export function formatWhatsAppPhone(phone?: string): string {
  if (!phone) return '';
  
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Remove leading 0 if present
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  // If standard 10-digit Indian mobile number, prepend '91'
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  
  return cleaned;
}

/**
 * Builds a clean, professional, and well-structured WhatsApp message
 * formatted with WhatsApp markdown (*bold*, _italic_, line breaks)
 */
export function buildInvoiceWhatsAppMessage(params: {
  invoice: Invoice;
  customer?: Customer | null;
  companyName?: string;
  companyPhone?: string;
}): string {
  const { invoice, customer, companyName = 'FABRIQ TEXTILE & APPAREL ERP', companyPhone } = params;

  const invNum = invoice.invoiceNumber || invoice.invoiceCode || invoice.id;
  const clientName = customer?.name || customer?.companyName || invoice.customerName || invoice.client || 'Valued Customer';
  const invDate = invoice.date || invoice.issueDate || new Date().toISOString().substring(0, 10);
  const totalAmount = invoice.amount || invoice.totalAmount || 0;
  const paidAmount = Number(invoice.paidAmount ?? (invoice.status === 'Paid' ? totalAmount : 0));
  const outstandingBalance = Number(invoice.outstandingBalance ?? Math.max(0, totalAmount - paidAmount));
  const isPartial = paidAmount > 0 && paidAmount < totalAmount;
  const isPaid = paidAmount >= totalAmount || invoice.status === 'Paid';
  const statusEmoji = isPaid 
    ? '✅ Paid' 
    : isPartial 
      ? `◐ Partial Payment (₹${outstandingBalance.toLocaleString('en-IN')} Due)` 
      : '⏳ Pending / Unpaid';

  // Gather line items
  let itemsList = '';
  if (invoice.items && invoice.items.length > 0) {
    itemsList = invoice.items
      .map(
        (it: any) =>
          `• ${it.quantity || 1}x ${it.productName || it.name || 'Item'} — ₹${Number(it.total || (it.quantity * it.unitPrice) || 0).toLocaleString('en-IN')}`
      )
      .join('\n');
  } else if (invoice.lineItems && invoice.lineItems.length > 0) {
    itemsList = invoice.lineItems
      .map(
        (it: any) =>
          `• ${it.quantity || 1}x ${it.productName || it.itemName || 'Item'} — ₹${Number(it.total || 0).toLocaleString('en-IN')}`
      )
      .join('\n');
  } else if (invoice.itemsSummary) {
    itemsList = `• ${invoice.itemsSummary}`;
  } else {
    itemsList = `• Apparel Lot / Goods — ₹${totalAmount.toLocaleString('en-IN')}`;
  }

  // Tax calculations
  const taxRate = invoice.taxRate !== undefined ? invoice.taxRate : 5;
  const taxableValue = invoice.subtotal !== undefined
    ? invoice.subtotal
    : (taxRate > 0 ? Math.round((totalAmount / (1 + taxRate / 100)) * 100) / 100 : totalAmount);
  const taxAmount = invoice.taxAmount !== undefined
    ? invoice.taxAmount
    : (taxRate > 0 ? Math.round((totalAmount - taxableValue) * 100) / 100 : 0);

  const lines = [
    `🧾 *INVOICE & PAYMENT RECEIPT*`,
    `🏢 *${companyName}*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📄 *Invoice No:* ${invNum}`,
    `📅 *Date:* ${invDate}`,
    `👤 *Billed To:* ${clientName}`,
    `📌 *Status:* ${statusEmoji}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📦 *DISPATCHED ITEMS:*`,
    itemsList,
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `💰 *TOTAL AMOUNT:* ₹${totalAmount.toLocaleString('en-IN')}`,
    paidAmount > 0 ? `💵 *AMOUNT RECEIVED:* ₹${paidAmount.toLocaleString('en-IN')}` : '',
    outstandingBalance > 0 && paidAmount > 0 ? `⚠️ *OUTSTANDING BALANCE DUE:* ₹${outstandingBalance.toLocaleString('en-IN')}` : '',
    invoice.paymentMode ? `💳 *Payment Mode:* ${invoice.paymentMode}` : '',
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🙏 _Thank you for your business with ${companyName}!_`,
    companyPhone ? `📞 Support: ${companyPhone}` : '',
    `_Please reply to this chat if you need an official signed PDF or have any queries._`
  ].filter(line => line !== '');

  return lines.join('\n');
}

/**
/**
 * Returns the WhatsApp universal URL for the given phone number and optional text message.
 * If message is omitted or empty, opens clean chat with no pre-filled text.
 */
export function getWhatsAppShareUrl(phone: string, message?: string): string {
  const cleanPhone = formatWhatsAppPhone(phone);
  const trimmed = message ? message.trim() : '';
  const encodedText = trimmed ? encodeURIComponent(trimmed) : '';
  
  if (cleanPhone) {
    return encodedText 
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}` 
      : `https://api.whatsapp.com/send?phone=${cleanPhone}`;
  }
  return encodedText ? `https://api.whatsapp.com/send?text=${encodedText}` : `https://api.whatsapp.com/send`;
}

/**
 * Directly opens WhatsApp Web or App to that phone number
 */
export function openWhatsAppShare(phone: string, message?: string): Window | null {
  const url = getWhatsAppShareUrl(phone, message);
  let win: Window | null = null;
  try {
    win = window.open(url, '_blank', 'noopener,noreferrer');
  } catch (e) {
    console.warn('Popup blocked, redirecting window location:', e);
  }
  if (!win && typeof window !== 'undefined') {
    window.location.href = url;
  }
  return win;
}
