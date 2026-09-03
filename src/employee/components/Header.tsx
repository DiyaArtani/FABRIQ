import React, { useState } from 'react';
import { Notification } from '../../types';
import { Bell, Sun, Moon, Check, Trash, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../admin/context/AdminAuthContext';

interface HeaderProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
  notifications: Notification[];
  onMarkNotificationRead: (id: string) => void;
  onClearNotifications: () => void;
  activeTab?: string;
}

export default function Header({
  isDarkMode,
  onToggleTheme,
  notifications,
  onMarkNotificationRead,
  onClearNotifications,
  activeTab = 'home'
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;
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

        {/* Notifications Icon Button */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
            className="w-9 h-9 flex items-center justify-center rounded-full text-emerald-700 dark:text-emerald-400 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors active:scale-95 cursor-pointer relative"
            title="Notifications"
          >
            <Bell className="w-4.5 h-4.5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-neutral-900" />
            )}
          </button>

          {/* Notifications Dropdown Card */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-neutral-900 rounded-xl border border-gray-100 dark:border-neutral-800 shadow-xl z-50 overflow-hidden transform origin-top-right transition-all">
              <div className="p-4 border-b border-gray-50 dark:border-neutral-800/50 flex justify-between items-center bg-gray-50/50 dark:bg-neutral-900/50">
                <span className="font-hanken font-bold text-sm text-gray-900 dark:text-neutral-100">Notifications ({unreadCount})</span>
                {unreadCount > 0 && (
                  <button
                    onClick={onClearNotifications}
                    className="text-xs text-rose-500 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Trash className="w-3 h-3" /> Clear All
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-400 dark:text-neutral-500">
                    No notifications at this time.
                  </div>
                ) : (
                  notifications.map((n, idx) => (
                    <div
                      key={`${n.id}-${idx}`}
                      className={`p-3.5 border-b border-gray-50 dark:border-neutral-800/30 flex items-start gap-2.5 transition-colors ${
                        n.read ? 'bg-transparent' : 'bg-emerald-50/20 dark:bg-emerald-950/10'
                      }`}
                    >
                      <div className="mt-1">
                        {n.type === 'alert' && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 block" />
                        )}
                        {n.type === 'warning' && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 block" />
                        )}
                        {n.type === 'info' && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 block" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className={`text-xs font-semibold ${n.read ? 'text-gray-500 dark:text-neutral-400' : 'text-gray-900 dark:text-neutral-100'}`}>
                            {n.title}
                          </h4>
                          {!n.read && (
                            <button
                              onClick={() => onMarkNotificationRead(n.id)}
                              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 p-0.5 rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors cursor-pointer"
                              title="Mark read"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                          {n.description}
                        </p>
                        <span className="text-[10px] text-gray-400 dark:text-neutral-500 block mt-1.5 font-geist">
                          {n.time}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu Button (DA) */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            className="w-9 h-9 bg-emerald-600 dark:bg-emerald-500 text-white font-mono font-bold text-xs rounded-full flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer border border-emerald-700 dark:border-emerald-400 shadow-xs"
            title="User Profile Menu"
          >
            {userInitials}
          </button>

          {/* Profile Popover Card */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-neutral-900 rounded-xl border border-gray-100 dark:border-neutral-800 shadow-xl z-50 p-3.5 font-mono text-xs">
              <div className="flex items-center gap-2.5 pb-2.5 border-b border-gray-100 dark:border-neutral-800">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                  {userInitials}
                </div>
                <div>
                  <div className="font-bold text-gray-900 dark:text-neutral-100">{userName}</div>
                  <div className="text-[10px] text-gray-500 dark:text-neutral-400">{employeeUser?.role || 'Employee'}</div>
                </div>
              </div>
              <div className="my-2.5 space-y-1 text-[11px] text-gray-600 dark:text-neutral-400">
                <div><span className="text-gray-400 dark:text-neutral-500">Employee ID:</span> {employeeUser?.employeeId || 'EMP-001'}</div>
                <div><span className="text-gray-400 dark:text-neutral-500">Department:</span> Garment Operations</div>
                <div><span className="text-gray-400 dark:text-neutral-500">Facility:</span> Unit 1 - Main Mill</div>
              </div>
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  navigate('/admin');
                }}
                className="w-full py-1.5 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-800 dark:text-neutral-200 rounded-lg font-bold text-center transition-colors cursor-pointer block"
              >
                Admin Control Center
              </button>
            </div>
          )}
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
