import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Printer, Download, Shield, Sparkles,
  CheckCircle2, Stamp, ArrowRightLeft
} from 'lucide-react';
import { Purchase } from '../types';
import { calculatePurchaseTotals } from '../components/PurchaseUIComponents';
import { useFabriqData } from '../../../../context/FabriqDataContext';

interface PurchasePDFPreviewScreenProps {
  purchase: Purchase;
  onBack: () => void;
}

export default function PurchasePDFPreviewScreen({
  purchase,
  onBack
}: PurchasePDFPreviewScreenProps) {
  const { warehouses } = useFabriqData();
  const { subtotal, grandTotal } = calculatePurchaseTotals(purchase);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const targetWarehouseName = (purchase.warehouse || purchase.warehouseLocation || '').trim().toLowerCase();
  const matchedWarehouse = (warehouses || []).find(
    (w) =>
      w.name.trim().toLowerCase() === targetWarehouseName ||
      w.code.trim().toLowerCase() === targetWarehouseName ||
      (targetWarehouseName && w.name.trim().toLowerCase().includes(targetWarehouseName)) ||
      (targetWarehouseName && targetWarehouseName.includes(w.name.trim().toLowerCase()))
  );
  const warehouseContactPerson = matchedWarehouse?.managerName || '';
  const warehousePhone = matchedWarehouse?.phone || '';

  const triggerToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg('');
    }, 3000);
  };

  const handlePrint = () => {
    setIsPrinting(true);
    triggerToast('Opening print dialog... Use Save as PDF or dispatch to printer.');
    setTimeout(() => {
      setIsPrinting(false);
      window.print();
    }, 150);
  };

  const handleDownload = () => {
    setIsDownloading(true);
    triggerToast('Opening PDF print preview. Select "Save as PDF" to download.');
    setTimeout(() => {
      setIsDownloading(false);
      window.print();
    }, 150);
  };

  return (
    <div className="space-y-6 select-none pb-12">
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
          #purchase-pdf-sheet, #purchase-pdf-sheet * {
            visibility: visible !important;
          }
          #purchase-pdf-sheet {
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
          #purchase-pdf-sheet * {
            color: #09090b !important;
            text-shadow: none !important;
          }
          .print\\:hidden, nav, header, aside, button {
            display: none !important;
            visibility: hidden !important;
          }
          #purchase-pdf-sheet tr,
          #purchase-pdf-sheet .avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Top action header bar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between border-b border-gray-100 dark:border-zinc-800/40 pb-4 print:hidden">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-extrabold text-gray-500 hover:text-emerald-500 dark:text-zinc-400 dark:hover:text-emerald-400 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Details
        </motion.button>

        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handlePrint}
            className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer border shadow-sm transition-all ${isPrinting
                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                : 'bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-200 border-gray-200 dark:border-zinc-800 hover:bg-gray-50'
              }`}
          >
            <Printer className={`w-4 h-4 ${isPrinting ? 'animate-bounce' : ''}`} />
            {isPrinting ? 'Preparing...' : 'Print Invoice'}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleDownload}
            className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer border shadow-sm transition-all ${isDownloading
                ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-400/25'
              }`}
          >
            <Download className={`w-4 h-4 ${isDownloading ? 'animate-bounce' : ''}`} />
            {isDownloading ? 'Opening...' : 'Export PDF'}
          </motion.button>
        </div>
      </div>

      {/* SUCCESS TOAST MESSAGE */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-emerald-500 text-white p-3 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 z-50 justify-center print:hidden"
          >
            <CheckCircle2 className="w-4 h-4" />
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Informative alert strip */}
      <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900 p-3 sm:p-3.5 rounded-2xl border border-gray-200/40 dark:border-zinc-800/10 text-xs text-gray-500 dark:text-zinc-400 font-medium print:hidden">
        <Shield className="w-4 h-4 text-emerald-500 flex-shrink-0" />
        <span>
          <strong>Purchase Invoice Sheet:</strong> High-fidelity procurement commercial bill. Tap <strong>Print</strong> to send directly to your printer or save as PDF.
        </span>
      </div>

      {/* THE SHEET: Styled to simulate an A4 paper in a dark visual workspace */}
      <div className="bg-zinc-200 dark:bg-zinc-900 p-0 sm:p-6 md:p-8 rounded-none sm:rounded-3xl border-0 sm:border border-gray-200 dark:border-zinc-850 flex justify-center shadow-none sm:shadow-inner">
        <div id="purchase-pdf-sheet" className="bg-white text-zinc-900 w-full max-w-[800px] min-h-[1000px] p-4 sm:p-8 md:p-12 shadow-none sm:shadow-2xl rounded-none sm:rounded-lg font-sans border-0 sm:border border-gray-300 flex flex-col justify-between select-text selection:bg-emerald-100">

          {/* TOP INNER SHEET HEADER */}
          <div className="space-y-5 sm:space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start border-b border-zinc-200 pb-4 sm:pb-6 gap-3 sm:gap-4 avoid-break">
              <div>
                <span className="text-emerald-500 font-mono font-black text-lg sm:text-xl tracking-wider flex items-center gap-1.5 uppercase">
                  <Sparkles className="w-5 h-5" />
                  Fabriq OS
                </span>
                <p className="text-[10px] text-zinc-400 mt-1 uppercase tracking-widest font-bold">Raw Denim Production System</p>
                <div className="text-[11px] text-zinc-500 mt-2.5 sm:mt-3.5 space-y-0.5 leading-relaxed font-semibold">
                  <p>Fabriq OS Apparel Manufacturing Ltd.</p>
                  <p>Plot No. 45-C, GIDC Industrial Hub,</p>
                  <p>Sarkhej Road, Ahmedabad, India</p>
                  <p>GSTIN: 24AAACF1042A1Z0</p>
                </div>
              </div>

              <div className="text-left sm:text-right w-full sm:w-auto border-t sm:border-t-0 pt-2.5 sm:pt-0 border-zinc-100">
                <h1 className="text-base sm:text-lg font-black text-zinc-950 uppercase tracking-tight">Purchase Invoice</h1>
                <p className="text-xs font-mono font-bold text-zinc-600 mt-1 uppercase tracking-widest bg-zinc-50 border border-zinc-200 px-2 py-0.5 inline-block rounded">
                  {purchase.billNumber}
                </p>

                <div className="text-[11px] text-zinc-500 mt-3 sm:mt-4 space-y-1 font-semibold">
                  <p><strong>Invoice Reference:</strong> {purchase.invoiceNumber}</p>
                  <p><strong>Purchase Date:</strong> {purchase.purchaseDate}</p>
                  <p><strong>Payment Status:</strong> <span className="text-emerald-600 font-bold">{purchase.paymentStatus}</span></p>
                  <p><strong>Receipt Status:</strong> <span className="text-indigo-600 font-bold">{purchase.status}</span></p>
                </div>
              </div>
            </div>

            {/* BILLING INFO ROW (FROM & TO) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 border-b border-zinc-150 pb-5 sm:pb-6 text-xs avoid-break">
              <div className="space-y-1.5">
                <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-black">Supplier (Bill From)</span>
                <div>
                  <h3 className="font-extrabold text-sm text-zinc-950">{purchase.supplier.name}</h3>
                  <div className="text-zinc-500 font-medium space-y-0.5 mt-1">
                    <p><strong>Mobile:</strong> {purchase.supplier.phone}</p>
                    {purchase.supplier.address && purchase.supplier.address !== 'N/A' && (
                      <p><strong>Address:</strong> {purchase.supplier.address}</p>
                    )}
                    {purchase.supplier.gstin && <p><strong>GST No:</strong> {purchase.supplier.gstin}</p>}
                    {(purchase.supplier.accountNumber || purchase.supplier.bankName || purchase.supplier.ifscCode) && (
                      <div className="mt-1 pt-1 border-t border-zinc-100 text-[10px] space-y-0.5">
                        <span className="font-bold text-zinc-700 block">Bank Remittance:</span>
                        {purchase.supplier.bankName && <p>Bank: {purchase.supplier.bankName}</p>}
                        {purchase.supplier.accountNumber && <p>A/C: {purchase.supplier.accountNumber}</p>}
                        {purchase.supplier.ifscCode && <p>IFSC: {purchase.supplier.ifscCode}</p>}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 border-t sm:border-t-0 pt-3 sm:pt-0 border-zinc-100">
                <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-black">Delivery &amp; Storage (Bill To)</span>
                <div>
                  <h3 className="font-extrabold text-sm text-zinc-950">Fabriq Apparel Mills</h3>
                  <div className="text-zinc-500 font-medium space-y-0.5 mt-1">
                    <p><strong>Warehouse:</strong> {purchase.warehouse || purchase.warehouseLocation || 'Godown A - Main Mill'}</p>
                    {warehouseContactPerson && (
                      <p><strong>Contact:</strong> {warehouseContactPerson} {warehousePhone ? `(${warehousePhone})` : ''}</p>
                    )}
                    <p><strong>Payment Status:</strong> <span className="text-emerald-600 font-bold">{purchase.paymentStatus}</span></p>
                    <p><strong>Payment Mode:</strong> {purchase.paymentMode || 'Bank Transfer'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* LEDGER TABLE CONTAINER (Responsive on mobile) */}
            <div className="space-y-2 avoid-break">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-black block">Itemized Fabric Inward Ledger</span>
                <span className="flex items-center gap-1 text-[9px] text-zinc-400 sm:hidden print:hidden">
                  <ArrowRightLeft className="w-2.5 h-2.5" /> Scroll table
                </span>
              </div>

              <div className="border border-zinc-200 rounded-lg overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-black uppercase text-zinc-500 tracking-wider">
                      <th className="p-2.5 w-2/5">Fabric Description</th>
                      <th className="p-2.5 w-1/5 text-center">Width</th>
                      <th className="p-2.5 w-1/5 text-right">Meters</th>
                      <th className="p-2.5 w-1/5 text-right">Rate / m</th>
                      <th className="p-2.5 w-1/5 text-right">Total Cost (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-150">
                    {(purchase.items && purchase.items.length > 0 ? purchase.items : [{
                      fabricName: purchase.fabricName,
                      width: purchase.width || '58"',
                      meters: purchase.meters,
                      rate: purchase.rate,
                      amount: subtotal
                    }]).map((item, idx) => (
                      <tr key={item.id || idx} className="text-xs text-zinc-800">
                        <td className="p-2.5 w-2/5">
                          <span className="font-bold text-zinc-900 block">{item.fabricName}</span>
                          <span className="text-[10px] text-zinc-400">Warehouse: {purchase.warehouse || purchase.warehouseLocation}</span>
                        </td>
                        <td className="p-2.5 w-1/5 text-center font-semibold text-zinc-600">{item.width || purchase.width || '58"'}</td>
                        <td className="p-2.5 w-1/5 text-right font-semibold font-mono">{(item.meters || 0).toLocaleString()} m</td>
                        <td className="p-2.5 w-1/5 text-right font-semibold font-mono">₹{(item.rate || 0).toFixed(2)}</td>
                        <td className="p-2.5 w-1/5 text-right font-extrabold font-mono text-zinc-950">
                          ₹{((item.amount !== undefined ? item.amount : (item.meters * item.rate)) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SUB TOTALS BLOCK */}
            <div className="flex flex-col sm:flex-row justify-between items-start pt-4 gap-4 avoid-break">
              <div className="w-full sm:w-1/2 pr-0 sm:pr-6 text-[10px] text-zinc-400 leading-relaxed italic space-y-1">
                <p className="font-bold uppercase tracking-wider not-italic mb-0.5">Commercial Quality Seal:</p>
                <p>"Fabric listed above received in verified condition. Underwent shade-lot and meterage parameter screening. Inwarded to raw warehouse storage location."</p>
              </div>

              <div className="w-full sm:w-1/2 text-xs space-y-2 border-t border-zinc-100 pt-2 font-semibold text-zinc-600">
                <div className="flex justify-between">
                  <span>Fabric Cost (Subtotal):</span>
                  <span className="font-mono text-zinc-800">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-amber-600">
                  <span>GST ({purchase.gstRate !== undefined ? purchase.gstRate : 5}%):</span>
                  <span className="font-mono">+ ₹{((subtotal * (purchase.gstRate !== undefined ? purchase.gstRate : 5)) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="border-t-2 border-zinc-950 pt-2.5 flex justify-between font-black text-sm text-zinc-950">
                  <span>Grand Total:</span>
                  <span className="font-mono font-black text-base text-emerald-700">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* SIGNATURE FIELDS AT BOTTOM OF PAPER */}
          <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end border-t border-zinc-200 pt-8 sm:pt-10 text-[10px] font-bold text-zinc-400 mt-8 sm:mt-12 gap-6 sm:gap-0 avoid-break">
            <div className="text-center space-y-3 w-full sm:w-auto">
              <div className="w-36 sm:w-32 h-0.5 bg-zinc-300 mx-auto" />
              <span>Prepared &amp; Verified By</span>
            </div>

            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-emerald-500/10 flex items-center justify-center text-emerald-500/20 rotate-12 relative select-none pointer-events-none my-2 sm:my-0">
              <Stamp className="w-6 h-6 sm:w-8 sm:h-8 opacity-25" />
              <span className="text-[7px] absolute font-black uppercase tracking-wider scale-90">FABRIQ OS</span>
            </div>

            <div className="text-center space-y-3 w-full sm:w-auto">
              <div className="w-36 sm:w-32 h-0.5 bg-zinc-300 mx-auto" />
              <span>Supplier Signoff</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
