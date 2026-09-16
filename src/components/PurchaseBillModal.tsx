import React from 'react';
import { Printer, X, Building2, Receipt } from 'lucide-react';
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
    email: supplierObj?.email || matchedSupplier?.email,
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
  const subtotal = resolvedPurchase?.subtotal || (resolvedRawItem ? (resolvedRawItem.totalMeters * resolvedRawItem.costPerMeter) : calculatedItemsTotal);
  const gstRate = resolvedPurchase?.gstRate !== undefined ? resolvedPurchase.gstRate : 5;
  const gstDetails = calculateGSTBreakdown(subtotal, false, gstRate);
  const totalAmount = resolvedPurchase?.totalAmount || gstDetails.grandTotal;
  const amountInWords = numberToIndianWords(totalAmount);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <style>{`
        @media print {
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
            margin: 0 !important;
            padding: 20px !important;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-4xl w-full my-6 max-h-[92vh] flex flex-col rounded-2xl overflow-hidden font-mono text-zinc-900 dark:text-zinc-100">
        
        {/* Modal Action Bar (Hidden during Print) */}
        <div className="p-4 bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-hanken font-extrabold text-sm sm:text-base text-zinc-900 dark:text-zinc-100">
                Purchase Bill &amp; Inward Material Receipt
              </h2>
              <span className="text-[10px] text-zinc-500 font-mono">
                Bill No: {billNo} • Supplier Inv: {supplierInvNo}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              title="Print official purchase bill"
            >
              <Printer className="w-4 h-4" />
              <span>Print Invoice</span>
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
        <div id="purchase-bill-printable" className="p-6 sm:p-10 overflow-y-auto space-y-6 text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 print:p-0 print:m-0 print:text-black print:bg-white text-xs">
          
          {/* Header Block */}
          <div className="flex flex-col sm:flex-row justify-between items-start pb-5 border-b-2 border-zinc-900 dark:border-zinc-100 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 bg-white p-0.5 border border-zinc-200 dark:border-zinc-700 shadow-xs flex items-center justify-center rounded overflow-hidden flex-shrink-0">
                  <img src="/logo.png" alt="Fabriq Logo" className="w-full h-full object-contain" />
                </span>
                <h1 className="font-hanken font-black text-xl tracking-tight uppercase">
                  {settings.companyName || 'FABRIQ TEXTILE & APPAREL ERP'}
                </h1>
              </div>
              <p className="text-[11px] text-zinc-500 mt-1 max-w-sm">
                Central Mills &amp; Inward Fabric Receiving Depo
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-zinc-600 dark:text-zinc-400 font-mono mt-1">
                <span><strong>GSTIN:</strong> {settings.gstin || '24AAACF9876E1Z2'}</span>
                <span><strong>STATE CODE:</strong> 24 (Gujarat)</span>
              </div>
            </div>

            <div className="text-right sm:text-right w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-zinc-200">
              <span className="inline-block px-2.5 py-0.5 bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest rounded mb-1">
                RAW MATERIAL PURCHASE TAX INVOICE
              </span>
              <div className="font-hanken font-black text-xl text-emerald-600 dark:text-emerald-400 tracking-tight">
                {billNo}
              </div>
              <div className="text-[11px] text-zinc-500 space-y-0.5 mt-1 font-mono">
                <div><strong>Bill Date:</strong> {billDate}</div>
                <div><strong>Supplier Invoice:</strong> {supplierInvNo}</div>
                <div>
                  <strong>Payment Status:</strong>{' '}
                  <span className={`font-bold ${paymentStatus === 'Paid' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'}`}>
                    {paymentStatus.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Supplier & Warehouse Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
            {/* Supplier Information */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">
                Supplier / Vendor (Billed By)
              </span>
              <h3 className="font-hanken font-bold text-sm text-zinc-900 dark:text-zinc-100">
                {resolvedSupplier.name}
              </h3>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-300">
                {resolvedSupplier.address || 'Address not specified'}
              </p>
              <div className="text-[10px] text-zinc-500 space-y-0.5 font-mono pt-1">
                <div><strong>Phone:</strong> {resolvedSupplier.phone || 'N/A'}</div>
                {resolvedSupplier.email && <div><strong>Email:</strong> {resolvedSupplier.email}</div>}
                {resolvedSupplier.gstin && (
                  <div className="text-emerald-600 dark:text-emerald-400 font-bold">
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
                <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{warehouseName || resolvedWarehouse?.name || 'Central Warehouse'}</span>
              </h4>
              <p className="text-[11px] text-zinc-500">
                Location: {resolvedWarehouse?.location || 'Main Depot'} • {resolvedWarehouse?.address || 'Warehouse Premises'}
              </p>
              <div className="text-[10px] text-zinc-500 space-y-0.5 font-mono pt-1">
                <div><strong>Supervisor:</strong> {resolvedWarehouse?.managerName || 'Stores Incharge'}</div>
                <div><strong>Payment Mode:</strong> {paymentMode}</div>
                <div><strong>Batch Lot Ref:</strong> {resolvedRawItem?.batchId || resolvedPurchase?.id || 'LOT-2026'}</div>
              </div>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-500 uppercase">
                  <th className="p-3 w-10 text-center">#</th>
                  <th className="p-3">Fabric Description &amp; Specifications</th>
                  <th className="p-3 text-center">Width</th>
                  <th className="p-3 text-center">HSN Code</th>
                  <th className="p-3 text-right">Meters</th>
                  <th className="p-3 text-right">Rate / Meter</th>
                  <th className="p-3 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {lineItems.map((item, idx) => {
                  const lineTotal = item.subtotal || item.amount || ((item.meters || 0) * (item.rate || 0));
                  return (
                    <tr key={item.id || idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50">
                      <td className="p-3 text-center font-bold text-zinc-400">{idx + 1}</td>
                      <td className="p-3">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 block">
                          {item.fabricName}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          Supplier Mill: {resolvedSupplier.name}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono text-zinc-600 dark:text-zinc-400">
                        {item.width || resolvedRawItem?.width || '58"'}
                      </td>
                      <td className="p-3 text-center font-mono text-zinc-500">52081990</td>
                      <td className="p-3 text-right font-bold text-zinc-900 dark:text-zinc-100">
                        {(item.meters || 0).toLocaleString()} m
                      </td>
                      <td className="p-3 text-right font-mono">
                        ₹{(Number(item.rate) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-right font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                        ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Calculations, Tax Summary & Words */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
            {/* Left Box: Amount in Words */}
            <div className="space-y-4">
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                  Bill Value in Words:
                </span>
                <p className="font-bold text-xs text-zinc-800 dark:text-zinc-200 italic font-sans leading-relaxed">
                  {amountInWords}
                </p>
              </div>

              {resolvedPurchase?.remarks && (
                <div className="text-[11px] text-zinc-500">
                  <strong>Remarks / Notes:</strong> {resolvedPurchase.remarks}
                </div>
              )}
            </div>

            {/* Right Box: Tax Breakdown & Grand Total */}
            <div className="bg-zinc-50 dark:bg-zinc-950 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2 font-mono text-xs">
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Taxable Subtotal:</span>
                <span>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-zinc-500 text-[11px]">
                <span>CGST ({gstDetails.cgstRate}%):</span>
                <span>₹{gstDetails.cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-zinc-500 text-[11px]">
                <span>SGST ({gstDetails.sgstRate}%):</span>
                <span>₹{gstDetails.sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="border-t border-zinc-200 dark:border-zinc-800 pt-2 flex justify-between font-black text-sm text-zinc-900 dark:text-zinc-100">
                <span>Total Invoice Value:</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Signatures & Verification Block */}
          <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-end text-center">
            <div className="space-y-12">
              <div className="w-44 border-b border-dashed border-zinc-400 dark:border-zinc-600"></div>
              <p className="text-[10px] text-zinc-500 font-bold uppercase">
                Received in Good Condition By (Stores Incharge)
              </p>
            </div>
            <div className="space-y-12">
              <div className="w-44 border-b border-dashed border-zinc-400 dark:border-zinc-600"></div>
              <p className="text-[10px] text-zinc-500 font-bold uppercase">
                Authorized Supplier / Mill Signatory
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
