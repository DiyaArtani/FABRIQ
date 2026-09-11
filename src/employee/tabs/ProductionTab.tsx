import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ProductionOrder, ProductionStage, StageHistoryEntry } from '../../types';
import {
  Search,
  Factory,
  Calendar,
  CheckCircle2,
  X,
  SlidersHorizontal,
  PackageCheck,
  Layers,
  Scissors,
  Sparkles,
  Box,
  FileText,
  Plus,
  ArrowRight
} from 'lucide-react';
import { useFabriqData } from '../../context/FabriqDataContext';
import { ProductionChallanModal } from '../components/ProductionChallanModal';
import { AdvanceStageModal } from '../../admin/components/AdvanceStageModal';

interface ProductionTabProps {
  key?: string;
  orders: ProductionOrder[];
}

export default function ProductionTab({ orders }: ProductionTabProps) {
  const { contractors, rawInventory, purchases, addProductionOrder, updateProductionOrder } = useFabriqData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  const [filterStage, setFilterStage] = useState<string>('All');

  // Modals state
  const [challanModalOrder, setChallanModalOrder] = useState<ProductionOrder | null>(null);
  const [advanceStageOrder, setAdvanceStageOrder] = useState<ProductionOrder | null>(null);

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [orderCode, setOrderCode] = useState('');
  const [challanNumber, setChallanNumber] = useState('');
  const [styleName, setStyleName] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [contractorName, setContractorName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().substring(0, 10));
  const [estimatedCompletion, setEstimatedCompletion] = useState('');
  const [selectedRawInventoryId, setSelectedRawInventoryId] = useState('');
  const [metersRequired, setMetersRequired] = useState(0);

  // Available raw materials for dropdown
  const availableRawMaterials = useMemo(() => {
    return rawInventory.filter(r => r.availableMeters > 0);
  }, [rawInventory]);

  const selectedRawMaterial = useMemo(() => {
    return rawInventory.find(r => r.id === selectedRawInventoryId);
  }, [rawInventory, selectedRawInventoryId]);

  const getRawItemInvoiceNo = (r: any) => {
    if (!r) return 'N/A';
    const p = purchases.find(
      (item) => item.id === r.purchaseId || item.billNumber === r.purchaseId || item.invoiceNumber === r.purchaseId
    );
    return (
      p?.invoiceNumber ||
      p?.billNumber ||
      (r.invoiceNumber && !r.invoiceNumber.startsWith('DF-2026-') ? r.invoiceNumber : '') ||
      (r.batchId && !r.batchId.startsWith('DF-2026-') ? r.batchId : 'N/A')
    );
  };

  const getOrderInvoiceNo = (po: ProductionOrder) => {
    const raw = rawInventory.find((r) => r.id === po.rawInventoryId);
    const p = purchases.find(
      (item) => item.id === raw?.purchaseId || item.invoiceNumber === po.rawBatchId || item.billNumber === po.rawBatchId
    );
    return (
      p?.invoiceNumber ||
      p?.billNumber ||
      raw?.invoiceNumber ||
      (po.rawBatchId && !po.rawBatchId.startsWith('DF-2026-') ? po.rawBatchId : 'N/A')
    );
  };

  // Generate next unique Challan Number
  const getNextChallanNumber = () => {
    let maxNum = 0;
    orders.forEach((po) => {
      if (po.challanNumber) {
        const match = po.challanNumber.match(/CH-(\d{4})-(\d+)/i) || po.challanNumber.match(/CH-(\d+)/i);
        if (match) {
          const num = parseInt(match[2] || match[1], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      }
    });
    const year = new Date().getFullYear();
    return `CH-${year}-${String(maxNum + 1).padStart(4, '0')}`;
  };

  const getNextOrderCode = () => {
    let maxNum = 0;
    orders.forEach((po) => {
      const code = po.orderCode || po.poCode || '';
      const match = code.match(/PRD-(\d{4})-(\d+)/i) || code.match(/PRD-(\d+)/i);
      if (match) {
        const num = parseInt(match[2] || match[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    return `PRD-2026-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const openCreateModal = () => {
    setOrderCode(getNextOrderCode());
    setChallanNumber(getNextChallanNumber());
    setStyleName('');
    setQuantity(0);
    const cuttingContractor = contractors.find(c => c.specialty?.toLowerCase().includes('cut')) || contractors[0];
    setContractorName(cuttingContractor?.name || 'Cutting Department Unit 1');
    setStartDate(new Date().toISOString().substring(0, 10));
    setEstimatedCompletion('');
    setSelectedRawInventoryId('');
    setMetersRequired(0);
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedRawInventoryId && selectedRawMaterial) {
      if (metersRequired > selectedRawMaterial.availableMeters) {
        alert(`Cannot allocate ${metersRequired}m — only ${selectedRawMaterial.availableMeters}m available in raw inventory.`);
        return;
      }
    }

    const initialCuttingStage: StageHistoryEntry = {
      stageName: 'Cutting',
      contractorId: '',
      contractorName: contractorName || 'Cutting Unit',
      quantitySent: quantity,
      quantityReceived: 0,
      quantityCompleted: 0,
      rejectedQuantity: 0,
      wastageQuantity: 0,
      assignedDate: startDate || new Date().toISOString().substring(0, 10),
      completedDate: '',
      status: 'In Progress',
      remarks: 'Initial production order created and sent to Cutting Contractor'
    };

    addProductionOrder({
      poCode: orderCode,
      orderCode,
      challanNumber: challanNumber || getNextChallanNumber(),
      styleName,
      name: styleName,
      productName: styleName,
      plannedQuantity: quantity,
      quantity,
      total: quantity,
      completed: 0,
      completedQuantity: 0,
      defectiveQuantity: 0,
      totalRejectedQuantity: 0,
      currentStage: 'Cutting',
      stage: 'Cutting',
      progress: 15,
      assignedTo: contractorName,
      contractorName,
      startDate,
      estimatedCompletion,
      dueDate: estimatedCompletion || startDate,
      status: 'In Progress',
      overallStatus: 'In Progress',
      createdAt: new Date().toISOString(),
      stageHistory: [initialCuttingStage],
      // Pipeline linkage
      rawInventoryId: selectedRawInventoryId || undefined,
      rawBatchId: selectedRawMaterial ? getRawItemInvoiceNo(selectedRawMaterial) : undefined,
      fabricName: selectedRawMaterial?.fabricName || undefined,
      metersRequired: metersRequired || undefined,
      metersAllocated: metersRequired || undefined,
      producedItemName: styleName,
      inventoryTransferred: false
    } as any);

    setIsCreateModalOpen(false);
  };

  // Search and filter logic
  const filteredOrders = orders.filter(order => {
    const code = order.poCode || order.orderCode || '';
    const ch = order.challanNumber || '';
    const name = order.name || order.styleName || '';
    const assigned = order.assignedTo || order.contractorName || '';
    const stage = order.currentStage || order.stage || '';

    const matchesSearch =
      code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ch.toLowerCase().includes(searchQuery.toLowerCase()) ||
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assigned.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stage.toLowerCase().includes(searchQuery.toLowerCase());

    if (filterStage === 'All') return matchesSearch;
    return matchesSearch && (order.currentStage === filterStage || order.stage === filterStage);
  });

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'Cutting': return <Scissors className="w-3.5 h-3.5" />;
      case 'Stitching': return <Factory className="w-3.5 h-3.5" />;
      case 'Washing': return <Sparkles className="w-3.5 h-3.5" />;
      case 'Packing': return <Box className="w-3.5 h-3.5" />;
      case 'Finished Goods': return <PackageCheck className="w-3.5 h-3.5" />;
      default: return <Layers className="w-3.5 h-3.5" />;
    }
  };

  const getStageBadgeStyle = (stage: string) => {
    switch (stage) {
      case 'Cutting':
        return 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800';
      case 'Stitching':
        return 'bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400 border border-sky-300 dark:border-sky-800';
      case 'Washing':
        return 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 border border-purple-300 dark:border-purple-800';
      case 'Packing':
        return 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-800';
      case 'Finished Goods':
        return 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800';
      default:
        return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="pb-24 select-none"
    >
      {/* Tab Header */}
      <section className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-hanken text-3xl font-black text-gray-900 dark:text-neutral-100 tracking-tight">
            Production Floor Tracking
          </h1>
          <p className="text-xs text-gray-400 dark:text-neutral-500 mt-0.5 font-medium font-geist">
            Challan tracking pipeline: Cutting &rarr; Stitching &rarr; Washing &rarr; Packing &rarr; Finished Goods
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-colors shrink-0 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Production Order</span>
        </button>
      </section>

      {/* Search & Filters */}
      <section className="mb-4 flex gap-2">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-500 w-4 h-4 group-hover:text-emerald-600 transition-colors" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all outline-none text-xs text-gray-900 dark:text-neutral-100 placeholder:text-gray-400 font-mono"
            placeholder="Search Challan #, Order code, style, or contractor..."
            type="text"
          />
        </div>

        <div className="relative">
          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            className="h-11 px-3 bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-emerald-500 text-xs font-mono font-bold text-gray-600 dark:text-neutral-300 outline-none cursor-pointer appearance-none pr-8"
          >
            <option value="All">All Stages</option>
            <option value="Cutting">Cutting</option>
            <option value="Stitching">Stitching</option>
            <option value="Washing">Washing</option>
            <option value="Packing">Packing</option>
            <option value="Finished Goods">Finished Goods</option>
          </select>
          <SlidersHorizontal className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
      </section>

      {/* Active Runs / PO List */}
      <section className="space-y-3 font-mono">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-neutral-900 border border-dashed border-gray-200 dark:border-neutral-800 rounded-2xl p-6">
            <Factory className="w-10 h-10 mx-auto text-gray-300 dark:text-neutral-700 mb-2" />
            <p className="text-xs text-gray-500 dark:text-neutral-400 font-bold">No production orders found.</p>
            <p className="text-[11px] text-gray-400 dark:text-neutral-500 mt-1">
              Start a new production run with a persistent Challan Number from Cutting to Finished Goods.
            </p>
            <button
              onClick={openCreateModal}
              className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold rounded-xl inline-flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Production Order</span>
            </button>
          </div>
        ) : (
          filteredOrders.map((order, idx) => {
            const currentStageName = (order.currentStage || order.stage || 'Cutting') as ProductionStage;
            const isFinished = currentStageName === 'Finished Goods' || order.overallStatus === 'Completed' || order.status === 'Completed';
            const totalQty = order.plannedQuantity || order.quantity || order.total || 100;
            const completedQty = order.finalQuantity || order.completedQuantity || order.completed || 0;
            const progress = order.progress || Math.min(100, Math.round((completedQty / totalQty) * 100)) || 15;

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.03 }}
                onClick={() => setSelectedOrder(order)}
                className="bento-card p-4 rounded-xl shadow-sm hover:border-emerald-500/50 transition-all cursor-pointer space-y-3 bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold rounded text-xs">
                      {order.challanNumber || `CH-2026-${order.id.slice(-4)}`}
                    </span>
                    <span className="font-hanken font-bold text-sm text-gray-900 dark:text-neutral-100">
                      {order.styleName || order.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md flex items-center gap-1 ${getStageBadgeStyle(currentStageName)}`}>
                      {getStageIcon(currentStageName)}
                      <span>Stage: {currentStageName}</span>
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-neutral-400">
                    <span>Assigned: <strong className="text-gray-900 dark:text-neutral-100">{order.contractorName || order.assignedTo}</strong></span>
                    <span className="font-bold text-gray-900 dark:text-neutral-100">{progress}% Progress ({completedQty}/{totalQty} pcs)</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Footer Info & Quick Actions */}
                <div className="flex justify-between items-center text-[11px] text-gray-400 dark:text-neutral-500 pt-2 border-t border-gray-100 dark:border-neutral-800 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span>Order: {order.orderCode || order.poCode}</span>
                    {order.metersAllocated && (
                      <span className="text-emerald-600 dark:text-emerald-400">{order.metersAllocated}m Fabric</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Advance Stage Button */}
                    {!isFinished && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAdvanceStageOrder(order);
                        }}
                        className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                        title="Edit Challan & Move to Next Stage"
                      >
                        <Layers className="w-3 h-3" />
                        <span>Advance Stage</span>
                      </button>
                    )}

                    {/* Print Challan Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setChallanModalOrder(order);
                      }}
                      className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <FileText className="w-3 h-3" />
                      <span>Challan</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </section>

      {/* Order Details Drawer / Inspection Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-mono">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 p-6 rounded-2xl max-w-lg w-full shadow-2xl relative max-h-[85vh] overflow-y-auto"
            >
              <button
                onClick={() => setSelectedOrder(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-400 dark:text-neutral-500 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-4 pt-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                    {selectedOrder.challanNumber || `CH-2026-${selectedOrder.id.slice(-4)}`}
                  </span>
                  <span className="font-mono text-[10px] text-gray-400 uppercase">
                    {selectedOrder.orderCode || selectedOrder.poCode}
                  </span>
                </div>
                <h3 className="font-hanken font-extrabold text-xl text-gray-900 dark:text-neutral-100">
                  {selectedOrder.styleName || selectedOrder.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">
                  Current Contractor: {selectedOrder.contractorName || selectedOrder.assignedTo}
                </p>
              </div>

              <div className="space-y-4 text-xs">
                {/* Raw Material Allocation */}
                {selectedOrder.rawInventoryId && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs font-mono">
                    <div className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-400">Raw Material Allocation</div>
                    <div className="font-bold text-emerald-900 dark:text-emerald-300 mt-0.5">
                      {selectedOrder.metersAllocated || selectedOrder.metersRequired}m of {selectedOrder.fabricName}
                    </div>
                    <div className="text-[10px] text-emerald-600">Invoice No: {getOrderInvoiceNo(selectedOrder)}</div>
                  </div>
                )}

                {/* Stage Progress */}
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-neutral-950/40 border border-gray-100 dark:border-neutral-800/40">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-semibold text-gray-500">Current Lifecycle Stage</span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{selectedOrder.currentStage || selectedOrder.stage}</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 dark:bg-emerald-500 transition-all duration-300"
                      style={{ width: `${selectedOrder.progress || 15}%` }}
                    />
                  </div>
                </div>

                {/* Stage History */}
                {selectedOrder.stageHistory && selectedOrder.stageHistory.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                      Stage Audit History
                    </span>
                    <div className="border border-gray-100 dark:border-neutral-800 rounded-lg overflow-hidden divide-y divide-gray-100 dark:divide-neutral-800 text-[11px]">
                      {selectedOrder.stageHistory.map((s, idx) => (
                        <div key={idx} className="p-2 flex justify-between items-center bg-gray-50/50 dark:bg-neutral-950/30">
                          <div>
                            <span className="font-bold text-gray-900 dark:text-neutral-100">{s.stageName}</span>
                            <span className="text-gray-400 ml-1.5">({s.contractorName})</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{s.quantityCompleted || s.quantitySent} pcs</span>
                            <span className="text-[9px] text-gray-400 ml-1.5">{s.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons inside Drawer */}
                <div className="space-y-2 pt-2">
                  {/* Advance / Move Stage Button */}
                  {selectedOrder.currentStage !== 'Finished Goods' && selectedOrder.overallStatus !== 'Completed' && (
                    <button
                      onClick={() => {
                        setAdvanceStageOrder(selectedOrder);
                        setSelectedOrder(null);
                      }}
                      className="w-full h-10 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                    >
                      <Layers className="w-4 h-4" />
                      <span>Edit Challan &amp; Move to Next Stage</span>
                    </button>
                  )}

                  {/* Print Challan Button */}
                  <button
                    onClick={() => {
                      setChallanModalOrder(selectedOrder);
                      setSelectedOrder(null);
                    }}
                    className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                  >
                    <FileText className="w-4 h-4" />
                    <span>View / Print Official Production Challan</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Advance Stage Modal */}
      <AdvanceStageModal
        isOpen={!!advanceStageOrder}
        onClose={() => setAdvanceStageOrder(null)}
        order={advanceStageOrder}
        onAdvance={(updatedOrder) => {
          updateProductionOrder(updatedOrder);
          setAdvanceStageOrder(null);
        }}
      />

      {/* Create Production Order Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-mono">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 p-6 rounded-2xl max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto text-xs"
          >
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-neutral-800 pb-3 mb-4">
              <div>
                <h3 className="font-hanken font-bold text-base text-gray-900 dark:text-neutral-100">
                  New Garment Production Run
                </h3>
                <p className="text-[11px] text-gray-400">Generate persistent Challan &amp; assign to Cutting Contractor</p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
                    Challan Number
                  </label>
                  <input
                    type="text"
                    required
                    readOnly
                    value={challanNumber}
                    className="w-full px-3 py-2 bg-emerald-50/50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 font-bold text-emerald-800 dark:text-emerald-300 rounded outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-gray-500">
                    Order Code
                  </label>
                  <input
                    type="text"
                    required
                    value={orderCode}
                    onChange={(e) => setOrderCode(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gray-500">
                  Garment Style / Item Name
                </label>
                <input
                  type="text"
                  required
                  value={styleName}
                  onChange={(e) => setStyleName(e.target.value)}
                  placeholder="e.g. Slim Fit Indigo Denim Jeans"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded outline-none font-bold"
                />
              </div>

              {/* Raw Material Selection */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <ArrowRight className="w-3 h-3" />
                  Select Raw Fabric from Inventory
                </label>
                <select
                  value={selectedRawInventoryId}
                  onChange={(e) => setSelectedRawInventoryId(e.target.value)}
                  className="w-full px-3 py-2 bg-emerald-50/40 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded outline-none font-mono"
                >
                  <option value="">— Select raw denim roll —</option>
                  {availableRawMaterials.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.fabricName} — {r.availableMeters}m available — Inv: {getRawItemInvoiceNo(r)}
                    </option>
                  ))}
                </select>
              </div>

              {selectedRawMaterial && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <label className="uppercase font-bold text-gray-500">Fabric Meters to Allocate</label>
                    <span className="text-emerald-600 font-bold">Max: {selectedRawMaterial.availableMeters}m</span>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={selectedRawMaterial.availableMeters}
                    required
                    value={metersRequired}
                    onChange={(e) => setMetersRequired(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded outline-none font-bold"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-gray-500">
                    Target Planned Qty (Pcs)
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded outline-none font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-gray-500">
                    1. Cutting Contractor
                  </label>
                  <select
                    value={contractorName}
                    onChange={(e) => setContractorName(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded outline-none font-bold"
                    required
                  >
                    <option value="">-- Select Contractor --</option>
                    {contractors.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name} {c.specialty ? `(${c.specialty})` : ''}
                      </option>
                    ))}
                    <option value="In-House Cutting Unit">In-House Cutting Unit</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gray-500">
                  Target Completion Date
                </label>
                <input
                  type="date"
                  value={estimatedCompletion}
                  onChange={(e) => setEstimatedCompletion(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-neutral-800 rounded font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Order &amp; Issue Challan</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Production Challan / Receipt Printable Modal */}
      <ProductionChallanModal
        isOpen={!!challanModalOrder}
        onClose={() => setChallanModalOrder(null)}
        order={challanModalOrder}
      />
    </motion.div>
  );
}
