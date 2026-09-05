import React from 'react';
import { Sun, Moon, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../admin/context/AdminAuthContext';

interface HeaderProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
  activeTab?: string;
}

export default function Header({
  isDarkMode,
  onToggleTheme,
  activeTab = 'home'
}: HeaderProps) {
  const navigate = useNavigate();
  const { employeeUser, logoutAll } = useAdminAuth();

  const handleSignOut = () => {
    logoutAll();
    navigate('/login');
  };

  const userName = employeeUser?.name || 'Employee';
  const userInitials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'DA';

  const tabTitles: Record<string, string> = {
    home: 'Control Center Dashboard',
    production: 'Production Control Module',
    inventory: 'Material Inventory Ledger',
    purchases: 'Procurement & Purchase Logs',
    sales: 'Sales, Invoicing & Billing',
    more: 'ERP Core System Settings'
  };

  return (
    <header className="fixed top-0 left-0 md:left-64 right-0 h-14 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-neutral-800 z-40 flex justify-between items-center px-5 select-none transition-colors duration-300">
      <div className="flex items-center gap-3">
        {/* On mobile, show logo and brand */}
        <div className="flex md:hidden items-center gap-2">
          <div className="w-7 h-7 rounded bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            F
          </div>
          <span className="font-hanken text-lg font-extrabold tracking-tight text-emerald-700 dark:text-emerald-400">
            Fabriq
          </span>
        </div>
        {/* On desktop, show current module path/title */}
        <div className="hidden md:flex items-center gap-2">
          <span className="text-xs text-gray-400 dark:text-neutral-500 font-mono">System</span>
          <span className="text-gray-300 dark:text-neutral-700">/</span>
          <span className="text-sm font-bold text-gray-800 dark:text-zinc-200 font-hanken">
            {tabTitles[activeTab]}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Theme Toggle Button */}
        <button
          onClick={onToggleTheme}
          aria-label="Toggle Theme"
          className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors active:scale-95 cursor-pointer"
          title="Toggle Theme"
        >
          {isDarkMode ? (
            <Sun className="w-4.5 h-4.5 text-amber-400" />
          ) : (
            <Moon className="w-4.5 h-4.5 text-indigo-600" />
          )}
        </button>

        {/* User Profile Badge */}
        <div
          className="w-9 h-9 bg-emerald-600 dark:bg-emerald-500 text-white font-mono font-bold text-xs rounded-full flex items-center justify-center border border-emerald-700 dark:border-emerald-400 shadow-xs select-none"
          title={userName}
        >
          {userInitials}
        </div>

        {/* Sign Out Button */}
        <button
          onClick={handleSignOut}
          title="Sign Out & Switch Portal"
          className="h-9 px-3 flex items-center gap-1.5 rounded-full text-xs font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors cursor-pointer active:scale-95"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
}
