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
  ArrowRight,
  User,
  Phone,
  MapPin
} from 'lucide-react';
import { useFabriqData } from '../../context/FabriqDataContext';
import { ProductionChallanModal } from '../components/ProductionChallanModal';
import { AdvanceStageModal } from '../../admin/components/AdvanceStageModal';
import CreateProductionScreen from '../features/production/screens/CreateProductionScreen';
import { sortLatest } from '../../utils/sortUtils';

interface ProductionTabProps {
  key?: string;
  orders: ProductionOrder[];
  initialView?: 'list' | 'create';
  onClearInitialView?: () => void;
}

export default function ProductionTab({ orders, initialView, onClearInitialView }: ProductionTabProps) {
  const { contractors, rawInventory, purchases, finishedInventory, addProductionOrder, updateProductionOrder } = useFabriqData();

  const [view, setView] = useState<'list' | 'create'>(initialView || 'list');

  React.useEffect(() => {
    if (initialView) {
      setView(initialView);
      if (onClearInitialView) onClearInitialView();
    }
  }, [initialView, onClearInitialView]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  const [filterStage, setFilterStage] = useState<string>('All');

  // Modals state
  const [challanModalOrder, setChallanModalOrder] = useState<ProductionOrder | null>(null);
  const [advanceStageOrder, setAdvanceStageOrder] = useState<ProductionOrder | null>(null);

  const getOrderInvoiceNo = (po: ProductionOrder) => {
    const raw = rawInventory.find((r) => r.id === po.rawInventoryId);
    const p = purchases.find(
      (item) => item.id === raw?.purchaseId || item.invoiceNumber === po.rawBatchId || item.billNumber === po.rawBatchId
    );
    return (
      p?.billNumber ||
      raw?.billNumber ||
      p?.invoiceNumber ||
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

  const getStageContractorName = (po: ProductionOrder, stageName: string) => {
    if (stageName === 'Cutting') return po.cuttingContractor || po.stageContractors?.cutting || (po.stageHistory || []).find(s => s.stageName === 'Cutting')?.contractorName || (po.currentStage === 'Cutting' ? (po.contractorName || po.assignedTo) : '') || '-';
    if (stageName === 'Stitching') return po.stitchingContractor || po.stageContractors?.stitching || (po.stageHistory || []).find(s => s.stageName === 'Stitching')?.contractorName || (po.currentStage === 'Stitching' ? (po.contractorName || po.assignedTo) : '') || '-';
    if (stageName === 'Washing') return po.washingContractor || po.stageContractors?.washing || (po.stageHistory || []).find(s => s.stageName === 'Washing')?.contractorName || (po.currentStage === 'Washing' ? (po.contractorName || po.assignedTo) : '') || '-';
    if (stageName === 'Packaging' || stageName === 'Packing') return po.packagingContractor || po.stageContractors?.packaging || (po.stageHistory || []).find(s => s.stageName === 'Packaging' || s.stageName === 'Packing')?.contractorName || (po.currentStage === 'Packaging' || po.currentStage === 'Packing' ? (po.contractorName || po.assignedTo) : '') || '-';
    return '-';
  };

  const getContractorDetails = (name: string) => {
    if (!name || name === '-') return null;
    return contractors.find(c => c.name.trim().toLowerCase() === name.trim().toLowerCase()) || null;
  };

  // Search and filter logic (pending production orders shown above finished ones, latest first)
  const filteredOrders = useMemo(() => {
    const list = orders.filter(order => {
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
      if (filterStage === 'Packaging') {
        return matchesSearch && (order.currentStage === 'Packaging' || order.stage === 'Packaging' || order.currentStage === 'Packing' || order.stage === 'Packing');
      }
      return matchesSearch && (order.currentStage === filterStage || order.stage === filterStage);
    });

    return [...list].sort((a, b) => {
      const isFinishedA = a.currentStage === 'Finished Goods' || a.stage === 'Finished Goods' || a.status === 'Completed' || a.overallStatus === 'Completed' || (Number(a.progress) >= 100);
      const isFinishedB = b.currentStage === 'Finished Goods' || b.stage === 'Finished Goods' || b.status === 'Completed' || b.overallStatus === 'Completed' || (Number(b.progress) >= 100);

      // Pending (in-progress) orders come above finished ones
      if (!isFinishedA && isFinishedB) return -1;
      if (isFinishedA && !isFinishedB) return 1;

      // Within the same group, sort latest first
      const timeA = new Date(a.createdAt || a.startDate || 0).getTime();
      const timeB = new Date(b.createdAt || b.startDate || 0).getTime();
      return timeB - timeA;
    });
  }, [orders, searchQuery, filterStage]);

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'Cutting': return <Scissors className="w-3.5 h-3.5" />;
      case 'Stitching': return <Factory className="w-3.5 h-3.5" />;
      case 'Washing': return <Sparkles className="w-3.5 h-3.5" />;
      case 'Packaging':
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
      case 'Packaging':
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
      <AnimatePresence mode="wait">
        {view === 'create' ? (
          <CreateProductionScreen
            key="create-production-screen"
            onBack={() => setView('list')}
            onCreated={() => setView('list')}
          />
        ) : (
          <motion.div
            key="production-list-view"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
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
                onClick={() => setView('create')}
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
            placeholder="Search Challan #, garment style, or contractor..."
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
            <option value="Packaging">Packaging</option>
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
              onClick={() => setView('create')}
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
                    <span>Assigned: <strong className={isFinished ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-gray-900 dark:text-neutral-100"}>{isFinished ? 'Finished' : (order.contractorName || order.assignedTo)}</strong></span>
                    <span className="font-bold text-gray-900 dark:text-neutral-100">{progress}% Progress ({completedQty}/{totalQty} pcs)</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {/* Stage contractor badges */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${order.currentStage === 'Cutting' ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold border border-amber-300' : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400'}`}>
                      Cut: {getStageContractorName(order, 'Cutting')}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${order.currentStage === 'Stitching' ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold border border-amber-300' : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400'}`}>
                      Stt: {getStageContractorName(order, 'Stitching')}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${order.currentStage === 'Washing' ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold border border-amber-300' : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400'}`}>
                      Wash: {getStageContractorName(order, 'Washing')}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${order.currentStage === 'Packaging' ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold border border-amber-300' : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400'}`}>
                      Pack: {getStageContractorName(order, 'Packaging')}
                    </span>
                  </div>
                </div>

                {/* Footer Info & Quick Actions */}
                <div className="flex justify-between items-center text-[11px] text-gray-400 dark:text-neutral-500 pt-2 border-t border-gray-100 dark:border-neutral-800 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    {order.metersAllocated && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">{order.metersAllocated}m Fabric</span>
                    )}
                    {(order.dueDate || order.estimatedCompletionDate) && (
                      <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Due: {order.dueDate || order.estimatedCompletionDate}
                      </span>
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
          <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-mono">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 p-6 rounded-2xl max-w-lg w-full shadow-2xl relative max-h-[85vh] overflow-y-auto no-scrollbar"
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
                    <div className="text-[10px] text-emerald-600">Bill No: {getOrderInvoiceNo(selectedOrder)}</div>
                  </div>
                )}

                {/* 4-Stage Contractor Directory */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                      Stage Contractors &amp; Contacts
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                      Active: {selectedOrder.currentStage || selectedOrder.stage}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { stage: 'Cutting', name: getStageContractorName(selectedOrder, 'Cutting'), icon: Scissors },
                      { stage: 'Stitching', name: getStageContractorName(selectedOrder, 'Stitching'), icon: Factory },
                      { stage: 'Washing', name: getStageContractorName(selectedOrder, 'Washing'), icon: Sparkles },
                      { stage: 'Packaging', name: getStageContractorName(selectedOrder, 'Packaging'), icon: Box },
                      { stage: 'Finished Goods', name: selectedOrder.warehouse || selectedOrder.godown || 'Central Godown', icon: PackageCheck }
                    ].map(stg => {
                      const Icon = stg.icon;
                      const details = getContractorDetails(stg.name);
                      const isCurrentStage = (selectedOrder.currentStage || selectedOrder.stage) === stg.stage;

                      return (
                        <div
                          key={stg.stage}
                          className={`p-2.5 rounded-xl border text-xs transition-all ${
                            isCurrentStage
                              ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 shadow-xs'
                              : 'bg-gray-50/60 dark:bg-neutral-950/30 border-gray-100 dark:border-neutral-800'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="flex items-center gap-1 text-[10px] font-bold text-gray-500 uppercase">
                              <Icon className="w-3 h-3 text-emerald-600" />
                              <span>{stg.stage}</span>
                            </span>
                            {isCurrentStage && (
                              <span className="text-[8px] px-1.5 py-0.2 rounded-full bg-emerald-600 text-white font-bold">Active</span>
                            )}
                          </div>
                          <div className="font-bold text-gray-900 dark:text-neutral-100 truncate">
                            {stg.name && stg.name !== '-' ? stg.name : <span className="text-gray-400 italic font-normal">Not configured</span>}
                          </div>
                          {details?.phone && (
                            <div className="text-[10px] text-gray-500 dark:text-neutral-400 flex items-center gap-1 mt-0.5">
                              <Phone className="w-2.5 h-2.5 text-gray-400" />
                              <span>{details.phone}</span>
                            </div>
                          )}
                          {details?.location && (
                            <div className="text-[9px] text-gray-400 truncate mt-0.5 flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{details.location}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

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
                            {s.dueDate && (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono block">
                                Due: {s.dueDate}
                              </span>
                            )}
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

      {/* Production Challan / Receipt Printable Modal */}
      <ProductionChallanModal
        isOpen={!!challanModalOrder}
        onClose={() => setChallanModalOrder(null)}
        order={challanModalOrder}
      />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
