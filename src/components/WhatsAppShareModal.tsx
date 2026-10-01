import React, { useState, useEffect } from 'react';
import { X, Phone, User, ExternalLink, FileText, Download, Loader2, Paperclip } from 'lucide-react';
import { Invoice, Customer } from '../types';
import { formatWhatsAppPhone, openWhatsAppShare } from '../utils/whatsappUtils';
import { downloadInvoicePdf, shareInvoicePdfToWhatsApp } from '../utils/invoicePdfGenerator';
import { useFabriqData } from '../context/FabriqDataContext';

// Authentic WhatsApp SVG Icon
export const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M12.031 2C6.496 2 2 6.496 2 12.031c0 1.77.462 3.499 1.34 5.02L2 22l5.105-1.339a9.984 9.984 0 0 0 4.926 1.288h.004c5.535 0 10.031-4.496 10.031-10.031A10.007 10.007 0 0 0 12.031 2Zm0 18.363h-.004a8.31 8.31 0 0 1-4.238-1.162l-.304-.18-3.03.795.808-2.953-.198-.315a8.307 8.307 0 0 1-1.272-4.517c0-4.6 3.742-8.342 8.343-8.342 2.228 0 4.323.868 5.897 2.443a8.3 8.3 0 0 1 2.443 5.897c0 4.602-3.743 8.343-8.343 8.343Zm4.573-6.242c-.25-.125-1.482-.731-1.712-.814-.23-.083-.397-.125-.564.125-.167.25-.648.814-.794.981-.146.167-.292.188-.542.063s-1.059-.39-2.016-1.244c-.745-.664-1.248-1.485-1.394-1.735-.146-.25-.015-.385.11-.51.112-.112.25-.292.375-.438.125-.146.167-.25.25-.417.083-.167.042-.313-.021-.438s-.564-1.357-.773-1.859c-.203-.489-.41-.422-.564-.43l-.48-.008c-.167 0-.438.063-.667.313-.23.25-.875.856-.875 2.086s.896 2.419 1.021 2.586c.125.167 1.763 2.693 4.27 3.776.597.258 1.063.412 1.427.528.6.19 1.146.163 1.577.099.48-.072 1.482-.605 1.691-1.189.208-.584.208-1.085.146-1.189-.063-.104-.229-.167-.479-.292Z" />
  </svg>
);

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  customer?: Customer | null;
  onViewInvoice?: () => void;
  onViewTaxInvoice?: () => void;
}

export const WhatsAppShareModal: React.FC<WhatsAppShareModalProps> = ({
  isOpen,
  onClose,
  invoice,
  customer,
  onViewInvoice,
  onViewTaxInvoice
}) => {
  const { settings, customers } = useFabriqData();

  // Find customer if not explicitly passed
  const resolvedCustomer: Customer | null = customer || 
    (invoice?.customerId ? customers.find(c => c.id === invoice.customerId) || null : null) ||
    (invoice?.customerPhone ? ({
      id: invoice.customerId || 'cust-direct',
      code: 'CUST',
      name: invoice.customerName || invoice.client || 'Valued Customer',
      companyName: invoice.customerName || invoice.client || 'Valued Customer',
      contactPerson: invoice.customerName || invoice.client || 'Valued Customer',
      phone: invoice.customerPhone,
      email: '',
      address: invoice.customerAddress || '',
      category: 'Wholesale',
      creditLimit: 0,
      outstandingBalance: 0,
      paymentTerms: 'Immediate',
      status: 'Active',
      ordersCount: 1
    } as Customer) : null);

  const initialPhone = resolvedCustomer?.phone || invoice?.customerPhone || '';
  const [recipientPhone, setRecipientPhone] = useState(initialPhone);

  // PDF Generation States
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isSharingPdf, setIsSharingPdf] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  const [hasShared, setHasShared] = useState(false);

  // Sync phone whenever invoice or resolvedCustomer changes
  useEffect(() => {
    if (invoice) {
      const phone = resolvedCustomer?.phone || invoice.customerPhone || '';
      setRecipientPhone(phone);
      setDownloadNotice(null);
      setHasShared(false);
    }
  }, [invoice, resolvedCustomer]);

  if (!isOpen || !invoice) return null;

  // Directly download PDF
  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      const result = await downloadInvoicePdf(invoice, resolvedCustomer, settings);
      setDownloadNotice(result.filename);
    } catch (err) {
      console.error('Error generating invoice PDF:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const cleanPhone = formatWhatsAppPhone(recipientPhone);
  const isValidPhone = cleanPhone.length >= 10;
  const invCode = invoice.invoiceNumber || invoice.invoiceCode || invoice.id;
  const clientDisplayName = resolvedCustomer?.name || resolvedCustomer?.companyName || invoice.customerName || invoice.client || 'Direct Customer';

  // Share via WhatsApp directly to that mobile number & generate PDF
  const handleSendWithPdf = async () => {
    if (!cleanPhone || !isValidPhone) {
      alert('Please provide a valid 10-digit mobile number.');
      return;
    }

    // 1. Immediately open WhatsApp chat directly to the customer's phone number
    // Synchronous call in response to click event guarantees no popup blocker issues
    openWhatsAppShare(cleanPhone);
    setHasShared(true);

    // 2. Concurrently download the official A4 Invoice PDF
    setIsSharingPdf(true);
    try {
      const result = await downloadInvoicePdf(invoice, resolvedCustomer, settings);
      setDownloadNotice(result.filename);
    } catch (err) {
      console.error('Error generating invoice PDF:', err);
    } finally {
      setIsSharingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-lg w-full my-6 flex flex-col rounded-2xl overflow-hidden font-mono text-zinc-900 dark:text-zinc-100">
        
        {/* Modal Header with authentic WhatsApp Green branding */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-600 to-[#128C7E] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-inner text-white">
              <WhatsAppIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-hanken font-extrabold text-base sm:text-lg leading-tight flex items-center gap-2">
                Send Invoice via WhatsApp
              </h2>
              <p className="text-xs text-emerald-100 font-mono mt-0.5">
                Instant delivery to customer's WhatsApp Web / App
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
          
          {/* Customer & Invoice Quick Banner */}
          <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                <User className="w-4 h-4" />
              </div>
              <div>
                <span className="font-hanken font-bold text-sm text-zinc-900 dark:text-zinc-100 block">
                  {clientDisplayName}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  Invoice: <strong className="text-zinc-700 dark:text-zinc-300">{invCode}</strong> • ₹{invoice.amount?.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              invoice.status === 'Paid'
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
            }`}>
              {invoice.status}
            </span>
          </div>

          {/* Recipient Phone Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Recipient Mobile Number *</span>
              </label>
              {cleanPhone && (
                <span className="text-[10px] text-zinc-500 font-mono">
                  Will send to: <strong className="text-emerald-600 dark:text-emerald-400">+{cleanPhone}</strong>
                </span>
              )}
            </div>
            <div className="relative flex items-center">
              <span className="absolute left-3 font-mono font-bold text-xs text-zinc-400 dark:text-zinc-500 select-none">
                +91
              </span>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]{10}"
                maxLength={10}
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="9825012345"
                className="w-full pl-12 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-mono font-semibold text-zinc-900 dark:text-zinc-100 outline-none focus:border-emerald-500 dark:focus:border-emerald-500 transition-colors shadow-2xs"
              />
            </div>
            {!isValidPhone && recipientPhone.trim() !== '' && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                ⚠️ Please provide a valid 10-digit mobile number ({recipientPhone.length}/10 digits).
              </p>
            )}
            {!recipientPhone.trim() && (
              <p className="text-[10px] text-zinc-400 font-mono">
                💡 No phone number linked? You can type one here, or leave empty to choose a contact in WhatsApp.
              </p>
            )}
          </div>

          {/* Invoice PDF Attachment Card */}
          <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Paperclip className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Official Invoice PDF</span>
                  <span className="px-1.5 py-0.2 bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-[9px] font-bold rounded">
                    A4 PDF READY
                  </span>
                </div>
                <span className="text-[11px] text-zinc-500 font-mono truncate block mt-0.5">
                  Invoice_{invCode.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf || isSharingPdf}
              className="px-3.5 py-2 bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-lg font-bold text-xs inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer shrink-0"
              title="Download PDF directly to device"
            >
              {isDownloadingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </>
              )}
            </button>
          </div>


          {/* Active Share & Download Status */}
          {hasShared && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-[11px] leading-relaxed flex items-start gap-2.5 animate-in fade-in">
              <span className="text-base select-none">✅</span>
              <div className="flex-1 space-y-1">
                <strong className="block text-emerald-900 dark:text-emerald-100 font-bold">
                  WhatsApp chat opened for +{cleanPhone}!
                </strong>
                <p className="text-[10px] text-emerald-700 dark:text-emerald-300">
                  {downloadNotice
                    ? `Invoice PDF (${downloadNotice}) is downloaded.`
                    : 'Invoice PDF is being downloaded...'}
                  {' '}In WhatsApp, click 📎 (Document) and send the file to the customer.
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => openWhatsAppShare(cleanPhone)}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <WhatsAppIcon className="w-3 h-3" />
                    <span>Re-open WhatsApp Chat (+{cleanPhone})</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Download Notification Cue if downloaded separately */}
          {!hasShared && downloadNotice && (
            <div className="p-3 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-xl text-sky-800 dark:text-sky-200 text-[11px] leading-relaxed flex items-start gap-2 animate-in fade-in">
              <span className="text-base select-none">📥</span>
              <div>
                <strong>PDF Downloaded ({downloadNotice})</strong>
                <p className="text-[10px] text-sky-700 dark:text-sky-300 mt-0.5">
                  The invoice PDF has been saved to your device downloads.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Buttons */}
        <div className="p-4 sm:p-5 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
          <div>
            {(onViewInvoice || onViewTaxInvoice) && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onViewInvoice) onViewInvoice();
                  else if (onViewTaxInvoice) onViewTaxInvoice();
                }}
                className="px-3.5 py-2 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="View printable invoice"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>View Invoice</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-bold text-xs rounded-xl hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSendWithPdf}
              disabled={isSharingPdf || isDownloadingPdf || !isValidPhone}
              className="px-5 py-2.5 bg-[#25D366] hover:bg-[#20ba5a] active:scale-98 disabled:opacity-50 text-white font-hanken font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              {isSharingPdf ? (
                <>
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  <span>Preparing PDF...</span>
                </>
              ) : (
                <>
                  <WhatsAppIcon className="w-4.5 h-4.5" />
                  <span>Share on WhatsApp Directly</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
