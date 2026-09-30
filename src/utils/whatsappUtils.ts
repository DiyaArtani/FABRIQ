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
  const statusEmoji = invoice.status === 'Paid' ? '✅ Paid' : '⏳ Pending / Unpaid';

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
    invoice.paymentMode ? `💳 *Payment Mode:* ${invoice.paymentMode}` : '',
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🙏 _Thank you for your business with ${companyName}!_`,
    companyPhone ? `📞 Support: ${companyPhone}` : '',
    `_Please reply to this chat if you need an official signed PDF or have any queries._`
  ].filter(line => line !== '');

  return lines.join('\n');
}

/**
 * Returns the wa.me URL for the given phone number and text message
 */
export function getWhatsAppShareUrl(phone: string, message: string): string {
  const cleanPhone = formatWhatsAppPhone(phone);
  const encodedText = encodeURIComponent(message);
  
  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodedText}`;
  }
  return `https://wa.me/?text=${encodedText}`;
}

/**
 * Directly opens WhatsApp Web or App in a new window/tab
 */
export function openWhatsAppShare(phone: string, message: string): void {
  const url = getWhatsAppShareUrl(phone, message);
  window.open(url, '_blank', 'noopener,noreferrer');
}
