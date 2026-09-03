import React, { useState } from 'react';
import { Printer, X, FileText, Factory, Scissors, Sparkles, Box, PackageCheck, Copy, CheckCircle2, Truck } from 'lucide-react';
import { ProductionOrder } from '../../types';
import { useFabriqData } from '../../context/FabriqDataContext';

interface ProductionChallanModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ProductionOrder | null;
}

export const ProductionChallanModal: React.FC<ProductionChallanModalProps> = ({
  isOpen,
  onClose,
  order
}) => {
  const { settings, contractors } = useFabriqData();
  const [copyType, setCopyType] = useState<'Original' | 'Duplicate' | 'Triplicate'>('Original');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const summary = `Delivery Challan #${order.challanNumber || `CH-2026-${order.id.slice(-4)}`}\nStyle: ${order.styleName || order.name}\nQuantity: ${(order.plannedQuantity || order.quantity || order.total)} Pcs\nStage: ${order.currentStage || order.stage}\nContractor: ${order.contractorName || order.assignedTo}`;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stagesList = [
    { name: 'Cutting', icon: Scissors },
    { name: 'Stitching', icon: Factory },
    { name: 'Washing', icon: Sparkles },
    { name: 'Packing', icon: Box },
    { name: 'Finished Goods', icon: PackageCheck }
  ];

  const currentStageIndex = stagesList.findIndex(s => s.name === (order.currentStage || order.stage));
  const totalRejected = (order.stageHistory || []).reduce((sum, s) => sum + (s.rejectedQuantity || 0), 0) || (order.defectiveQuantity || 0);
  const finalGoodUnits = order.finalQuantity || order.completedQuantity || order.completed || 0;

  // Find contractor info
  const contractorInfo = contractors.find(c => c.name === (order.contractorName || order.assignedTo)) || {
    name: order.contractorName || order.assignedTo || 'Specialized Job Worker',
    specialty: 'Job Work Processing',
    phone: '+91 98240 54321',
    location: 'Industrial Area Unit 4'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-4xl w-full my-6 max-h-[92vh] flex flex-col rounded-2xl overflow-hidden font-mono text-zinc-900 dark:text-zinc-100">
        
        {/* Top Header Actions (Hidden in Print) */}
        <div className="p-4 bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-hanken font-bold text-base text-zinc-900 dark:text-zinc-100">
                Delivery Challan &amp; Job Work Movement Receipt
              </h2>
              <span className="text-[10px] text-zinc-500 font-mono">
                Challan Ref: {order.challanNumber || `CH-2026-${order.id.slice(-4)}`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Copy Type Selector */}
            <div className="hidden sm:flex bg-zinc-200 dark:bg-zinc-800 p-0.5 rounded-lg text-[10px] font-bold">
              {(['Original', 'Duplicate', 'Triplicate'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setCopyType(type)}
                  className={`px-2 py-1 rounded transition-colors ${
                    copyType === type
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
              title="Copy challan info"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy Info'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Challan</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Challan Document Body */}
        <div className="p-6 sm:p-10 overflow-y-auto space-y-6 text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 print:p-0 print:m-0 print:text-black print:bg-white text-xs">
          
          {/* Header Banner */}
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
                <span><strong>RULE:</strong> Rule 55 Delivery Challan for Job Work</span>
              </div>
            </div>

            <div className="text-right sm:text-right w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-zinc-200">
              <span className="inline-block px-2.5 py-0.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-[10px] font-black uppercase tracking-widest rounded mb-1">
                DELIVERY CHALLAN ({copyType.toUpperCase()})
              </span>
              <div className="font-hanken font-black text-xl text-emerald-600 dark:text-emerald-400 tracking-tight">
                {order.challanNumber || `CH-2026-${order.id.slice(-4)}`}
              </div>
              <div className="text-[11px] text-zinc-500 space-y-0.5 mt-1 font-mono">
                <div><strong>Challan Date:</strong> {order.startDate || new Date().toISOString().substring(0, 10)}</div>
                <div><strong>PO Code:</strong> {order.poCode || order.orderCode}</div>
                <div><strong>Stage:</strong> <span className="font-bold text-emerald-600">{order.currentStage || order.stage}</span></div>
              </div>
            </div>
          </div>

          {/* Consignor (Sender) & Consignee (Processor / Contractor) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">
                Dispatched By (Consignor)
              </span>
              <h3 className="font-hanken font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Main Manufacturing Mill (Godown A)
              </h3>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-300">
                Fabriq Production Division • Surat Textile Cluster
              </p>
              <div className="text-[10px] text-zinc-500 space-y-0.5 font-mono pt-1">
                <div><strong>Authorized Dispatcher:</strong> Factory In-Charge</div>
                <div><strong>Dispatch Mode:</strong> Factory Internal Logistics / Truck</div>
              </div>
            </div>

            <div className="space-y-1 border-t sm:border-t-0 sm:border-l sm:pl-4 border-zinc-200 dark:border-zinc-800 pt-3 sm:pt-0">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">
                Assigned Contractor / Job Worker (Consignee)
              </span>
              <h4 className="font-hanken font-bold text-sm text-zinc-800 dark:text-zinc-200">
                {contractorInfo.name}
              </h4>
              <p className="text-[11px] text-zinc-500">
                Specialty: {contractorInfo.specialty} • Location: {contractorInfo.location}
              </p>
              <div className="text-[10px] text-zinc-500 space-y-0.5 font-mono pt-1">
                <div><strong>Phone:</strong> {contractorInfo.phone}</div>
                <div><strong>Nature of Processing:</strong> Garment Stitching / Washing / Finishing</div>
              </div>
            </div>
          </div>

          {/* Lifecycle Step Indicators */}
          <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block mb-2">
              Production Lifecycle Journey
            </span>
            <div className="grid grid-cols-5 gap-1.5 text-center text-[10px] font-bold">
              {stagesList.map((stg, i) => {
                const isPassed = currentStageIndex >= i;
                const isCurrent = currentStageIndex === i;
                const Icon = stg.icon;
                return (
                  <div
                    key={stg.name}
                    className={`p-2 rounded-lg border flex flex-col items-center gap-1 transition-all ${
                      isCurrent
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : isPassed
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40'
                        : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400 border-zinc-200 dark:border-zinc-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate w-full">{stg.name}</span>
                    {isPassed && !isCurrent && <span className="text-[8px] opacity-80">✓ Done</span>}
                    {isCurrent && <span className="text-[8px] font-black">Active</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Job Specifications & Raw Fabric Allocation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2 text-xs">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                Job Particulars
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-zinc-400 block text-[10px]">STYLE / ITEM:</span>
                  <strong className="text-zinc-900 dark:text-zinc-100">{order.styleName || order.name}</strong>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px]">ORDER CODE:</span>
                  <strong className="text-zinc-900 dark:text-zinc-100">{order.orderCode || order.poCode}</strong>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px]">PLANNED LOT:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {(order.plannedQuantity || order.quantity || order.total)} Pcs
                  </strong>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px]">DUE DATE:</span>
                  <strong className="text-zinc-900 dark:text-zinc-100">{order.dueDate || 'Standard Pipeline'}</strong>
                </div>
              </div>
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2 text-xs">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                Raw Material Allocation
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-zinc-400 block text-[10px]">FABRIC NAME:</span>
                  <strong className="text-zinc-900 dark:text-zinc-100">{order.fabricName || 'Raw Denim'}</strong>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px]">RAW BATCH ID:</span>
                  <strong className="text-zinc-900 dark:text-zinc-100">{order.rawBatchId || 'DF-2026-BATCH'}</strong>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px]">METERS ISSUED:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {order.metersAllocated || order.metersRequired || 'N/A'} Meters
                  </strong>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px]">STORAGE LOCATION:</span>
                  <strong className="text-zinc-900 dark:text-zinc-100">Godown Section A</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Stage Execution History Table */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="font-hanken font-bold text-xs uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Stage Execution History &amp; Quality Audit Trail
              </h4>
              <span className="text-[10px] text-zinc-400 font-mono">Challan Ref: {order.challanNumber}</span>
            </div>

            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-500 uppercase">
                    <th className="p-3">Stage</th>
                    <th className="p-3">Contractor / Unit</th>
                    <th className="p-3 text-right">Qty Sent</th>
                    <th className="p-3 text-right">Qty OK</th>
                    <th className="p-3 text-right">Rejections</th>
                    <th className="p-3">Log Dates</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {order.stageHistory && order.stageHistory.length > 0 ? (
                    order.stageHistory.map((stg, idx) => (
                      <tr key={`${stg.stageName}-${idx}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50">
                        <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100">{stg.stageName}</td>
                        <td className="p-3 text-emerald-600 dark:text-emerald-400">{stg.contractorName || 'Assigned Person'}</td>
                        <td className="p-3 text-right font-mono">{stg.quantitySent || 0}</td>
                        <td className="p-3 text-right font-bold text-zinc-900 dark:text-zinc-100 font-mono">{stg.quantityCompleted || stg.quantityReceived || 0}</td>
                        <td className="p-3 text-right text-rose-600 font-bold font-mono">{stg.rejectedQuantity || stg.wastageQuantity || 0}</td>
                        <td className="p-3 text-[10px] text-zinc-500">
                          {stg.completedDate ? `Done: ${stg.completedDate}` : `Issued: ${stg.assignedDate}`}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              stg.status === 'Completed'
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                                : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                            }`}
                          >
                            {stg.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-zinc-400 text-xs">
                        No stage logs recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary Totals */}
          <div className="grid grid-cols-3 gap-3 p-3.5 bg-zinc-100 dark:bg-zinc-950 rounded-xl text-xs font-mono">
            <div>
              <span className="text-zinc-400 block text-[10px]">TOTAL PLANNED:</span>
              <strong className="text-zinc-900 dark:text-zinc-100 text-sm font-bold">
                {(order.plannedQuantity || order.quantity || order.total).toLocaleString()} Pcs
              </strong>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px]">FINISHED GOODS ACCEPTED:</span>
              <strong className="text-emerald-600 dark:text-emerald-400 text-sm font-bold">
                {finalGoodUnits.toLocaleString()} Pcs
              </strong>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px]">CUMULATIVE REJECTIONS:</span>
              <strong className="text-rose-600 text-sm font-bold">
                {totalRejected.toLocaleString()} Pcs
              </strong>
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-2 gap-8 text-xs font-mono">
            <div className="space-y-12">
              <span className="text-[11px] text-zinc-500 uppercase font-bold block">
                Dispatched By (Factory Production Manager)
              </span>
              <div className="border-t border-zinc-400 pt-1 text-[10px] text-zinc-500">
                Authorized Signature &amp; Stamp
              </div>
            </div>

            <div className="space-y-12 text-right">
              <span className="text-[11px] text-zinc-500 uppercase font-bold block">
                Received &amp; Acknowledged By (Processor / Contractor)
              </span>
              <div className="border-t border-zinc-400 pt-1 text-[10px] text-zinc-500">
                Contractor Signature &amp; Date
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
