import React from 'react';
import { motion } from 'motion/react';
import { Sun, Moon, RotateCcw, Shield, Mail, LogOut, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../admin/context/AdminAuthContext';

interface MoreTabProps {
  key?: string;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onResetData: () => void;
  userEmail: string;
}

export default function MoreTab({ isDarkMode, onToggleTheme, onResetData, userEmail }: MoreTabProps) {
  const navigate = useNavigate();
  const { employeeUser, logoutEmployee } = useAdminAuth();

  const handleSignOut = () => {
    logoutEmployee();
    navigate('/app/login');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 select-none text-gray-900 dark:text-neutral-100"
    >
      {/* Page Title */}
      <section>
        <h1 className="font-hanken text-4xl font-black text-gray-900 dark:text-neutral-100 tracking-tight">
          Settings
        </h1>
        <p className="text-xs text-gray-400 dark:text-neutral-500 mt-1 font-medium font-geist">
          Configure Fabriq Production OS preferences &amp; session
        </p>
      </section>

      {/* Account Info Card */}
      <section className="bento-card p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center font-hanken font-bold text-lg text-emerald-600 dark:text-emerald-400 shrink-0">
            {(employeeUser?.name || userEmail || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-hanken font-extrabold text-base">{employeeUser?.name || 'Employee'}</h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium flex items-center gap-1 mt-0.5">
              <Mail className="w-3.5 h-3.5 text-gray-400" />
              {employeeUser?.email || userEmail || 'user@domain.com'}
            </p>
            <span className="inline-flex items-center gap-1 text-[9px] font-bold font-geist text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/30 px-2 py-0.5 rounded-full mt-2">
              <Shield className="w-2.5 h-2.5" /> {employeeUser?.role || 'Employee'}
            </span>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out Session</span>
        </button>
      </section>

      {/* Preferences Section */}
      <section className="space-y-3">
        <h3 className="font-geist text-xs text-gray-400 dark:text-zinc-500 uppercase tracking-widest font-semibold px-1">
          Preferences &amp; Authentication
        </h3>

        <div className="bento-card overflow-hidden shadow-sm divide-y divide-gray-100 dark:divide-zinc-800/40">
          {/* Sign Out and Choose Portal */}
          <div className="p-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-zinc-950/20 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <LogOut className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-sm font-bold">Switch Login Mode / Portal</h4>
                <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">Sign out active session and return to Admin/User selection screen</p>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold font-mono text-xs rounded-xl transition-all cursor-pointer active:scale-95"
            >
              Sign Out &amp; Switch
            </button>
          </div>

          {/* Toggle Theme inline row */}
          <div className="p-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-zinc-950/20 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                {isDarkMode ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
              </div>
              <div>
                <h4 className="text-sm font-bold">Aesthetic Mode</h4>
                <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">Switch between Light and Dark canvas modes</p>
              </div>
            </div>

            <button
              onClick={onToggleTheme}
              className="px-3.5 py-1.5 bg-gray-100 dark:bg-zinc-800 hover:bg-emerald-500 hover:text-zinc-950 dark:hover:bg-emerald-500 text-xs font-bold font-geist rounded-xl transition-all cursor-pointer active:scale-95 text-gray-900 dark:text-zinc-100"
            >
              {isDarkMode ? 'Set Light' : 'Set Dark'}
            </button>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
