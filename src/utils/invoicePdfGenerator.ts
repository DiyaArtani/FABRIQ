import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Invoice, Customer, SystemSettings } from '../types';
import { numberToIndianWords } from '../lib/invoiceUtils';
import { formatWhatsAppPhone, openWhatsAppShare } from './whatsappUtils';

export interface InvoicePdfOptions {
  invoice: Invoice;
  customer?: Customer | null;
  settings?: Partial<SystemSettings> | any;
}

export interface GeneratedPdfResult {
  blob: Blob;
  file: File;
  filename: string;
  objectUrl: string;
}

/**
 * Creates an offscreen DOM element rendering the full Tax Invoice layout
 * adhering strictly to production ERP print guidelines (no un-added dummy data,
 * clean typography, accurate partial payments & balance due).
 */
function createOffscreenInvoiceElement(
  invoice: Invoice,
  customer: Customer | null | undefined,
  settings: any
): HTMLElement {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px'; // Standard A4 width at 96 DPI
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#09090b';
  container.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';
  container.style.padding = '32px 36px';
  container.style.boxSizing = 'border-box';
  container.style.zIndex = '-9999';

  const invNum = invoice.invoiceNumber || invoice.invoiceCode || invoice.id;
  const companyName = settings?.companyName || 'FABRIQ TEXTILE & APPAREL ERP';
  const companyAddr = settings?.companyAddress || settings?.address || '';
  const companyPhone = settings?.contactPhone || settings?.phone || '';
  const companyEmail = settings?.companyEmail || settings?.email || '';
  const gstin = settings?.gstin || '';

  const custName = customer?.name || customer?.companyName || invoice.customerName || invoice.client || 'Valued Customer';
  const custAddr = customer?.address || invoice.customerAddress || '';
  const custPhone = customer?.phone || invoice.customerPhone || '';
  const custEmail = customer?.email || '';
  const contactPerson = customer?.contactPerson || '';

  const grandTotal = Number(invoice.totalAmount ?? invoice.amount ?? 0);
  const paidAmount = Number(invoice.paidAmount ?? (invoice.status === 'Paid' ? grandTotal : 0));
  const outstandingBalance = Number(invoice.outstandingBalance ?? Math.max(0, grandTotal - paidAmount));
  const isPaid = paidAmount >= grandTotal || invoice.status === 'Paid';
  const isPartial = paidAmount > 0 && paidAmount < grandTotal;

  const lineItems = (invoice.items && invoice.items.length > 0)
    ? invoice.items
    : ((invoice.lineItems && invoice.lineItems.length > 0)
        ? invoice.lineItems
        : [
            {
              productName: invoice.itemsSummary || 'Finished Garment Lot',
              quantity: invoice.itemsCount || 1,
              unitPrice: grandTotal / (invoice.itemsCount || 1),
              total: grandTotal
            }
          ]);

  const totalQuantity = lineItems.reduce((acc: number, it: any) => acc + Number(it.quantity || 1), 0);
  const amountInWords = numberToIndianWords(grandTotal);
  const balanceInWords = outstandingBalance > 0 ? numberToIndianWords(outstandingBalance) : '';

  const itemsHtml = lineItems.map((it: any, idx: number) => `
    <tr style="border-bottom: 1px solid #e4e4e7;">
      <td style="padding: 10px 12px; text-align: center; color: #71717a; font-weight: bold;">${idx + 1}</td>
      <td style="padding: 10px 12px;">
        <div style="font-weight: bold; color: #09090b; font-size: 13px;">${it.productName || it.itemName || 'Garment Item'}</div>
        ${it.color || it.size ? `<div style="font-size: 11px; color: #71717a;">${[it.color, it.size].filter(Boolean).join(' • ')}</div>` : ''}
      </td>
      <td style="padding: 10px 12px; text-align: right; font-weight: bold; color: #09090b;">${it.quantity || 1} Pcs</td>
      <td style="padding: 10px 12px; text-align: right; color: #27272a;">₹${Number(it.unitPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td style="padding: 10px 12px; text-align: right; font-weight: bold; color: #09090b;">₹${Number(it.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
    </tr>
  `).join('');

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 20px;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #09090b; padding-bottom: 16px;">
        <div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 32px; height: 32px; background: #047857; color: #ffffff; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 16px;">F</div>
            <h1 style="margin: 0; font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.5px;">${companyName}</h1>
          </div>
          ${companyAddr ? `<p style="margin: 4px 0 0 0; font-size: 11px; color: #71717a; max-width: 380px;">${companyAddr}</p>` : ''}
          <div style="margin-top: 6px; font-size: 10px; color: #52525b; display: flex; gap: 14px; flex-wrap: wrap;">
            ${companyPhone ? `<span><strong>Phone:</strong> ${companyPhone}</span>` : ''}
            ${companyEmail ? `<span><strong>Email:</strong> ${companyEmail}</span>` : ''}
            ${gstin ? `<span><strong>GSTIN:</strong> ${gstin}</span>` : ''}
          </div>
        </div>

        <div style="text-align: right;">
          <div style="display: inline-block; background-color: #047857; color: #ffffff; font-size: 10px; font-weight: 900; padding: 2px 10px; border-radius: 4px; text-transform: uppercase; letter-spacing: 1px;">TAX INVOICE</div>
          <div style="font-size: 18px; font-weight: 900; color: #047857; margin-top: 4px;">${invNum}</div>
          <div style="font-size: 11px; color: #71717a; margin-top: 4px; line-height: 1.4;">
            <div><strong>Invoice Date:</strong> ${invoice.date || invoice.issueDate || new Date().toISOString().substring(0, 10)}</div>
            ${invoice.dueDate ? `<div><strong>Due Date:</strong> ${invoice.dueDate}</div>` : ''}
            <div>
              <strong>Payment Status:</strong> 
              <span style="font-weight: 800; color: ${isPaid ? '#047857' : (isPartial ? '#d97706' : '#71717a')};">
                ${isPaid ? 'PAID' : (isPartial ? `PARTIAL (₹${outstandingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} DUE)` : 'PENDING')}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Customer Details Grid -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px;">
        <div>
          <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.5px; display: block; margin-bottom: 2px;">BILLED TO (CUSTOMER DETAILS)</span>
          <div style="font-size: 13px; font-weight: 800; color: #0f172a;">${custName}</div>
          ${custAddr ? `<div style="font-size: 11px; color: #475569; margin-top: 2px; line-height: 1.3;">${custAddr}</div>` : ''}
          <div style="font-size: 10px; color: #64748b; margin-top: 4px; line-height: 1.3;">
            ${contactPerson && contactPerson !== custName ? `<div><strong>Contact:</strong> ${contactPerson}</div>` : ''}
            ${custPhone ? `<div><strong>Phone:</strong> ${custPhone}</div>` : ''}
            ${custEmail ? `<div><strong>Email:</strong> ${custEmail}</div>` : ''}
          </div>
        </div>

        <div style="border-left: 1px solid #e2e8f0; padding-left: 16px;">
          <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.5px; display: block; margin-bottom: 2px;">SHIPPING &amp; DELIVERY</span>
          <div style="font-size: 12px; font-weight: 700; color: #1e293b;">Consignee: ${custName}</div>
          ${custAddr ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">Delivery Location: ${custAddr}</div>` : ''}
          <div style="font-size: 10px; color: #64748b; margin-top: 4px;">
            ${invoice.paymentMode ? `<div><strong>Payment Mode:</strong> ${invoice.paymentMode}</div>` : ''}
          </div>
        </div>
      </div>

      <!-- Itemized Products Table -->
      <div>
        <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #71717a; margin-bottom: 6px; letter-spacing: 0.5px;">ITEMIZED COMMERCIAL PRODUCTS</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #e4e4e7; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background-color: #f4f4f5; border-bottom: 1px solid #e4e4e7; text-transform: uppercase; font-size: 10px; color: #71717a;">
              <th style="padding: 10px 12px; width: 36px; text-align: center;">#</th>
              <th style="padding: 10px 12px; text-align: left;">Item Description &amp; Specifications</th>
              <th style="padding: 10px 12px; text-align: right; width: 80px;">Qty</th>
              <th style="padding: 10px 12px; text-align: right; width: 110px;">Unit Rate</th>
              <th style="padding: 10px 12px; text-align: right; width: 120px;">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
      </div>

      <!-- Summary Section -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start;">
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
            <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #94a3b8; display: block;">INVOICE AMOUNT IN WORDS:</span>
            <p style="margin: 2px 0 0 0; font-size: 12px; font-weight: bold; color: #1e293b; font-style: italic;">${amountInWords}</p>
            ${isPartial && outstandingBalance > 0 ? `
              <div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #cbd5e1;">
                <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #d97706; display: block;">OUTSTANDING BALANCE DUE IN WORDS:</span>
                <p style="margin: 2px 0 0 0; font-size: 11px; font-weight: bold; color: #b45309; font-style: italic;">${balanceInWords}</p>
              </div>
            ` : ''}
          </div>
          ${invoice.notes ? `
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; font-size: 11px; color: #475569;">
              <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #94a3b8; display: block;">NOTES:</span>
              ${invoice.notes}
            </div>
          ` : ''}
        </div>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; font-size: 11px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #64748b;">
            <span>Total Quantity:</span>
            <span style="font-weight: bold; color: #0f172a;">${totalQuantity} Pcs</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #64748b;">
            <span>Total Invoice Amount:</span>
            <span style="font-weight: bold; color: #0f172a;">₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          ${paidAmount > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #047857; font-weight: bold;">
              <span>Amount Received ${isPartial ? '(Partial)' : ''}:</span>
              <span>- ₹${paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          ` : ''}
          <div style="border-top: 1px dashed #cbd5e1; padding-top: 8px; display: flex; justify-content: space-between; align-items: baseline;">
            <span style="font-size: 12px; font-weight: 900; color: #0f172a;">${paidAmount > 0 ? 'Outstanding Balance Due:' : 'Total Payable:'}</span>
            <span style="font-size: 16px; font-weight: 900; color: ${outstandingBalance > 0 ? '#d97706' : '#047857'};">
              ₹${outstandingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      <!-- Terms & Signatures -->
      <div style="border-top: 1px solid #e4e4e7; padding-top: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 10px; color: #71717a;">
        <div>
          <span style="font-weight: 800; text-transform: uppercase; color: #3f3f46; display: block; margin-bottom: 2px;">TERMS &amp; CONDITIONS</span>
          <div>1. Payment is due strictly within the agreed payment schedule.</div>
          <div>2. Goods once sold are verified and accepted in sound condition.</div>
          <div>3. All disputes subject to local jurisdiction only.</div>
        </div>

        <div style="text-align: right; display: flex; flex-direction: column; justify-content: space-between; height: 60px;">
          <div style="font-weight: bold; text-transform: uppercase;">FOR ${companyName}</div>
          <div style="border-top: 1px solid #a1a1aa; width: 140px; margin-left: auto; padding-top: 4px;">Authorized Signatory</div>
        </div>
      </div>
    </div>
  `;

  return container;
}

/**
 * Generates an official PDF document from the invoice data,
 * producing a Blob, File, and local object URL.
 */
export async function generateInvoicePdf(
  invoice: Invoice,
  customer?: Customer | null,
  settings?: any
): Promise<GeneratedPdfResult> {
  const invCode = invoice.invoiceNumber || invoice.invoiceCode || invoice.id || 'INV';
  const cleanCode = invCode.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Invoice_${cleanCode}.pdf`;

  // Check if an existing invoice element is visible on page
  const existingElement = document.getElementById('sales-invoice-printable');
  let targetElement: HTMLElement;
  let isCreated = false;

  if (existingElement && existingElement.offsetHeight > 100) {
    targetElement = existingElement;
  } else {
    targetElement = createOffscreenInvoiceElement(invoice, customer, settings);
    document.body.appendChild(targetElement);
    isCreated = true;
  }

  try {
    const h2c: any = html2canvas;
    const canvas = await h2c(targetElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    const blob = pdf.output('blob');
    const file = new File([blob], filename, { type: 'application/pdf' });
    const objectUrl = URL.createObjectURL(blob);

    return {
      blob,
      file,
      filename,
      objectUrl
    };
  } finally {
    if (isCreated && targetElement.parentNode) {
      targetElement.parentNode.removeChild(targetElement);
    }
  }
}

/**
 * Automatically triggers browser download of the invoice PDF
 */
export async function downloadInvoicePdf(
  invoice: Invoice,
  customer?: Customer | null,
  settings?: any
): Promise<GeneratedPdfResult> {
  const result = await generateInvoicePdf(invoice, customer, settings);
  const link = document.createElement('a');
  link.href = result.objectUrl;
  link.download = result.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return result;
}

/**
 * Handles WhatsApp Invoice PDF sharing:
 * 1. Generates and triggers download of official PDF file.
 * 2. Opens WhatsApp chat directly to the recipient's phone number.
 */
export async function shareInvoicePdfToWhatsApp(params: {
  invoice: Invoice;
  customer?: Customer | null;
  settings?: any;
  phone?: string;
  message?: string;
}): Promise<{ sharedViaNative: boolean; downloaded: boolean; file: File; filename: string }> {
  const { invoice, customer, settings, phone = '', message = '' } = params;

  // 1. Download PDF directly to device
  const result = await downloadInvoicePdf(invoice, customer, settings);

  // 2. Open WhatsApp chat directly with recipient mobile number
  if (phone) {
    openWhatsAppShare(phone, message);
  }

  return { sharedViaNative: false, downloaded: true, file: result.file, filename: result.filename };
}
