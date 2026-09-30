import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Factory,
  ShoppingBag,
  PackageCheck,
  Receipt,
  ArrowRight,
  Layers,
  Warehouse,
  Boxes,
  CheckCircle2,
  Users,
  Building2,
  HardHat,
  Truck,
  History,
  Scissors,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Activity,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Tag
} from 'lucide-react';
import { useFabriqData } from '../../context/FabriqDataContext';

export const DashboardPage: React.FC = () => {
  const {
    users,
    productionOrders,
    stockItems,
    invoices,
    purchases,
    warehouses,
    contractors,
    customers,
    suppliers,
    sales,
    auditLogs,
    finishedInventory,
    rawInventory
  } = useFabriqData();
  const navigate = useNavigate();



  // 1. Production Metrics (Strictly from live production orders in database)
  const activeOrders = productionOrders.filter(o => o.status !== 'Completed' && o.overallStatus !== 'Completed');
  const activeOrdersCount = activeOrders.length;
  const activeProductionPcs = activeOrders.reduce((acc, c) => acc + Number(c.quantity || c.targetQuantity || c.plannedQuantity || 0), 0);

  // 2. Real Stock & Valuation Calculations (Strictly from database inventory collections)
  const finishedGoodsUnits = finishedInventory.reduce((acc, curr) => acc + Number(curr.availableQuantity ?? curr.unitsAvailable ?? 0), 0);
  const finishedGoodsValue = finishedInventory.reduce((acc, curr) => {
    const qty = Number(curr.availableQuantity ?? curr.unitsAvailable ?? 0);
    const price = Number(curr.costPerUnit || curr.unitPrice || curr.sellingPrice || 0);
    return acc + (qty * price);
  }, 0);

  const rawFabricMeters = rawInventory.reduce((acc, curr) => acc + Number(curr.availableMeters || 0), 0);
  const rawFabricValue = rawInventory.reduce((acc, curr) => {
    const meters = Number(curr.availableMeters || 0);
    const cost = Number(curr.costPerMeter || 0);
    return acc + (meters * cost);
  }, 0);

  // Legacy stock items fallback only if finished/raw are empty
  const legacyStockUnits = stockItems.reduce((acc, curr) => acc + Number(curr.availableUnits || 0), 0);
  const legacyStockValue = stockItems.reduce((acc, curr) => acc + (Number(curr.availableUnits || 0) * Number(curr.costPrice || curr.unitPrice || 0)), 0);

  const totalStockValue = (finishedGoodsValue + rawFabricValue) > 0
    ? (finishedGoodsValue + rawFabricValue)
    : legacyStockValue;

  const totalStockUnits = (finishedGoodsUnits + rawFabricMeters) > 0
    ? (finishedGoodsUnits + rawFabricMeters)
    : legacyStockUnits;

  // 3. Financial Ledger Calculations strictly from database
  const totalPurchasesAmount = purchases.reduce((acc, curr) => acc + Number(curr.totalAmount || curr.amount || 0), 0);
  const totalInvoicedAmount = invoices.reduce((acc, curr) => acc + Number(curr.amount || curr.totalAmount || 0), 0);
  const pendingInvoicesAmount = invoices
    .filter(i => i.status === 'Pending' || i.status === 'Overdue')
    .reduce((acc, curr) => acc + Number(curr.amount || curr.totalAmount || 0), 0);
  const collectedRevenueAmount = invoices
    .filter(i => i.status === 'Paid')
    .reduce((acc, curr) => acc + Number(curr.amount || curr.totalAmount || 0), 0);

  const collectionRate = totalInvoicedAmount > 0
    ? Math.round((collectedRevenueAmount / totalInvoicedAmount) * 100)
    : 0;

  // Pending customer receivables sorted by highest amount first
  const pendingInvoicesList = invoices
    .filter(i => i.status === 'Pending' || i.status === 'Overdue')
    .sort((a, b) => Number(b.amount || b.totalAmount || 0) - Number(a.amount || a.totalAmount || 0));
  const topPendingInvoices = pendingInvoicesList.slice(0, 4);

  // 4. Production Stage Breakdown
  const stageStats = {
    cutting: productionOrders.filter(o => (o.currentStage === 'Cutting' || o.stage === 'Cutting' || o.stage === 'Fabric Issued') && o.overallStatus !== 'Completed' && o.status !== 'Completed').length,
    stitching: productionOrders.filter(o => (o.currentStage === 'Stitching' || o.stage === 'Stitching') && o.overallStatus !== 'Completed' && o.status !== 'Completed').length,
    washing: productionOrders.filter(o => (o.currentStage === 'Washing' || o.stage === 'Washing') && o.overallStatus !== 'Completed' && o.status !== 'Completed').length,
    packaging: productionOrders.filter(o => (o.currentStage === 'Packaging' || o.currentStage === 'Packing' || o.stage === 'Packaging' || o.stage === 'Packing') && o.overallStatus !== 'Completed' && o.status !== 'Completed').length,
    completed: productionOrders.filter(o => o.currentStage === 'Finished Goods' || o.overallStatus === 'Completed' || o.status === 'Completed').length,
  };

  const totalTrackedBatches = stageStats.cutting + stageStats.stitching + stageStats.washing + stageStats.packaging + stageStats.completed || 1;

  // Recent 4 active production batches for the live preview
  const recentActiveBatches = activeOrders.slice(0, 4);

  // Fast moving ready-to-dispatch garments from finished inventory
  const topFinishedGarments = finishedInventory.slice(0, 4);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* 1. Header (Clean & Uncluttered) */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 text-zinc-900 dark:text-white shadow-2xs rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-hanken font-extrabold text-2xl sm:text-3xl tracking-tight text-zinc-900 dark:text-white">
            Manufacturing &amp; Stock Intelligence
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-mono font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>All Systems Live</span>
          </span>
        </div>
      </div>

      {/* 2. MINIMAL EXECUTIVE HERO KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Card 1: Godown Stock Valuation */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 hover:border-emerald-500/40 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Stock Valuation
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Warehouse className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-hanken tracking-tight text-zinc-900 dark:text-zinc-100">
              ₹{Math.round(totalStockValue).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 flex items-center gap-1.5 flex-wrap">
              <span>{finishedGoodsUnits.toLocaleString()} pcs ready</span>
              <span className="text-zinc-300 dark:text-zinc-700">•</span>
              <span>{rawFabricMeters.toLocaleString()}m fabric</span>
            </p>
          </div>
        </div>

        {/* Card 2: Live Production Orders */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 hover:border-sky-500/40 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Active Production
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Factory className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-hanken tracking-tight text-zinc-900 dark:text-zinc-100">
              {activeOrdersCount} <span className="text-lg font-bold text-zinc-500 dark:text-zinc-400">{activeOrdersCount === 1 ? 'Batch' : 'Batches'}</span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 flex items-center gap-1.5">
              <span>{activeProductionPcs.toLocaleString()} pcs in progress</span>
            </p>
          </div>
        </div>

        {/* Card 3: Invoiced Revenue & Sales */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 hover:border-teal-500/40 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Invoiced Revenue
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-hanken tracking-tight text-emerald-600 dark:text-emerald-400">
              ₹{totalInvoicedAmount.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 flex items-center gap-1.5">
              <span>₹{pendingInvoicesAmount.toLocaleString('en-IN')} pending</span>
              <span className="text-zinc-300 dark:text-zinc-700">•</span>
              <span>{invoices.length} {invoices.length === 1 ? 'invoice' : 'invoices'}</span>
            </p>
          </div>
        </div>

        {/* Card 4: Purchases & Mill Spend */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 hover:border-indigo-500/40 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Purchases &amp; Spend
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-hanken tracking-tight text-zinc-900 dark:text-zinc-100">
              ₹{Math.round(totalPurchasesAmount).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 flex items-center gap-1.5">
              <span>{purchases.length} {purchases.length === 1 ? 'bill' : 'bills'}</span>
              <span className="text-zinc-300 dark:text-zinc-700">•</span>
              <span>{suppliers.length} {suppliers.length === 1 ? 'supplier' : 'suppliers'}</span>
            </p>
          </div>
        </div>

      </div>

      {/* 3. LIVE PRODUCTION PIPELINE SECTION (Interactive Connected Flow) */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 shadow-2xs rounded-3xl space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-800/60 shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-hanken font-bold text-base sm:text-lg text-zinc-900 dark:text-zinc-100">
                Live Production Order Pipeline
              </h2>
              <p className="text-xs font-mono text-zinc-500">
                End-to-end stage tracking from raw fabric issue to finished goods dispatch
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin/production')}
            className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>MANAGE PRODUCTION</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 5 Sequential Pipeline Stages with Modern Visual Connector styling */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">

          {/* Stage 1: Cutting */}
          <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl relative group hover:border-amber-400 transition-all">
            <div className="flex items-center justify-between text-[11px] font-mono font-bold uppercase text-amber-700 dark:text-amber-400">
              <span className="flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5" />
                1. Cutting
              </span>
              <span className="text-[10px] opacity-75">
                {Math.round((stageStats.cutting / totalTrackedBatches) * 100)}%
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-hanken text-amber-800 dark:text-amber-300 mt-2">
              {stageStats.cutting}
            </div>
            <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
              Fabric rolls in cutting
            </div>
          </div>

          {/* Stage 2: Stitching */}
          <div className="p-4 bg-sky-50/60 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/50 rounded-2xl relative group hover:border-sky-400 transition-all">
            <div className="flex items-center justify-between text-[11px] font-mono font-bold uppercase text-sky-700 dark:text-sky-400">
              <span>2. Stitching</span>
              <span className="text-[10px] opacity-75">
                {Math.round((stageStats.stitching / totalTrackedBatches) * 100)}%
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-hanken text-sky-800 dark:text-sky-300 mt-2">
              {stageStats.stitching}
            </div>
            <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
              Assembly &amp; tailoring
            </div>
          </div>

          {/* Stage 3: Washing */}
          <div className="p-4 bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/50 rounded-2xl relative group hover:border-purple-400 transition-all">
            <div className="flex items-center justify-between text-[11px] font-mono font-bold uppercase text-purple-700 dark:text-purple-400">
              <span>3. Washing</span>
              <span className="text-[10px] opacity-75">
                {Math.round((stageStats.washing / totalTrackedBatches) * 100)}%
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-hanken text-purple-800 dark:text-purple-300 mt-2">
              {stageStats.washing}
            </div>
            <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
              Denim wash &amp; finish
            </div>
          </div>

          {/* Stage 4: Packaging */}
          <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 rounded-2xl relative group hover:border-indigo-400 transition-all">
            <div className="flex items-center justify-between text-[11px] font-mono font-bold uppercase text-indigo-700 dark:text-indigo-400">
              <span>4. Packaging</span>
              <span className="text-[10px] opacity-75">
                {Math.round((stageStats.packaging / totalTrackedBatches) * 100)}%
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-hanken text-indigo-800 dark:text-indigo-300 mt-2">
              {stageStats.packaging}
            </div>
            <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
              QC &amp; barcode tagging
            </div>
          </div>

          {/* Stage 5: Finished Goods */}
          <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl col-span-2 sm:col-span-1 relative group hover:border-emerald-400 transition-all">
            <div className="flex items-center justify-between text-[11px] font-mono font-bold uppercase text-emerald-700 dark:text-emerald-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                5. Finished
              </span>
              <span className="text-[10px] opacity-75">
                {Math.round((stageStats.completed / totalTrackedBatches) * 100)}%
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-hanken text-emerald-800 dark:text-emerald-300 mt-2">
              {stageStats.completed}
            </div>
            <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
              In Godown / Ready
            </div>
          </div>

        </div>

        {/* Live Active Production Order Preview */}
        {recentActiveBatches.length > 0 && (
          <div className="pt-2 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400 block">
                Active Batches In Progress:
              </span>
              <span className="text-[10px] font-mono text-zinc-400">
                Click any batch to inspect stage challans
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {recentActiveBatches.map((order, idx) => (
                <div
                  key={`${order.id}-${idx}`}
                  onClick={() => navigate('/admin/production')}
                  className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-emerald-500/50 hover:shadow-xs transition-all cursor-pointer space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 transition-colors">
                      {order.orderNumber || order.productionOrderId || `PO-${idx + 1}`}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 font-mono font-bold rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
                      {order.currentStage || order.stage || 'In Process'}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate">
                    {order.productName || order.itemName || order.styleName || order.name || 'Production Batch'}
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-1.5 border-t border-zinc-200/60 dark:border-zinc-800">
                    <span>Qty: <strong className="text-zinc-800 dark:text-zinc-200">{Number(order.quantity || order.targetQuantity || order.plannedQuantity || 0)} pcs</strong></span>
                    <span className="truncate max-w-[100px]">{order.contractorName || order.assignedTo || 'In-House'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. GODOWN STOCK SECTION (Hero Godown Stock Ledger & Storage Utilization) */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 shadow-2xs rounded-3xl space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-800/60 shadow-xs">
              <Warehouse className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-hanken font-bold text-base sm:text-lg text-zinc-900 dark:text-zinc-100">
                Godown Stock &amp; Warehouse Asset Ledger
              </h2>
              <p className="text-xs font-mono text-zinc-500">
                Storage capacity, stored SKUs, and estimated valuations across active godowns
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin/warehouses')}
            className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>VIEW ALL GODOWNS</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Godown Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.length === 0 ? (
            <div className="col-span-full p-8 text-center text-xs font-mono text-zinc-500 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
              No godowns configured yet. Add godowns from Warehouse Management.
            </div>
          ) : (
            warehouses.map((wh, idx) => {
              const matchesWarehouse = (itemWarehouse?: string) => {
                if (!itemWarehouse) return false;
                const iw = itemWarehouse.trim().toLowerCase();
                const wn = (wh.name || '').trim().toLowerCase();
                const wc = (wh.code || '').trim().toLowerCase();
                return iw === wn || (wc !== '' && iw === wc);
              };

              const whRaw = rawInventory.filter(r => matchesWarehouse(r.warehouse));
              const whRawMeters = whRaw.reduce((sum, r) => sum + (Number(r.availableMeters) || 0), 0);
              const whRawVal = whRaw.reduce((sum, r) => sum + ((Number(r.availableMeters) || 0) * (Number(r.costPerMeter) || 0)), 0);

              const whFin = finishedInventory.filter(f => matchesWarehouse(f.warehouse));
              const whFinUnits = whFin.reduce((sum, f) => sum + (Number(f.availableQuantity ?? f.unitsAvailable ?? 0)), 0);
              const whFinVal = whFin.reduce((sum, f) => sum + ((Number(f.availableQuantity ?? f.unitsAvailable ?? 0)) * (Number(f.costPerUnit || f.unitPrice || 0))), 0);

              const whStockItems = stockItems.filter(s => matchesWarehouse(s.warehouse || s.location));
              const whStockUnits = whStockItems.reduce((sum, s) => sum + (Number(s.availableUnits) || 0), 0);
              const whStockVal = whStockItems.reduce((sum, s) => sum + ((Number(s.availableUnits) || 0) * (Number(s.costPrice || s.unitPrice || 0))), 0);

              const val = whRawVal + whFinVal + whStockVal;
              const curUnits = whFinUnits + whStockUnits;
              const capUnits = Number(wh.finishedGoodsCapacityUnits || wh.capacityUnits || 0);
              const pct = capUnits > 0 ? Math.round((curUnits / capUnits) * 100) : 0;
              const totalItemsCount = whFin.length + whRaw.length + whStockItems.length;

              let barColor = 'bg-emerald-500';
              let badgeColor = 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
              if (pct > 80) {
                barColor = 'bg-amber-500';
                badgeColor = 'text-amber-700 bg-amber-50 dark:bg-amber-950 dark:text-amber-400 border-amber-200 dark:border-amber-800';
              }
              if (pct > 95) {
                barColor = 'bg-rose-500';
                badgeColor = 'text-rose-700 bg-rose-50 dark:bg-rose-950 dark:text-rose-400 border-rose-200 dark:border-rose-800';
              }

              return (
                <div
                  key={`${wh.id}-${idx}`}
                  className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3 font-mono text-xs hover:border-emerald-500/40 transition-all hover:shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100 font-hanken">
                        {wh.name}
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        {wh.location || 'Location Not Set'}{wh.managerName ? ` • In-Charge: ${wh.managerName}` : ''}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${badgeColor}`}>
                      {pct}% Utilized
                    </span>
                  </div>

                  {/* Capacity Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] text-zinc-500">
                      <span>Stored: <strong>{whFinUnits > 0 ? `${whFinUnits.toLocaleString()} pcs` : ''}{whFinUnits > 0 && whRawMeters > 0 ? ' • ' : ''}{whRawMeters > 0 ? `${whRawMeters.toLocaleString()}m` : (whFinUnits === 0 ? '0 items' : '')}</strong></span>
                      <span>Cap: {capUnits.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColor} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Valuation & SKUs */}
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-200/70 dark:border-zinc-850">
                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase block">Lots Stored</span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">{totalItemsCount} Lots</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-zinc-400 uppercase block">Est. Asset Value</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        ₹{Math.round(val).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Quick Inventory Category Highlights */}
        <div className="p-4 bg-zinc-100/70 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2.5 text-zinc-600 dark:text-zinc-400">
            <Boxes className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Total Warehoused Finished Goods: <strong className="text-zinc-900 dark:text-zinc-100">{finishedInventory.length} Garment Styles</strong> ({finishedGoodsUnits.toLocaleString()} pcs) • Raw Denim Fabric: <strong className="text-zinc-900 dark:text-zinc-100">{rawInventory.length} Lots</strong> ({rawFabricMeters.toLocaleString()} m)
            </span>
          </div>
          <button
            onClick={() => navigate('/admin/inventory')}
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <span>Open Inventory Ledger</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 5. SOMETHING MORE: Live Operational Feed & Fast Moving Garments Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Module A: Fast-Moving Ready Garments In Stock */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 shadow-2xs rounded-3xl space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-200/60 dark:border-sky-800/60">
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-hanken font-bold text-base text-zinc-900 dark:text-zinc-100">
                  Ready Goods for Dispatch
                </h3>
                <p className="text-xs font-mono text-zinc-500">
                  Finished garment lots available for customer billing
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/admin/sales')}
              className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>NEW SALE</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {topFinishedGarments.length === 0 ? (
              <div className="p-6 text-center text-xs font-mono text-zinc-500">
                No finished goods in stock. Complete production batches to populate stock.
              </div>
            ) : (
              topFinishedGarments.map((item, idx) => (
                <div
                  key={`${item.id}-${idx}`}
                  className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 rounded-xl flex items-center justify-between text-xs font-mono hover:border-emerald-500/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-850 flex items-center justify-center font-bold text-zinc-700 dark:text-zinc-300">
                      {(item.productName || item.itemName || 'G').charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-zinc-900 dark:text-zinc-100 font-hanken text-xs sm:text-sm">
                        {item.productName || item.itemName || item.styleName || `Garment Item #${idx + 1}`}
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        {[
                          item.category,
                          item.color ? `Color: ${item.color}` : null,
                          item.size ? `Size: ${item.size}` : null,
                          item.warehouse ? `Godown: ${item.warehouse}` : null
                        ].filter(Boolean).join(' • ') || 'Warehouse Stored'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-emerald-600 dark:text-emerald-400">
                      {Number(item.availableQuantity ?? item.unitsAvailable ?? 0)} pcs ready
                    </div>
                    {(item.unitPrice || item.sellingPrice || item.costPerUnit) ? (
                      <div className="text-[10px] text-zinc-500">
                        ₹{Number(item.unitPrice || item.sellingPrice || item.costPerUnit || 0).toLocaleString('en-IN')} / pc
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Module B: Customer Outstanding Receivables & Recovery (High-Value Cashflow Monitor) */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 shadow-2xs rounded-3xl space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/60 dark:border-amber-800/60">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-hanken font-bold text-base text-zinc-900 dark:text-zinc-100">
                  Customer Receivables &amp; Recovery
                </h3>
                <p className="text-xs font-mono text-zinc-500">
                  Outstanding client invoices awaiting settlement
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/admin/sales')}
              className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>ALL INVOICES</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {topPendingInvoices.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-zinc-500 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                ✅ All customer accounts are settled! 100% collection efficiency.
              </div>
            ) : (
              topPendingInvoices.map((inv, idx) => {
                const customer = customers.find(c => c.id === inv.customerId || c.companyName === inv.customerName);
                const clientName = inv.customerName || customer?.companyName || customer?.name || 'Customer';
                const invAmount = Number(inv.amount || inv.totalAmount || 0);
                const isOverdue = inv.status === 'Overdue';

                return (
                  <div
                    key={`${inv.id}-${idx}`}
                    className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 rounded-xl flex items-center justify-between text-xs font-mono hover:border-emerald-500/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-850 flex items-center justify-center font-bold text-zinc-700 dark:text-zinc-300 shrink-0">
                        {clientName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-zinc-900 dark:text-zinc-100 font-hanken text-xs sm:text-sm truncate">
                          {clientName}
                        </div>
                        <div className="text-[10px] text-zinc-500 flex items-center gap-1.5 truncate">
                          <span>{inv.invoiceNumber || inv.id}</span>
                          <span>•</span>
                          <span className={isOverdue ? 'text-rose-500 font-bold' : ''}>
                            {isOverdue ? 'Overdue' : (inv.dueDate ? `Due: ${inv.dueDate}` : 'Pending')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">
                        ₹{invAmount.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                        Unpaid
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Aggregate footer banner */}
          <div className="pt-2 flex items-center justify-between text-xs font-mono border-t border-zinc-100 dark:border-zinc-800 text-zinc-500">
            <span>Total Pending: <strong className="text-rose-600 dark:text-rose-400">₹{pendingInvoicesAmount.toLocaleString('en-IN')}</strong></span>
            <span>{pendingInvoicesList.length} Invoices Pending</span>
          </div>
        </div>

      </div>

      {/* 6. SHORTCUTS IN THE END (Clean, Intuitive Navigation Grid) */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 shadow-2xs rounded-3xl space-y-4">
        <div className="border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
          <h3 className="font-hanken font-bold text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            QUICK MODULE SHORTCUTS &amp; DIRECTORY
          </h3>
          <p className="text-xs font-mono text-zinc-400 mt-0.5">
            Direct navigation across operational ledgers and system management
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <button
            onClick={() => navigate('/admin/inventory')}
            className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 rounded-2xl text-left transition-all group cursor-pointer"
          >
            <PackageCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-1.5 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-hanken">Inventory</div>
            <div className="text-[10px] font-mono text-zinc-500">{finishedGoodsUnits.toLocaleString()} Pcs • {rawFabricMeters.toLocaleString()}m</div>
          </button>

          <button
            onClick={() => navigate('/admin/production')}
            className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 rounded-2xl text-left transition-all group cursor-pointer"
          >
            <Factory className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-1.5 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-hanken">Production</div>
            <div className="text-[10px] font-mono text-zinc-500">{activeOrdersCount} Batches</div>
          </button>

          <button
            onClick={() => navigate('/admin/sales')}
            className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 rounded-2xl text-left transition-all group cursor-pointer"
          >
            <Receipt className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-1.5 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-hanken">Sales &amp; Billing</div>
            <div className="text-[10px] font-mono text-zinc-500">{invoices.length} Invoices</div>
          </button>

          <button
            onClick={() => navigate('/admin/purchases')}
            className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 rounded-2xl text-left transition-all group cursor-pointer"
          >
            <ShoppingBag className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-1.5 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-hanken">Purchases</div>
            <div className="text-[10px] font-mono text-zinc-500">{purchases.length} Bills</div>
          </button>

          <button
            onClick={() => navigate('/admin/warehouses')}
            className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 rounded-2xl text-left transition-all group cursor-pointer"
          >
            <Warehouse className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-1.5 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-hanken">Godowns</div>
            <div className="text-[10px] font-mono text-zinc-500">{warehouses.length} Facilities</div>
          </button>

          <button
            onClick={() => navigate('/admin/customers')}
            className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 rounded-2xl text-left transition-all group cursor-pointer"
          >
            <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-1.5 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-hanken">Customers</div>
            <div className="text-[10px] font-mono text-zinc-500">{customers.length} Accounts</div>
          </button>

          <button
            onClick={() => navigate('/admin/contractors')}
            className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 rounded-2xl text-left transition-all group cursor-pointer"
          >
            <HardHat className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-1.5 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-hanken">Contractors</div>
            <div className="text-[10px] font-mono text-zinc-500">{contractors.length} Units</div>
          </button>

          <button
            onClick={() => navigate('/admin/settings')}
            className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 rounded-2xl text-left transition-all group cursor-pointer"
          >
            <History className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-1.5 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-hanken">Audit Logs</div>
            <div className="text-[10px] font-mono text-zinc-500">Activity Trail</div>
          </button>
        </div>
      </div>



    </div>
  );
};

