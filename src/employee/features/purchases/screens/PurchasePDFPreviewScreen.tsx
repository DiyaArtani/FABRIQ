import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Printer, Download, Shield, Sparkles, 
  CheckCircle2, FileText, Stamp
} from 'lucide-react';
import { Purchase } from '../types';
import { calculatePurchaseTotals } from '../components/PurchaseUIComponents';

interface PurchasePDFPreviewScreenProps {
  purchase: Purchase;
  onBack: () => void;
}

export default function PurchasePDFPreviewScreen({
  purchase,
  onBack
}: PurchasePDFPreviewScreenProps) {
  const { subtotal, grandTotal } = calculatePurchaseTotals(purchase);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const triggerToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg('');
    }, 3000);
  };

  const handlePrint = () => {
    setIsPrinting(true);
    triggerToast('Generating print rasterizer... PDF document dispatched to system spooler.');
    setTimeout(() => {
      setIsPrinting(false);
    }, 1500);
  };

  const handleDownload = () => {
    setIsDownloading(true);
    triggerToast('Compiling PDF buffer... Downloaded file fabriq_procure_report.pdf.');
    setTimeout(() => {
      setIsDownloading(false);
    }, 1500);
  };

  return (
    <div className="space-y-6 select-none pb-12">
      {/* Top action header bar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between border-b border-gray-100 dark:border-zinc-800/40 pb-4">
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
            className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer border shadow-sm transition-all ${
              isPrinting
                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                : 'bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-200 border-gray-200 dark:border-zinc-800 hover:bg-gray-50'
            }`}
          >
            <Printer className={`w-4 h-4 ${isPrinting ? 'animate-bounce' : ''}`} />
            {isPrinting ? 'Printing...' : 'Print / Save PDF'}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleDownload}
            className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer border shadow-sm transition-all ${
              isDownloading
                ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-400/25'
            }`}
          >
            <Download className={`w-4 h-4 ${isDownloading ? 'animate-bounce' : ''}`} />
            {isDownloading ? 'Downloading...' : 'Export PDF'}
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
            className="bg-emerald-500 text-white p-3 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 z-50 justify-center"
          >
            <CheckCircle2 className="w-4 h-4" />
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Informative alert strip */}
      <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900 p-3.5 rounded-2xl border border-gray-200/40 dark:border-zinc-800/10 text-xs text-gray-500 dark:text-zinc-400 font-medium">
        <Shield className="w-4 h-4 text-emerald-500 flex-shrink-0" />
        <span>
          <strong>PDF Spooler Sandbox:</strong> Below is a high-fidelity rendering of the commercial ledger. Pressing Print or Export simulates compiling and dispatching documents safely.
        </span>
      </div>

      {/* THE SHEET: Styled to simulate an A4 paper in a dark visual workspace */}
      <div className="bg-zinc-200 dark:bg-zinc-900 p-4 sm:p-8 rounded-3xl border border-gray-200 dark:border-zinc-850 flex justify-center shadow-inner">
        <div className="bg-white text-zinc-900 w-full max-w-[800px] min-h-[1050px] p-6 sm:p-12 shadow-2xl rounded-lg font-sans border border-gray-300 flex flex-col justify-between select-text selection:bg-emerald-100">
          
          {/* TOP INNER SHEET HEADER */}
          <div className="space-y-6">
            <div className="flex justify-between items-start border-b border-zinc-200 pb-6">
              <div>
                <span className="text-emerald-500 font-mono font-black text-xl tracking-wider flex items-center gap-1.5 uppercase">
                  <Sparkles className="w-5 h-5" />
                  Fabriq OS
                </span>
                <p className="text-[10px] text-zinc-400 mt-1 uppercase tracking-widest font-bold">Raw Denim Production System</p>
                <div className="text-[11px] text-zinc-500 mt-3.5 space-y-0.5 leading-relaxed font-semibold">
                  <p>Fabriq OS Apparel Manufacturing Ltd.</p>
                  <p>Plot No. 45-C, GIDC Industrial Hub,</p>
                  <p>Sarkhej Road, Ahmedabad, India</p>
                  <p>GSTIN: 24AAACF1042A1Z0</p>
                </div>
              </div>

              <div className="text-right">
                <h1 className="text-lg font-black text-zinc-950 uppercase tracking-tight">Purchase Invoice</h1>
                <p className="text-xs font-mono font-bold text-zinc-400 mt-1 uppercase tracking-widest bg-zinc-50 border border-zinc-100 px-2 py-0.5 inline-block rounded">
                  {purchase.billNumber}
                </p>

                <div className="text-[11px] text-zinc-500 mt-4 space-y-1.5 font-semibold">
                  <p><strong>Invoice Reference:</strong> {purchase.invoiceNumber}</p>
                  <p><strong>Purchase Date:</strong> {purchase.purchaseDate}</p>
                  <p><strong>Payment Status:</strong> <span className="text-emerald-600 font-bold">{purchase.paymentStatus}</span></p>
                  <p><strong>Receipt Status:</strong> <span className="text-indigo-600 font-bold">{purchase.status}</span></p>
                </div>
              </div>
            </div>

            {/* BILLING INFO ROW (FROM & TO) */}
            <div className="grid grid-cols-2 gap-8 border-b border-zinc-150 pb-6 text-xs">
              <div className="space-y-2">
                <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-black">Supplier (Bill From)</span>
                <div>
                  <h3 className="font-extrabold text-sm text-zinc-950">{purchase.supplier.name}</h3>
                  <div className="text-zinc-500 font-medium space-y-1 mt-1.5">
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

              <div className="space-y-2">
                <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-black">Delivery & Storage (Bill To)</span>
                <div>
                  <h3 className="font-extrabold text-sm text-zinc-950">Fabriq Apparel Mills</h3>
                  <div className="text-zinc-500 font-medium space-y-1 mt-1.5">
                    <p><strong>Warehouse Location:</strong> {purchase.warehouse || purchase.warehouseLocation || 'Godown A - Main Mill'}</p>
                    <p><strong>Payment Status:</strong> <span className="text-emerald-600 font-bold">{purchase.paymentStatus}</span></p>
                    <p><strong>Payment Mode:</strong> {purchase.paymentMode || 'Bank Transfer'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* LEDGER TABLE */}
            <div className="space-y-3.5">
              <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-black block">Itemized Fabric Inward Ledger</span>
              
              <div className="border border-zinc-200 rounded-lg overflow-hidden">
                <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-2.5 flex justify-between text-[10px] font-black uppercase text-zinc-500 tracking-wider">
                  <span className="w-2/5">Fabric Description</span>
                  <span className="w-1/5 text-center">Width</span>
                  <span className="w-1/5 text-right">Meters</span>
                  <span className="w-1/5 text-right">Rate / Meter</span>
                  <span className="w-1/5 text-right">Total Cost (₹)</span>
                </div>

                <div className="divide-y divide-zinc-150">
                  <div className="px-4 py-3 flex justify-between items-center text-xs text-zinc-800">
                    <div className="w-2/5 flex flex-col gap-0.5">
                      <span className="font-bold text-zinc-900">{purchase.fabricName}</span>
                      <span className="text-[10px] text-zinc-400">Stored at: {purchase.warehouse || purchase.warehouseLocation}</span>
                    </div>
                    <span className="w-1/5 text-center font-semibold text-zinc-600">{purchase.width || '58"'}</span>
                    <span className="w-1/5 text-right font-semibold font-mono">{purchase.meters.toLocaleString()} m</span>
                    <span className="w-1/5 text-right font-semibold font-mono">₹{purchase.rate.toFixed(2)}</span>
                    <span className="w-1/5 text-right font-extrabold font-mono text-zinc-950">
                      ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* SUB TOTALS BLOCK */}
            <div className="flex justify-between items-start pt-4">
              <div className="w-1/2 pr-6 text-[10px] text-zinc-400 leading-relaxed italic space-y-1">
                <p className="font-bold uppercase tracking-wider not-italic mb-1">Commercial Quality Seal:</p>
                <p>"Fabric listed above received in verified condition. Underwent shade-lot and meterage parameter screening. Inwarded to raw warehouse storage location."</p>
              </div>

              <div className="w-1/3 text-xs space-y-2 border-t border-zinc-100 pt-2 font-semibold text-zinc-600">
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
          <div className="flex justify-between items-end border-t border-zinc-200 pt-10 text-[10px] font-bold text-zinc-400 mt-12">
            <div className="text-center space-y-4">
              <div className="w-32 h-1 bg-zinc-200 mx-auto" />
              <span>Prepared &amp; Verified By</span>
            </div>

            <div className="w-20 h-20 rounded-full border-4 border-emerald-500/10 flex items-center justify-center text-emerald-500/20 rotate-12 relative animate-pulse select-none pointer-events-none">
              <Stamp className="w-8 h-8 opacity-25" />
              <span className="text-[7px] absolute font-black uppercase tracking-wider scale-90">FABRIQ OS SEAL</span>
            </div>

            <div className="text-center space-y-4">
              <div className="w-32 h-1 bg-zinc-200 mx-auto" />
              <span>Supplier Authority Signoff</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
