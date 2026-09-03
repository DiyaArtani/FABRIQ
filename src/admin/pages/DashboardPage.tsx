import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Factory,
  ShoppingBag,
  PackageCheck,
  Receipt,
  Plus,
  ArrowRight,
  TrendingUp,
  Activity,
  Building2,
  HardHat,
  Truck,
  History,
  Download,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Layers,
  Sparkles
} from 'lucide-react';
import { useFabriqData } from '../../context/FabriqDataContext';
import { KpiCard, Badge } from '../components/AdminUIComponents';

export const DashboardPage: React.FC = () => {
  const {
    users,
    productionOrders,
    stockItems,
    invoices,
    purchases,
    warehouses,
    contractors,
    settings
  } = useFabriqData();
  const navigate = useNavigate();
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Metrics & Financial Calculations
  const activeUsersCount = users.filter(u => u.status === 'Active').length;
  const activeOrders = productionOrders.filter(o => o.status !== 'Completed');
  const activeOrdersCount = activeOrders.length;
  
  const totalStockUnits = stockItems.reduce((acc, curr) => acc + curr.availableUnits, 0);
  const totalStockValue = stockItems.reduce((acc, curr) => acc + (curr.availableUnits * curr.costPrice), 0);
  const lowStockCount = stockItems.filter(s => s.status === 'Low Stock' || s.status === 'Out of Stock').length;

  const totalPurchasesAmount = purchases.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const totalInvoicedAmount = invoices.reduce((acc, curr) => acc + curr.amount, 0);
  const pendingInvoicesAmount = invoices
    .filter(i => i.status === 'Pending' || i.status === 'Overdue')
    .reduce((acc, curr) => acc + curr.amount, 0);
  const collectedRevenueAmount = invoices
    .filter(i => i.status === 'Paid')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalProductionUnits = productionOrders.reduce((acc, curr) => acc + curr.quantity, 0);

  // Production Stage Breakdown
  const stageStats = {
    cutting: productionOrders.filter(o => o.stage === 'Cutting' || o.stage === 'Fabric Issued').length,
    stitching: productionOrders.filter(o => o.stage === 'Stitching' || o.stage === 'In Progress').length,
    qc: productionOrders.filter(o => o.stage === 'Quality Check' || o.stage === 'QC').length,
    finishing: productionOrders.filter(o => o.stage === 'Washing' || o.stage === 'Finishing' || o.stage === 'Packaging').length,
    completed: productionOrders.filter(o => o.status === 'Completed').length,
  };

  // Export Executive Audit Data CSV
  const handleExportCSV = () => {
    const csvRows = [
      ['FABRIQ APPAREL LEDGER - EXECUTIVE AUDIT & REPORTING SUMMARY'],
      ['Generated At', new Date().toLocaleString('en-IN')],
      ['Company', settings.companyName || 'Fabriq Textile & Apparel'],
      ['Currency', 'INR (₹)'],
      [],
      ['=== FINANCIAL METRICS ==='],
      ['Metric', 'Amount (INR)', 'Record Count'],
      ['Total Procurement Spend', totalPurchasesAmount, purchases.length],
      ['Total Gross Invoiced', totalInvoicedAmount, invoices.length],
      ['Collected Revenue', collectedRevenueAmount, invoices.filter(i => i.status === 'Paid').length],
      ['Pending Receivables', pendingInvoicesAmount, invoices.filter(i => i.status !== 'Paid').length],
      ['Total Stock Asset Value', totalStockValue, `${totalStockUnits} Units`],
      [],
      ['=== GODOWN STOCK VALUATION ==='],
      ['Godown Name', 'Stored SKUs', 'Current Units', 'Capacity Units', 'Estimated Asset Value (INR)'],
      ...warehouses.map(wh => {
        const whItems = stockItems.filter(s => s.warehouse === wh.name);
        const val = whItems.reduce((acc, c) => acc + (c.availableUnits * c.costPrice), 0);
        return [wh.name, whItems.length, wh.currentUnits, wh.capacityUnits, val];
      }),
      [],
      ['=== CONTRACTOR PERFORMANCE ==='],
      ['Contractor Name', 'Specialty', 'Active Orders', 'Total Production Pcs', 'Rating'],
      ...contractors.map(ctr => {
        const ctrOrders = productionOrders.filter(p => p.contractorName === ctr.name);
        const pcs = ctrOrders.reduce((acc, c) => acc + c.quantity, 0);
        return [ctr.name, ctr.specialty, ctrOrders.filter(o => o.status !== 'Completed').length, pcs, ctr.rating];
      })
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Fabriq_Executive_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Executive Control & Analytics Header */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 text-zinc-900 dark:text-white shadow-xs rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-geist font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>EXECUTIVE DASHBOARD & LIVE ANALYTICS</span>
          </div>
          <h1 className="font-hanken font-extrabold text-2xl tracking-tight text-zinc-900 dark:text-white">
            Executive Control & Intelligence Hub
          </h1>
          <p className="text-xs font-sans text-zinc-500 dark:text-zinc-400 mt-1 max-w-2xl">
            Live operational oversight combining financial metrics, godown asset valuations, contractor performance, and inventory throughput.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs flex items-center gap-2 shadow-sm rounded-xl transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{downloadSuccess ? 'REPORT EXPORTED!' : 'EXPORT REPORT (CSV)'}</span>
          </button>
          <button
            onClick={() => navigate('/admin/purchases')}
            className="px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 font-sans font-bold text-xs flex items-center gap-2 transition-colors rounded-xl cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>PO ENTRY</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="ACTIVE USERS / EMPLOYEES"
          value={activeUsersCount}
          subtitle={`Total Registered: ${users.length}`}
          badgeText="AUTHENTICATED"
          badgeVariant="emerald"
          icon={Users}
        />
        <KpiCard
          title="ACTIVE PRODUCTION ORDERS"
          value={activeOrdersCount}
          subtitle={`${totalProductionUnits.toLocaleString()} total units logged`}
          badgeText="IN PIPELINE"
          badgeVariant="blue"
          icon={Factory}
        />
        <KpiCard
          title="TOTAL RAW DENIM PURCHASES"
          value={`₹${totalPurchasesAmount.toLocaleString('en-IN')}`}
          subtitle={`${purchases.length} Purchase Bills (YTD)`}
          badgeText="PROCUREMENT"
          badgeVariant="emerald"
          icon={ShoppingBag}
        />
        <KpiCard
          title="UNPAID INVOICES BALANCE"
          value={`₹${pendingInvoicesAmount.toLocaleString('en-IN')}`}
          subtitle={`${invoices.filter(i => i.status !== 'Paid').length} Uncollected Invoices`}
          badgeText={pendingInvoicesAmount > 0 ? "ACTION REQUIRED" : "BALANCED"}
          badgeVariant={pendingInvoicesAmount > 0 ? "amber" : "emerald"}
          icon={Receipt}
        />
      </div>

      {/* Secondary Financial & Stock Valuation Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 shadow-2xs">
          <span className="text-[10px] font-mono font-bold uppercase text-zinc-500">Gross Invoiced Revenue</span>
          <div className="text-xl font-bold font-hanken text-emerald-600 dark:text-emerald-400 mt-1">
            ₹{totalInvoicedAmount.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] font-mono text-zinc-500 mt-2">
            Collected: ₹{collectedRevenueAmount.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 shadow-2xs">
          <span className="text-[10px] font-mono font-bold uppercase text-zinc-500">Stock Inventory Valuation</span>
          <div className="text-xl font-bold font-hanken text-zinc-900 dark:text-zinc-100 mt-1">
            ₹{totalStockValue.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] font-mono text-zinc-500 mt-2">
            {totalStockUnits.toLocaleString()} Total Units in Stock
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 shadow-2xs">
          <span className="text-[10px] font-mono font-bold uppercase text-zinc-500">Active Production Units</span>
          <div className="text-xl font-bold font-hanken text-sky-600 dark:text-sky-400 mt-1">
            {activeOrders.reduce((acc, c) => acc + c.quantity, 0).toLocaleString()} Pcs
          </div>
          <div className="text-[10px] font-mono text-zinc-500 mt-2">
            Across {activeOrdersCount} Batches
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 shadow-2xs">
          <span className="text-[10px] font-mono font-bold uppercase text-zinc-500">Inventory Status Health</span>
          <div className="text-xl font-bold font-hanken text-zinc-900 dark:text-zinc-100 mt-1 flex items-center gap-2">
            <span>{stockItems.length - lowStockCount} Optimal</span>
            {lowStockCount > 0 && (
              <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 font-mono font-bold rounded">
                {lowStockCount} Low
              </span>
            )}
          </div>
          <div className="text-[10px] font-mono text-zinc-500 mt-2">
            {stockItems.length} Monitored SKUs
          </div>
        </div>
      </div>

      {/* Production Pipeline Progress Tracker */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-500" />
            <h3 className="font-hanken font-bold text-sm text-zinc-900 dark:text-zinc-100">
              Live Production Order Pipeline
            </h3>
          </div>
          <button
            onClick={() => navigate('/admin/production')}
            className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>VIEW PRODUCTION CONTROL</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
          <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-center">
            <div className="text-[10px] font-mono uppercase text-zinc-500">Cutting & Issue</div>
            <div className="text-lg font-black font-hanken text-zinc-900 dark:text-zinc-100 mt-0.5">{stageStats.cutting}</div>
            <div className="text-[10px] font-mono text-zinc-400">Batches</div>
          </div>
          <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-center">
            <div className="text-[10px] font-mono uppercase text-zinc-500">Stitching Work</div>
            <div className="text-lg font-black font-hanken text-blue-600 dark:text-blue-400 mt-0.5">{stageStats.stitching}</div>
            <div className="text-[10px] font-mono text-zinc-400">Batches</div>
          </div>
          <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-center">
            <div className="text-[10px] font-mono uppercase text-zinc-500">Quality Check</div>
            <div className="text-lg font-black font-hanken text-amber-600 dark:text-amber-400 mt-0.5">{stageStats.qc}</div>
            <div className="text-[10px] font-mono text-zinc-400">Batches</div>
          </div>
          <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-center">
            <div className="text-[10px] font-mono uppercase text-zinc-500">Finishing / Pack</div>
            <div className="text-lg font-black font-hanken text-purple-600 dark:text-purple-400 mt-0.5">{stageStats.finishing}</div>
            <div className="text-[10px] font-mono text-zinc-400">Batches</div>
          </div>
          <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-center">
            <div className="text-[10px] font-mono uppercase text-zinc-500">Completed Batches</div>
            <div className="text-lg font-black font-hanken text-emerald-600 dark:text-emerald-400 mt-0.5">{stageStats.completed}</div>
            <div className="text-[10px] font-mono text-zinc-400">Finished Goods</div>
          </div>
        </div>
      </div>

      {/* Reports & Detailed Analytics Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Godown Valuation Table */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
            <div>
              <h3 className="font-hanken font-bold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-500" />
                Godown Stock Asset Valuation
              </h3>
              <p className="text-xs font-mono text-zinc-500">Storage capacity and inventory balance valuation</p>
            </div>
            <button
              onClick={() => navigate('/admin/inventory')}
              className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>INVENTORY</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {warehouses.length === 0 ? (
              <div className="p-4 text-center text-xs font-mono text-zinc-500">No godowns configured.</div>
            ) : (
              warehouses.map((wh, idx) => {
                const whItems = stockItems.filter(s => s.warehouse === wh.name);
                const val = whItems.reduce((acc, c) => acc + (c.availableUnits * c.costPrice), 0);
                const pct = wh.capacityUnits > 0 ? Math.round((wh.currentUnits / wh.capacityUnits) * 100) : 0;
                let barColor = 'bg-emerald-500';
                if (pct > 80) barColor = 'bg-amber-500';
                if (pct > 95) barColor = 'bg-rose-500';

                return (
                  <div key={`${wh.id}-${idx}`} className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-zinc-900 dark:text-zinc-100">{wh.name}</div>
                        <div className="text-[10px] text-zinc-500">{whItems.length} Active SKUs • Manager: {wh.managerName}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">₹{val.toLocaleString('en-IN')}</div>
                        <div className="text-[10px] text-zinc-500">{wh.currentUnits.toLocaleString()} / {wh.capacityUnits.toLocaleString()} Units ({pct}%)</div>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Contractor Yield & Performance Table */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
            <div>
              <h3 className="font-hanken font-bold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <HardHat className="w-4 h-4 text-emerald-500" />
                Contractor Production Performance
              </h3>
              <p className="text-xs font-mono text-zinc-500">Job-work efficiency, output pcs, and rating</p>
            </div>
            <button
              onClick={() => navigate('/admin/contractors')}
              className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>CONTRACTORS</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {contractors.length === 0 ? (
              <div className="p-4 text-center text-xs font-mono text-zinc-500">No contractors registered yet.</div>
            ) : (
              contractors.map((ctr, idx) => {
                const ctrOrders = productionOrders.filter(p => p.contractorName === ctr.name);
                const totalPcs = ctrOrders.reduce((acc, c) => acc + c.quantity, 0);
                const activeOrdersCount = ctrOrders.filter(o => o.status !== 'Completed').length;

                return (
                  <div key={`${ctr.id}-${idx}`} className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between font-mono text-xs">
                    <div>
                      <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <span>{ctr.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded font-normal">
                          {ctr.specialty}
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        {activeOrdersCount} Active Batches • {ctrOrders.length} Total Runs
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">{totalPcs.toLocaleString()} Pcs</div>
                      <div className="text-[10px] text-amber-500 font-bold">★ {ctr.rating || 5}.0 Rating</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Master Data Quick Access Directory */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 shadow-2xs">
        <h3 className="font-hanken font-bold text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3 flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-emerald-500" />
          MASTER DATA DIRECTORY SHORTCUTS
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <button
            onClick={() => navigate('/admin/users')}
            className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 text-left transition-colors group cursor-pointer"
          >
            <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-hanken">Users</div>
            <div className="text-[10px] font-mono text-zinc-500">{users.length} Records</div>
          </button>

          <button
            onClick={() => navigate('/admin/customers')}
            className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 text-left transition-colors group cursor-pointer"
          >
            <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-hanken">Customers</div>
            <div className="text-[10px] font-mono text-zinc-500">Retail / Wholesale</div>
          </button>

          <button
            onClick={() => navigate('/admin/contractors')}
            className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 text-left transition-colors group cursor-pointer"
          >
            <HardHat className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-hanken">Contractors</div>
            <div className="text-[10px] font-mono text-zinc-500">{contractors.length} Registered</div>
          </button>

          <button
            onClick={() => navigate('/admin/suppliers')}
            className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 text-left transition-colors group cursor-pointer"
          >
            <Truck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-hanken">Suppliers</div>
            <div className="text-[10px] font-mono text-zinc-500">Mills & Trims</div>
          </button>

          <button
            onClick={() => navigate('/admin/inventory')}
            className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 text-left transition-colors group cursor-pointer"
          >
            <PackageCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-hanken">Stock Inventory</div>
            <div className="text-[10px] font-mono text-zinc-500">{totalStockUnits.toLocaleString()} Units</div>
          </button>

          <button
            onClick={() => navigate('/admin/settings')}
            className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 text-left transition-colors group cursor-pointer"
          >
            <History className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-hanken">Audit Logs</div>
            <div className="text-[10px] font-mono text-zinc-500">Activity Trail</div>
          </button>
        </div>
      </div>
    </div>
  );
};
