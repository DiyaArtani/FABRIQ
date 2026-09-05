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
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

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

  // Direct High-Fidelity Printable Invoice Generator
  const handlePrintInvoice = () => {
    setIsPrinting(true);

    const printWindow = window.open('', '_blank', 'width=850,height=1100');
    if (!printWindow) {
      alert('Pop-up blocked. Please allow pop-ups to generate and print invoice.');
      setIsPrinting(false);
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Invoice - ${purchase.billNumber}</title>
        <style>
          @page {
            size: A4;
            margin: 15mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #18181b;
            background: #fff;
            padding: 24px;
            font-size: 12px;
            line-height: 1.5;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #10b981;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          .brand {
            font-size: 22px;
            font-weight: 900;
            color: #047857;
            letter-spacing: 1px;
            text-transform: uppercase;
          }
          .brand-sub {
            font-size: 10px;
            color: #71717a;
            font-family: monospace;
          }
          .invoice-tag {
            text-align: right;
          }
          .invoice-title {
            font-size: 18px;
            font-weight: 800;
            color: #18181b;
          }
          .invoice-meta {
            font-size: 11px;
            color: #52525b;
            font-family: monospace;
          }
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
          }
          .card {
            background: #f4f4f5;
            border: 1px solid #e4e4e7;
            border-radius: 8px;
            padding: 14px;
          }
          .card-title {
            font-size: 10px;
            font-weight: 800;
            color: #71717a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
            border-bottom: 1px solid #e4e4e7;
            padding-bottom: 4px;
          }
          .data-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
            font-size: 11px;
          }
          .data-label {
            color: #71717a;
          }
          .data-value {
            font-weight: 600;
            color: #18181b;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th {
            background: #f4f4f5;
            color: #3f3f46;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            text-align: left;
            padding: 8px 12px;
            border-top: 1px solid #e4e4e7;
            border-bottom: 1px solid #e4e4e7;
          }
          td {
            padding: 10px 12px;
            border-bottom: 1px solid #f4f4f5;
            font-size: 11px;
          }
          .text-right {
            text-align: right;
          }
          .total-box {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 24px;
          }
          .total-table {
            width: 280px;
          }
          .total-table .row {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            font-size: 11px;
          }
          .total-table .grand-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-top: 2px solid #18181b;
            font-size: 14px;
            font-weight: 800;
            color: #047857;
          }
          .footer {
            border-top: 1px dashed #d4d4d8;
            padding-top: 16px;
            text-align: center;
            font-size: 10px;
            color: #a1a1aa;
            font-family: monospace;
          }
          .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .badge-paid { background: #d1fae5; color: #065f46; }
          .badge-pending { background: #fef3c7; color: #92400e; }
          .badge-partial { background: #e0e7ff; color: #3730a3; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">FABRIQ LEDGER</div>
            <div class="brand-sub">Commercial Fabric Procurement & Inward Voucher</div>
          </div>
          <div class="invoice-tag">
            <div class="invoice-title">PROCUREMENT INVOICE</div>
            <div class="invoice-meta">BILL NO: <strong>${purchase.billNumber}</strong></div>
            <div class="invoice-meta">DATE: ${purchase.purchaseDate}</div>
          </div>
        </div>

        <div class="grid-2">
          <div class="card">
            <div class="card-title">Supplier / Mill Details</div>
            <div class="data-row">
              <span class="data-label">Vendor Name:</span>
              <span class="data-value">${purchase.supplier.name}</span>
            </div>
            <div class="data-row">
              <span class="data-label">Mobile:</span>
              <span class="data-value">${purchase.supplier.phone || 'N/A'}</span>
            </div>
            <div class="data-row">
              <span class="data-label">GSTIN:</span>
              <span class="data-value">${purchase.supplier.gstin || 'N/A'}</span>
            </div>
            <div class="data-row">
              <span class="data-label">Address:</span>
              <span class="data-value">${purchase.supplier.address && purchase.supplier.address !== 'N/A' ? purchase.supplier.address : 'N/A'}</span>
            </div>
            ${purchase.supplier.bankName ? `
            <div class="data-row" style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #e4e4e7;">
              <span class="data-label">Bank Remittance:</span>
              <span class="data-value">${purchase.supplier.bankName} (A/C: ${purchase.supplier.accountNumber || '-'})</span>
            </div>
            ` : ''}
          </div>

          <div class="card">
            <div class="card-title">Warehouse & Inward Info</div>
            <div class="data-row">
              <span class="data-label">Warehouse Facility:</span>
              <span class="data-value">${purchase.warehouse || purchase.warehouseLocation || 'Default Godown'}</span>
            </div>
            ${warehouseContactPerson ? `
            <div class="data-row">
              <span class="data-label">Facility Contact Person:</span>
              <span class="data-value">${warehouseContactPerson}${warehousePhone ? ' (' + warehousePhone + ')' : ''}</span>
            </div>
            ` : ''}
            <div class="data-row">
              <span class="data-label">Supplier Invoice Ref:</span>
              <span class="data-value">${purchase.invoiceNumber || purchase.billNumber}</span>
            </div>
            <div class="data-row">
              <span class="data-label">Payment Mode:</span>
              <span class="data-value">${purchase.paymentMode || 'Bank Transfer'}</span>
            </div>
            <div class="data-row">
              <span class="data-label">Payment Status:</span>
              <span class="badge badge-${currentPaymentStatus.toLowerCase()}">${currentPaymentStatus}</span>
            </div>
            ${purchase.remarks ? `
            <div class="data-row" style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #e4e4e7;">
              <span class="data-label">Remarks:</span>
              <span class="data-value">${purchase.remarks}</span>
            </div>
            ` : ''}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description / Fabric Item</th>
              <th>Width</th>
              <th class="text-right">Quantity (Meters)</th>
              <th class="text-right">Rate / Meter</th>
              <th class="text-right">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>${purchase.fabricName}</strong></td>
              <td>${purchase.width || '58"'}</td>
              <td class="text-right">${(purchase.meters || 0).toLocaleString()} m</td>
              <td class="text-right">₹${(purchase.rate || 0).toFixed(2)}</td>
              <td class="text-right font-bold">₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>

        <div class="total-box">
          <div class="total-table">
            <div class="row">
              <span class="data-label">Subtotal:</span>
              <span class="data-value">₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="row">
              <span class="data-label">GST (${gstRate}%):</span>
              <span class="data-value">₹${gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="grand-row">
              <span>Grand Total:</span>
              <span>₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        <div class="footer">
          <div>This is a computer generated commercial procurement receipt issued via Fabriq ERP Ledger.</div>
          <div>Printed on ${new Date().toLocaleString('en-IN')} • Document Reference: ${purchase.id}</div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setIsPrinting(false);
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
            Invoice #{purchase.invoiceNumber || purchase.billNumber}
          </span>
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
              <span className="text-[10px] text-gray-400 dark:text-neutral-500 uppercase">Supplier Invoice #</span>
              <p className="font-bold text-gray-900 dark:text-neutral-100">
                {purchase.invoiceNumber || purchase.billNumber}
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
          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-neutral-800 pb-3 text-xs font-mono font-bold uppercase text-gray-500 dark:text-neutral-400">
            <Layers className="w-4 h-4 text-purple-500" />
            <span>Fabric Specifications</span>
          </div>

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
          disabled={isPrinting}
          className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>{isPrinting ? 'Preparing PDF...' : 'Print Invoice (Download PDF)'}</span>
        </motion.button>
      </div>
    </div>
  );
}
