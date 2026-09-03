import React from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import BottomNav from '../components/BottomNav';
import { ProductionOrder, StockItem, Invoice, Notification } from '../../types';
import { ShieldCheck, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../admin/context/AdminAuthContext';

interface EmployeeLayoutProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  notifications: Notification[];
  onMarkNotificationRead: (id: string) => void;
  onClearNotifications: () => void;
  productionOrders: ProductionOrder[];
  stockItems: StockItem[];
  invoices: Invoice[];
  children: React.ReactNode;
}

export const EmployeeLayout: React.FC<EmployeeLayoutProps> = ({
  activeTab,
  setActiveTab,
  isDarkMode,
  onToggleTheme,
  notifications,
  onMarkNotificationRead,
  onClearNotifications,
  productionOrders,
  stockItems,
  invoices,
  children
}) => {
  const { logoutEmployee, employeeUser, isAdminAuthenticated } = useAdminAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-gray-900 dark:text-zinc-100 transition-colors duration-300 flex flex-col antialiased">
      {/* Top Banner (Desktop & Mobile status bar) */}
      <div className="bg-zinc-900 text-zinc-100 px-4 py-2 text-xs font-mono border-b border-zinc-800 flex items-center justify-between shadow-sm z-30 relative">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
          <span className="hidden sm:inline">EMPLOYEE APP ({employeeUser?.name || 'Staff'})</span>
          <span className="sm:hidden">{employeeUser?.name || 'EMPLOYEE APP'}</span>
        </div>
        <div className="flex items-center gap-2">
          {isAdminAuthenticated && (
            <button
              onClick={() => navigate('/admin')}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[11px] transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Portal</span>
            </button>
          )}
          <button
            onClick={() => {
              logoutEmployee();
              navigate('/app/login');
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 font-bold rounded text-[11px] transition-colors cursor-pointer"
            title="Sign Out of Employee App"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Desktop Sidebar (Rendered on MD screens and above) */}
      <Sidebar
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        productionOrders={productionOrders}
        stockItems={stockItems}
        invoices={invoices}
        isDarkMode={isDarkMode}
        onToggleTheme={onToggleTheme}
      />

      {/* Top Navigation Header */}
      <Header
        isDarkMode={isDarkMode}
        onToggleTheme={onToggleTheme}
        notifications={notifications}
        onMarkNotificationRead={onMarkNotificationRead}
        onClearNotifications={onClearNotifications}
        activeTab={activeTab}
      />

      {/* Main Content Area (Responsive width on desktop, optimized container on mobile) */}
      <main className="flex-1 max-w-md mx-auto pt-20 pb-28 px-4 md:max-w-none md:pl-72 md:mx-0 md:px-8 md:pb-12 transition-all duration-300 w-full">
        {children}
      </main>

      {/* Mobile App Bottom Navigation Bar (Hidden on desktop) */}
      <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} />
    </div>
  );
};
