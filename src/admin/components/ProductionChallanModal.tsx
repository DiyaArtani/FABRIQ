import React, { useState, useEffect, useRef } from 'react';
import { Printer, X, FileText, Factory, Scissors, Sparkles, Box, PackageCheck, Building2, Layers, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductionOrder, ProductionStage, StageHistoryEntry } from '../../types';
import { useFabriqData } from '../../context/FabriqDataContext';

interface ProductionChallanModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ProductionOrder | null;
}

const stageCodes: Record<string, string> = {
  'Cutting': 'CUT',
  'Stitching': 'STT',
  'Washing': 'WSH',
  'Packaging': 'PKG',
  'Packing': 'PKG',
  'Finished Goods': 'FG'
};

export const ProductionChallanModal: React.FC<ProductionChallanModalProps> = ({
  isOpen,
  onClose,
  order
}) => {
  const { settings, contractors, rawInventory, warehouses } = useFabriqData();

  if (!isOpen || !order) return null;

  // 1. Resolve Raw Inventory Item where fabric is stored
  const rawItem = (rawInventory || []).find(r => 
    (order.rawInventoryId && r.id === order.rawInventoryId) ||
    (order.rawBatchId && (r.batchId === order.rawBatchId || r.invoiceNumber === order.rawBatchId || r.billNumber === order.rawBatchId)) ||
    (order.fabricName && r.fabricName.toLowerCase() === (order.fabricName || '').toLowerCase())
  );

  // 2. Resolve true storage location of the fabric
  const fabricStorageLocation = (rawItem?.warehouse || order.warehouse || order.godown || 'Central Warehouse').trim();

  // 3. Resolve warehouse / godown info
  const godownInfo = (warehouses || []).find(w => 
    w.name.toLowerCase() === fabricStorageLocation.toLowerCase() ||
    fabricStorageLocation.toLowerCase().includes(w.name.toLowerCase()) ||
    w.name.toLowerCase().includes(fabricStorageLocation.toLowerCase())
  ) || {
    name: fabricStorageLocation,
    address: 'Warehouse Premises',
    location: fabricStorageLocation,
    managerName: 'Godown In-Charge',
    contactNumber: settings.contactPhone || '+91 98250 12345'
  };

  const baseChallan = (order.challanNumber || `CH-2026-${order.id.slice(-4)}`).replace(/-(CUT|STT|WSH|PKG|FG|STG\d+)$/i, '');

  // 4. Build all stage challans (both current and saved past stages)
  const availableStageChallans = (order.stageHistory && order.stageHistory.length > 0)
    ? order.stageHistory.map((stg: StageHistoryEntry, idx: number) => {
        const stageName = stg.stageName || `Stage ${idx + 1}`;
        const code = stageCodes[stageName] || `STG${idx + 1}`;
        const chNo = stg.challanNumber || `${baseChallan}-${code}`;
        return {
          ...stg,
          index: idx,
          stageName,
          challanNumber: chNo,
          contractorName: stg.contractorName || order.contractorName || order.assignedTo || 'Assigned Job Worker',
          quantitySent: stg.quantitySent || (idx === 0 ? (order.plannedQuantity || order.quantity || order.total || 0) : (order.completedQuantity || order.quantity || 0)),
          assignedDate: stg.assignedDate || order.startDate || new Date().toISOString().substring(0, 10),
          status: stg.status || (idx === (order.stageHistory?.length || 1) - 1 ? 'In Progress' : 'Completed')
        };
      })
    : [
        {
          index: 0,
          stageName: order.currentStage || order.stage || 'Cutting',
          challanNumber: order.challanNumber || `${baseChallan}-CUT`,
          contractorName: order.contractorName || order.assignedTo || 'Assigned Job Worker',
          quantitySent: order.plannedQuantity || order.quantity || order.total || 0,
          assignedDate: order.startDate || new Date().toISOString().substring(0, 10),
          status: order.status || 'In Progress'
        }
      ];

  // Default to the latest active stage
  const [selectedStageIndex, setSelectedStageIndex] = useState<number>(availableStageChallans.length - 1);

  const historyScrollRef = useRef<HTMLDivElement>(null);

  const scrollHistory = (direction: 'left' | 'right') => {
    if (historyScrollRef.current) {
      const scrollAmount = 260;
      historyScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Sync index when order updates
  useEffect(() => {
    setSelectedStageIndex(availableStageChallans.length - 1);
  }, [order?.id, order?.currentStage, order?.stageHistory?.length]);

  // Keep selected stage in view
  useEffect(() => {
    if (historyScrollRef.current) {
      const activeEl = historyScrollRef.current.querySelector('[data-selected="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
      }
    }
  }, [selectedStageIndex]);

  const activeChallan = availableStageChallans[selectedStageIndex] || availableStageChallans[availableStageChallans.length - 1];

  const handlePrint = () => {
    window.print();
  };

  const stagesList = [
    { name: 'Cutting', label: '1. Cutting', icon: Scissors },
    { name: 'Stitching', label: '2. Stitching', icon: Factory },
    { name: 'Washing', label: '3. Washing', icon: Sparkles },
    { name: 'Packaging', label: '4. Packaging', icon: Box },
    { name: 'Finished Goods', label: '5. Finished Goods', icon: PackageCheck }
  ];

  const currentStageName = activeChallan.stageName === 'Packing' ? 'Packaging' : activeChallan.stageName;
  const currentStageIndex = stagesList.findIndex(s => s.name === currentStageName);
  const totalRejected = (order.stageHistory || []).reduce((sum, s) => sum + (s.rejectedQuantity || 0), 0) || (order.defectiveQuantity || 0);
  const finalGoodUnits = order.finalQuantity || order.completedQuantity || order.completed || 0;

  // Contractor info for active challan
  const matchedContractor = contractors.find(c => c.name === activeChallan.contractorName);
  const activeContractor = {
    name: activeChallan.contractorName || 'Assigned Contractor',
    phone: matchedContractor?.phone || activeChallan.contractorPhone || '+91 98240 54321',
    location: matchedContractor?.location || activeChallan.contractorLocation || 'Job Work Processing Facility'
  };

  // Determine if this is the first stage (Cutting / initial issuance from Godown)
  const stageSequence: ProductionStage[] = ['Cutting', 'Stitching', 'Washing', 'Packaging', 'Finished Goods'];
  const activeStageNormalized = activeChallan.stageName === 'Packing' ? 'Packaging' : activeChallan.stageName;
  const activeStageIndexInSeq = stageSequence.indexOf(activeStageNormalized as ProductionStage);

  const isFirstStage = selectedStageIndex === 0 || activeStageNormalized === 'Cutting';

  // For upcoming stages, resolve the previous stage processor details
  let prevStageEntry: StageHistoryEntry | null = null;
  if (!isFirstStage) {
    if (selectedStageIndex > 0 && availableStageChallans[selectedStageIndex - 1]) {
      prevStageEntry = availableStageChallans[selectedStageIndex - 1];
    } else if (order.stageHistory && order.stageHistory.length > 0) {
      const curIdx = order.stageHistory.findIndex(
        s => s.stageName === activeChallan.stageName || (activeChallan.stageName === 'Packaging' && s.stageName === 'Packing')
      );
      if (curIdx > 0) {
        prevStageEntry = order.stageHistory[curIdx - 1];
      }
    }
  }

  const prevStageNameFromSeq = activeStageIndexInSeq > 0 ? stageSequence[activeStageIndexInSeq - 1] : 'Cutting';
  const prevContractorFallbackName = prevStageNameFromSeq === 'Cutting'
    ? (order.cuttingContractor || order.stageContractors?.cutting)
    : prevStageNameFromSeq === 'Stitching'
    ? (order.stitchingContractor || order.stageContractors?.stitching)
    : prevStageNameFromSeq === 'Washing'
    ? (order.washingContractor || order.stageContractors?.washing)
    : (order.packagingContractor || order.stageContractors?.packaging);

  const prevContractorName = prevStageEntry?.contractorName || prevContractorFallbackName || 'Previous Stage Contractor';
  const matchedPrevContractor = contractors.find(c => c.name.toLowerCase() === prevContractorName.toLowerCase());

  const prevStagePerson = {
    name: prevContractorName,
    stageName: prevStageEntry?.stageName || prevStageNameFromSeq,
    phone: matchedPrevContractor?.phone || prevStageEntry?.contractorPhone || '',
    location: matchedPrevContractor?.location || prevStageEntry?.contractorLocation || 'Processing Facility',
    challanNumber: prevStageEntry?.challanNumber || `${baseChallan}-${stageCodes[prevStageNameFromSeq] || 'PREV'}`,
    handoverDate: prevStageEntry?.completedDate || prevStageEntry?.assignedDate || activeChallan.assignedDate
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-zinc-950/85 backdrop-blur-xs overflow-y-auto no-scrollbar animate-in fade-in duration-200"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      <style>{`
        @media print {
          /* Hide all app contents, navigation bars, sidebars, headers */
          body * {
            visibility: hidden !important;
          }
          /* Only make the challan printable section visible */
          #production-challan-printable, #production-challan-printable * {
            visibility: visible !important;
          }
          #production-challan-printable {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 16px !important;
            background: white !important;
            color: black !important;
            overflow: visible !important;
            max-height: none !important;
            height: auto !important;
            box-shadow: none !important;
            border: none !important;
          }
          html, body, #production-challan-printable {
            overflow: visible !important;
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }
          ::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
          }
          /* Explicitly hide bottom nav and header */
          nav, header, aside, .glass-nav, [role="navigation"] {
            display: none !important;
            visibility: hidden !important;
          }
        }
      `}</style>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-4xl w-full my-auto max-h-[94vh] flex flex-col rounded-2xl overflow-hidden font-mono text-zinc-900 dark:text-zinc-100">
        
        {/* Top Header Actions (Hidden in Print) */}
        <div className="p-4 bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-hanken font-bold text-base text-zinc-900 dark:text-zinc-100">
                Production Order Challan
              </h2>
              <span className="text-[10px] text-zinc-500 font-mono">
                Challan Ref: {activeChallan.challanNumber} • Stage: {activeChallan.stageName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
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

        {/* Stage Advancement & Saved Challan Selector Bar (Hidden during Print) */}
        {availableStageChallans.length > 1 && (
          <div className="px-3 py-2 bg-zinc-100/90 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2 print:hidden relative">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-mono font-bold shrink-0 pl-1">
              <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-[10px] uppercase tracking-wider hidden sm:inline">Challan History:</span>
            </div>

            {/* Left Scroll Button */}
            <button
              type="button"
              onClick={() => scrollHistory('left')}
              className="p-1 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 shrink-0 cursor-pointer shadow-2xs transition-colors"
              title="Scroll left"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Scrollable Container with onWheel support for normal mouse wheel */}
            <div
              ref={historyScrollRef}
              onWheel={(e) => {
                if (e.deltaY !== 0) {
                  e.currentTarget.scrollLeft += e.deltaY;
                }
              }}
              className="flex-1 flex items-center gap-2 overflow-x-auto scroll-smooth py-1 px-1 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700"
            >
              {availableStageChallans.map((ch, idx) => {
                const isSelected = selectedStageIndex === idx;
                const isLatest = idx === availableStageChallans.length - 1;
                return (
                  <button
                    key={`${ch.stageName}-${idx}`}
                    type="button"
                    data-selected={isSelected ? 'true' : 'false'}
                    onClick={() => setSelectedStageIndex(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer flex items-center gap-2 border shadow-2xs ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                    }`}
                  >
                    <span>{ch.stageName}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-normal ${
                      isSelected ? 'bg-emerald-700/90 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}>
                      {ch.challanNumber}
                    </span>
                    {isLatest ? (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-black tracking-wider ${
                        isSelected ? 'bg-white text-emerald-700' : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400'
                      }`}>
                        Active
                      </span>
                    ) : (
                      <span className={`text-[9px] font-normal ${isSelected ? 'text-emerald-100' : 'text-zinc-400'}`}>Saved</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right Scroll Button */}
            <button
              type="button"
              onClick={() => scrollHistory('right')}
              className="p-1 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 shrink-0 cursor-pointer shadow-2xs transition-colors"
              title="Scroll right"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Printable Challan Document Body */}
        <div 
          id="production-challan-printable" 
          className="p-6 sm:p-10 overflow-y-auto no-scrollbar space-y-6 text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 print:p-0 print:m-0 print:text-black print:bg-white text-xs"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          
          {/* Header Banner */}
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
              {(settings.companyAddress || settings.address) && (
                <p className="text-[11px] text-zinc-500 mt-1 max-w-sm">
                  {settings.companyAddress || settings.address}
                </p>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-zinc-600 dark:text-zinc-400 font-mono mt-1">
                {settings.gstin && <span><strong>GSTIN:</strong> {settings.gstin}</span>}
                {settings.contactPhone && <span><strong>Phone:</strong> {settings.contactPhone}</span>}
                {settings.companyEmail && <span><strong>Email:</strong> {settings.companyEmail}</span>}
              </div>
            </div>

            <div className="text-right sm:text-right w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-zinc-200">
              <span className="inline-block px-2.5 py-0.5 bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest rounded mb-1">
                PRODUCTION ORDER CHALLAN
              </span>
              <div className="font-hanken font-black text-xl text-emerald-600 dark:text-emerald-400 tracking-tight">
                {activeChallan.challanNumber}
              </div>
              <div className="text-[11px] text-zinc-500 space-y-0.5 mt-1 font-mono">
                <div><strong>Challan Date:</strong> {activeChallan.assignedDate}</div>
                <div><strong>PO Code:</strong> {order.poCode || order.orderCode}</div>
                <div><strong>Challan Stage:</strong> <span className="font-bold text-emerald-600">{activeChallan.stageName}</span></div>
                <div><strong>Stage Status:</strong> <span className="font-bold text-zinc-700 dark:text-zinc-300">{activeChallan.status}</span></div>
              </div>
            </div>
          </div>

          {/* Consignor (Dispatched By) & Consignee (Processor / Contractor) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
            {isFirstStage ? (
              /* First Stage: Dispatched by Fabric Storage Godown */
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">
                  Dispatched By (Fabric Storage Godown)
                </span>
                <h3 className="font-hanken font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{godownInfo.name}</span>
                </h3>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-300">
                  {godownInfo.address || godownInfo.location || 'Central Fabric Storage Facility'}
                </p>
                <div className="text-[10px] text-zinc-500 space-y-0.5 font-mono pt-1">
                  <div><strong>Godown In-Charge:</strong> {godownInfo.managerName || 'Stores Manager'}</div>
                  {godownInfo.contactNumber && <div><strong>Contact:</strong> {godownInfo.contactNumber}</div>}
                  <div><strong>Fabric Stored &amp; Dispatched:</strong> {order.fabricName || rawItem?.fabricName || 'Raw Material Fabric'}</div>
                </div>
              </div>
            ) : (
              /* Next Upcoming Stages: Dispatched by Previous Stage Person */
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">
                  Dispatched &amp; Handed Over By ({prevStagePerson.stageName} Processor)
                </span>
                <h3 className="font-hanken font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{prevStagePerson.name}</span>
                </h3>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-300">
                  {prevStagePerson.location}
                </p>
                <div className="text-[10px] text-zinc-500 space-y-0.5 font-mono pt-1">
                  <div><strong>Completed Stage:</strong> {prevStagePerson.stageName}</div>
                  <div><strong>Previous Stage Challan:</strong> {prevStagePerson.challanNumber}</div>
                  {prevStagePerson.phone && <div><strong>Contact Phone:</strong> {prevStagePerson.phone}</div>}
                  <div><strong>Handover / Dispatch Date:</strong> {prevStagePerson.handoverDate}</div>
                </div>
              </div>
            )}

            <div className="space-y-1 border-t sm:border-t-0 sm:border-l sm:pl-4 border-zinc-200 dark:border-zinc-800 pt-3 sm:pt-0">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">
                Assigned Contractor / Job Worker (Consignee)
              </span>
              <h4 className="font-hanken font-bold text-sm text-zinc-800 dark:text-zinc-200">
                {activeChallan.contractorName}
              </h4>
              <p className="text-[11px] text-zinc-500">
                Location: {activeContractor.location || 'Job Work Unit'}
              </p>
              <div className="text-[10px] text-zinc-500 space-y-0.5 font-mono pt-1">
                <div><strong>Phone:</strong> {activeContractor.phone || 'N/A'}</div>
                <div><strong>Current Stage Assigned:</strong> {activeChallan.stageName}</div>
                <div><strong>Issue / Dispatch Date:</strong> {activeChallan.assignedDate}</div>
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
                  <span className="text-zinc-400 block text-[10px]">CHALLAN STAGE:</span>
                  <strong className="text-zinc-900 dark:text-zinc-100">{activeChallan.stageName}</strong>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px]">STAGE QUANTITY:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {activeChallan.quantitySent} Pcs
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
                  <strong className="text-zinc-900 dark:text-zinc-100">{order.fabricName || rawItem?.fabricName || 'Raw Denim'}</strong>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px]">BILL / INVOICE NO:</span>
                  <strong className="text-zinc-900 dark:text-zinc-100">{order.rawBatchId || rawItem?.invoiceNumber || rawItem?.billNumber || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px]">METERS ISSUED:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {order.metersAllocated || order.metersRequired || rawItem?.allocatedMeters || 'N/A'} Meters
                  </strong>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px]">STORAGE LOCATION:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {godownInfo.name}
                  </strong>
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
              <span className="text-[10px] text-zinc-400 font-mono">Challan Ref: {activeChallan.challanNumber}</span>
            </div>

            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-500 uppercase">
                    <th className="p-3">Stage</th>
                    <th className="p-3">Challan Ref</th>
                    <th className="p-3">Contractor / Unit</th>
                    <th className="p-3 text-right">Qty Sent</th>
                    <th className="p-3 text-right">Qty OK</th>
                    <th className="p-3 text-right">Rejections</th>
                    <th className="p-3">Log Dates</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {availableStageChallans.map((stg, idx) => (
                    <tr 
                      key={`${stg.stageName}-${idx}`} 
                      className={`hover:bg-zinc-50 dark:hover:bg-zinc-950/50 ${selectedStageIndex === idx ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''}`}
                    >
                      <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <span>{stg.stageName}</span>
                        {selectedStageIndex === idx && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-600 text-white font-bold">Selected</span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-zinc-600 dark:text-zinc-400 text-[11px] font-bold">
                        {stg.challanNumber}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">{stg.contractorName || 'Assigned Person'}</div>
                        {(stg.contractorPhone || (contractors.find(c => c.name === stg.contractorName)?.phone)) && (
                          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                            Ph: {stg.contractorPhone || contractors.find(c => c.name === stg.contractorName)?.phone}
                          </div>
                        )}
                      </td>
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
                  ))}
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
                {isFirstStage
                  ? `Dispatched By (${godownInfo.name} In-Charge)`
                  : `Dispatched & Handed Over By (${prevStagePerson.name} - ${prevStagePerson.stageName})`}
              </span>
              <div className="border-t border-zinc-400 pt-1 text-[10px] text-zinc-500">
                {isFirstStage ? 'Authorized Signature & Stamp' : 'Contractor Signature & Stamp'}
              </div>
            </div>

            <div className="space-y-12 text-right">
              <span className="text-[11px] text-zinc-500 uppercase font-bold block">
                {activeStageNormalized === 'Finished Goods' ? `Received & Inwarded By (${godownInfo.managerName || 'Stores In-Charge'})` : `Received & Acknowledged By (${activeChallan.contractorName})`}
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
