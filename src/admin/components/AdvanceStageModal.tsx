import React, { useState, useEffect, useMemo } from 'react';
import { ProductionOrder, ProductionStage, StageHistoryEntry } from '../../types';
import { useFabriqData } from '../../context/FabriqDataContext';
import { ArrowRight, CheckCircle2, Scissors, Factory, Sparkles, Box, PackageCheck, Layers, Calendar, User, FileText, Phone, MapPin } from 'lucide-react';

interface AdvanceStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ProductionOrder | null;
  onAdvance: (updatedOrder: ProductionOrder) => void;
}

export const AdvanceStageModal: React.FC<AdvanceStageModalProps> = ({
  isOpen,
  onClose,
  order,
  onAdvance
}) => {
  const { contractors, warehouses, finishedInventory } = useFabriqData();

  if (!isOpen || !order) return null;

  // Normalize current stage to 4 core stages
  const rawStage = (order.currentStage || order.stage || 'Cutting') as string;
  const currentStage: ProductionStage = rawStage === 'Packing' ? 'Packaging' : (rawStage as ProductionStage);

  // 4 sequential stages followed by Finished Goods
  const stageSequence: ProductionStage[] = ['Cutting', 'Stitching', 'Washing', 'Packaging', 'Finished Goods'];
  const currentIndex = stageSequence.indexOf(currentStage);
  const defaultNextStage = currentIndex >= 0 && currentIndex < stageSequence.length - 1
    ? stageSequence[currentIndex + 1]
    : 'Finished Goods';

  // Helper to match contractor specialty with stage
  const isMatchSpecialty = (specialty?: string, stage?: string) => {
    if (!specialty || !stage) return false;
    const s = specialty.toLowerCase();
    const st = stage.toLowerCase();
    if (st.includes('cut')) return s.includes('cut');
    if (st.includes('stitch')) return s.includes('stitch');
    if (st.includes('wash')) return s.includes('wash');
    if (st.includes('pack')) return s.includes('pack');
    return false;
  };

  // Find recommended contractor for a given stage (prioritize saved stage contractor)
  const getRecommendedContractor = (stage: ProductionStage) => {
    if (stage === 'Cutting' && (order.cuttingContractor || order.stageContractors?.cutting)) {
      return order.cuttingContractor || order.stageContractors?.cutting || '';
    }
    if (stage === 'Stitching' && (order.stitchingContractor || order.stageContractors?.stitching)) {
      return order.stitchingContractor || order.stageContractors?.stitching || '';
    }
    if (stage === 'Washing' && (order.washingContractor || order.stageContractors?.washing)) {
      return order.washingContractor || order.stageContractors?.washing || '';
    }
    if ((stage === 'Packaging' || stage === 'Packing') && (order.packagingContractor || order.stageContractors?.packaging)) {
      return order.packagingContractor || order.stageContractors?.packaging || '';
    }
    const fromHist = (order.stageHistory || []).find(s => s.stageName === stage || (stage === 'Packaging' && s.stageName === 'Packing'))?.contractorName;
    if (fromHist) return fromHist;

    const match = contractors.find(c => isMatchSpecialty(c.specialty, stage) && c.status !== 'Inactive');
    return match ? match.name : (contractors.find(c => isMatchSpecialty(c.specialty, stage))?.name || '');
  };

  // Find active stage entry from history or fallback
  const activeHistoryEntry = (order.stageHistory || []).find(s => (s.stageName === currentStage || (currentStage === 'Packaging' && s.stageName === 'Packing')) && s.status !== 'Completed') ||
    (order.stageHistory || [])[(order.stageHistory || []).length - 1] || null;

  // Available input quantity for current stage
  const availableInputQty = useMemo(() => {
    if (currentStage === 'Cutting') {
      return order.plannedQuantity || order.quantity || order.total || 0;
    }
    const prevStageIndex = currentIndex - 1;
    if (prevStageIndex >= 0) {
      const prevStageName = stageSequence[prevStageIndex];
      const prevEntry = (order.stageHistory || []).find(s => s.stageName === prevStageName || (prevStageName === 'Packaging' && s.stageName === 'Packing'));
      if (prevEntry) {
        return prevEntry.quantityCompleted || prevEntry.quantityReceived || 0;
      }
    }
    return order.completedQuantity || order.completed || order.plannedQuantity || 0;
  }, [order, currentStage, currentIndex, stageSequence]);

  // Local Form States
  const [qtySent, setQtySent] = useState<number>(availableInputQty);
  const [qtyCompleted, setQtyCompleted] = useState<number>(availableInputQty);
  const [qtyRejected, setQtyRejected] = useState<number>(0);
  const [currentContractor, setCurrentContractor] = useState<string>(
    activeHistoryEntry?.contractorName || order.contractorName || order.assignedTo || contractors[0]?.name || ''
  );
  const [completedDate, setCompletedDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [remarks, setRemarks] = useState<string>('');

  // Target Next Stage & Contractor & Due Date
  const getDefaultDueDate = (daysAhead: number = 7) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().substring(0, 10);
  };

  const [targetNextStage, setTargetNextStage] = useState<ProductionStage>(defaultNextStage);
  const [nextContractorName, setNextContractorName] = useState<string>(getRecommendedContractor(defaultNextStage));
  const [nextStageDueDate, setNextStageDueDate] = useState<string>('');
  const [destinationGodown, setDestinationGodown] = useState<string>('');
  const [finishedPricePerPiece, setFinishedPricePerPiece] = useState<number>(1200);

  // Reset form whenever order changes
  useEffect(() => {
    if (order) {
      setQtySent(availableInputQty);
      setQtyCompleted(availableInputQty);
      setQtyRejected(0);
      setCurrentContractor(
        activeHistoryEntry?.contractorName || order.contractorName || order.assignedTo || contractors[0]?.name || ''
      );
      setCompletedDate(new Date().toISOString().substring(0, 10));
      setRemarks('');
      setTargetNextStage(defaultNextStage);
      setNextContractorName(getRecommendedContractor(defaultNextStage));

      const existingNextStage = (order.stageHistory || []).find(
        s => s.stageName === defaultNextStage || (defaultNextStage === 'Packaging' && s.stageName === 'Packing')
      );
      setNextStageDueDate(
        existingNextStage?.dueDate || order.dueDate || order.estimatedCompletionDate || getDefaultDueDate(7)
      );

      const existingFin = (finishedInventory || []).find(f => (f.productName || f.itemName || '').trim().toLowerCase() === (order.styleName || order.name || '').trim().toLowerCase());
      setFinishedPricePerPiece(order.unitPrice || order.pricePerPiece || existingFin?.unitPrice || 1200);
      const defaultGodown = order.warehouse || order.godown || existingFin?.warehouse || (warehouses && warehouses[0]?.name) || '';
      setDestinationGodown(defaultGodown);
    }
  }, [order, availableInputQty, defaultNextStage, warehouses, finishedInventory]);

  // Handle stage change with automatic contractor recommendation & due date
  const handleStageChange = (newStage: ProductionStage) => {
    setTargetNextStage(newStage);
    if (newStage !== 'Finished Goods') {
      const rec = getRecommendedContractor(newStage);
      setNextContractorName(rec);
      const existingStage = (order.stageHistory || []).find(
        s => s.stageName === newStage || (newStage === 'Packaging' && s.stageName === 'Packing')
      );
      setNextStageDueDate(
        existingStage?.dueDate || order.dueDate || order.estimatedCompletionDate || getDefaultDueDate(7)
      );
    } else {
      setNextStageDueDate(completedDate || new Date().toISOString().substring(0, 10));
    }
  };

  // Adjust completed when rejected changes
  const handleRejectedChange = (val: number) => {
    const rej = Math.max(0, val);
    setQtyRejected(rej);
    setQtyCompleted(Math.max(0, qtySent - rej));
  };

  const handleQtyCompletedChange = (val: number) => {
    const comp = Math.max(0, val);
    setQtyCompleted(comp);
    setQtyRejected(Math.max(0, qtySent - comp));
  };

  // Only show contractors matching the selected next stage
  const stageContractors = useMemo(() => {
    return contractors.filter(c => isMatchSpecialty(c.specialty, targetNextStage) && c.status !== 'Inactive');
  }, [contractors, targetNextStage]);

  // Selected next contractor details
  const selectedNextContractorInfo = useMemo(() => {
    return contractors.find(c => c.name === nextContractorName);
  }, [contractors, nextContractorName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (qtyCompleted < 0) {
      alert('Completed output quantity cannot be negative.');
      return;
    }

    // 1. Build updated history
    const existingHistory = [...(order.stageHistory || [])];
    const existingIndex = existingHistory.findIndex(s => s.stageName === currentStage || (currentStage === 'Packaging' && s.stageName === 'Packing'));
    const stageCodeMap: Record<string, string> = {
      'Cutting': 'CUT',
      'Stitching': 'STT',
      'Washing': 'WSH',
      'Packaging': 'PKG',
      'Packing': 'PKG',
      'Finished Goods': 'FG'
    };
    const baseChallan = (order.challanNumber || `CH-2026-${order.id.slice(-4)}`).replace(/-(CUT|STT|WSH|PKG|FG|STG\d+)$/i, '');
    const currentCode = stageCodeMap[currentStage] || 'STG1';
    const nextCode = stageCodeMap[targetNextStage] || 'STG2';

    const currentStageChallan = activeHistoryEntry?.challanNumber || `${baseChallan}-${currentCode}`;
    const nextStageChallan = `${baseChallan}-${nextCode}`;

    const currentContractorInfo = contractors.find(c => c.name === currentContractor);
    const completedStageEntry: StageHistoryEntry = {
      stageName: currentStage,
      contractorId: currentContractorInfo?.id || '',
      contractorName: currentContractor,
      contractorPhone: currentContractorInfo?.phone || '',
      contractorLocation: currentContractorInfo?.location || '',
      quantitySent: qtySent,
      quantityReceived: availableInputQty,
      quantityCompleted: qtyCompleted,
      rejectedQuantity: qtyRejected,
      wastageQuantity: qtyRejected,
      assignedDate: activeHistoryEntry?.assignedDate || order.startDate || new Date().toISOString().substring(0, 10),
      completedDate: completedDate,
      challanNumber: currentStageChallan,
      status: 'Completed',
      remarks: remarks || `Successfully completed ${currentStage} stage.`
    };

    if (existingIndex >= 0) {
      existingHistory[existingIndex] = completedStageEntry;
    } else {
      existingHistory.push(completedStageEntry);
    }

    // 2. Target stage progression
    const isMovingToFinished = targetNextStage === 'Finished Goods';

    if (!isMovingToFinished) {
      // Check if target next stage already has an entry
      const nextIndex = existingHistory.findIndex(s => s.stageName === targetNextStage || (targetNextStage === 'Packaging' && s.stageName === 'Packing'));
      const nextStageEntry: StageHistoryEntry = {
        stageName: targetNextStage,
        contractorId: selectedNextContractorInfo?.id || '',
        contractorName: nextContractorName,
        contractorPhone: selectedNextContractorInfo?.phone || '',
        contractorLocation: selectedNextContractorInfo?.location || '',
        quantitySent: qtyCompleted,
        quantityReceived: 0,
        quantityCompleted: 0,
        rejectedQuantity: 0,
        wastageQuantity: 0,
        assignedDate: completedDate,
        dueDate: nextStageDueDate || undefined,
        completedDate: '',
        challanNumber: nextStageChallan,
        status: 'In Progress',
        remarks: `Job forwarded from ${currentStage} with stage Challan ${nextStageChallan}`
      };

      if (nextIndex >= 0) {
        existingHistory[nextIndex] = nextStageEntry;
      } else {
        existingHistory.push(nextStageEntry);
      }
    }

    // 3. Compute overall progress & metrics for the 4 stages
    const stageProgressMap: Record<string, number> = {
      'Cutting': 25,
      'Stitching': 50,
      'Washing': 75,
      'Packaging': 90,
      'Packing': 90,
      'Finished Goods': 100
    };

    const nextProgress = stageProgressMap[targetNextStage] || 100;
    const totalRejections = existingHistory.reduce((acc, s) => acc + (s.rejectedQuantity || 0), 0);

    const updatedCutting = targetNextStage === 'Cutting' ? nextContractorName : (currentStage === 'Cutting' ? currentContractor : (order.cuttingContractor || order.stageContractors?.cutting));
    const updatedStitching = targetNextStage === 'Stitching' ? nextContractorName : (currentStage === 'Stitching' ? currentContractor : (order.stitchingContractor || order.stageContractors?.stitching));
    const updatedWashing = targetNextStage === 'Washing' ? nextContractorName : (currentStage === 'Washing' ? currentContractor : (order.washingContractor || order.stageContractors?.washing));
    const updatedPackaging = (targetNextStage === 'Packaging' || targetNextStage === 'Packing') ? nextContractorName : ((currentStage === 'Packaging' || currentStage === 'Packing') ? currentContractor : (order.packagingContractor || order.stageContractors?.packaging));

    const updatedOrder: ProductionOrder = {
      ...order,
      cuttingContractor: updatedCutting,
      stitchingContractor: updatedStitching,
      washingContractor: updatedWashing,
      packagingContractor: updatedPackaging,
      stageContractors: {
        ...(order.stageContractors || {}),
        cutting: updatedCutting,
        stitching: updatedStitching,
        washing: updatedWashing,
        packaging: updatedPackaging
      },
      challanNumber: isMovingToFinished ? `${baseChallan}-FG` : nextStageChallan,
      currentStage: targetNextStage,
      stage: targetNextStage,
      assignedTo: isMovingToFinished ? destinationGodown : nextContractorName,
      contractorName: isMovingToFinished ? destinationGodown : nextContractorName,
      dueDate: isMovingToFinished ? (order.dueDate || completedDate) : (nextStageDueDate || order.dueDate),
      estimatedCompletionDate: isMovingToFinished ? (order.estimatedCompletionDate || completedDate) : (nextStageDueDate || order.estimatedCompletionDate),
      estimatedCompletion: isMovingToFinished ? (order.estimatedCompletion || completedDate) : (nextStageDueDate || order.estimatedCompletion),
      warehouse: isMovingToFinished ? destinationGodown : (order.warehouse || 'Finished Goods Godown'),
      godown: isMovingToFinished ? destinationGodown : (order.godown || 'Finished Goods Godown'),
      unitPrice: isMovingToFinished ? finishedPricePerPiece : (order.unitPrice || finishedPricePerPiece),
      pricePerPiece: isMovingToFinished ? finishedPricePerPiece : (order.pricePerPiece || finishedPricePerPiece),
      progress: nextProgress,
      completed: qtyCompleted,
      completedQuantity: qtyCompleted,
      finalQuantity: isMovingToFinished ? qtyCompleted : order.finalQuantity,
      totalRejectedQuantity: totalRejections,
      defectiveQuantity: totalRejections,
      overallStatus: isMovingToFinished ? 'Completed' : 'In Progress',
      status: isMovingToFinished ? 'Completed' : 'In Progress',
      stageHistory: existingHistory,
      inventoryTransferred: isMovingToFinished
    };

    onAdvance(updatedOrder);
    onClose();
  };

  const getStageIcon = (stage: ProductionStage | string) => {
    switch (stage) {
      case 'Cutting': return <Scissors className="w-4 h-4 text-amber-500" />;
      case 'Stitching': return <Factory className="w-4 h-4 text-sky-500" />;
      case 'Washing': return <Sparkles className="w-4 h-4 text-purple-500" />;
      case 'Packaging':
      case 'Packing': return <Box className="w-4 h-4 text-indigo-500" />;
      case 'Finished Goods': return <PackageCheck className="w-4 h-4 text-emerald-500" />;
      default: return <Layers className="w-4 h-4 text-zinc-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-xs overflow-y-auto no-scrollbar animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-2xl w-full my-8 rounded-xl overflow-hidden font-mono">
        {/* Header */}
        <div className="p-4 bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h2 className="font-hanken font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Update Challan &amp; Advance Production Stage
              </h2>
              <span className="text-[10px] text-zinc-500 font-mono">
                Challan: <strong className="text-emerald-600 dark:text-emerald-400">{order.challanNumber}</strong> • Style: {order.styleName || order.name}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Active Stage Completion Card */}
          <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-lg space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-200/60 dark:border-zinc-800/60 pb-2">
              <span className="font-bold flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100">
                {getStageIcon(currentStage)}
                <span>1. Record {currentStage} Stage Output</span>
              </span>
              <span className="text-[10px] text-zinc-400">
                Input Available: <strong>{availableInputQty} Pcs</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-500">
                  {currentStage === 'Cutting' ? 'Quantity / Fabric Sent (Pcs)' : 'Quantity Sent for Stage'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={qtySent}
                  onChange={(e) => setQtySent(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 outline-none focus:border-emerald-500 rounded font-bold"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-500">
                  {currentStage === 'Cutting' ? 'Pieces Cut & Approved (OK)' : 'Good / Accepted Output (OK)'}
                </label>
                <input
                  type="number"
                  min="0"
                  max={qtySent}
                  value={qtyCompleted}
                  onChange={(e) => handleQtyCompletedChange(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-emerald-500/50 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400 outline-none focus:border-emerald-500 rounded font-bold"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-500">
                  Rejected / Defective / Wastage
                </label>
                <input
                  type="number"
                  min="0"
                  value={qtyRejected}
                  onChange={(e) => handleRejectedChange(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-rose-300 dark:border-rose-800 text-rose-600 outline-none focus:border-rose-500 rounded font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-500">
                  {currentStage} Stage Contractor
                </label>
                <input
                  type="text"
                  value={currentContractor}
                  onChange={(e) => setCurrentContractor(e.target.value)}
                  placeholder="Contractor name..."
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 outline-none focus:border-emerald-500 rounded font-bold"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-500">
                  Date Completed
                </label>
                <input
                  type="date"
                  value={completedDate}
                  onChange={(e) => setCompletedDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 outline-none focus:border-emerald-500 rounded"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-500">
                  Remarks / Quality Notes
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Quality approved, forward to next stage..."
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 outline-none focus:border-emerald-500 rounded"
                />
              </div>
            </div>
          </div>

          {/* Forwarding to Next Stage Box */}
          <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-400">
                {getStageIcon(targetNextStage)}
                <span>2. Forward Same Challan to Next Stage</span>
              </span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                Forwarding: {qtyCompleted} Pcs OK
              </span>
            </div>

            {/* Target Stage & Contractor / Godown Selection Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Select Target Next Stage */}
              <div className="space-y-1">
                <label className="text-[11px] uppercase font-bold text-zinc-600 dark:text-zinc-400 block">
                  Target Next Stage
                </label>
                <select
                  value={targetNextStage}
                  onChange={(e) => handleStageChange(e.target.value as ProductionStage)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 outline-none focus:border-emerald-500 rounded font-bold text-xs text-zinc-900 dark:text-zinc-100"
                  required
                >
                  <option value="Cutting">Cutting</option>
                  <option value="Stitching">Stitching</option>
                  <option value="Washing">Washing</option>
                  <option value="Packaging">Packaging</option>
                  <option value="Finished Goods">Finished Goods (Godown)</option>
                </select>
              </div>

              {/* Next Contractor Selection (or Destination Godown) */}
              {targetNextStage !== 'Finished Goods' ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] uppercase font-bold text-zinc-600 dark:text-zinc-400">
                      Assign {targetNextStage} Contractor
                    </label>
                    {stageContractors.length > 0 && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                        {stageContractors.length} {targetNextStage} specialist{stageContractors.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <select
                    value={nextContractorName}
                    onChange={(e) => setNextContractorName(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 outline-none focus:border-emerald-500 rounded font-bold text-xs text-zinc-900 dark:text-zinc-100"
                    required
                  >
                    <option value="">-- Select {targetNextStage} Contractor --</option>
                    {stageContractors.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name} ({c.specialty})
                      </option>
                    ))}
                    {stageContractors.length === 0 && (
                      <option value="" disabled>-- No registered contractors for {targetNextStage} --</option>
                    )}
                  </select>
                  {stageContractors.length === 0 && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-1">
                      No contractor found with specialty "{targetNextStage}". Please register one in Contractor Management.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[11px] uppercase font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
                    <span>Destination Godown / Warehouse</span>
                    <span className="text-[9px] text-zinc-400 font-normal">Storage location</span>
                  </label>
                  <select
                    value={destinationGodown}
                    onChange={(e) => setDestinationGodown(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-emerald-400 dark:border-emerald-700 text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-emerald-500 rounded"
                    required
                  >
                    <option value="">-- Select Destination Godown --</option>
                    {(warehouses || []).map((w, idx) => (
                      <option key={`wh-${w.id}-${idx}`} value={w.name}>
                        {w.name} {w.location ? `(${w.location})` : ''}
                      </option>
                    ))}
                  </select>
                  {(!warehouses || warehouses.length === 0) && (
                    <div className="text-[10px] text-amber-500 font-mono mt-1">
                      No godowns found in database. Please register a warehouse first.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Next Stage Due Date / Inward Date Row */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] uppercase font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{targetNextStage === 'Finished Goods' ? 'Completion / Inward Date' : `${targetNextStage} Due Date`}</span>
                </label>
                <span className="text-[10px] text-zinc-400">
                  {targetNextStage === 'Finished Goods' ? 'Final inward date' : 'Expected stage completion'}
                </span>
              </div>
              <input
                type="date"
                required
                value={nextStageDueDate}
                min={completedDate || new Date().toISOString().substring(0, 10)}
                onChange={(e) => setNextStageDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 outline-none focus:border-emerald-500 rounded font-bold text-xs text-zinc-900 dark:text-zinc-100"
              />
            </div>

            {/* When moving to Finished Goods: Per Piece Price & Valuation row */}
            {targetNextStage === 'Finished Goods' && (
              <div className="p-3 bg-emerald-100/60 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-lg space-y-2">
                <div className="grid grid-cols-2 gap-3 items-center">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                      <span>Per Piece Price (₹)</span>
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-normal">Selling / Unit rate</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-400 font-bold">₹</span>
                      <input
                        type="number"
                        required
                        min={1}
                        step="any"
                        value={finishedPricePerPiece}
                        onChange={(e) => setFinishedPricePerPiece(Number(e.target.value))}
                        placeholder="1200"
                        className="w-full pl-7 pr-3 py-2 bg-white dark:bg-zinc-900 border border-emerald-400 dark:border-emerald-700 text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-emerald-500 rounded"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300">
                      Total Ready Batch Valuation
                    </label>
                    <div className="px-3 py-2 bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800 rounded text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
                      <span>{qtyCompleted} Pcs @ ₹{finishedPricePerPiece || 0}</span>
                      <span>₹{((qtyCompleted || 0) * (finishedPricePerPiece || 0)).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Contractor Contact Preview if chosen */}
            {selectedNextContractorInfo && targetNextStage !== 'Finished Goods' && (
              <div className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] text-zinc-600 dark:text-zinc-400 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                  {selectedNextContractorInfo.name}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-emerald-500" />
                  {selectedNextContractorInfo.phone} ({selectedNextContractorInfo.contactPerson})
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-500" />
                  {selectedNextContractorInfo.location}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 rounded font-bold text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {targetNextStage === 'Finished Goods'
                  ? 'Complete Order & Deposit to Inventory'
                  : `Save Challan & Move to ${targetNextStage}`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
