import React from 'react';
import { Printer, X, Building2, Receipt, ArrowRightLeft } from 'lucide-react';
import { RawInventoryItem, Purchase, Supplier } from '../types';
import { useFabriqData } from '../context/FabriqDataContext';
import { numberToIndianWords, calculateGSTBreakdown } from '../lib/invoiceUtils';

export interface PurchaseBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawItem?: RawInventoryItem | null;
  purchase?: Purchase | null;
}

export const PurchaseBillModal: React.FC<PurchaseBillModalProps> = ({
  isOpen,
  onClose,
  rawItem,
  purchase: directPurchase
}) => {
  const { settings, purchases, suppliers, warehouses, rawInventory } = useFabriqData();

  if (!isOpen || (!rawItem && !directPurchase)) return null;

  // Resolve matching purchase from store or direct prop
  const resolvedPurchase = directPurchase || (rawItem ? (purchases || []).find(
    (p) =>
      p.id === rawItem.purchaseId ||
      p.billNumber === rawItem.billNumber ||
      p.billNumber === rawItem.purchaseId ||
      p.invoiceNumber === rawItem.invoiceNumber ||
      p.invoiceNumber === rawItem.purchaseId
  ) : null);

  // Resolve matching raw item from inventory if not passed directly
  const resolvedRawItem = rawItem || (resolvedPurchase ? (rawInventory || []).find(
    (r) =>
      r.purchaseId === resolvedPurchase.id ||
      r.billNumber === resolvedPurchase.billNumber ||
      r.invoiceNumber === resolvedPurchase.invoiceNumber ||
      r.batchId === resolvedPurchase.billNumber
  ) : null);

  // Resolve matching supplier from purchase or store
  const supplierObj = (resolvedPurchase?.supplier as any) || (resolvedRawItem ? suppliers.find((s) => s.name.toLowerCase() === (resolvedRawItem.supplierName || '').toLowerCase()) : null);
  const supplierName = supplierObj?.name || resolvedRawItem?.supplierName || resolvedPurchase?.supplier?.name || 'Textile Mill Supplier';
  const matchedSupplier = (suppliers || []).find((s) => s.name.toLowerCase() === supplierName.toLowerCase());

  const resolvedSupplier: Partial<Supplier> = {
    name: supplierName,
    phone: supplierObj?.phone || matchedSupplier?.phone || '+91 98200 54321',
    address: supplierObj?.address || matchedSupplier?.address || 'Textile Market Ring Road, Surat, Gujarat - 395002',
    gstin: supplierObj?.gstin || matchedSupplier?.gstin || '24AAACT1234F1Z9',
    bankName: supplierObj?.bankName || matchedSupplier?.bankName,
    accountNumber: supplierObj?.accountNumber || matchedSupplier?.accountNumber,
    ifscCode: supplierObj?.ifscCode || matchedSupplier?.ifscCode
  };

  // Resolve destination warehouse
  const warehouseName = (resolvedPurchase?.warehouse || resolvedPurchase?.warehouseLocation || resolvedRawItem?.warehouse || '').trim();
  const resolvedWarehouse = (warehouses || []).find(
    (w) =>
      w.name.toLowerCase() === warehouseName.toLowerCase() ||
      (warehouseName && w.name.toLowerCase().includes(warehouseName.toLowerCase())) ||
      (warehouseName && warehouseName.toLowerCase().includes(w.name.toLowerCase()))
  );

  // Bill reference numbers
  const billNo = resolvedPurchase?.billNumber || resolvedRawItem?.billNumber || 'BILL-2026-0001';
  const supplierInvNo = resolvedPurchase?.invoiceNumber || resolvedRawItem?.invoiceNumber || 'INV-TEX-892';
  const billDate = resolvedPurchase?.purchaseDate || resolvedRawItem?.createdAt?.substring(0, 10) || new Date().toISOString().substring(0, 10);
  const paymentStatus = resolvedPurchase?.paymentStatus || 'Paid';
  const paymentMode = resolvedPurchase?.paymentMode || 'Bank Transfer (NEFT/RTGS)';

  // Calculate items
  let lineItems: Array<{
    id?: string;
    fabricName: string;
    width?: string;
    meters: number;
    rate: number;
    subtotal?: number;
    amount?: number;
  }> = [];

  if (resolvedPurchase?.items && resolvedPurchase.items.length > 0) {
    lineItems = resolvedPurchase.items.map((item) => ({
      id: item.id,
      fabricName: item.fabricName,
      width: item.width || resolvedPurchase.width || '58"',
      meters: Number(item.meters) || 0,
      rate: Number(item.rate) || 0,
      subtotal: item.amount !== undefined ? item.amount : ((Number(item.meters) || 0) * (Number(item.rate) || 0))
    }));
  } else if (resolvedPurchase && resolvedPurchase.fabricName) {
    lineItems = [
      {
        id: 'item-1',
        fabricName: resolvedPurchase.fabricName,
        width: resolvedPurchase.width || '58"',
        meters: Number(resolvedPurchase.meters) || 0,
        rate: Number(resolvedPurchase.rate) || 0,
        subtotal: resolvedPurchase.subtotal || ((Number(resolvedPurchase.meters) || 0) * (Number(resolvedPurchase.rate) || 0))
      }
    ];
  } else if (resolvedRawItem) {
    lineItems = [
      {
        id: 'item-1',
        fabricName: resolvedRawItem.fabricName,
        width: resolvedRawItem.width || '58"',
        meters: Number(resolvedRawItem.totalMeters) || 0,
        rate: Number(resolvedRawItem.costPerMeter) || 0,
        subtotal: (Number(resolvedRawItem.totalMeters) || 0) * (Number(resolvedRawItem.costPerMeter) || 0)
      }
    ];
  }

  const calculatedItemsTotal = lineItems.reduce((sum, it) => sum + (it.subtotal || it.amount || (it.meters * it.rate)), 0);
  const totalMeters = lineItems.reduce((sum, it) => sum + (Number(it.meters) || 0), 0);
  const subtotal = resolvedPurchase?.subtotal || (resolvedRawItem ? (resolvedRawItem.totalMeters * resolvedRawItem.costPerMeter) : calculatedItemsTotal);
  const gstRate = resolvedPurchase?.gstRate !== undefined ? resolvedPurchase.gstRate : 5;
  const gstDetails = calculateGSTBreakdown(subtotal, false, gstRate);
  const totalAmount = resolvedPurchase?.totalAmount || gstDetails.grandTotal;
  const amountInWords = numberToIndianWords(totalAmount);

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
          #purchase-bill-printable, #purchase-bill-printable * {
            visibility: visible !important;
          }
          #purchase-bill-printable {
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
          /* Force dark mode colors to print-friendly dark text on clean white */
          #purchase-bill-printable,
          #purchase-bill-printable * {
            color: #09090b !important;
            text-shadow: none !important;
          }
          #purchase-bill-printable .print-dark-bg {
            background-color: #09090b !important;
            color: #ffffff !important;
          }
          #purchase-bill-printable .print-dark-bg * {
            color: #ffffff !important;
          }
          #purchase-bill-printable .print-emerald-badge {
            background-color: #047857 !important;
            color: #ffffff !important;
          }
          #purchase-bill-printable .print-emerald-text {
            color: #047857 !important;
          }
          #purchase-bill-printable .print-subtle-bg {
            background-color: #f8fafc !important;
            border-color: #e2e8f0 !important;
          }
          #purchase-bill-printable table {
            min-width: 100% !important;
            width: 100% !important;
            border-collapse: collapse !important;
          }
          #purchase-bill-printable tr,
          #purchase-bill-printable .avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          /* Hide scrollbars, dialog buttons, headers */
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
              <Receipt className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-hanken font-extrabold text-xs sm:text-base text-zinc-900 dark:text-zinc-100 truncate">
                Purchase Bill &amp; Material Receipt
              </h2>
              <span className="text-[10px] text-zinc-500 font-mono truncate block">
                {billNo} • Inv: {supplierInvNo}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={handlePrint}
              className="px-3 sm:px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              title="Print official purchase bill"
            >
              <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Print</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Purchase Bill Body */}
        <div id="purchase-bill-printable" className="p-4 sm:p-8 md:p-10 overflow-y-auto space-y-5 sm:space-y-6 text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 print:p-0 print:m-0 print:text-black print:bg-white text-xs">

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
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-zinc-600 dark:text-zinc-400 font-mono mt-1">
                {settings.contactPhone && <span><strong>Phone:</strong> {settings.contactPhone}</span>}
                {settings.companyEmail && <span><strong>Email:</strong> {settings.companyEmail}</span>}
              </div>
            </div>

            <div className="text-left sm:text-right w-full sm:w-auto border-t sm:border-t-0 pt-2.5 sm:pt-0 border-zinc-200 dark:border-zinc-800">
              <span className="inline-block px-2 py-0.5 bg-emerald-700 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded mb-1 print-emerald-badge">
                RAW MATERIAL PURCHASE BILL
              </span>
              <div className="font-hanken font-black text-lg sm:text-xl text-emerald-600 dark:text-emerald-400 tracking-tight print-emerald-text">
                {billNo}
              </div>
              <div className="text-[10px] sm:text-[11px] text-zinc-500 space-y-0.5 mt-0.5 font-mono">
                <div><strong>Bill Date:</strong> {billDate}</div>
                <div><strong>Supplier Invoice:</strong> {supplierInvNo}</div>
                <div>
                  <strong>Payment Status:</strong>{' '}
                  <span className={`font-bold ${paymentStatus === 'Paid' ? 'text-emerald-600 dark:text-emerald-400 print-emerald-text' : 'text-amber-600'}`}>
                    {paymentStatus.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Supplier & Warehouse Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3.5 sm:p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl print-subtle-bg avoid-break">
            {/* Supplier Information */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">
                Supplier / Vendor (Billed By)
              </span>
              <h3 className="font-hanken font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">
                {resolvedSupplier.name}
              </h3>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-300 leading-snug">
                {resolvedSupplier.address || 'Address not specified'}
              </p>
              <div className="text-[10px] text-zinc-500 space-y-0.5 font-mono pt-1">
                <div><strong>Phone:</strong> {resolvedSupplier.phone || 'N/A'}</div>
                {resolvedSupplier.gstin && (
                  <div className="text-emerald-600 dark:text-emerald-400 font-bold print-emerald-text">
                    <strong>GSTIN:</strong> {resolvedSupplier.gstin}
                  </div>
                )}
                {resolvedSupplier.bankName && (
                  <div>
                    <strong>Bank:</strong> {resolvedSupplier.bankName} (A/C: {resolvedSupplier.accountNumber || 'N/A'}, IFSC: {resolvedSupplier.ifscCode || 'N/A'})
                  </div>
                )}
              </div>
            </div>

            {/* Warehouse Receiving Information */}
            <div className="space-y-1 border-t sm:border-t-0 sm:border-l sm:pl-4 border-zinc-200 dark:border-zinc-800 pt-3 sm:pt-0">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">
                Storage Destination &amp; Facility
              </span>
              <h4 className="font-hanken font-semibold text-xs text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{warehouseName || resolvedWarehouse?.name || 'Central Warehouse'}</span>
              </h4>
              <p className="text-[11px] text-zinc-500 leading-snug">
                Location: {resolvedWarehouse?.location || 'Main Depot'} • {resolvedWarehouse?.address || 'Warehouse Premises'}
              </p>
              <div className="text-[10px] text-zinc-500 space-y-0.5 font-mono pt-1">
                <div><strong>Supervisor:</strong> {resolvedWarehouse?.managerName || 'Stores Incharge'}</div>
                <div><strong>Payment Mode:</strong> {paymentMode}</div>
                <div><strong>Batch Lot Ref:</strong> {resolvedRawItem?.batchId || resolvedPurchase?.id || 'LOT-2026'}</div>
              </div>
            </div>
          </div>

          {/* Itemized Table Container (Responsive Horizontal Scroll for Mobile) */}
          <div className="space-y-1.5 avoid-break">
            <div className="flex items-center justify-between text-[10px] text-zinc-400 uppercase font-bold tracking-wider px-1">
              <span>Itemized Material Ledger</span>
              <span className="flex items-center gap-1 text-[9px] text-zinc-400 sm:hidden print:hidden">
                <ArrowRightLeft className="w-2.5 h-2.5" /> Swipe table
              </span>
            </div>

            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-x-auto print-subtle-bg">
              <table className="w-full min-w-[540px] sm:min-w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-500 uppercase print-subtle-bg">
                    <th className="p-2.5 sm:p-3 w-10 text-center">#</th>
                    <th className="p-2.5 sm:p-3">Fabric Description &amp; Specifications</th>
                    <th className="p-2.5 sm:p-3 text-center">Width</th>
                    <th className="p-2.5 sm:p-3 text-right">Meters</th>
                    <th className="p-2.5 sm:p-3 text-right">Rate / m</th>
                    <th className="p-2.5 sm:p-3 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {lineItems.map((item, idx) => {
                    const lineTotal = item.subtotal || item.amount || ((item.meters || 0) * (item.rate || 0));
                    return (
                      <tr key={item.id || idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50">
                        <td className="p-2.5 sm:p-3 text-center font-bold text-zinc-400">{idx + 1}</td>
                        <td className="p-2.5 sm:p-3">
                          <span className="font-bold text-zinc-900 dark:text-zinc-100 block">
                            {item.fabricName}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            Supplier: {resolvedSupplier.name}
                          </span>
                        </td>
                        <td className="p-2.5 sm:p-3 text-center font-mono text-zinc-600 dark:text-zinc-400">
                          {item.width || resolvedRawItem?.width || '58"'}
                        </td>
                        <td className="p-2.5 sm:p-3 text-right font-bold text-zinc-900 dark:text-zinc-100">
                          {(item.meters || 0).toLocaleString()} m
                        </td>
                        <td className="p-2.5 sm:p-3 text-right font-mono">
                          ₹{(Number(item.rate) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2.5 sm:p-3 text-right font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                          ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Calculations, Summary & Words */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start avoid-break">
            {/* Left Box: Amount in Words */}
            <div className="space-y-3">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1 print-subtle-bg">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                  Bill Value in Words:
                </span>
                <p className="font-bold text-xs text-zinc-800 dark:text-zinc-200 italic font-sans leading-relaxed">
                  {amountInWords}
                </p>
              </div>

              {resolvedPurchase?.remarks && (
                <div className="text-[11px] text-zinc-500">
                  <strong>Remarks:</strong> {resolvedPurchase.remarks}
                </div>
              )}
            </div>

            {/* Right Box: Bill Summary & Grand Total */}
            <div className="bg-zinc-50 dark:bg-zinc-950 p-3.5 sm:p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2 font-mono text-xs print-subtle-bg">
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Total Quantity:</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{totalMeters.toLocaleString()} m</span>
              </div>
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Subtotal:</span>
                <span>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              {gstRate > 0 && (
                <div className="flex justify-between text-amber-600 dark:text-amber-500">
                  <span>GST ({gstRate}%):</span>
                  <span>+ ₹{((subtotal * gstRate) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="border-t border-zinc-200 dark:border-zinc-800 pt-2 flex justify-between font-black text-sm text-zinc-900 dark:text-zinc-100">
                <span>Total Bill Value:</span>
                <span className="text-emerald-600 dark:text-emerald-400 print-emerald-text">
                  ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Signatures & Verification Block */}
          <div className="pt-6 sm:pt-8 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row gap-6 sm:gap-4 justify-between items-center sm:items-end text-center avoid-break">
            <div className="space-y-6 sm:space-y-10 w-full sm:w-auto">
              <div className="w-40 sm:w-44 border-b border-dashed border-zinc-400 dark:border-zinc-600 mx-auto sm:mx-0"></div>
              <p className="text-[10px] text-zinc-500 font-bold uppercase">
                Received By (Stores Incharge)
              </p>
            </div>
            <div className="space-y-6 sm:space-y-10 w-full sm:w-auto">
              <div className="w-40 sm:w-44 border-b border-dashed border-zinc-400 dark:border-zinc-600 mx-auto sm:mx-0"></div>
              <p className="text-[10px] text-zinc-500 font-bold uppercase">
                Authorized Supplier Signatory
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
