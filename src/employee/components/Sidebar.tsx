import React from 'react';
import { 
  Home, 
  Factory, 
  Package, 
  Receipt, 
  ShoppingBag, 
  Settings, 
  Sun, 
  Moon,
  TrendingUp,
  Boxes,
  AlertTriangle
} from 'lucide-react';
import { ProductionOrder, StockItem, Invoice } from '../../types';

interface SidebarProps {
  activeTab: string;
  onChangeTab: (tab: string) => void;
  productionOrders: ProductionOrder[];
  stockItems: StockItem[];
  invoices: Invoice[];
  isDarkMode: boolean;
  onToggleTheme: () => void;
  userEmail?: string;
}

export default function Sidebar({
  activeTab,
  onChangeTab,
  productionOrders,
  stockItems,
  invoices,
  isDarkMode,
  onToggleTheme,
  userEmail = 'diyaartani003@gmail.com'
}: SidebarProps) {
  const tabs = [
    { id: 'home', label: 'Dashboard', icon: Home },
    { id: 'production', label: 'Production', icon: Factory, badge: productionOrders.filter(o => o.progress < 100).length },
    { id: 'inventory', label: 'Inventory', icon: Package, badge: stockItems.filter(s => s.status === 'Low Stock' || s.status === 'Out of Stock').length, badgeType: 'warning' },
    { id: 'purchases', label: 'Purchases', icon: ShoppingBag },
    { id: 'sales', label: 'Sales & Billing', icon: Receipt, badge: invoices.filter(i => i.status === 'Pending').length, badgeType: 'danger' },
    { id: 'more', label: 'System Settings', icon: Settings }
  ];

  // ERP stats overview
  const totalValuation = stockItems.reduce((acc, item) => acc + (item.availableUnits * (item.unitPrice || item.costPrice || 0)), 0);

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 md:left-0 z-40 bg-white dark:bg-neutral-950 border-r border-gray-100 dark:border-neutral-900 select-none transition-all duration-300">
      {/* Branding Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100 dark:border-neutral-900 bg-gray-50/50 dark:bg-neutral-900/20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            F
          </div>
          <div className="flex flex-col">
            <span className="font-hanken text-lg font-black tracking-tight text-gray-900 dark:text-zinc-50">
              Fabriq <span className="text-emerald-600 dark:text-emerald-400 font-medium text-xs">ERP</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
        <div className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-wider px-3 mb-2">
          Enterprise Modules
        </div>

        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all text-sm font-medium group cursor-pointer ${
                isActive
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                  : 'text-gray-600 dark:text-neutral-400 hover:bg-gray-50 dark:hover:bg-neutral-900/60 hover:text-gray-900 dark:hover:text-zinc-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4.5 h-4.5 transition-transform group-hover:scale-105 ${
                  isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-neutral-500'
                }`} />
                <span>{tab.label}</span>
              </div>

              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  tab.badgeType === 'warning'
                    ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                    : tab.badgeType === 'danger'
                    ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400'
                    : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* ERP Live Utility Stats Panel */}
        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-neutral-900/60">
          <div className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-wider px-3 mb-3">
            Active System Status
          </div>
          
          <div className="bg-gray-50/50 dark:bg-neutral-900/30 rounded-xl p-3 border border-gray-100 dark:border-neutral-900/40 space-y-3 mx-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-neutral-400 flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5 text-emerald-500" /> Stock Valuation:
              </span>
              <span className="font-semibold text-gray-800 dark:text-zinc-200">₹{totalValuation.toLocaleString('en-IN')}</span>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-neutral-400 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-blue-500" /> Active Orders:
              </span>
              <span className="font-semibold text-gray-800 dark:text-zinc-200">
                {productionOrders.filter(o => o.progress < 100).length} Runs
              </span>
            </div>

            {stockItems.some(s => s.status === 'Low Stock' || s.status === 'Out of Stock') && (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2 rounded-lg">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Restock raw materials needed.</span>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* User Info / Theme switch at Bottom */}
      <div className="p-4 border-t border-gray-100 dark:border-neutral-900 bg-gray-50/30 dark:bg-neutral-900/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-xl border border-emerald-500/30 bg-emerald-500/10 shrink-0 flex items-center justify-center font-bold text-xs text-emerald-600 dark:text-emerald-400">
              {(userEmail || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-gray-800 dark:text-zinc-100 truncate">
                Admin User
              </span>
              <span className="text-[10px] text-gray-400 dark:text-neutral-500 truncate font-mono">
                {userEmail}
              </span>
            </div>
          </div>

          <button
            onClick={onToggleTheme}
            aria-label="Toggle Theme"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            {isDarkMode ? (
              <Sun className="w-4.5 h-4.5 text-amber-400" />
            ) : (
              <Moon className="w-4.5 h-4.5 text-indigo-600" />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
