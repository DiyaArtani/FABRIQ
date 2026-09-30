import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { ProductionOrder, RawInventoryItem, FinishedInventoryItem } from '../../types';
import { useFabriqData } from '../../context/FabriqDataContext';
import {
  Factory,
  ChevronRight,
  Warehouse as WarehouseIcon,
  Layers,
  ScrollText,
  Package,
  Boxes,
  MapPin,
  CheckCircle2,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { sortLatest } from '../../utils/sortUtils';

interface HomeTabProps {
  key?: string;
  productionOrders?: ProductionOrder[];
  onQuickAction?: (actionType: 'new_order' | 'add_stock' | 'invoice' | 'new_purchase' | 'add_customer') => void;
  onSelectOrder?: (order: ProductionOrder) => void;
  onNavigateToTab: (tabId: string) => void;
  lowStockItemsCount?: number;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
}

export default function HomeTab({
  onSelectOrder,
  onNavigateToTab
}: HomeTabProps) {
  const {
    productionOrders = [],
    warehouses = [],
    rawInventory = [],
    finishedInventory = []
  } = useFabriqData();

  const [inventoryTab, setInventoryTab] = useState<'raw' | 'finished'>('raw');

  // 1. KPI Calculations for Today's Production Summary (Dynamic & Real without pending/queued orders)
  const totalOrdersCount = productionOrders.length;

  const runningOrders = productionOrders.filter(
    o => o.status === 'In Progress' || o.status === 'ACTIVE' || o.status === 'Active' || o.status === 'On Track' ||
      (o.status !== 'Completed' && o.status !== 'On Hold' && o.status !== 'Cancelled' && o.currentStage !== 'Finished Goods')
  );
  const runningOrdersCount = runningOrders.length;

  const completedOrders = productionOrders.filter(
    o => o.status === 'Completed' || o.overallStatus === 'Completed' || o.currentStage === 'Finished Goods'
  );
  const completedOrdersCount = completedOrders.length;

  const delayedOrders = productionOrders.filter(
    o => o.status === 'On Hold' || o.status === 'Paused' || o.overallStatus === 'On Hold'
  );
  const delayedOrdersCount = delayedOrders.length;

  // 2. Active Orders (Top 5 dynamic production orders, pending above finished)
  const displayActiveOrders = useMemo(() => {
    return [...productionOrders]
      .filter(o => o.status !== 'Cancelled')
      .sort((a, b) => {
        const isFinA = a.status === 'Completed' || a.overallStatus === 'Completed' || a.currentStage === 'Finished Goods' || (Number(a.progress) >= 100);
        const isFinB = b.status === 'Completed' || b.overallStatus === 'Completed' || b.currentStage === 'Finished Goods' || (Number(b.progress) >= 100);
        if (!isFinA && isFinB) return -1;
        if (isFinA && !isFinB) return 1;
        return new Date(b.createdAt || b.startDate || 0).getTime() - new Date(a.createdAt || a.startDate || 0).getTime();
      })
      .slice(0, 5);
  }, [productionOrders]);

  // 3. Raw Inventory Calculations
  const activeRawList = useMemo(() => {
    const active = (rawInventory || []).filter(item => {
      const avail = Number(item.availableMeters) || 0;
      return avail > 0 && item.status !== 'Depleted';
    });
    return sortLatest(active);
  }, [rawInventory]);

  const totalRawAvailableMeters = useMemo(() => {
    return (rawInventory || []).reduce((acc, item) => acc + (Number(item.availableMeters) || 0), 0);
  }, [rawInventory]);

  const totalRawAllocatedMeters = useMemo(() => {
    return (rawInventory || []).reduce((acc, item) => acc + (Number(item.allocatedMeters) || 0), 0);
  }, [rawInventory]);

  // 4. Finished Goods Inventory Calculations
  const activeFinishedList = useMemo(() => {
    const active = (finishedInventory || []).filter(item => {
      const avail = Number(item.availableQuantity ?? item.unitsAvailable ?? 0);
      return avail > 0 && item.status !== 'Sold Out' && item.status !== 'Out of Stock';
    });
    return sortLatest(active);
  }, [finishedInventory]);

  const totalFinishedAvailableUnits = useMemo(() => {
    return (finishedInventory || []).reduce(
      (acc, item) => acc + (Number(item.availableQuantity ?? item.unitsAvailable ?? 0)),
      0
    );
  }, [finishedInventory]);

  const totalFinishedProducedUnits = useMemo(() => {
    return (finishedInventory || []).reduce(
      (acc, item) => acc + (Number(item.totalProduced ?? item.unitsProduced ?? 0)),
      0
    );
  }, [finishedInventory]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18 }}
      className="space-y-6 select-none font-sans text-zinc-900 dark:text-zinc-100 max-w-6xl mx-auto pb-8"
    >
      {/* =========================================================================
          SECTION 1: HEADER
          ========================================================================= */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 shadow-2xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg shadow-xs overflow-hidden flex items-center justify-center flex-shrink-0">
            <img src="/logo.png" alt="Fabriq Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="font-hanken text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
              Fabriq ERP
            </h1>
            <p className="text-xs font-mono text-zinc-500">
              Live Production &amp; Material Floor Overview
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Floor Operational
          </span>
        </div>
      </div>

      {/* =========================================================================
          SECTION 2: PRODUCTION SUMMARY (4 ACCURATE OPERATIONAL KPI CARDS)
          ========================================================================= */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Factory className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-hanken font-extrabold text-sm text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              Production Summary
            </h2>
          </div>
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Operational Batches</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
          {/* Card 1: Total Orders */}
          <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 uppercase font-bold block">
                Total Orders
              </span>
              <span className="text-2xl font-black text-zinc-900 dark:text-zinc-50 mt-1 block">
                {totalOrdersCount}
              </span>
            </div>
            <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold rounded">
              All Batches
            </span>
          </div>

          {/* Card 2: Running Orders */}
          <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 uppercase font-bold block">
                Running Orders
              </span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                {runningOrdersCount}
              </span>
            </div>
            <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded">
              In Production
            </span>
          </div>

          {/* Card 3: Completed Goods */}
          <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 uppercase font-bold block">
                Completed
              </span>
              <span className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1 block">
                {completedOrdersCount}
              </span>
            </div>
            <span className="px-2 py-0.5 bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/60 text-sky-700 dark:text-sky-400 text-[10px] font-bold rounded">
              Finished Goods
            </span>
          </div>

          {/* Card 4: Delayed / On Hold Orders */}
          <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 uppercase font-bold block">
                Delayed Orders
              </span>
              <span className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 block">
                {delayedOrdersCount}
              </span>
            </div>
            <span className="px-2 py-0.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-400 text-[10px] font-bold rounded">
              Attention Needed
            </span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: ACTIVE PRODUCTION OVERVIEW (LATEST 4-5 ORDERS)
          ========================================================================= */}
      <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-hanken font-extrabold text-sm text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              Active Production Overview
            </h2>
          </div>
          <button
            onClick={() => onNavigateToTab('production')}
            className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
          >
            View All Production Orders <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 4 to 5 Active Order Cards */}
        <div className="space-y-3">
          {displayActiveOrders.length === 0 ? (
            <div className="p-6 text-center text-xs font-mono text-zinc-500 bg-zinc-50/50 dark:bg-zinc-950/50 rounded-md border border-dashed border-zinc-200 dark:border-zinc-800">
              No active production orders found.
            </div>
          ) : (
            displayActiveOrders.map((order, idx) => {
              const isDelayed = order.status === 'On Hold' || order.status === 'Paused';
              const progressVal = order.progress || Math.min(100, Math.round(((order.completed || 0) / (order.total || 1)) * 100)) || 0;

              return (
                <div
                  key={`${order.id}-${idx}`}
                  onClick={() => {
                    if (onSelectOrder) onSelectOrder(order);
                    else onNavigateToTab('production');
                  }}
                  className="p-4 bg-zinc-50/70 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800/80 rounded-md hover:border-emerald-500/60 dark:hover:border-emerald-500/60 transition-colors cursor-pointer group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-xs font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 border border-emerald-200 dark:border-emerald-800/60 rounded">
                        {order.challanNumber || order.poCode || order.orderCode || `CH-2026-${idx + 1}`}
                      </span>
                      <span className="font-hanken font-bold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {order.name || order.styleName || order.productName || 'Garment Manufacturing Run'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-zinc-500">Stage:</span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">
                        {order.currentStage || order.stage || 'In Production'}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar & Percentage Completed */}
                  <div className="space-y-1.5 my-3">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-zinc-500 text-[11px]">
                        Contractor: <strong className="text-zinc-800 dark:text-zinc-200 font-semibold">{order.assignedTo || order.contractorName || 'In-House Unit 1'}</strong>
                      </span>
                      <span className="font-extrabold text-zinc-900 dark:text-zinc-100 text-xs">
                        {progressVal}% Completed ({order.completed || Math.round((progressVal / 100) * (order.total || order.targetQuantity || 1000))} / {order.total || order.targetQuantity || 1000} Pcs)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${isDelayed ? 'bg-rose-500' : 'bg-emerald-600 dark:bg-emerald-500'}`}
                        style={{ width: `${progressVal}%` }}
                      />
                    </div>
                  </div>

                  {/* Expected Completion Date */}
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 text-[11px] font-mono text-zinc-500">
                    <div>
                      Assigned Unit: <span className="text-zinc-800 dark:text-zinc-200 font-semibold">{order.assignedTo || order.contractorName || 'Main Mill'}</span>
                    </div>
                    <div>
                      Expected Completion: <span className="font-bold text-zinc-900 dark:text-zinc-100">{order.dueDate || order.estimatedCompletionDate || 'On Schedule'}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: INVENTORY OVERVIEW (RAW INVENTORY & FINISHED GOODS)
          ========================================================================= */}
      <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <WarehouseIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h2 className="font-hanken font-extrabold text-sm text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Inventory Overview
              </h2>
              <p className="text-[11px] font-mono text-zinc-500">
                Live raw fabric materials and finished garment stock
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateToTab('inventory')}
            className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer transition-colors shrink-0"
          >
            Open Full Inventory Hub <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 2 Major Aggregate Inventory Stock Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono">
          {/* Raw Material Inventory Card */}
          <div
            onClick={() => setInventoryTab('raw')}
            className={`p-4 border rounded-lg cursor-pointer transition-all ${
              inventoryTab === 'raw'
                ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/30 ring-1 ring-emerald-500'
                : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 font-bold mb-2">
              <span className="flex items-center gap-1.5">
                <ScrollText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                RAW MATERIALS (FABRIC)
              </span>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 rounded">
                Meters in Stock
              </span>
            </div>
            <div className="font-hanken font-extrabold text-2xl text-zinc-900 dark:text-zinc-50">
              {totalRawAvailableMeters.toLocaleString()}{' '}
              <span className="text-sm font-normal text-zinc-500 font-mono">Meters</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800">
              <span>{activeRawList.length} Active Fabric Lots</span>
              <span>{totalRawAllocatedMeters.toLocaleString()} Mtr Allocated</span>
            </div>
          </div>

          {/* Finished Goods Inventory Card */}
          <div
            onClick={() => setInventoryTab('finished')}
            className={`p-4 border rounded-lg cursor-pointer transition-all ${
              inventoryTab === 'finished'
                ? 'border-sky-500 bg-sky-50/20 dark:bg-sky-950/30 ring-1 ring-sky-500'
                : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 hover:border-sky-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-sky-700 dark:text-sky-400 font-bold mb-2">
              <span className="flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                FINISHED GOODS (GARMENTS)
              </span>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-sky-100 dark:bg-sky-950 rounded">
                Pieces in Stock
              </span>
            </div>
            <div className="font-hanken font-extrabold text-2xl text-zinc-900 dark:text-zinc-50">
              {totalFinishedAvailableUnits.toLocaleString()}{' '}
              <span className="text-sm font-normal text-zinc-500 font-mono">Pieces</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800">
              <span>{activeFinishedList.length} Finished Garment SKUs</span>
              <span>{totalFinishedProducedUnits.toLocaleString()} Pcs Produced</span>
            </div>
          </div>
        </div>

        {/* Sub-tabs Switcher */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2 font-mono text-xs">
            <button
              onClick={() => setInventoryTab('raw')}
              className={`px-3 py-1.5 border font-bold rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                inventoryTab === 'raw'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-emerald-300'
              }`}
            >
              <ScrollText className="w-3.5 h-3.5" />
              <span>Raw Fabric ({activeRawList.length})</span>
            </button>
            <button
              onClick={() => setInventoryTab('finished')}
              className={`px-3 py-1.5 border font-bold rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                inventoryTab === 'finished'
                  ? 'bg-sky-600 text-white border-sky-600'
                  : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-sky-300'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Finished Goods ({activeFinishedList.length})</span>
            </button>
          </div>

          <span className="text-[11px] font-mono text-zinc-400 hidden sm:inline">
            Showing latest available inventory stock
          </span>
        </div>

        {/* Tab 1 Content: Raw Material Inventory Items */}
        {inventoryTab === 'raw' && (
          <div className="space-y-3 font-mono text-xs">
            {activeRawList.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-zinc-500 bg-zinc-50/50 dark:bg-zinc-950/50 rounded-md border border-dashed border-zinc-200 dark:border-zinc-800">
                No active raw fabric inventory currently in stock.
              </div>
            ) : (
              activeRawList.slice(0, 5).map((item, idx) => {
                const totalM = Number(item.totalMeters) || 0;
                const availM = Number(item.availableMeters) || 0;
                const percent = totalM > 0 ? Math.min(100, Math.round((availM / totalM) * 100)) : 100;

                return (
                  <div
                    key={`${item.id}-${idx}`}
                    onClick={() => onNavigateToTab('inventory')}
                    className="p-3.5 bg-zinc-50/70 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800/80 rounded-md hover:border-emerald-500/60 transition-colors cursor-pointer"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded">
                          {item.batchId || item.billNumber || item.id}
                        </span>
                        <span className="font-hanken font-bold text-sm text-zinc-900 dark:text-zinc-100">
                          {item.fabricName}
                        </span>
                        {item.color && (
                          <span className="text-[11px] text-zinc-500">
                            • {item.color}
                          </span>
                        )}
                        {item.width && (
                          <span className="text-[11px] text-zinc-400">
                            ({item.width})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                          <MapPin className="w-3 h-3 text-emerald-500" />
                          {item.warehouse || 'Central Godown'}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded border border-zinc-200 dark:border-zinc-700">
                          {item.status || 'Available'}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar of Available vs Total Meters */}
                    <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden my-2">
                      <div
                        className={`h-full ${availM < 100 ? 'bg-amber-500' : 'bg-emerald-600 dark:bg-emerald-500'}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-0.5">
                      <span>Supplier: <strong className="text-zinc-800 dark:text-zinc-200">{item.supplierName || 'Primary Mill'}</strong></span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        {availM.toLocaleString()} Mtr available {totalM > 0 && `(of ${totalM.toLocaleString()} Mtr)`}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2 Content: Finished Goods Inventory Items */}
        {inventoryTab === 'finished' && (
          <div className="space-y-3 font-mono text-xs">
            {activeFinishedList.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-zinc-500 bg-zinc-50/50 dark:bg-zinc-950/50 rounded-md border border-dashed border-zinc-200 dark:border-zinc-800">
                No finished goods currently in stock.
              </div>
            ) : (
              activeFinishedList.slice(0, 5).map((item, idx) => {
                const totalU = Number(item.totalProduced ?? item.unitsProduced ?? 0);
                const availU = Number(item.availableQuantity ?? item.unitsAvailable ?? 0);
                const percent = totalU > 0 ? Math.min(100, Math.round((availU / totalU) * 100)) : 100;

                return (
                  <div
                    key={`${item.id}-${idx}`}
                    onClick={() => onNavigateToTab('inventory')}
                    className="p-3.5 bg-zinc-50/70 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800/80 rounded-md hover:border-sky-500/60 transition-colors cursor-pointer"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 rounded">
                          {item.batchNumber || item.challanNumber || item.productionOrderId || `FG-${idx + 1}`}
                        </span>
                        <span className="font-hanken font-bold text-sm text-zinc-900 dark:text-zinc-100">
                          {item.productName || item.itemName || 'Garment Item'}
                        </span>
                        {item.styleName && (
                          <span className="text-[11px] text-zinc-500">
                            • {item.styleName}
                          </span>
                        )}
                        {item.color && (
                          <span className="text-[11px] text-zinc-400">
                            ({item.color}{item.size ? ` / ${item.size}` : ''})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                          <MapPin className="w-3 h-3 text-sky-500" />
                          {item.warehouse || 'Finished Goods Warehouse'}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded border border-zinc-200 dark:border-zinc-700">
                          {item.status || 'In Stock'}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar of Available vs Total Produced */}
                    <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden my-2">
                      <div
                        className={`h-full ${availU < 50 ? 'bg-amber-500' : 'bg-sky-600 dark:bg-sky-500'}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-0.5">
                      <span>Category: <strong className="text-zinc-800 dark:text-zinc-200">{item.category || 'Apparel'}</strong></span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        {availU.toLocaleString()} Pcs in stock {totalU > 0 && `(of ${totalU.toLocaleString()} Produced)`}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </section>
    </motion.div>
  );
}
