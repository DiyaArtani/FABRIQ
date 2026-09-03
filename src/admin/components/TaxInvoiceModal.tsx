import React, { useRef, useState } from 'react';
import { Printer, Download, X, FileText, CheckCircle2, Copy, Building2, Phone, Mail, MapPin } from 'lucide-react';
import { Invoice, Customer } from '../../types';
import { useFabriqData } from '../../context/FabriqDataContext';
import { numberToIndianWords, calculateGSTBreakdown } from '../../lib/invoiceUtils';

interface TaxInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  customer?: Customer | null;
}

export const TaxInvoiceModal: React.FC<TaxInvoiceModalProps> = ({
  isOpen,
  onClose,
  invoice,
  customer
}) => {
  const { settings, customers } = useFabriqData();
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [invoiceCopyType, setInvoiceCopyType] = useState<'Original' | 'Duplicate' | 'Triplicate'>('Original');

  if (!isOpen || !invoice) return null;

  // Resolve customer account
  const resolvedCustomer = customer || customers.find(c => c.id === invoice.customerId) || {
    name: invoice.customerName || invoice.client,
    contactPerson: invoice.client || 'Authorized Buyer',
    email: 'client@apparel-orders.in',
    phone: '+91 98250 12345',
    address: 'Ring Road Textile Market, Surat, Gujarat - 395002',
    gstin: '24AAACF1234F1Z5',
    type: 'Wholesale' as const
  };

  const lineItems = invoice.items && invoice.items.length > 0 
    ? invoice.items 
    : [
        {
          finishedInventoryId: 'item-1',
          productName: invoice.itemsSummary || 'Premium Indigo Jeans / Garment Lot',
          quantity: invoice.itemsCount || 1,
          unitPrice: invoice.amount / (invoice.itemsCount || 1),
          total: invoice.amount
        }
      ];

  const taxDetails = calculateGSTBreakdown(invoice.amount, false, settings.defaultTaxRate || 5);
  const amountInWords = numberToIndianWords(invoice.amount);

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const summary = `Tax Invoice #${invoice.invoiceNumber || invoice.invoiceCode}\nClient: ${resolvedCustomer.name}\nAmount: ₹${invoice.amount.toLocaleString('en-IN')}\nStatus: ${invoice.status}\nDate: ${invoice.date}`;
    navigator.clipboard.writeText(summary);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-4xl w-full my-6 max-h-[92vh] flex flex-col rounded-2xl overflow-hidden font-mono text-zinc-900 dark:text-zinc-100">
        
        {/* Modal Action Bar (Hidden during Print) */}
        <div className="p-4 bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-hanken font-extrabold text-sm sm:text-base text-zinc-900 dark:text-zinc-100">
                GST Tax Invoice &amp; Payment Receipt
              </h2>
              <span className="text-[10px] text-zinc-500 font-mono">
                Invoice No: {invoice.invoiceNumber || invoice.invoiceCode}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Copy Type Selector */}
            <div className="hidden sm:flex bg-zinc-200 dark:bg-zinc-800 p-0.5 rounded-lg text-[10px] font-bold">
              {(['Original', 'Duplicate', 'Triplicate'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setInvoiceCopyType(type)}
                  className={`px-2 py-1 rounded transition-colors ${
                    invoiceCopyType === type
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            <button
              onClick={handleCopySummary}
              className="px-3 py-1.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Copy invoice summary to clipboard"
            >
              {copyFeedback ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copyFeedback ? 'Copied!' : 'Copy Info'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Invoice</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Document Body */}
        <div className="p-6 sm:p-10 overflow-y-auto space-y-6 text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 print:p-0 print:m-0 print:text-black print:bg-white text-xs">
          
          {/* Header Block */}
          <div className="flex flex-col sm:flex-row justify-between items-start pb-5 border-b-2 border-zinc-900 dark:border-zinc-100 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 bg-emerald-600 text-white font-black flex items-center justify-center rounded text-base font-hanken">
                  F
                </span>
                <h1 className="font-hanken font-black text-xl tracking-tight uppercase">
                  {settings.companyName || 'FABRIQ TEXTILE & APPAREL ERP'}
                </h1>
              </div>
              <p className="text-[11px] text-zinc-500 mt-1 max-w-sm">
                Plot 42, Millenium Textile Park, Ring Road, Surat, Gujarat - 395002
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-zinc-600 dark:text-zinc-400 font-mono mt-1">
                <span><strong>GSTIN:</strong> {settings.gstin || '24AAACF9876E1Z2'}</span>
                <span><strong>PAN:</strong> AAACF9876E</span>
                <span><strong>STATE CODE:</strong> 24 (Gujarat)</span>
              </div>
            </div>

            <div className="text-right sm:text-right w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-zinc-200">
              <span className="inline-block px-2.5 py-0.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-[10px] font-black uppercase tracking-widest rounded mb-1">
                TAX INVOICE ({invoiceCopyType.toUpperCase()} FOR RECIPIENT)
              </span>
              <div className="font-hanken font-black text-xl text-emerald-600 dark:text-emerald-400 tracking-tight">
                {invoice.invoiceNumber || invoice.invoiceCode}
              </div>
              <div className="text-[11px] text-zinc-500 space-y-0.5 mt-1 font-mono">
                <div><strong>Invoice Date:</strong> {invoice.date || new Date().toISOString().substring(0, 10)}</div>
                <div><strong>Due Date:</strong> {invoice.dueDate || 'Immediate / On Delivery'}</div>
                <div><strong>Payment Status:</strong> <span className={`font-bold ${invoice.status === 'Paid' ? 'text-emerald-600' : 'text-amber-600'}`}>{invoice.status.toUpperCase()}</span></div>
              </div>
            </div>
          </div>

          {/* Billed To / Shipped To Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">
                Billed To (Customer Details)
              </span>
              <h3 className="font-hanken font-bold text-sm text-zinc-900 dark:text-zinc-100">
                {resolvedCustomer.name}
              </h3>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-300">
                {resolvedCustomer.address}
              </p>
              <div className="text-[10px] text-zinc-500 space-y-0.5 font-mono pt-1">
                <div><strong>Contact Person:</strong> {resolvedCustomer.contactPerson}</div>
                <div><strong>Phone:</strong> {resolvedCustomer.phone}</div>
                <div><strong>Email:</strong> {resolvedCustomer.email}</div>
                {resolvedCustomer.gstin && (
                  <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                    <strong>GSTIN:</strong> {resolvedCustomer.gstin}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1 border-t sm:border-t-0 sm:border-l sm:pl-4 border-zinc-200 dark:border-zinc-800 pt-3 sm:pt-0">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">
                Shipping &amp; Dispatch Destination
              </span>
              <h4 className="font-hanken font-semibold text-xs text-zinc-800 dark:text-zinc-200">
                Consignee: {resolvedCustomer.name}
              </h4>
              <p className="text-[11px] text-zinc-500">
                Delivery Location: {resolvedCustomer.address}
              </p>
              <div className="text-[10px] text-zinc-500 space-y-0.5 font-mono pt-1">
                <div><strong>Place of Supply:</strong> Gujarat (State Code: 24)</div>
                <div><strong>Reverse Charge Applicable:</strong> No</div>
                <div><strong>Payment Mode:</strong> {invoice.paymentMode || 'NEFT / RTGS / Bank Transfer'}</div>
                {invoice.saleId && (
                  <div><strong>Sale Order Ref:</strong> {invoice.saleId}</div>
                )}
              </div>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-500 uppercase">
                  <th className="p-3 w-10 text-center">#</th>
                  <th className="p-3">Item Description &amp; Specifications</th>
                  <th className="p-3 text-center">HSN/SAC</th>
                  <th className="p-3 text-right">Qty</th>
                  <th className="p-3 text-right">Unit Rate</th>
                  <th className="p-3 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {lineItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50">
                    <td className="p-3 text-center font-bold text-zinc-400">{idx + 1}</td>
                    <td className="p-3">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100 block">
                        {item.productName}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        Garment Finished Stock • Premium Export Quality
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono text-zinc-500">62034200</td>
                    <td className="p-3 text-right font-bold text-zinc-900 dark:text-zinc-100">
                      {item.quantity} Pcs
                    </td>
                    <td className="p-3 text-right font-mono">
                      ₹{item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                      ₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Calculations, Tax Summary & Words */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
            {/* Left Box: Amount in Words & Bank Details */}
            <div className="space-y-4">
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                  Invoice Value in Words:
                </span>
                <p className="font-bold text-xs text-zinc-800 dark:text-zinc-200 italic font-sans leading-relaxed">
                  {amountInWords}
                </p>
              </div>

              {/* Bank Account Details */}
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[11px] font-mono space-y-1">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">
                  Bank Details for Electronic Transfer (NEFT / RTGS / IMPS)
                </span>
                <div><strong>Bank Name:</strong> HDFC Bank Ltd</div>
                <div><strong>Account Name:</strong> {settings.companyName || 'Fabriq Apparel ERP'}</div>
                <div><strong>Account Number:</strong> 50200084920194</div>
                <div><strong>IFSC Code:</strong> HDFC0001234</div>
                <div><strong>Branch:</strong> Textile Market Main Branch, Surat</div>
              </div>
            </div>

            {/* Right Box: Tax Breakdown & Grand Total */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2.5 font-mono text-xs">
              <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
                <span>Taxable Value of Goods:</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                  ₹{taxDetails.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
                <span>CGST ({taxDetails.cgstRate}%):</span>
                <span>₹{taxDetails.cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
                <span>SGST ({taxDetails.sgstRate}%):</span>
                <span>₹{taxDetails.sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="border-t border-dashed border-zinc-300 dark:border-zinc-700 pt-2 flex justify-between items-baseline">
                <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 font-hanken">
                  Total Invoice Amount (INR):
                </span>
                <span className="font-black text-xl text-emerald-600 dark:text-emerald-400">
                  ₹{invoice.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Terms & Conditions & Signatures */}
          <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs font-mono">
            <div className="space-y-1.5 text-[10px] text-zinc-500">
              <span className="font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block">
                Terms &amp; Conditions
              </span>
              <p>1. Payment is due strictly within the agreed payment schedule.</p>
              <p>2. Interest @ 18% per annum will be charged on overdue payments.</p>
              <p>3. Goods once sold are verified and accepted in sound condition.</p>
              <p>4. All disputes subject to local jurisdiction only.</p>
            </div>

            <div className="space-y-12 text-right">
              <div>
                <span className="text-[11px] text-zinc-500 uppercase font-bold block">
                  For {settings.companyName || 'FABRIQ TEXTILE & APPAREL ERP'}
                </span>
              </div>
              <div className="border-t border-zinc-400 pt-1 text-[10px] text-zinc-500">
                Authorized Signatory &amp; Seal
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
