import React, { useState, useEffect, useMemo } from 'react';
import { ProductionOrder, ProductionStage, StageHistoryEntry } from '../../types';
import { useFabriqData } from '../../context/FabriqDataContext';
import { ArrowRight, CheckCircle2, Scissors, Factory, Sparkles, Box, PackageCheck, Layers, Calendar, User, FileText } from 'lucide-react';

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
  const { contractors } = useFabriqData();

  if (!isOpen || !order) return null;

  const currentStage = (order.currentStage || order.stage || 'Cutting') as ProductionStage;

  // Stage sequence
  const stageSequence: ProductionStage[] = ['Cutting', 'Stitching', 'Washing', 'Packing', 'Finished Goods'];
  const currentIndex = stageSequence.indexOf(currentStage);
  const defaultNextStage = currentIndex < stageSequence.length - 1 ? stageSequence[currentIndex + 1] : 'Finished Goods';

  // Find active stage entry from history or fallback
  const activeHistoryEntry = (order.stageHistory || []).find(s => s.stageName === currentStage && s.status !== 'Completed') ||
    (order.stageHistory || [])[(order.stageHistory || []).length - 1] || null;

  // Available input quantity for current stage
  const availableInputQty = useMemo(() => {
    if (currentStage === 'Cutting') {
      return order.plannedQuantity || order.quantity || order.total || 0;
    }
    const prevStageIndex = currentIndex - 1;
    if (prevStageIndex >= 0) {
      const prevStageName = stageSequence[prevStageIndex];
      const prevEntry = (order.stageHistory || []).find(s => s.stageName === prevStageName);
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

  // Target Next Stage & Contractor
  const [targetNextStage, setTargetNextStage] = useState<ProductionStage>(defaultNextStage);
  const [nextContractorName, setNextContractorName] = useState<string>(contractors[0]?.name || '');

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
      setNextContractorName(contractors[0]?.name || '');
    }
  }, [order, availableInputQty, defaultNextStage]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (qtyCompleted < 0) {
      alert('Completed output quantity cannot be negative.');
      return;
    }

    // 1. Build updated history
    const existingHistory = [...(order.stageHistory || [])];
    const existingIndex = existingHistory.findIndex(s => s.stageName === currentStage);

    const completedStageEntry: StageHistoryEntry = {
      stageName: currentStage,
      contractorId: '',
      contractorName: currentContractor,
      quantitySent: qtySent,
      quantityReceived: availableInputQty,
      quantityCompleted: qtyCompleted,
      rejectedQuantity: qtyRejected,
      wastageQuantity: qtyRejected,
      assignedDate: activeHistoryEntry?.assignedDate || order.startDate || new Date().toISOString().substring(0, 10),
      completedDate: completedDate,
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
      const nextIndex = existingHistory.findIndex(s => s.stageName === targetNextStage);
      const nextStageEntry: StageHistoryEntry = {
        stageName: targetNextStage,
        contractorId: '',
        contractorName: nextContractorName,
        quantitySent: qtyCompleted,
        quantityReceived: 0,
        quantityCompleted: 0,
        rejectedQuantity: 0,
        wastageQuantity: 0,
        assignedDate: completedDate,
        completedDate: '',
        status: 'In Progress',
        remarks: `Job forwarded from ${currentStage} with Challan ${order.challanNumber}`
      };

      if (nextIndex >= 0) {
        existingHistory[nextIndex] = nextStageEntry;
      } else {
        existingHistory.push(nextStageEntry);
      }
    }

    // 3. Compute overall progress & metrics
    const stageProgressMap: Record<ProductionStage, number> = {
      'Cutting': 25,
      'Stitching': 50,
      'Washing': 75,
      'Packing': 90,
      'Finished Goods': 100
    };

    const nextProgress = stageProgressMap[targetNextStage] || 100;
    const totalRejections = existingHistory.reduce((acc, s) => acc + (s.rejectedQuantity || 0), 0);

    const updatedOrder: ProductionOrder = {
      ...order,
      challanNumber: order.challanNumber, // Retain exact same persistent Challan Number
      currentStage: targetNextStage,
      stage: targetNextStage,
      assignedTo: isMovingToFinished ? 'Finished Goods Godown' : nextContractorName,
      contractorName: isMovingToFinished ? 'Finished Goods Godown' : nextContractorName,
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

  const getStageIcon = (stage: ProductionStage) => {
    switch (stage) {
      case 'Cutting': return <Scissors className="w-4 h-4" />;
      case 'Stitching': return <Factory className="w-4 h-4" />;
      case 'Washing': return <Sparkles className="w-4 h-4" />;
      case 'Packing': return <Box className="w-4 h-4" />;
      case 'Finished Goods': return <PackageCheck className="w-4 h-4" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-xl w-full my-8 rounded-xl overflow-hidden font-mono">
        {/* Header */}
        <div className="p-4 bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h2 className="font-hanken font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Update Challan &amp; Advance Stage
              </h2>
              <span className="text-[10px] text-zinc-500 font-mono">
                Challan: <strong className="text-emerald-600 dark:text-emerald-400">{order.challanNumber}</strong> • Style: {order.styleName || order.name}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
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
                  {currentStage} Contractor / Unit
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
                  placeholder="e.g. Quality verified, ready for forwarding..."
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

            <div className="grid grid-cols-2 gap-3">
              {/* Select Target Next Stage */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-600 dark:text-zinc-400">
                  Target Next Stage
                </label>
                <select
                  value={targetNextStage}
                  onChange={(e) => setTargetNextStage(e.target.value as ProductionStage)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 outline-none focus:border-emerald-500 rounded font-bold"
                  required
                >
                  <option value="Cutting">Cutting</option>
                  <option value="Stitching">Stitching</option>
                  <option value="Washing">Washing</option>
                  <option value="Packing">Packing</option>
                  <option value="Finished Goods">Finished Goods (Completed)</option>
                </select>
              </div>

              {/* Next Contractor Selection */}
              {targetNextStage !== 'Finished Goods' ? (
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-600 dark:text-zinc-400">
                    Assign {targetNextStage} Contractor
                  </label>
                  <select
                    value={nextContractorName}
                    onChange={(e) => setNextContractorName(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 outline-none focus:border-emerald-500 rounded font-bold"
                    required
                  >
                    {contractors.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name} {c.specialty ? `(${c.specialty})` : ''}
                      </option>
                    ))}
                    <option value="In-House Floor Unit">In-House Floor Unit</option>
                  </select>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-600 dark:text-zinc-400">
                    Destination Facility
                  </label>
                  <input
                    type="text"
                    readOnly
                    value="Finished Goods Godown"
                    className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded font-bold text-zinc-700 dark:text-zinc-300"
                  />
                </div>
              )}
            </div>

            <p className="text-[10px] text-zinc-500">
              🔒 Persistent Challan Number <strong className="text-emerald-700 dark:text-emerald-400">{order.challanNumber}</strong> remains constant throughout the complete workflow.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 rounded font-bold text-xs"
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
