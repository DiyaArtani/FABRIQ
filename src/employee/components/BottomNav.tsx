import React from 'react';
import { Home, Factory, Package, Receipt, ShoppingBag, MoreHorizontal } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onChangeTab: (tab: string) => void;
}

export default function BottomNav({ activeTab, onChangeTab }: BottomNavProps) {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'production', label: 'Production', icon: Factory },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'purchases', label: 'Purchases', icon: ShoppingBag },
    { id: 'sales', label: 'Sales', icon: Receipt },
    { id: 'more', label: 'More', icon: MoreHorizontal }
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full h-20 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-xl border-t border-gray-100 dark:border-neutral-800 z-50 rounded-t-2xl shadow-lg flex justify-around items-center px-2 pb-4 pt-2 glass-nav select-none transition-all duration-300">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onChangeTab(tab.id)}
            className={`flex flex-col items-center justify-center gap-1 w-12 sm:w-16 h-12 rounded-xl transition-all active:scale-90 cursor-pointer ${
              isActive
                ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                : 'text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-300'
            }`}
          >
            <Icon className={`w-4.5 h-4.5 transition-transform ${isActive ? 'scale-110' : ''}`} />
            <span className="text-[9px] sm:text-[11px] tracking-wide font-medium">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
