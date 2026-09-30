import React from 'react';
import { 
  Home, 
  Factory, 
  Package, 
  Receipt, 
  ShoppingBag, 
  Settings 
} from 'lucide-react';
import { ProductionOrder, StockItem, Invoice } from '../../types';

interface SidebarProps {
  activeTab: string;
  onChangeTab: (tab: string) => void;
  productionOrders: ProductionOrder[];
  stockItems: StockItem[];
  invoices: Invoice[];
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
  userEmail?: string;
}

export default function Sidebar({
  activeTab,
  onChangeTab,
  productionOrders,
  stockItems,
  invoices
}: SidebarProps) {
  const tabs = [
    { id: 'home', label: 'Dashboard', icon: Home },
    { id: 'production', label: 'Production', icon: Factory, badge: productionOrders.filter(o => o.progress < 100).length },
    { id: 'inventory', label: 'Inventory', icon: Package, badge: stockItems.filter(s => s.status === 'Low Stock' || s.status === 'Out of Stock').length, badgeType: 'warning' },
    { id: 'purchases', label: 'Purchases', icon: ShoppingBag },
    { id: 'sales', label: 'Sales & Billing', icon: Receipt, badge: invoices.filter(i => i.status === 'Pending').length, badgeType: 'danger' },
    { id: 'more', label: 'System Settings', icon: Settings }
  ];

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 md:left-0 z-40 bg-white dark:bg-neutral-950 border-r border-gray-100 dark:border-neutral-900 select-none transition-all duration-300">
      {/* Branding Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100 dark:border-neutral-900 bg-gray-50/50 dark:bg-neutral-900/20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg shadow-sm overflow-hidden flex items-center justify-center flex-shrink-0">
            <img src="/logo.png" alt="Fabriq Logo" className="w-full h-full object-cover" />
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

      </nav>


    </aside>
  );
}
