import React, { useState, useMemo } from 'react';
import {
  Factory,
  Plus,
  Search,
  Edit,
  Trash2,
  ArrowRight,
  PackageCheck,
  FileText,
  Layers,
  Scissors,
  Sparkles,
  Box,
  CheckCircle2,
  Printer,
  ChevronRight,
  TrendingUp,
  Clock
} from 'lucide-react';
import { useFabriqData } from '../../context/FabriqDataContext';
import { ProductionOrder, ProductionStage, StageHistoryEntry } from '../../types';
import { Badge, Modal, ConfirmDeleteModal } from '../components/AdminUIComponents';
import { ProductionChallanModal } from '../components/ProductionChallanModal';
import { AdvanceStageModal } from '../components/AdvanceStageModal';

export const ProductionManagementPage: React.FC = () => {
  const {
    productionOrders,
    contractors,
    rawInventory,
    addProductionOrder,
    updateProductionOrder,
    deleteProductionOrder
  } = useFabriqData();

  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('ALL');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProductionOrder | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<ProductionOrder | null>(null);

  // Challan & Advance Stage Modals
  const [challanOrder, setChallanOrder] = useState<ProductionOrder | null>(null);
  const [advanceStageOrder, setAdvanceStageOrder] = useState<ProductionOrder | null>(null);

  // Form Fields for Create / Edit
  const [orderCode, setOrderCode] = useState('');
  const [challanNumber, setChallanNumber] = useState('');
  const [styleName, setStyleName] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [contractorName, setContractorName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().substring(0, 10));
  const [estimatedCompletion, setEstimatedCompletion] = useState('');
  const [status, setStatus] = useState<ProductionOrder['status']>('In Progress');

  // Pipeline fields
  const [selectedRawInventoryId, setSelectedRawInventoryId] = useState('');
  const [metersRequired, setMetersRequired] = useState(0);
  const [producedItemName, setProducedItemName] = useState('');

  // Available raw materials for dropdown
  const availableRawMaterials = useMemo(() => {
    return rawInventory.filter(r => r.availableMeters > 0);
  }, [rawInventory]);

  const selectedRawMaterial = useMemo(() => {
    return rawInventory.find(r => r.id === selectedRawInventoryId);
  }, [rawInventory, selectedRawInventoryId]);

  // Generate next unique Challan Number
  const getNextChallanNumber = () => {
    let maxNum = 0;
    productionOrders.forEach((po) => {
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
    productionOrders.forEach((po) => {
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
    setEditingItem(null);
    setOrderCode(getNextOrderCode());
    setChallanNumber(getNextChallanNumber());
    setStyleName('');
    setQuantity(0);
    // Find a contractor with cutting specialty or fallback
    const cuttingContractor = contractors.find(c => c.specialty?.toLowerCase().includes('cut')) || contractors[0];
    setContractorName(cuttingContractor?.name || 'Cutting Department Unit 1');
    setStartDate(new Date().toISOString().substring(0, 10));
    setEstimatedCompletion('');
    setStatus('In Progress');
    setSelectedRawInventoryId('');
    setMetersRequired(0);
    setProducedItemName('');
    setIsModalOpen(true);
  };

  const openEditModal = (po: ProductionOrder) => {
    setEditingItem(po);
    setOrderCode(po.orderCode || po.poCode);
    setChallanNumber(po.challanNumber || `CH-2026-${po.id.slice(-4)}`);
    setStyleName(po.styleName || po.name);
    setQuantity(po.plannedQuantity || po.quantity || po.total);
    setContractorName(po.contractorName || po.assignedTo);
    setStartDate(po.startDate || new Date().toISOString().substring(0, 10));
    setEstimatedCompletion(po.estimatedCompletion || po.dueDate || '');
    setStatus(po.status || po.overallStatus || 'In Progress');
    setSelectedRawInventoryId(po.rawInventoryId || '');
    setMetersRequired(po.metersRequired || po.metersAllocated || 0);
    setProducedItemName(po.producedItemName || po.productName || po.styleName || po.name);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate meters against available stock for new orders
    if (!editingItem && selectedRawInventoryId && selectedRawMaterial) {
      if (metersRequired > selectedRawMaterial.availableMeters) {
        alert(`Cannot allocate ${metersRequired}m — only ${selectedRawMaterial.availableMeters}m available in raw inventory.`);
        return;
      }
    }

    if (editingItem) {
      updateProductionOrder({
        ...editingItem,
        orderCode,
        styleName,
        name: styleName,
        plannedQuantity: quantity,
        quantity,
        total: quantity,
        contractorName,
        assignedTo: contractorName,
        startDate,
        estimatedCompletion,
        dueDate: estimatedCompletion || editingItem.dueDate,
        status,
        overallStatus: status,
        producedItemName: producedItemName || styleName,
        productName: producedItemName || styleName
      });
    } else {
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
        remarks: 'Initial job order issued for fabric cutting'
      };

      addProductionOrder({
        poCode: orderCode,
        orderCode,
        challanNumber: challanNumber || getNextChallanNumber(),
        styleName,
        name: styleName,
        productName: producedItemName || styleName,
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
        rawBatchId: selectedRawMaterial?.batchId || undefined,
        fabricName: selectedRawMaterial?.fabricName || undefined,
        metersRequired: metersRequired || undefined,
        metersAllocated: metersRequired || undefined,
        producedItemName: producedItemName || styleName,
        inventoryTransferred: false
      } as any);
    }
    setIsModalOpen(false);
  };

  // Filtered orders
  const filteredOrders = productionOrders.filter((po) => {
    const code = po.orderCode || po.poCode || '';
    const ch = po.challanNumber || '';
    const style = po.styleName || po.name || '';
    const contractor = po.contractorName || po.assignedTo || '';
    const stageVal = po.currentStage || po.stage || '';

    const matchesSearch =
      code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ch.toLowerCase().includes(searchTerm.toLowerCase()) ||
      style.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contractor.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStage = stageFilter === 'ALL' || stageVal === stageFilter;

    return matchesSearch && matchesStage;
  });

  // KPI Metrics
  const activeCutting = productionOrders.filter(o => (o.currentStage === 'Cutting' || o.stage === 'Cutting') && o.overallStatus !== 'Completed').length;
  const activeStitching = productionOrders.filter(o => (o.currentStage === 'Stitching' || o.stage === 'Stitching') && o.overallStatus !== 'Completed').length;
  const activeWashingPacking = productionOrders.filter(o => (o.currentStage === 'Washing' || o.currentStage === 'Packing' || o.stage === 'Washing' || o.stage === 'Packing') && o.overallStatus !== 'Completed').length;
  const totalCompleted = productionOrders.filter(o => o.currentStage === 'Finished Goods' || o.overallStatus === 'Completed' || o.status === 'Completed').length;

  const getStageBadgeStyle = (stageName: string) => {
    switch (stageName) {
      case 'Cutting':
        return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800';
      case 'Stitching':
        return 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 border-sky-300 dark:border-sky-800';
      case 'Washing':
        return 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-800';
      case 'Packing':
        return 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border-indigo-300 dark:border-indigo-800';
      case 'Finished Goods':
        return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800';
      default:
        return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 mb-1">
            <Factory className="w-4 h-4" />
            <span>GARMENT PRODUCTION WORKFLOW &amp; CHALLAN PIPELINE</span>
          </div>
          <h1 className="font-hanken font-bold text-xl text-zinc-900 dark:text-zinc-100 tracking-tight">
            Production &amp; Job Challan Management
          </h1>
          <p className="text-xs font-mono text-zinc-500 mt-0.5">
            Single persistent Challan lifecycle: Cutting &rarr; Stitching &rarr; Washing &rarr; Packing &rarr; Finished Goods.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition-colors shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>NEW PRODUCTION ORDER</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 font-mono text-xs">
        <div className="p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-2xs">
          <span className="text-[10px] text-zinc-400 uppercase font-bold block">Total Production Orders</span>
          <span className="text-xl font-black text-zinc-900 dark:text-zinc-100 mt-1 block font-hanken">
            {productionOrders.length}
          </span>
          <span className="text-[10px] text-zinc-500 mt-1 block">Active pipeline batches</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-900/40 rounded-lg shadow-2xs">
          <span className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-bold flex items-center gap-1">
            <Scissors className="w-3 h-3" /> 1. Cutting Stage
          </span>
          <span className="text-xl font-black text-amber-700 dark:text-amber-400 mt-1 block font-hanken">
            {activeCutting}
          </span>
          <span className="text-[10px] text-zinc-500 mt-1 block">Fabrics in cutting</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-zinc-900 border border-sky-200 dark:border-sky-900/40 rounded-lg shadow-2xs">
          <span className="text-[10px] text-sky-600 dark:text-sky-400 uppercase font-bold flex items-center gap-1">
            <Factory className="w-3 h-3" /> 2. Stitching Stage
          </span>
          <span className="text-xl font-black text-sky-700 dark:text-sky-400 mt-1 block font-hanken">
            {activeStitching}
          </span>
          <span className="text-[10px] text-zinc-500 mt-1 block">Assembly &amp; stitching</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-zinc-900 border border-purple-200 dark:border-purple-900/40 rounded-lg shadow-2xs">
          <span className="text-[10px] text-purple-600 dark:text-purple-400 uppercase font-bold flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> 3-4. Wash &amp; Pack
          </span>
          <span className="text-xl font-black text-purple-700 dark:text-purple-400 mt-1 block font-hanken">
            {activeWashingPacking}
          </span>
          <span className="text-[10px] text-zinc-500 mt-1 block">Washing &amp; packaging</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-900/40 rounded-lg shadow-2xs col-span-2 lg:col-span-1">
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold flex items-center gap-1">
            <PackageCheck className="w-3 h-3" /> 5. Finished Goods
          </span>
          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block font-hanken">
            {totalCompleted}
          </span>
          <span className="text-[10px] text-zinc-500 mt-1 block">Deposited to inventory</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search Challan #, Order Code, Style..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-zinc-500">Stage Filter:</span>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Stages</option>
            <option value="Cutting">Cutting</option>
            <option value="Stitching">Stitching</option>
            <option value="Washing">Washing</option>
            <option value="Packing">Packing</option>
            <option value="Finished Goods">Finished Goods</option>
          </select>
        </div>
      </div>

      {/* Main Production Orders Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs overflow-x-auto">
        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead>
            <tr className="bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 uppercase tracking-wider text-[11px]">
              <th className="p-3 font-bold">Challan Number</th>
              <th className="p-3 font-bold">Order / Garment Style</th>
              <th className="p-3 font-bold">Raw Fabric Allocation</th>
              <th className="p-3 font-bold">Target Qty</th>
              <th className="p-3 font-bold">Current Stage</th>
              <th className="p-3 font-bold">Assigned Contractor</th>
              <th className="p-3 font-bold">Completed / Defects</th>
              <th className="p-3 font-bold">Status</th>
              <th className="p-3 font-bold text-right">Workflow Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-zinc-500">
                  <Factory className="w-8 h-8 mx-auto text-zinc-400 mb-2 opacity-50" />
                  <p className="font-bold">No production orders found.</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Click "NEW PRODUCTION ORDER" to launch a garment run with a persistent Challan Number.</p>
                </td>
              </tr>
            ) : (
              filteredOrders.map((po, idx) => {
                const currentStageName = (po.currentStage || po.stage || 'Cutting') as ProductionStage;
                const isFinished = currentStageName === 'Finished Goods' || po.overallStatus === 'Completed' || po.status === 'Completed';
                const totalRej = (po.stageHistory || []).reduce((acc, s) => acc + (s.rejectedQuantity || 0), 0) || po.defectiveQuantity || 0;
                const goodOutput = po.finalQuantity || po.completedQuantity || po.completed || 0;

                return (
                  <tr key={`${po.id}-${idx}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    {/* Challan Number Badge */}
                    <td className="p-3">
                      <span className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold rounded text-[11px] block text-center">
                        {po.challanNumber || `CH-2026-${po.id.slice(-4)}`}
                      </span>
                    </td>

                    {/* Order Code & Style */}
                    <td className="p-3">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100 font-hanken text-sm">
                        {po.styleName || po.name}
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                        Code: {po.orderCode || po.poCode}
                      </div>
                    </td>

                    {/* Raw Fabric */}
                    <td className="p-3">
                      {po.rawInventoryId ? (
                        <div>
                          <div className="text-zinc-800 dark:text-zinc-200 text-[11px] font-bold">{po.fabricName || 'Raw Fabric'}</div>
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">{po.metersAllocated || po.metersRequired}m allocated</div>
                          <div className="text-[9px] text-zinc-400">Batch: {po.rawBatchId}</div>
                        </div>
                      ) : (
                        <span className="text-[10px] text-zinc-400">Direct In-House Stock</span>
                      )}
                    </td>

                    {/* Target Batch Qty */}
                    <td className="p-3 text-zinc-800 dark:text-zinc-200 font-bold">
                      {(po.plannedQuantity || po.quantity || po.total).toLocaleString()} Pcs
                    </td>

                    {/* Current Stage */}
                    <td className="p-3">
                      <span className={`px-2 py-0.5 text-[10px] font-bold border rounded ${getStageBadgeStyle(currentStageName)} flex items-center gap-1 w-fit`}>
                        {currentStageName === 'Cutting' && <Scissors className="w-3 h-3" />}
                        {currentStageName === 'Stitching' && <Factory className="w-3 h-3" />}
                        {currentStageName === 'Washing' && <Sparkles className="w-3 h-3" />}
                        {currentStageName === 'Packing' && <Box className="w-3 h-3" />}
                        {currentStageName === 'Finished Goods' && <PackageCheck className="w-3 h-3" />}
                        <span>{currentStageName}</span>
                      </span>
                    </td>

                    {/* Contractor */}
                    <td className="p-3 text-zinc-800 dark:text-zinc-200">
                      <div className="font-bold">{po.contractorName || po.assignedTo || 'Unassigned'}</div>
                      <div className="text-[10px] text-zinc-400">Challan Receiver</div>
                    </td>

                    {/* Completed OK / Rejections */}
                    <td className="p-3 text-zinc-700 dark:text-zinc-300">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">{goodOutput.toLocaleString()} Pcs OK</span>
                      {totalRej > 0 && (
                        <div className="text-[10px] text-rose-600 font-bold">({totalRej} Rejects)</div>
                      )}
                    </td>

                    {/* Overall Status */}
                    <td className="p-3">
                      <Badge status={po.status || po.overallStatus} />
                      {isFinished && (
                        <span className="mt-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded">
                          <PackageCheck className="w-2.5 h-2.5" />
                          → INVENTORY
                        </span>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {/* Print / View Challan */}
                        <button
                          onClick={() => setChallanOrder(po)}
                          className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          title="View / Print Official Production Challan"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>CHALLAN</span>
                        </button>

                        {/* Advance Stage (if not finished) */}
                        {!isFinished ? (
                          <button
                            onClick={() => setAdvanceStageOrder(po)}
                            className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                            title="Complete Stage & Forward with Same Challan"
                          >
                            <Layers className="w-3.5 h-3.5" />
                            <span>ADVANCE</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setChallanOrder(po)}
                            className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700 rounded text-xs font-bold flex items-center gap-1 cursor-pointer"
                            title="Order Completed in Finished Goods"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>DONE</span>
                          </button>
                        )}

                        {/* Edit Modal */}
                        <button
                          onClick={() => openEditModal(po)}
                          className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                          title="Edit Order"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Modal */}
                        <button
                          onClick={() => setDeleteCandidate(po)}
                          className="p-1 text-rose-500 hover:text-rose-700 border border-rose-200 dark:border-rose-900/50 rounded hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors cursor-pointer"
                          title="Delete Order"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Form: Create / Edit Order */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? `Edit Production Order (${editingItem.orderCode || editingItem.poCode})` : 'Create New Garment Production Order'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Auto Challan Number */}
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400">
                Persistent Challan Number
              </label>
              <input
                type="text"
                required
                readOnly={!!editingItem}
                value={challanNumber}
                onChange={(e) => setChallanNumber(e.target.value)}
                placeholder="CH-2026-0001"
                className="w-full px-3 py-2 bg-emerald-50/50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300 outline-none"
              />
              <div className="text-[10px] text-zinc-400">Retained throughout Cutting, Stitching, Washing, Packing &amp; Inventory</div>
            </div>

            {/* Order Code */}
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Production Order Code</label>
              <input
                type="text"
                required
                value={orderCode}
                onChange={(e) => setOrderCode(e.target.value)}
                placeholder="PRD-2026-001"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              />
            </div>

            {/* Garment Style Name */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Garment Style / Product Name</label>
              <input
                type="text"
                required
                value={styleName}
                onChange={(e) => setStyleName(e.target.value)}
                placeholder="e.g. Slim Fit Indigo Denim Jeans"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              />
            </div>

            {/* === PIPELINE: Raw Material Selection === */}
            {!editingItem && (
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <ArrowRight className="w-3 h-3" />
                  RAW FABRIC ALLOCATION (INVENTORY PIPELINE)
                </label>
                <select
                  value={selectedRawInventoryId}
                  onChange={(e) => setSelectedRawInventoryId(e.target.value)}
                  className="w-full px-3 py-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs font-mono outline-none focus:border-emerald-500"
                >
                  <option value="">— Select raw denim from inventory —</option>
                  {availableRawMaterials.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.fabricName} ({r.color}) — {r.availableMeters}m available — Batch: {r.batchId} — {r.warehouse}
                    </option>
                  ))}
                </select>
                {availableRawMaterials.length === 0 && (
                  <div className="text-[10px] font-mono text-amber-600 dark:text-amber-400 mt-1">
                    ⚠ No raw materials in inventory. Create a "Received" purchase first.
                  </div>
                )}
              </div>
            )}

            {!editingItem && selectedRawMaterial && (
              <div className="space-y-1 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold uppercase text-zinc-500">
                    Meters to Allocate (Available: {selectedRawMaterial.availableMeters}m)
                  </label>
                  <span className="text-[10px] font-mono text-emerald-600">
                    Cost: ₹{selectedRawMaterial.costPerMeter}/m | Batch: {selectedRawMaterial.batchId}
                  </span>
                </div>
                <input
                  type="number"
                  required
                  min={1}
                  max={selectedRawMaterial.availableMeters}
                  value={metersRequired}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val <= selectedRawMaterial.availableMeters) {
                      setMetersRequired(val);
                    }
                  }}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
                />
                {metersRequired > 0 && (
                  <div className="flex items-center gap-1.5 mt-1 px-2 py-1.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded text-[10px] font-mono text-emerald-700 dark:text-emerald-400">
                    <ArrowRight className="w-3 h-3" />
                    <span className="font-bold">PIPELINE:</span> {metersRequired}m will be deducted from Raw Stock ({selectedRawMaterial.availableMeters - metersRequired}m remaining).
                  </div>
                )}
              </div>
            )}

            {/* Target Production Quantity */}
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Target Production Quantity (Pcs)</label>
              <input
                type="number"
                required
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              />
            </div>

            {/* Cutting Contractor (Initial stage assignment) */}
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">
                1. Initial Stage: Cutting Contractor
              </label>
              <select
                value={contractorName}
                onChange={(e) => setContractorName(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500 font-bold"
                required
              >
                <option value="">-- Select Cutting Contractor --</option>
                {contractors.map((c, idx) => (
                  <option key={`${c.id}-${idx}`} value={c.name}>
                    {c.name} {c.specialty ? `(${c.specialty})` : ''}
                  </option>
                ))}
                <option value="In-House Cutting Unit">In-House Cutting Unit</option>
              </select>
            </div>

            {/* Estimated Completion Date */}
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Estimated Delivery Date</label>
              <input
                type="date"
                value={estimatedCompletion}
                onChange={(e) => setEstimatedCompletion(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              />
            </div>

            {/* Overall Status */}
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Overall Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              >
                <option value="In Progress">In Progress</option>
                <option value="Planned">Planned</option>
                <option value="On Hold">On Hold</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-mono font-bold border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold uppercase tracking-wider"
            >
              {editingItem ? 'SAVE CHANGES' : 'CREATE ORDER & GENERATE CHALLAN'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Production Challan / Receipt Printable Modal */}
      <ProductionChallanModal
        isOpen={!!challanOrder}
        onClose={() => setChallanOrder(null)}
        order={challanOrder}
      />

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

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <ConfirmDeleteModal
          isOpen={!!deleteCandidate}
          onClose={() => setDeleteCandidate(null)}
          onConfirm={() => deleteProductionOrder(deleteCandidate.id)}
          itemName={`Run Order ${deleteCandidate.orderCode || deleteCandidate.poCode} (Challan: ${deleteCandidate.challanNumber})`}
          itemType="Production Run"
        />
      )}
    </div>
  );
};
