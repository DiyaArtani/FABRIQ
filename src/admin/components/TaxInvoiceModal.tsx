import React, { useState } from 'react';
import { Printer, X, FileText, ArrowRightLeft, Download, Loader2 } from 'lucide-react';
import { Invoice, Customer } from '../../types';
import { useFabriqData } from '../../context/FabriqDataContext';
import { useAdminAuth } from '../context/AdminAuthContext';
import { numberToIndianWords } from '../../lib/invoiceUtils';
import { WhatsAppShareModal, WhatsAppIcon } from '../../components/WhatsAppShareModal';
import { downloadInvoicePdf } from '../../utils/invoicePdfGenerator';

export interface PrintableInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  customer?: Customer | null;
  isAdmin?: boolean;
}

export const PrintableInvoiceModal: React.FC<PrintableInvoiceModalProps> = ({
  isOpen,
  onClose,
  invoice,
  customer,
  isAdmin: directIsAdmin
}) => {
  const { settings, customers, sales } = useFabriqData();
  const { isAdminAuthenticated } = useAdminAuth();
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // WhatsApp sharing is strictly restricted to Admin side
  const canShareWhatsApp = directIsAdmin !== undefined ? directIsAdmin : isAdminAuthenticated;

  if (!isOpen || !invoice) return null;

  // Resolve customer account without dummy fallbacks
  const resolvedCustomer = customer || customers.find(c => c.id === invoice.customerId) || {
    name: invoice.customerName || invoice.client || 'Customer',
    contactPerson: invoice.client || '',
    email: '',
    phone: '',
    address: '',
    type: 'Wholesale' as const
  };

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      await downloadInvoicePdf(invoice, resolvedCustomer, settings);
    } catch (err) {
      console.error('Failed to download invoice PDF:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const lineItems = invoice.items && invoice.items.length > 0 
    ? invoice.items 
    : [
        {
          finishedInventoryId: 'item-1',
          productName: invoice.itemsSummary || 'Finished Garment Lot',
          quantity: invoice.itemsCount || 1,
          unitPrice: (invoice.amount || 0) / (invoice.itemsCount || 1),
          total: invoice.amount || 0
        }
      ];

  const totalQuantity = lineItems.reduce((acc, it) => acc + (it.quantity || 1), 0);
  const grandTotalAmount = Number(invoice.totalAmount ?? invoice.amount ?? 0);

  // Find linked sale order to accurately verify payments & partial receipts
  const linkedSale = sales.find(s => 
    (invoice.saleId && s.id === invoice.saleId) ||
    (invoice.id && s.invoiceId === invoice.id) ||
    (invoice.invoiceNumber && (s.invoiceNumber === invoice.invoiceNumber || s.saleCode === invoice.invoiceNumber))
  );

  const rawPaid = invoice.paidAmount !== undefined 
    ? Number(invoice.paidAmount) 
    : (linkedSale?.paidAmount !== undefined 
        ? Number(linkedSale.paidAmount) 
        : (invoice.status === 'Paid' || linkedSale?.paymentStatus === 'Paid' ? grandTotalAmount : 0));

  const paidAmount = Math.min(grandTotalAmount, Math.max(0, rawPaid));
  const outstandingBalance = Math.max(0, grandTotalAmount - paidAmount);
  const isPartialPayment = paidAmount > 0 && paidAmount < grandTotalAmount;
  const isPaidInFull = paidAmount >= grandTotalAmount || invoice.status === 'Paid' || linkedSale?.paymentStatus === 'Paid';

  const amountInWords = numberToIndianWords(grandTotalAmount);
  const outstandingInWords = outstandingBalance > 0 ? numberToIndianWords(outstandingBalance) : '';

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 50);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 sm:p-4 bg-zinc-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm 12mm 12mm;
          }
          html, body {
            height: auto !important;
            overflow: visible !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 11px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          #sales-invoice-printable, #sales-invoice-printable * {
            visibility: visible !important;
          }
          #sales-invoice-printable {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            overflow: visible !important;
            background: #ffffff !important;
            color: #09090b !important;
          }
          /* Dark mode print fix: strictly force dark text on clean white backgrounds */
          #sales-invoice-printable,
          #sales-invoice-printable * {
            color: #09090b !important;
            text-shadow: none !important;
          }
          #sales-invoice-printable .print-emerald-text {
            color: #047857 !important;
          }
          #sales-invoice-printable .print-emerald-badge {
            background-color: #047857 !important;
            color: #ffffff !important;
          }
          #sales-invoice-printable .print-amber-text {
            color: #d97706 !important;
          }
          #sales-invoice-printable .print-amber-badge {
            background-color: #d97706 !important;
            color: #ffffff !important;
          }
          #sales-invoice-printable .print-subtle-bg {
            background-color: #f8fafc !important;
            border-color: #e2e8f0 !important;
          }
          #sales-invoice-printable table {
            min-width: 100% !important;
            width: 100% !important;
            border-collapse: collapse !important;
          }
          #sales-invoice-printable tr,
          #sales-invoice-printable .avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          /* Hide all action chrome, backdrop and buttons */
          .print\\:hidden, nav, header, aside, button {
            display: none !important;
            visibility: hidden !important;
          }
        }
      `}</style>

      {/* Modal Dialog Card */}
      <div className="bg-white dark:bg-zinc-900 border-0 sm:border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-4xl w-full h-full sm:h-auto sm:my-6 sm:max-h-[92vh] flex flex-col rounded-none sm:rounded-2xl overflow-hidden font-mono text-zinc-900 dark:text-zinc-100">
        
        {/* Modal Action Header (Hidden during Print) */}
        <div className="p-3 sm:p-4 bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between print:hidden shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-hanken font-extrabold text-xs sm:text-base text-zinc-900 dark:text-zinc-100 truncate">
                Commercial Tax Invoice
              </h2>
              <span className="text-[10px] text-zinc-500 font-mono truncate block">
                Invoice: {invoice.invoiceNumber || invoice.invoiceCode}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={handlePrint}
              className="px-3 sm:px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              title="Print official sales invoice"
            >
              <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Print</span>
            </button>

            {/* Direct PDF Download */}
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="px-3 sm:px-3.5 py-1.5 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Download official Tax Invoice PDF"
            >
              {isDownloadingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  <span className="hidden sm:inline">Generating...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">PDF</span>
                </>
              )}
            </button>

            {/* WhatsApp Share Button - strictly for Admin side */}
            {canShareWhatsApp && (
              <button
                onClick={() => setIsWhatsAppModalOpen(true)}
                className="px-3 sm:px-3.5 py-1.5 bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-all hover:scale-102 active:scale-98 cursor-pointer"
                title="Send invoice directly to customer on WhatsApp"
              >
                <WhatsAppIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Close invoice modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Document Body */}
        <div id="sales-invoice-printable" className="p-4 sm:p-8 md:p-10 overflow-y-auto space-y-5 sm:space-y-6 text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 print:p-0 print:m-0 print:text-black print:bg-white text-xs">
          
          {/* Header Block */}
          <div className="flex flex-col sm:flex-row justify-between items-start pb-4 sm:pb-5 border-b-2 border-zinc-900 dark:border-zinc-100 gap-3 sm:gap-4 avoid-break">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 sm:w-8 sm:h-8 bg-white p-0.5 border border-zinc-200 dark:border-zinc-700 shadow-xs flex items-center justify-center rounded overflow-hidden flex-shrink-0">
                  <img src="/logo.png" alt="Fabriq Logo" className="w-full h-full object-contain" />
                </span>
                <h1 className="font-hanken font-black text-base sm:text-xl tracking-tight uppercase">
                  {settings.companyName || 'FABRIQ TEXTILE & APPAREL ERP'}
                </h1>
              </div>
              {(settings.companyAddress || settings.address) && (
                <p className="text-[11px] text-zinc-500 mt-1 max-w-sm">
                  {settings.companyAddress || settings.address}
                </p>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-zinc-600 dark:text-zinc-400 font-mono mt-1">
                {settings.contactPhone && <span><strong>Phone:</strong> {settings.contactPhone}</span>}
                {settings.companyEmail && <span><strong>Email:</strong> {settings.companyEmail}</span>}
                {settings.gstin && <span><strong>GSTIN:</strong> {settings.gstin}</span>}
              </div>
            </div>

            <div className="text-left sm:text-right w-full sm:w-auto border-t sm:border-t-0 pt-2.5 sm:pt-0 border-zinc-200 dark:border-zinc-800">
              <span className="inline-block px-2.5 py-0.5 bg-emerald-700 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded mb-1 print-emerald-badge">
                TAX INVOICE
              </span>
              <div className="font-hanken font-black text-lg sm:text-xl text-emerald-600 dark:text-emerald-400 tracking-tight print-emerald-text">
                {invoice.invoiceNumber || invoice.invoiceCode}
              </div>
              <div className="text-[10px] sm:text-[11px] text-zinc-500 space-y-0.5 mt-0.5 font-mono">
                <div><strong>Invoice Date:</strong> {invoice.date || new Date().toISOString().substring(0, 10)}</div>
                {invoice.dueDate && <div><strong>Due Date:</strong> {invoice.dueDate}</div>}
                <div>
                  <strong>Payment Status:</strong>{' '}
                  <span className={`font-bold ${isPaidInFull ? 'text-emerald-600 print-emerald-text' : isPartialPayment ? 'text-amber-600 print-amber-text' : 'text-zinc-600'}`}>
                    {isPaidInFull ? 'PAID' : isPartialPayment ? `PARTIAL (₹${outstandingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} DUE)` : (invoice.status ? invoice.status.toUpperCase() : 'PENDING')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Billed To / Shipped To Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3.5 sm:p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl print-subtle-bg avoid-break">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">
                Billed To (Customer Details)
              </span>
              <h3 className="font-hanken font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">
                {resolvedCustomer.name}
              </h3>
              {resolvedCustomer.address && (
                <p className="text-[11px] text-zinc-600 dark:text-zinc-300 leading-snug">
                  {resolvedCustomer.address}
                </p>
              )}
              <div className="text-[10px] text-zinc-500 space-y-0.5 font-mono pt-1">
                {resolvedCustomer.contactPerson && resolvedCustomer.contactPerson !== resolvedCustomer.name && (
                  <div><strong>Contact Person:</strong> {resolvedCustomer.contactPerson}</div>
                )}
                {resolvedCustomer.phone && <div><strong>Phone:</strong> {resolvedCustomer.phone}</div>}
                {resolvedCustomer.email && <div><strong>Email:</strong> {resolvedCustomer.email}</div>}
              </div>
            </div>

            <div className="space-y-1 border-t sm:border-t-0 sm:border-l sm:pl-4 border-zinc-200 dark:border-zinc-800 pt-3 sm:pt-0">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">
                Shipping &amp; Delivery Details
              </span>
              <h4 className="font-hanken font-semibold text-xs text-zinc-800 dark:text-zinc-200">
                Consignee: {resolvedCustomer.name}
              </h4>
              {resolvedCustomer.address && (
                <p className="text-[11px] text-zinc-500 leading-snug">
                  Delivery Location: {resolvedCustomer.address}
                </p>
              )}
              <div className="text-[10px] text-zinc-500 space-y-0.5 font-mono pt-1">
                {invoice.paymentMode && <div><strong>Payment Mode:</strong> {invoice.paymentMode}</div>}
              </div>
            </div>
          </div>

          {/* Itemized Table Container (Responsive Horizontal Scroll for Mobile) */}
          <div className="space-y-1.5 avoid-break">
            <div className="flex items-center justify-between text-[10px] text-zinc-400 uppercase font-bold tracking-wider px-1">
              <span>Itemized Commercial Products</span>
              <span className="flex items-center gap-1 text-[9px] text-zinc-400 sm:hidden print:hidden">
                <ArrowRightLeft className="w-2.5 h-2.5" /> Swipe table
              </span>
            </div>

            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-x-auto print-subtle-bg">
              <table className="w-full min-w-[500px] sm:min-w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-500 uppercase print-subtle-bg">
                    <th className="p-2.5 sm:p-3 w-10 text-center">#</th>
                    <th className="p-2.5 sm:p-3">Item Description &amp; Specifications</th>
                    <th className="p-2.5 sm:p-3 text-right">Qty</th>
                    <th className="p-2.5 sm:p-3 text-right">Unit Rate</th>
                    <th className="p-2.5 sm:p-3 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {lineItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50">
                      <td className="p-2.5 sm:p-3 text-center font-bold text-zinc-400">{idx + 1}</td>
                      <td className="p-2.5 sm:p-3">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 block">
                          {item.productName || item.itemName}
                        </span>
                        {(item.color || item.size) && (
                          <span className="text-[10px] text-zinc-500 block">
                            {[item.color, item.size].filter(Boolean).join(' • ')}
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 sm:p-3 text-right font-bold text-zinc-900 dark:text-zinc-100">
                        {item.quantity} Pcs
                      </td>
                      <td className="p-2.5 sm:p-3 text-right font-mono">
                        ₹{item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2.5 sm:p-3 text-right font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                        ₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Calculations, Summary & Words */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start avoid-break">
            {/* Left Box: Amount in Words & Notes */}
            <div className="space-y-3">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1 print-subtle-bg">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                  Invoice Amount in Words:
                </span>
                <p className="font-bold text-xs text-zinc-800 dark:text-zinc-200 italic font-sans leading-relaxed">
                  {amountInWords}
                </p>
                {isPartialPayment && outstandingBalance > 0 && (
                  <div className="pt-2 mt-2 border-t border-dashed border-zinc-200 dark:border-zinc-800">
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider block">
                      Outstanding Balance Due in Words:
                    </span>
                    <p className="font-bold text-xs text-amber-700 dark:text-amber-300 italic font-sans leading-relaxed">
                      {outstandingInWords}
                    </p>
                  </div>
                )}
              </div>

              {invoice.notes && (
                <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1 print-subtle-bg">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                    Notes / Remarks:
                  </span>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 font-sans">
                    {invoice.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Right Box: Total Summary */}
            <div className="p-3.5 sm:p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2.5 font-mono text-xs print-subtle-bg">
              <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
                <span>Total Quantity:</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                  {totalQuantity} Pcs
                </span>
              </div>

              <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
                <span>Total Invoice Amount:</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                  ₹{grandTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {paidAmount > 0 && (
                <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                  <span>Amount Received {isPartialPayment ? '(Partial)' : ''}:</span>
                  <span className="font-bold font-mono">
                    - ₹{paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              <div className="border-t border-dashed border-zinc-300 dark:border-zinc-700 pt-2 flex justify-between items-baseline">
                <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 font-hanken">
                  {paidAmount > 0 ? 'Outstanding Balance Due:' : 'Total Payable:'}
                </span>
                <span className={`font-black text-lg sm:text-xl ${outstandingBalance > 0 ? 'text-amber-600 dark:text-amber-400 print-amber-text' : 'text-emerald-600 dark:text-emerald-400 print-emerald-text'}`}>
                  ₹{outstandingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Terms & Conditions & Signatures */}
          <div className="pt-5 sm:pt-6 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 text-xs font-mono avoid-break">
            <div className="space-y-1 text-[10px] text-zinc-500">
              <span className="font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block">
                Terms &amp; Conditions
              </span>
              <p>1. Payment is due strictly within the agreed payment schedule.</p>
              <p>2. Goods once sold are verified and accepted in sound condition.</p>
              <p>3. All disputes subject to local jurisdiction only.</p>
            </div>

            <div className="space-y-8 sm:space-y-12 text-center sm:text-right pt-2 sm:pt-0">
              <div>
                <span className="text-[11px] text-zinc-500 uppercase font-bold block">
                  For {settings.companyName || 'FABRIQ TEXTILE & APPAREL ERP'}
                </span>
              </div>
              <div className="w-48 sm:w-auto mx-auto sm:mx-0 border-t border-zinc-400 pt-1 text-[10px] text-zinc-500">
                Authorized Signatory &amp; Seal
              </div>
            </div>
          </div>

          {/* WhatsApp Share Action Bar inside Invoice view (Hidden during Print & ONLY for Admin) */}
          {canShareWhatsApp && (
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-emerald-50/60 dark:bg-emerald-950/30 p-3.5 rounded-xl border-dashed border-emerald-300 dark:border-emerald-800 print:hidden">
              <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 w-full sm:w-auto">
                <div className="w-7 h-7 rounded-lg bg-[#25D366] text-white flex items-center justify-center shrink-0">
                  <WhatsAppIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-xs block text-zinc-900 dark:text-zinc-100 truncate">Send Invoice directly to {resolvedCustomer.name}</span>
                  {resolvedCustomer.phone && (
                    <span className="text-[10px] text-zinc-500 font-mono truncate block">Linked: {resolvedCustomer.phone}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsWhatsAppModalOpen(true)}
                className="w-full sm:w-auto px-3.5 py-1.5 bg-[#25D366] hover:bg-[#20ba5a] text-white font-hanken font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <WhatsAppIcon className="w-3.5 h-3.5" />
                <span>Share on WhatsApp</span>
              </button>
            </div>
          )}

        </div>
      </div>

      {/* WhatsApp Share Modal Dialog */}
      {canShareWhatsApp && (
        <WhatsAppShareModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => setIsWhatsAppModalOpen(false)}
          invoice={invoice}
          customer={resolvedCustomer}
        />
      )}
    </div>
  );
};

// Backwards-compatibility alias so existing imports continue to work seamlessly
export const TaxInvoiceModal = PrintableInvoiceModal;
export default PrintableInvoiceModal;
