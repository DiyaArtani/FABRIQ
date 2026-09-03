import React from 'react';
import { motion } from 'motion/react';
import { ProductionOrder } from '../../types';
import { useFabriqData } from '../../context/FabriqDataContext';
import {
  Factory,
  ChevronRight,
  Warehouse as WarehouseIcon,
  Layers
} from 'lucide-react';

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
    productionOrders,
    warehouses
  } = useFabriqData();

  // 1. KPI Calculations for Today's Production Summary (Fully Dynamic)
  const runningOrders = productionOrders.filter(
    o => o.status === 'In Progress' || o.status === 'ACTIVE' || o.status === 'On Track'
  );
  const runningOrdersCount = runningOrders.length;

  const completedToday = productionOrders.filter(
    o => o.status === 'Completed'
  );
  const completedTodayCount = completedToday.length;

  const pendingOrders = productionOrders.filter(
    o => o.status === 'Planned' || o.status === 'Review Needed'
  );
  const pendingOrdersCount = pendingOrders.length;

  const delayedOrders = productionOrders.filter(
    o => o.status === 'On Hold'
  );
  const delayedOrdersCount = delayedOrders.length;

  // 2. Active Orders (Top 5 dynamic production orders)
  const activeOrdersList = productionOrders
    .filter(o => o.status === 'In Progress' || o.status === 'ACTIVE' || o.status === 'On Track' || o.status === 'Planned')
    .slice(0, 5);

  const displayActiveOrders = activeOrdersList.length > 0 ? activeOrdersList : productionOrders.slice(0, 5);

  // 3. Warehouse Stock Information (Fully Dynamic)
  const warehouseList = warehouses.map(w => {
    const capacity = w.capacityUnits || 50000;
    const current = w.currentUnits || 0;
    const available = Math.max(0, capacity - current);
    const percent = capacity > 0 ? Math.min(100, Math.round((current / capacity) * 100)) : 0;
    return {
      id: w.id || w.name,
      name: w.name,
      capacityUnits: capacity,
      currentUnits: current,
      availableSpace: available,
      utilizationPercent: percent
    };
  });

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
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 shadow-2xs flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-600 dark:bg-emerald-500 rounded-md text-white flex items-center justify-center font-bold text-xl font-mono shadow-xs flex-shrink-0">
          F
        </div>
        <h1 className="font-hanken text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
          Fabriq ERP
        </h1>
      </div>

      {/* =========================================================================
          SECTION 2: TODAY'S PRODUCTION SUMMARY (4 CLEAN KPI CARDS)
          ========================================================================= */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Factory className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-hanken font-extrabold text-sm text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              Today's Production Summary
            </h2>
          </div>
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Operational Counts</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
          {/* Card 1: Running Orders */}
          <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 uppercase font-bold block">
                Running Orders
              </span>
              <span className="text-2xl font-black text-zinc-900 dark:text-zinc-50 mt-1 block">
                {runningOrdersCount}
              </span>
            </div>
            <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded">
              In Production
            </span>
          </div>

          {/* Card 2: Completed Today */}
          <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 uppercase font-bold block">
                Completed Today
              </span>
              <span className="text-2xl font-black text-zinc-900 dark:text-zinc-50 mt-1 block">
                {completedTodayCount}
              </span>
            </div>
            <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded">
              Finished
            </span>
          </div>

          {/* Card 3: Pending Orders */}
          <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 uppercase font-bold block">
                Pending Orders
              </span>
              <span className="text-2xl font-black text-zinc-900 dark:text-zinc-50 mt-1 block">
                {pendingOrdersCount}
              </span>
            </div>
            <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded">
              Queued
            </span>
          </div>

          {/* Card 4: Delayed Orders */}
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
              const isDelayed = order.status === 'On Hold';
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
                        {order.name || order.styleName || 'Garment Manufacturing Run'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-zinc-500">Stage:</span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">
                        {order.stage || 'Stitching & Assembly'}
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
                        {progressVal}% Completed ({order.completed || Math.round((progressVal / 100) * (order.total || 1000))} / {order.total || 1000} Pcs)
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
                      Expected Completion: <span className="font-bold text-zinc-900 dark:text-zinc-100">{order.dueDate || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: INVENTORY OVERVIEW (WAREHOUSE CAPACITY & 3 STATS)
          ========================================================================= */}
      <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 shadow-2xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <WarehouseIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-hanken font-extrabold text-sm text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              Inventory Overview
            </h2>
          </div>
          <button
            onClick={() => onNavigateToTab('inventory')}
            className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
          >
            View Inventory <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Warehouse-level Stock Capacity Cards */}
        <div className="space-y-3 font-mono text-xs">
          {warehouseList.length === 0 ? (
            <div className="p-6 text-center text-xs font-mono text-zinc-500 bg-zinc-50/50 dark:bg-zinc-950/50 rounded-md border border-dashed border-zinc-200 dark:border-zinc-800">
              No warehouse facilities registered.
            </div>
          ) : (
            warehouseList.map((wh) => (
              <div
                key={wh.id}
                onClick={() => onNavigateToTab('inventory')}
                className="p-4 bg-zinc-50/70 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800/80 rounded-md hover:border-emerald-500/60 transition-colors cursor-pointer"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{wh.name}</span>
                  <span className="font-black text-emerald-700 dark:text-emerald-400 text-xs">
                    {wh.utilizationPercent}% Capacity Used
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden mb-2.5">
                  <div
                    className={`h-full ${wh.utilizationPercent > 90 ? 'bg-amber-500' : 'bg-emerald-600 dark:bg-emerald-500'}`}
                    style={{ width: `${wh.utilizationPercent}%` }}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500 pt-1">
                  <div>
                    Used Capacity: <strong className="text-zinc-900 dark:text-zinc-100">{wh.currentUnits.toLocaleString()} Units</strong>
                  </div>
                  <div>
                    Available Capacity: <strong className="text-zinc-900 dark:text-zinc-100">{wh.availableSpace.toLocaleString()} Units</strong>
                  </div>
                  <div>
                    Total Capacity: <strong className="text-zinc-900 dark:text-zinc-100">{wh.capacityUnits.toLocaleString()} Units</strong>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </motion.div>
  );
}
