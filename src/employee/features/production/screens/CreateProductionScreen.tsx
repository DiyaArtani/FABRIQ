import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Factory,
  Scissors,
  Layers,
  Calendar,
  AlertCircle,
  PackageCheck,
  User,
  ArrowRight,
  ShieldCheck,
  Building2,
  Sparkles,
  Box
} from 'lucide-react';
import { useFabriqData } from '../../../../context/FabriqDataContext';
import { StageHistoryEntry } from '../../../../types';

interface CreateProductionScreenProps {
  key?: string;
  onBack: () => void;
  onCreated: () => void;
}

export default function CreateProductionScreen({ onBack, onCreated }: CreateProductionScreenProps) {
  const {
    productionOrders,
    contractors,
    rawInventory,
    finishedInventory,
    addProductionOrder
  } = useFabriqData();

  // Contractor specialty filters
  const cuttingContractors = useMemo(() => contractors.filter(c => c.specialty?.toLowerCase().includes('cut') && c.status !== 'Inactive'), [contractors]);
  const stitchingContractors = useMemo(() => contractors.filter(c => c.specialty?.toLowerCase().includes('stitch') && c.status !== 'Inactive'), [contractors]);
  const washingContractors = useMemo(() => contractors.filter(c => (c.specialty?.toLowerCase().includes('wash') || c.specialty?.toLowerCase().includes('laundry') || c.specialty?.toLowerCase().includes('dry')) && c.status !== 'Inactive'), [contractors]);
  const packagingContractors = useMemo(() => contractors.filter(c => (c.specialty?.toLowerCase().includes('pack') || c.specialty?.toLowerCase().includes('finish')) && c.status !== 'Inactive'), [contractors]);

  // Compute Next Challan Number
  const nextChallanNumber = useMemo(() => {
    let max = 0;
    productionOrders.forEach(p => {
      const match = (p.challanNumber || '').match(/CH-\d{4}-(\d+)/);
      if (match) {
        const val = parseInt(match[1], 10);
        if (val > max) max = val;
      }
    });
    return `CH-2026-${String(max + 1).padStart(4, '0')}`;
  }, [productionOrders]);

  const nextOrderCode = useMemo(() => {
    let max = 0;
    productionOrders.forEach(p => {
      const match = (p.poCode || p.orderCode || '').match(/PO-(\d+)/);
      if (match) {
        const val = parseInt(match[1], 10);
        if (val > max) max = val;
      }
    });
    return `PO-${String(max + 1).padStart(3, '0')}`;
  }, [productionOrders]);

  // Form State
  const [styleName, setStyleName] = useState('');
  const [quantity, setQuantity] = useState<number>(100);
  const [selectedRawInventoryId, setSelectedRawInventoryId] = useState('');
  const [metersRequired, setMetersRequired] = useState<number>(0);

  const [cuttingContractor, setCuttingContractor] = useState(cuttingContractors[0]?.name || '');
  const [stitchingContractor, setStitchingContractor] = useState(stitchingContractors[0]?.name || '');
  const [washingContractor, setWashingContractor] = useState(washingContractors[0]?.name || '');
  const [packagingContractor, setPackagingContractor] = useState(packagingContractors[0]?.name || '');

  const [startDate, setStartDate] = useState(new Date().toISOString().substring(0, 10));
  const [estimatedCompletion, setEstimatedCompletion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available raw fabrics
  const availableRawMaterials = useMemo(() => {
    return (rawInventory || []).filter(r => r.availableMeters > 0);
  }, [rawInventory]);

  const selectedRawMaterial = useMemo(() => {
    return availableRawMaterials.find(r => r.id === selectedRawInventoryId) || null;
  }, [availableRawMaterials, selectedRawInventoryId]);

  const getRawItemInvoiceNo = (item: any) => {
    return item.purchaseInvoiceNo || item.invoiceNumber || item.billNumber || item.batchId || 'N/A';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!styleName.trim()) {
      alert('Please enter a garment style or item name.');
      return;
    }

    if (quantity <= 0) {
      alert('Target quantity must be greater than 0.');
      return;
    }

    if (selectedRawInventoryId && selectedRawMaterial) {
      if (metersRequired > selectedRawMaterial.availableMeters) {
        alert(`Cannot allocate ${metersRequired}m — only ${selectedRawMaterial.availableMeters}m available in selected raw fabric.`);
        return;
      }
    }

    setIsSubmitting(true);

    const baseChallan = nextChallanNumber.replace(/-(CUT|STT|WSH|PKG|FG|STG\d+)$/i, '');
    const initialStageChallan = `${baseChallan}-CUT`;

    const activeCuttingName = cuttingContractor || cuttingContractors[0]?.name || 'Cutting Department';
    const selectedContractorObj = contractors.find(c => c.name === activeCuttingName);

    const initialCuttingStage: StageHistoryEntry = {
      stageName: 'Cutting',
      contractorId: selectedContractorObj?.id || '',
      contractorName: activeCuttingName,
      contractorPhone: selectedContractorObj?.phone || '',
      contractorLocation: selectedContractorObj?.location || '',
      quantitySent: quantity,
      quantityReceived: 0,
      quantityCompleted: 0,
      rejectedQuantity: 0,
      wastageQuantity: 0,
      assignedDate: startDate || new Date().toISOString().substring(0, 10),
      completedDate: '',
      challanNumber: initialStageChallan,
      status: 'In Progress',
      remarks: 'Initial production order launched and sent to Cutting'
    };

    addProductionOrder({
      poCode: nextOrderCode,
      orderCode: nextOrderCode,
      challanNumber: initialStageChallan,
      styleName: styleName.trim(),
      name: styleName.trim(),
      productName: styleName.trim(),
      plannedQuantity: quantity,
      quantity: quantity,
      total: quantity,
      completed: 0,
      completedQuantity: 0,
      defectiveQuantity: 0,
      totalRejectedQuantity: 0,
      currentStage: 'Cutting',
      stage: 'Cutting',
      progress: 15,
      assignedTo: activeCuttingName,
      contractorName: activeCuttingName,
      cuttingContractor: activeCuttingName,
      stitchingContractor: stitchingContractor || '',
      washingContractor: washingContractor || '',
      packagingContractor: packagingContractor || '',
      stageContractors: {
        cutting: activeCuttingName,
        stitching: stitchingContractor || '',
        washing: washingContractor || '',
        packaging: packagingContractor || ''
      },
      startDate: startDate || new Date().toISOString().substring(0, 10),
      estimatedCompletion: estimatedCompletion || '',
      dueDate: estimatedCompletion || startDate,
      status: 'In Progress',
      overallStatus: 'In Progress',
      createdAt: new Date().toISOString(),
      stageHistory: [initialCuttingStage],
      rawInventoryId: selectedRawInventoryId || undefined,
      rawBatchId: selectedRawMaterial ? getRawItemInvoiceNo(selectedRawMaterial) : undefined,
      fabricName: selectedRawMaterial?.fabricName || undefined,
      metersRequired: metersRequired || undefined,
      metersAllocated: metersRequired || undefined,
      producedItemName: styleName.trim(),
      inventoryTransferred: false
    } as any);

    setIsSubmitting(false);
    onCreated();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.25 }}
      className="max-w-4xl mx-auto pb-28 text-gray-900 dark:text-neutral-100 font-mono"
    >
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-gray-200 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-700 dark:text-neutral-300 transition-colors shadow-2xs cursor-pointer flex items-center justify-center"
            title="Back to Production Orders"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-hanken text-2xl font-black text-gray-900 dark:text-neutral-100 tracking-tight">
                New Production Order
              </h1>
              <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-md">
                {nextChallanNumber}-CUT
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5 font-sans">
              Launch garment manufacturing run with single persistent Challan tracking
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || !styleName.trim() || quantity <= 0}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-300 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          <Factory className="w-4 h-4" />
          <span>{isSubmitting ? 'LAUNCHING...' : 'LAUNCH PRODUCTION RUN'}</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Section 1: Garment Style & Order Target */}
        <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 pb-2 border-b border-gray-100 dark:border-neutral-800/80">
            <PackageCheck className="w-4 h-4" />
            <span>1. Garment Style & Target Batch Size</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-600 dark:text-neutral-400 uppercase tracking-wider">
                Garment Style / Item Name *
              </label>
              <input
                type="text"
                required
                value={styleName}
                onChange={(e) => setStyleName(e.target.value)}
                placeholder="e.g. Slim Fit Indigo Denim Jeans"
                list="emp-existing-styles-list"
                className="w-full h-11 px-3.5 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs font-bold text-gray-900 dark:text-neutral-100"
              />
              <datalist id="emp-existing-styles-list">
                {Array.from(new Set([
                  ...finishedInventory.map(f => f.productName || f.itemName || f.styleName).filter(Boolean),
                  ...productionOrders.map(p => p.productName || p.styleName || p.name).filter(Boolean)
                ])).map((name, idx) => (
                  <option key={idx} value={name as string} />
                ))}
              </datalist>
              <p className="text-[10px] text-gray-400">
                Matches or creates finished goods stock entry upon final stage inwarding.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-600 dark:text-neutral-400 uppercase tracking-wider">
                Planned Target Quantity (Pcs) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  required
                  min={1}
                  value={quantity || ''}
                  onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
                  placeholder="100"
                  className="w-full h-11 px-3.5 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs font-bold text-gray-900 dark:text-neutral-100 font-mono"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold pointer-events-none">
                  Pcs
                </span>
              </div>
              <p className="text-[10px] text-gray-400">
                Total units expected from this batch run through all stages.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Raw Material Allocation */}
        <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-neutral-800/80">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              <Layers className="w-4 h-4" />
              <span>2. Raw Fabric Roll Allocation (Optional)</span>
            </div>
            {selectedRawMaterial && (
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                Available: {selectedRawMaterial.availableMeters}m
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-600 dark:text-neutral-400 uppercase tracking-wider">
                Select Raw Fabric Roll
              </label>
              <select
                value={selectedRawInventoryId}
                onChange={(e) => {
                  setSelectedRawInventoryId(e.target.value);
                  const mat = availableRawMaterials.find(r => r.id === e.target.value);
                  if (mat && metersRequired === 0) {
                    setMetersRequired(Math.min(quantity * 1.5, mat.availableMeters));
                  }
                }}
                className="w-full h-11 px-3.5 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs font-mono text-gray-800 dark:text-neutral-200 cursor-pointer"
              >
                <option value="">— In-House Fabric / None —</option>
                {availableRawMaterials.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.fabricName} ({r.availableMeters}m) — {r.warehouse || 'Godown'} — Bill: {getRawItemInvoiceNo(r)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-600 dark:text-neutral-400 uppercase tracking-wider">
                Meters to Allocate
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={selectedRawMaterial ? selectedRawMaterial.availableMeters : undefined}
                  step="any"
                  value={metersRequired || ''}
                  onChange={(e) => setMetersRequired(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 150"
                  disabled={!selectedRawInventoryId}
                  className="w-full h-11 px-3.5 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs font-bold text-gray-900 dark:text-neutral-100 font-mono disabled:opacity-50"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold pointer-events-none">
                  Meters
                </span>
              </div>
            </div>
          </div>

          {selectedRawMaterial && (
            <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl flex items-center justify-between text-xs">
              <span className="text-emerald-900 dark:text-emerald-300 font-bold">
                {selectedRawMaterial.fabricName} (Storage: {selectedRawMaterial.warehouse || 'Central Warehouse'})
              </span>
              <span className="text-emerald-700 dark:text-emerald-400 font-mono">
                Bill Ref: {getRawItemInvoiceNo(selectedRawMaterial)}
              </span>
            </div>
          )}
        </div>

        {/* Section 3: Stage Contractors Pipeline */}
        <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 pb-2 border-b border-gray-100 dark:border-neutral-800/80">
            <User className="w-4 h-4" />
            <span>3. Assign Stage Contractors (Manufacturing Pipeline)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Cutting */}
            <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-xl space-y-2">
              <label className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                <Scissors className="w-3.5 h-3.5" />
                <span>1. Cutting Unit *</span>
              </label>
              <select
                value={cuttingContractor}
                onChange={(e) => setCuttingContractor(e.target.value)}
                className="w-full h-9 px-2 bg-white dark:bg-neutral-900 border border-amber-300 dark:border-amber-700 rounded-lg text-xs font-bold text-gray-800 dark:text-neutral-200 outline-none"
                required
              >
                <option value="">Select Contractor</option>
                {cuttingContractors.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Stitching */}
            <div className="p-3 bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/50 rounded-xl space-y-2">
              <label className="text-[10px] uppercase font-bold text-sky-800 dark:text-sky-300 flex items-center gap-1">
                <Factory className="w-3.5 h-3.5" />
                <span>2. Stitching Unit</span>
              </label>
              <select
                value={stitchingContractor}
                onChange={(e) => setStitchingContractor(e.target.value)}
                className="w-full h-9 px-2 bg-white dark:bg-neutral-900 border border-sky-300 dark:border-sky-700 rounded-lg text-xs font-bold text-gray-800 dark:text-neutral-200 outline-none"
              >
                <option value="">Select Contractor</option>
                {stitchingContractors.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Washing */}
            <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/50 rounded-xl space-y-2">
              <label className="text-[10px] uppercase font-bold text-purple-800 dark:text-purple-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>3. Washing Unit</span>
              </label>
              <select
                value={washingContractor}
                onChange={(e) => setWashingContractor(e.target.value)}
                className="w-full h-9 px-2 bg-white dark:bg-neutral-900 border border-purple-300 dark:border-purple-700 rounded-lg text-xs font-bold text-gray-800 dark:text-neutral-200 outline-none"
              >
                <option value="">Select Contractor</option>
                {washingContractors.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Packaging */}
            <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/50 rounded-xl space-y-2">
              <label className="text-[10px] uppercase font-bold text-indigo-800 dark:text-indigo-300 flex items-center gap-1">
                <Box className="w-3.5 h-3.5" />
                <span>4. Packaging Unit</span>
              </label>
              <select
                value={packagingContractor}
                onChange={(e) => setPackagingContractor(e.target.value)}
                className="w-full h-9 px-2 bg-white dark:bg-neutral-900 border border-indigo-300 dark:border-indigo-700 rounded-lg text-xs font-bold text-gray-800 dark:text-neutral-200 outline-none"
              >
                <option value="">Select Contractor</option>
                {packagingContractors.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 4: Timeline & Schedule */}
        <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 pb-2 border-b border-gray-100 dark:border-neutral-800/80">
            <Calendar className="w-4 h-4" />
            <span>4. Production Timeline</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-600 dark:text-neutral-400 uppercase tracking-wider">
                Start Date
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-11 px-3.5 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs font-bold text-gray-900 dark:text-neutral-100"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-600 dark:text-neutral-400 uppercase tracking-wider">
                Estimated Target Completion
              </label>
              <input
                type="date"
                min={startDate}
                value={estimatedCompletion}
                onChange={(e) => setEstimatedCompletion(e.target.value)}
                className="w-full h-11 px-3.5 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs font-bold text-gray-900 dark:text-neutral-100"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-full sm:w-auto px-6 py-3 bg-white dark:bg-neutral-900 border border-gray-300 dark:border-neutral-700 rounded-xl text-xs font-bold text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !styleName.trim() || quantity <= 0}
            className="w-full sm:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-300 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-600/10 cursor-pointer transition-all uppercase tracking-wider"
          >
            <Factory className="w-4 h-4" />
            <span>{isSubmitting ? 'Launching...' : 'Confirm & Launch Production Run'}</span>
          </button>
        </div>
      </form>
    </motion.div>
  );
}
