import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Printer, CheckCircle2, Clock, Truck,
  Warehouse as WarehouseIcon, Layers, Phone, MapPin,
  Building2, Landmark, DollarSign, Calendar, FileText,
  ShieldCheck, AlertCircle, Edit3, PackageCheck, Lock, User
} from 'lucide-react';
import { Purchase, PurchaseStatus, PurchasePaymentStatus } from '../types';
import { useFabriqData } from '../../../../context/FabriqDataContext';
import { calculatePurchaseTotals } from '../components/PurchaseUIComponents';
import { PurchaseBillModal } from '../../../../components/PurchaseBillModal';

interface PurchaseDetailsScreenProps {
  purchase: Purchase;
  onBack: () => void;
  onUpdatePaymentStatus?: (newStatus: PurchasePaymentStatus) => void;
}

export default function PurchaseDetailsScreen({
  purchase,
  onBack,
  onUpdatePaymentStatus
}: PurchaseDetailsScreenProps) {
  const { updatePurchase, warehouses } = useFabriqData();
  const [currentPaymentStatus, setCurrentPaymentStatus] = useState<PurchasePaymentStatus>(purchase.paymentStatus);
  const [currentDeliveryStatus, setCurrentDeliveryStatus] = useState<PurchaseStatus>(purchase.status || 'Received');
  const [statusToast, setStatusToast] = useState<string>('');
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState<boolean>(false);

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

  const { subtotal, gstRate, gstAmount, grandTotal } = calculatePurchaseTotals(purchase);

  // Handle Payment Status change by employee (Forward-only state machine: can ONLY upgrade towards Paid, then locked)
  const handleStatusChange = (newStatus: PurchasePaymentStatus) => {
    // If already Paid, status is locked and cannot be edited
    if (currentPaymentStatus === 'Paid') return;

    // From Partial, can only move forward to Paid (cannot regress to Pending)
    if (currentPaymentStatus === 'Partial' && newStatus === 'Pending') return;

    if (newStatus === currentPaymentStatus) return;

    setCurrentPaymentStatus(newStatus);

    const updated = {
      ...purchase,
      paymentStatus: newStatus
    };

    if (onUpdatePaymentStatus) {
      onUpdatePaymentStatus(newStatus);
    } else {
      updatePurchase(updated);
    }

    setStatusToast(`Payment status marked as "${newStatus}"`);
    setTimeout(() => setStatusToast(''), 3000);
  };

  // Handle Delivery Status forward-only progression (Similar to Paid status: can ONLY upgrade from In Transit to Received, then locked)
  const handleDeliveryStatusChange = (newStatus: PurchaseStatus) => {
    // If already Received, it is locked and cannot regress back to In Transit
    if (currentDeliveryStatus === 'Received') return;

    if (newStatus === currentDeliveryStatus) return;

    setCurrentDeliveryStatus(newStatus);
    const updated = {
      ...purchase,
      status: newStatus
    };
    updatePurchase(updated);
    setStatusToast('Delivery upgraded to "Received" (Settled & Locked)! Stock entered into warehouse inventory.');
    setTimeout(() => setStatusToast(''), 3500);
  };

  // Open unified printable Purchase Bill Modal
  const handlePrintInvoice = () => {
    setIsInvoiceModalOpen(true);
  };

  return (
    <div className="space-y-6 select-none max-w-4xl mx-auto pb-16">
      {/* Toast Notification */}
      <AnimatePresence>
        {statusToast && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs font-mono font-bold shadow-lg flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{statusToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Navigation Row */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-neutral-800 pb-4">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-mono font-bold text-gray-500 hover:text-emerald-600 dark:text-neutral-400 dark:hover:text-emerald-400 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Purchase Logs</span>
        </motion.button>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/60">
            {purchase.billNumber || `Bill #${purchase.id}`}
          </span>
          {purchase.invoiceNumber && (
            <span className="text-[11px] font-mono font-bold text-zinc-600 dark:text-zinc-400 bg-gray-100 dark:bg-neutral-800 px-3 py-1 rounded-lg border border-gray-200 dark:border-neutral-700">
              Supplier Inv: {purchase.invoiceNumber}
            </span>
          )}
        </div>
      </div>

      {/* Main Title & Interactive Status Pill Selectors */}
      <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono uppercase text-emerald-600 dark:text-emerald-400 font-bold tracking-widest block mb-1">
              Procurement Inward Log
            </span>
            <h1 className="font-hanken font-extrabold text-xl text-gray-900 dark:text-neutral-100">
              {purchase.fabricName}
            </h1>
            <p className="text-xs font-mono text-gray-500 dark:text-neutral-400 mt-0.5">
              Purchased from <strong className="text-gray-800 dark:text-neutral-200">{purchase.supplier.name}</strong> on {purchase.purchaseDate}
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 sm:justify-end">
            {/* 1. Shipment Delivery Status State Machine (Forward-only like Paid status) */}
            <div className="flex flex-col sm:items-end gap-1">
              <span className="text-[10px] font-mono font-bold text-gray-400 dark:text-neutral-500 uppercase">
                Shipment Status
              </span>
              {currentDeliveryStatus === 'Received' ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-xl font-mono text-xs font-bold shadow-2xs">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Received (Locked)</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-neutral-950 p-1 rounded-xl border border-gray-200 dark:border-neutral-800">
                  <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400 font-bold px-1.5 flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-amber-500" />
                    <span>In Transit</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeliveryStatusChange('Received')}
                    className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                  >
                    <PackageCheck className="w-3 h-3" />
                    <span>Mark Received</span>
                  </button>
                </div>
              )}
            </div>

            {/* 2. Payment Status State Machine (Forward-only) */}
            <div className="flex flex-col sm:items-end gap-1">
              <span className="text-[10px] font-mono font-bold text-gray-400 dark:text-neutral-500 uppercase">
                Payment Status
              </span>
              {currentPaymentStatus === 'Paid' ? (
                <div className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-xl font-mono text-xs font-bold shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Paid (Settled &amp; Locked)</span>
                </div>
              ) : currentPaymentStatus === 'Partial' ? (
                <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-neutral-950 p-1 rounded-xl border border-gray-200 dark:border-neutral-800">
                  <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 px-1.5">
                    Partial
                  </span>
                  <button
                    type="button"
                    onClick={() => handleStatusChange('Paid')}
                    className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Mark Full Paid</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-neutral-950 p-1 rounded-xl border border-gray-200 dark:border-neutral-800">
                  <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-bold px-1.5">
                    Pending
                  </span>
                  <button
                    type="button"
                    onClick={() => handleStatusChange('Partial')}
                    className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span>Partial</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange('Paid')}
                    className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Paid</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Purchase & Facility Info */}
        <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-neutral-800 pb-3 text-xs font-mono font-bold uppercase text-gray-500 dark:text-neutral-400">
            <WarehouseIcon className="w-4 h-4 text-sky-500" />
            <span>Facility &amp; Inward Details</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div className="space-y-0.5">
              <span className="text-[10px] text-gray-400 dark:text-neutral-500 uppercase">Warehouse Facility</span>
              <p className="font-bold text-gray-900 dark:text-neutral-100">
                {purchase.warehouse || purchase.warehouseLocation || 'Default Godown'}
              </p>
              {matchedWarehouse?.location && (
                <p className="text-[10px] text-gray-500 dark:text-neutral-400 flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5 text-zinc-400 shrink-0" />
                  <span>{matchedWarehouse.location}</span>
                </p>
              )}
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] text-gray-400 dark:text-neutral-500 uppercase">Facility Contact Person</span>
              <p className="font-bold text-gray-900 dark:text-neutral-100 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                <span>{warehouseContactPerson || 'Facility Manager'}</span>
              </p>
              {warehousePhone && (
                <p className="text-[10px] text-gray-500 dark:text-neutral-400 flex items-center gap-1">
                  <Phone className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                  <span>{warehousePhone}</span>
                </p>
              )}
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] text-gray-400 dark:text-neutral-500 uppercase">Internal Bill #</span>
              <p className="font-bold font-mono text-gray-900 dark:text-neutral-100">
                {purchase.billNumber || 'N/A'}
              </p>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] text-gray-400 dark:text-neutral-500 uppercase">Supplier Invoice #</span>
              <p className="font-bold font-mono text-gray-900 dark:text-neutral-100">
                {purchase.invoiceNumber || 'N/A'}
              </p>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] text-gray-400 dark:text-neutral-500 uppercase">Purchase Date</span>
              <p className="font-bold text-gray-900 dark:text-neutral-100">
                {purchase.purchaseDate}
              </p>
            </div>

            <div className="space-y-0.5 sm:col-span-2">
              <span className="text-[10px] text-gray-400 dark:text-neutral-500 uppercase">Payment Mode</span>
              <p className="font-bold text-gray-900 dark:text-neutral-100">
                {purchase.paymentMode || 'Bank Transfer'}
              </p>
            </div>
          </div>

          {purchase.remarks && (
            <div className="pt-2 border-t border-gray-100 dark:border-neutral-800 text-xs font-mono text-gray-600 dark:text-neutral-400 italic">
              <span className="font-bold not-italic text-gray-700 dark:text-neutral-300 mr-1">Remarks:</span>
              "{purchase.remarks}"
            </div>
          )}
        </div>

        {/* Card 2: Supplier Master & Remittance */}
        <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-neutral-800 pb-3 text-xs font-mono font-bold uppercase text-gray-500 dark:text-neutral-400">
            <Building2 className="w-4 h-4 text-emerald-500" />
            <span>Supplier &amp; Bank Details</span>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div>
              <span className="text-[10px] text-gray-400 dark:text-neutral-500 uppercase block">Supplier Name</span>
              <p className="font-bold text-gray-900 dark:text-neutral-100 font-hanken text-sm">
                {purchase.supplier.name}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-gray-400 dark:text-neutral-500 uppercase block">Mobile No</span>
                <p className="font-bold text-gray-800 dark:text-neutral-200 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-emerald-500" />
                  <span>{purchase.supplier.phone || 'N/A'}</span>
                </p>
              </div>

              <div>
                <span className="text-[10px] text-gray-400 dark:text-neutral-500 uppercase block">GST No (GSTIN)</span>
                <p className="font-bold text-gray-800 dark:text-neutral-200 uppercase">
                  {purchase.supplier.gstin || 'N/A'}
                </p>
              </div>
            </div>

            {purchase.supplier.address && purchase.supplier.address !== 'N/A' && (
              <div>
                <span className="text-[10px] text-gray-400 dark:text-neutral-500 uppercase block">Physical Address</span>
                <p className="text-gray-700 dark:text-neutral-300 text-[11px] truncate">
                  {purchase.supplier.address}
                </p>
              </div>
            )}

            {/* Bank Remittance Details */}
            {(purchase.supplier.bankName || purchase.supplier.accountNumber) && (
              <div className="pt-2 border-t border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950 p-2.5 rounded-xl space-y-1">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase flex items-center gap-1">
                  <Landmark className="w-3 h-3" />
                  <span>Bank Remittance</span>
                </span>
                <p className="text-[11px] font-bold text-gray-800 dark:text-neutral-200">
                  {purchase.supplier.bankName || 'Bank'} • A/C: {purchase.supplier.accountNumber || '-'}
                </p>
                {purchase.supplier.ifscCode && (
                  <p className="text-[10px] text-gray-500 dark:text-neutral-400 font-mono">
                    IFSC: {purchase.supplier.ifscCode}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Fabric Specifications */}
        <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-neutral-800 pb-3 text-xs font-mono font-bold uppercase text-gray-500 dark:text-neutral-400">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-500" />
              <span>
                Fabric Specifications {purchase.items && purchase.items.length > 1 ? `(${purchase.items.length} Fabrics)` : ''}
              </span>
            </div>
            <span className="text-emerald-600 dark:text-emerald-400">
              Total: {(purchase.meters || 0).toLocaleString()} m
            </span>
          </div>

          {purchase.items && purchase.items.length > 1 ? (
            <div className="space-y-3 font-mono text-xs">
              {purchase.items.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-3 bg-gray-50 dark:bg-neutral-950 rounded-xl border border-gray-100 dark:border-neutral-800 space-y-1.5"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900 dark:text-neutral-100 text-sm">
                      {item.fabricName}
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{((item.amount !== undefined ? item.amount : (item.meters * item.rate)) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-gray-500 dark:text-neutral-400">
                    <span>Width: {item.width || purchase.width || '58"'}</span>
                    <span>{(item.meters || 0).toLocaleString()} m @ ₹{(item.rate || 0).toFixed(2)}/m</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-mono">
              <div className="space-y-0.5 sm:col-span-3">
                <span className="text-[10px] text-gray-400 dark:text-neutral-500 uppercase">Fabric Item</span>
                <p className="font-bold text-gray-900 dark:text-neutral-100 text-sm">
                  {purchase.fabricName}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] text-gray-400 dark:text-neutral-500 uppercase">Width</span>
                <p className="font-bold text-gray-800 dark:text-neutral-200">
                  {purchase.width || '58"'}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] text-gray-400 dark:text-neutral-500 uppercase">Total Quantity</span>
                <p className="font-bold text-emerald-600 dark:text-emerald-400">
                  {(purchase.meters || 0).toLocaleString()} Meters
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] text-gray-400 dark:text-neutral-500 uppercase">Rate / Meter</span>
                <p className="font-bold text-gray-800 dark:text-neutral-200">
                  ₹{(purchase.rate || 0).toFixed(2)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Card 4: Financial & GST Valuation Summary */}
        <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-neutral-800 pb-3 text-xs font-mono font-bold uppercase text-gray-500 dark:text-neutral-400">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            <span>Pricing &amp; GST Valuation</span>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-neutral-400">Subtotal ({purchase.meters}m × ₹{purchase.rate}):</span>
              <span className="font-bold text-gray-900 dark:text-neutral-100">
                ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-neutral-400">GST Valuation ({gstRate}%):</span>
              <span className="font-bold text-gray-900 dark:text-neutral-100">
                ₹{gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="pt-2 border-t-2 border-gray-200 dark:border-neutral-800 flex justify-between items-center text-sm font-bold">
              <span className="text-gray-900 dark:text-neutral-100">Grand Total:</span>
              <span className="text-emerald-600 dark:text-emerald-400 text-base">
                ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Single Final Print Invoice Action Button */}
      <div className="border-t border-gray-200 dark:border-neutral-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs font-mono text-gray-400 dark:text-neutral-500 text-center sm:text-left">
          Purchase PO #{purchase.billNumber} • Recorded in Raw Inward Ledger
        </div>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handlePrintInvoice}
          className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>View &amp; Print Invoice</span>
        </motion.button>
      </div>

      {/* Unified Purchase Invoice Modal */}
      <PurchaseBillModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        purchase={purchase}
      />
    </div>
  );
}
