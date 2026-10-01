import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCheck,
  User,
  Mail,
  KeyRound,
  ArrowRight,
  AlertCircle,
  Sun,
  Moon
} from 'lucide-react';
import { useAdminAuth } from '../../admin/context/AdminAuthContext';
import { useFabriqData } from '../../context/FabriqDataContext';
import { AppUser } from '../../types';


export const EmployeeLoginPage: React.FC = () => {
  const { loginAsEmployee, loginAsEmployeeWithCredentials, isFirebaseConfigured } = useAdminAuth();
  const { settings, users } = useFabriqData();
  const navigate = useNavigate();

  // Dark/Light Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('fabriq_theme');
    if (saved) return saved === 'dark';
    return false; // Default Light Mode
  });

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

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  // Filter strictly non-admin active employee profiles from Firebase database
  const employeeUsers = useMemo(() => {
    return (users || []).filter(u => {
      const role = (u?.role || '').toLowerCase();
      return role !== 'admin' && u.status !== 'Disabled';
    });
  }, [users]);

  // Form State
  const [employeeEmail, setEmployeeEmail] = useState('');
  const [employeePin, setEmployeePin] = useState('');
  const [selectedUserObj, setSelectedUserObj] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Quick Employee Select handler
  const handleSelectEmployeeProfile = (u: AppUser) => {
    setSelectedUserObj(u);
    setEmployeeEmail(u.email || u.employeeId || '');
    setEmployeePin('');
    setErrorMsg(null);
  };

  // Handle Employee Form Submission
  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const emailOrId = employeeEmail.trim();
    if (!emailOrId) {
      setErrorMsg('Please enter your Employee Email or ID.');
      setLoading(false);
      return;
    }

    if (!employeePin.trim()) {
      setErrorMsg('Please enter your Security PIN.');
      setLoading(false);
      return;
    }

    try {
      const res = await loginAsEmployeeWithCredentials(emailOrId, employeePin);
      if (res.success) {
        navigate('/app');
      } else {
        setErrorMsg(res.message || 'Employee authentication failed. Check your email and PIN.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Login error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col justify-between p-4 sm:p-8 font-sans antialiased relative overflow-hidden transition-colors duration-300">
      {/* Background Ambient Glow Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/10 dark:bg-emerald-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-sky-500/10 dark:bg-sky-600/15 rounded-full blur-[140px] pointer-events-none" />

      {/* Background Subtle Grid Lines Pattern */}
      <div
        className="absolute inset-0 opacity-[0.05] dark:opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.3) 1px, transparent 0)`,
          backgroundSize: '24px 24px'
        }}
      />

      {/* Top Header Bar */}
      <div className="flex items-center justify-between max-w-6xl mx-auto w-full relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl shadow-md overflow-hidden flex items-center justify-center flex-shrink-0">
            <img src="/logo.png" alt="Fabriq Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="font-hanken font-extrabold text-base tracking-wide uppercase text-zinc-900 dark:text-white">
              {settings.companyName || 'FABRIQ'}
            </h1>
            <p className="text-[11px] font-mono text-sky-600 dark:text-sky-400 font-bold">
              Employee portal
            </p>
          </div>
        </div>

        {/* Live Status Badge & Theme Toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2.5 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm transition-all cursor-pointer flex items-center gap-2 text-xs font-semibold"
            title="Toggle Light / Dark Mode"
          >
            {isDarkMode ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-zinc-700" />
                <span className="hidden sm:inline">Dark Mode</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Authentication Container */}
      <div className="my-auto max-w-md w-full mx-auto relative z-10 py-6">
        {/* Central Auth Glassmorphism Card */}
        <div className="bg-white/95 dark:bg-zinc-900/85 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800/90 p-6 sm:p-8 shadow-xl dark:shadow-2xl rounded-3xl space-y-6 transition-colors duration-300">

          {/* Card Header & Title */}
          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-sky-50 dark:bg-sky-950/80 border border-sky-500/30 text-sky-600 dark:text-sky-400 rounded-2xl mb-1 shadow-inner">
              <UserCheck className="w-6 h-6" />
            </div>
            <h2 className="font-hanken font-extrabold text-2xl sm:text-3xl text-zinc-900 dark:text-white tracking-tight">
              Sign In to Your Workspace
            </h2>
            <p className="text-xs font-sans text-zinc-500 dark:text-zinc-400">
              Select your employee profile or enter credentials to sign into the app
            </p>
          </div>

          {/* Error Message Alert */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/90 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-mono rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* EMPLOYEE LOGIN FORM */}
          <form onSubmit={handleEmployeeSubmit} className="space-y-4">

            {/* Quick Select Employee Profile */}
            {employeeUsers.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-sans font-bold uppercase text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  Select Employee
                </label>
                <select
                  value={selectedUserObj?.id || ''}
                  onChange={(e) => {
                    const matched = employeeUsers.find(u => u.id === e.target.value);
                    if (matched) handleSelectEmployeeProfile(matched);
                  }}
                  className="w-full px-3.5 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-sky-500 text-zinc-900 dark:text-white font-sans text-xs rounded-xl outline-none transition-colors cursor-pointer"
                >
                  <option value="">-- Choose Employee --</option>
                  {employeeUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email || u.employeeId})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Email / ID Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-sans font-bold uppercase text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                Employee Email / ID
              </label>
              <input
                type="text"
                required
                value={employeeEmail}
                onChange={(e) => setEmployeeEmail(e.target.value)}
                placeholder="e.g. employee@fabriq.com"
                className="w-full px-3.5 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-sky-500 text-zinc-900 dark:text-white font-sans text-xs rounded-xl outline-none transition-colors"
              />
            </div>

            {/* Passcode / PIN Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-sans font-bold uppercase text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                Passcode / Security PIN
              </label>
              <input
                type="password"
                value={employeePin}
                onChange={(e) => setEmployeePin(e.target.value)}
                placeholder="••••"
                className="w-full px-3.5 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-sky-500 text-zinc-900 dark:text-white font-sans text-xs rounded-xl outline-none transition-colors"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-sky-600 hover:bg-sky-500 text-white font-sans font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md rounded-xl cursor-pointer"
            >
              <span>{loading ? 'SIGNING IN...' : 'ENTER SHOP'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

        </div>
      </div>

      {/* Page Footer */}
      <div className="max-w-6xl mx-auto w-full text-center text-xs font-mono text-zinc-500 dark:text-zinc-500 py-2 relative z-10">
        Fabriq Industrial Textile ERP &copy; 2026.
      </div>
    </div>
  );
};
