import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Warehouse as WarehouseIcon,
  HardHat,
  Truck,
  Building2,
  ShoppingBag,
  Factory,
  PackageCheck,
  Receipt,
  History,
  LogOut,
  Smartphone,
  Sun,
  Moon,
  ShieldCheck,
  ChevronRight,
  Menu,
  X,
  Bell
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useFabriqData } from '../../context/FabriqDataContext';

export const AdminLayout: React.FC = () => {
  const { adminUser, logoutAdmin } = useAdminAuth();
  const { notifications, settings } = useFabriqData();
  const navigate = useNavigate();
  const location = useLocation();

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('fabriq_theme');
    if (saved) return saved === 'dark';
    return document.documentElement.classList.contains('dark');
  });

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      localStorage.setItem('fabriq_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      localStorage.setItem('fabriq_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  const navItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'User Management', path: '/admin/users', icon: Users, badge: 'Users' },
    { label: 'Warehouse Master', path: '/admin/warehouses', icon: WarehouseIcon },
    { label: 'Contractor Master', path: '/admin/contractors', icon: HardHat },
    { label: 'Supplier Master', path: '/admin/suppliers', icon: Truck },
    { label: 'Customer Master', path: '/admin/customers', icon: Building2 },
    { label: 'Purchase Ledger', path: '/admin/purchases', icon: ShoppingBag },
    { label: 'Production Control', path: '/admin/production', icon: Factory },
    { label: 'Inventory Master', path: '/admin/inventory', icon: PackageCheck },
    { label: 'Sales & Billing', path: '/admin/sales', icon: Receipt },
    { label: 'Audit Logs', path: '/admin/settings', icon: History }
  ];

  const currentNav = navItems.find(item => location.pathname.startsWith(item.path)) || navItems[0];
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex font-sans antialiased">
      {/* Mobile Sidebar Overlay Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Desktop & Mobile Persistent Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 border-r border-zinc-200 dark:border-zinc-800 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-hanken font-extrabold text-xl shadow-sm">
              F
            </div>
            <div>
              <h1 className="font-hanken font-extrabold text-sm tracking-tight text-zinc-900 dark:text-white uppercase">
                {settings.companyName || 'FABRIQ LEDGER'}
              </h1>
              <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                <ShieldCheck className="w-3 h-3" />
                <span>ADMIN PORTAL v2.4</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="lg:hidden text-zinc-400 hover:text-zinc-900 dark:hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Admin User Profile Card */}
        <div className="p-3 mx-3 my-3 bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700/60 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold text-xs font-mono">
              {adminUser?.name?.substring(0, 2).toUpperCase() || 'AD'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-zinc-900 dark:text-white truncate font-hanken">
                {adminUser?.name || 'Administrator'}
              </p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono truncate">
                {adminUser?.role || 'Admin'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-1 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-mono font-bold transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Switcher & Sign Out */}
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 space-y-1">
          <button
            onClick={() => navigate('/app')}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono font-bold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/50 transition-colors cursor-pointer"
          >
            <Smartphone className="w-4 h-4" />
            <span>Employee App</span>
          </button>
          <button
            onClick={() => {
              logoutAdmin();
              navigate('/login');
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Sticky Header */}
        <header className="sticky top-0 z-20 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="font-hanken font-bold text-sm text-zinc-900 dark:text-white">
                {currentNav.label}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-colors cursor-pointer"
              title="Toggle Theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-600" />}
            </button>

            {/* Launch Employee App Link */}
            <button
              onClick={() => navigate('/app')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-mono font-bold rounded-xl border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5 text-sky-500" />
              <span>Launch App</span>
            </button>
          </div>
        </header>

        {/* Dynamic Page Outlet */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
