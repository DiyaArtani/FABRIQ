import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  UserCheck,
  Lock,
  Mail,
  ArrowRight,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Building2,
  KeyRound,
  User,
  LogOut,
  ChevronRight,
  Sun,
  Moon
} from 'lucide-react';
import { useAdminAuth } from '../admin/context/AdminAuthContext';
import { useFabriqData } from '../context/FabriqDataContext';

export const UnifiedLoginPage: React.FC = () => {
  const {
    loginAsAdmin,
    loginAsEmployeeWithCredentials,
    isFirebaseConfigured,
    isAdminAuthenticated,
    adminUser,
    isEmployeeAuthenticated,
    employeeUser,
    logoutAll
  } = useAdminAuth();

  const { settings, users } = useFabriqData();
  const navigate = useNavigate();
  const location = useLocation();

  // Dark/Light Theme state - Default to Light Mode unless saved
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

  // Active Role Tab: 'admin' | 'employee' - automatically detects /app/login or /admin/login
  const [activeTab, setActiveTab] = useState<'admin' | 'employee'>(() => {
    if (location.pathname.includes('/app') || location.pathname.includes('/employee')) {
      return 'employee';
    }
    return 'admin';
  });

  // Admin Form State
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [rememberAdmin, setRememberAdmin] = useState(true);

  // Employee Form State
  const [employeeIdentifier, setEmployeeIdentifier] = useState('');
  const [employeePin, setEmployeePin] = useState('');
  const [selectedUserObj, setSelectedUserObj] = useState<any>(null);

  // Shared States
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter strictly non-admin active employee profiles
  const employeeUsers = React.useMemo(() => {
    return (users || []).filter(u => {
      const role = (u?.role || '').toLowerCase();
      const dept = (u?.department || '').toLowerCase();
      return (
        role !== 'admin' &&
        role !== 'super admin' &&
        role !== 'administrator' &&
        dept !== 'executive management' &&
        u.status !== 'Disabled'
      );
    });
  }, [users]);

  // Quick Employee Select
  const handleSelectEmployeeProfile = (u: any) => {
    setSelectedUserObj(u);
    setEmployeeIdentifier(u.employeeId || u.email || u.name);
    setEmployeePin('');
    setErrorMsg(null);
  };

  // Handle Admin Form Submission
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await loginAsAdmin(adminEmail, adminPassword);
      if (res.success) {
        navigate('/admin/dashboard');
      } else {
        setErrorMsg(res.message || 'Administrator authentication failed');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Login error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Handle Employee Form Submission
  const handleEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = loginAsEmployeeWithCredentials(employeeIdentifier, employeePin);
      if (res.success) {
        navigate('/app');
      } else {
        setErrorMsg(res.message || 'Employee authentication failed');
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
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-500 flex items-center justify-center font-hanken font-extrabold text-2xl text-white shadow-md">
            F
          </div>
          <div>
            <h1 className="font-hanken font-extrabold text-base tracking-wide uppercase text-zinc-900 dark:text-white">
              {settings.companyName || 'FABRIQ'}
            </h1>
          </div>
        </div>

        {/* Live Status Badge & Theme Toggle */}
        <div className="flex items-center gap-3">
          {/* Sun / Moon Light & Dark Theme Toggle Button */}
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
      <div className="my-auto max-w-lg w-full mx-auto relative z-10 py-6">
        {/* Central Auth Glassmorphism Card */}
        <div className="bg-white/95 dark:bg-zinc-900/85 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800/90 p-6 sm:p-8 shadow-xl dark:shadow-2xl rounded-3xl space-y-6 transition-colors duration-300">
          {/* Card Header & Title */}
          <div className="text-center space-y-1.5">
            <h2 className="font-hanken font-extrabold text-2xl sm:text-3xl text-zinc-900 dark:text-white tracking-tight">
              Sign In to Your Workspace
            </h2>
            <p className="text-xs font-sans text-zinc-500 dark:text-zinc-400">
              Select your operational role below to sign into the system
            </p>
          </div>

          {/* Dual Role Selector Tabs */}
          <div className="grid grid-cols-2 p-1.5 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab('admin');
                setErrorMsg(null);
              }}
              className={`py-3 px-4 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-white/60 dark:hover:bg-zinc-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>ADMIN PORTAL</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('employee');
                setErrorMsg(null);
              }}
              className={`py-3 px-4 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'employee'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-white/60 dark:hover:bg-zinc-900'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>EMPLOYEE APP</span>
            </button>
          </div>

          {/* Error Message Alert */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/90 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-mono rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: ADMINISTRATOR LOGIN FORM */}
          {activeTab === 'admin' && (
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-sans font-bold uppercase text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Admin Email Address
                </label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@domain.com"
                  className="w-full px-3.5 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-emerald-500 text-zinc-900 dark:text-white font-sans text-xs rounded-xl outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-sans font-bold uppercase text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Security Key / Password
                </label>
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-emerald-500 text-zinc-900 dark:text-white font-sans text-xs rounded-xl outline-none transition-colors"
                />
              </div>

              <div className="flex items-center justify-between text-xs font-sans text-zinc-600 dark:text-zinc-400 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberAdmin}
                    onChange={(e) => setRememberAdmin(e.target.checked)}
                    className="accent-emerald-600 rounded"
                  />
                  <span>Remember Session</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md rounded-xl cursor-pointer"
              >
                <span>{loading ? 'AUTHENTICATING...' : 'ACCESS ADMIN CONTROL PANEL'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* TAB 2: EMPLOYEE / SHOP FLOOR USER LOGIN FORM */}
          {activeTab === 'employee' && (
            <form onSubmit={handleEmployeeSubmit} className="space-y-4">
              {/* Quick Select Employee Profile */}
              {employeeUsers.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-sans font-bold uppercase text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                    Select Active Employee Account
                  </label>
                  <select
                    value={selectedUserObj?.id || ''}
                    onChange={(e) => {
                      const matched = employeeUsers.find(u => u.id === e.target.value);
                      if (matched) handleSelectEmployeeProfile(matched);
                    }}
                    className="w-full px-3.5 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-sky-500 text-zinc-900 dark:text-white font-sans text-xs rounded-xl outline-none transition-colors"
                  >
                    <option value="">-- Choose Employee Profile --</option>
                    {employeeUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role} - {u.department})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-sans font-bold uppercase text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  Employee ID, Email, or Name
                </label>
                <input
                  type="text"
                  required
                  value={employeeIdentifier}
                  onChange={(e) => setEmployeeIdentifier(e.target.value)}
                  placeholder="e.g. EMP-101 or user@domain.com"
                  className="w-full px-3.5 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-sky-500 text-zinc-900 dark:text-white font-sans text-xs rounded-xl outline-none transition-colors"
                />
              </div>

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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-sky-600 hover:bg-sky-500 text-white font-sans font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md rounded-xl cursor-pointer"
              >
                <span>{loading ? 'SIGNING IN...' : 'ENTER SHOP FLOOR APP'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Page Footer */}
      <div className="max-w-6xl mx-auto w-full text-center text-xs font-mono text-zinc-500 dark:text-zinc-500 py-2 relative z-10">
        Fabriq Industrial Textile ERP &copy; 2026. Support for Light and Dark Modes.
      </div>
    </div>
  );
};
