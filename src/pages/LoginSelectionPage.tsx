import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Smartphone, LogOut, UserCheck, ArrowRight, Building2, Factory, Lock, CheckCircle2 } from 'lucide-react';
import { useAdminAuth } from '../admin/context/AdminAuthContext';
import { useFabriqData } from '../context/FabriqDataContext';

export const LoginSelectionPage: React.FC = () => {
  const {
    isAdminAuthenticated,
    adminUser,
    isEmployeeAuthenticated,
    employeeUser,
    loginAsEmployee,
    logoutAdmin,
    logoutEmployee,
    logoutAll
  } = useAdminAuth();

  const { settings } = useFabriqData();
  const navigate = useNavigate();

  const handleChooseEmployeeLogin = () => {
    if (isEmployeeAuthenticated) {
      navigate('/app');
    } else {
      navigate('/employee-login');
    }
  };

  const handleChooseAdminLogin = () => {
    if (isAdminAuthenticated) {
      navigate('/admin/dashboard');
    } else {
      navigate('/admin/login');
    }
  };

  const handleSignoutAll = () => {
    logoutAll();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between p-4 sm:p-8 font-sans antialiased">
      {/* Top Brand & Global Status Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-5xl mx-auto w-full border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center font-hanken font-extrabold text-2xl text-white shadow-md">
            F
          </div>
          <div>
            <h1 className="font-hanken font-extrabold text-lg uppercase tracking-wide text-white">
              {settings.companyName || 'FABRIQ OS'}
            </h1>
            <p className="text-xs font-geist text-emerald-400 font-semibold">
              Enterprise Garment ERP &amp; Shop Floor Ledger
            </p>
          </div>
        </div>

        {(isAdminAuthenticated || isEmployeeAuthenticated) && (
          <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 px-3.5 py-1.5 rounded-xl">
            <div className="flex items-center gap-2 text-xs font-geist text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Signed In: {adminUser?.name || employeeUser?.name || 'Active Session'}</span>
            </div>
            <button
              onClick={handleSignoutAll}
              className="px-3 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-geist font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Sign Out All Sessions"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>SIGN OUT</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Choice Section */}
      <div className="my-auto max-w-4xl w-full mx-auto space-y-8 py-8">
        <div className="text-center space-y-2">
          <span className="px-3.5 py-1 text-xs font-geist font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/80 rounded-full inline-block">
            AUTHENTICATION PORTAL
          </span>
          <h2 className="font-hanken font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
            Choose Your Operational Portal
          </h2>
          <p className="text-sm font-sans text-zinc-400 max-w-lg mx-auto">
            Select an operational environment to sign in or switch portals instantly.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Admin Portal Login */}
          <div className="bg-zinc-900/90 border border-zinc-800 hover:border-emerald-500/60 p-6 sm:p-8 flex flex-col justify-between space-y-6 transition-all duration-300 group shadow-xl rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <ShieldCheck className="w-32 h-32 text-emerald-500" />
            </div>

            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-emerald-950 border border-emerald-600/40 text-emerald-400 rounded-2xl flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                {isAdminAuthenticated ? (
                  <span className="px-3 py-1 bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs font-geist font-bold uppercase rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> ACTIVE ADMIN
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-zinc-800 text-zinc-400 border border-zinc-700 text-xs font-geist font-bold uppercase rounded-full">
                    RESTRICTED ROLE
                  </span>
                )}
              </div>

              <div>
                <h3 className="font-hanken font-extrabold text-2xl text-white group-hover:text-emerald-400 transition-colors">
                  Desktop Admin Portal
                </h3>
                <p className="text-xs font-sans text-zinc-400 mt-1 leading-relaxed">
                  Full executive control, user access rights, contractor master, sales overrides, and audit trails.
                </p>
              </div>

              <ul className="text-xs font-sans text-zinc-400 space-y-2.5 pt-3 border-t border-zinc-800/80">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Master Database CRUD Controls</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Financial &amp; Procurement Overrides</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Security Audit Logs &amp; User Access</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 space-y-2 relative z-10">
              <button
                onClick={handleChooseAdminLogin}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md rounded-xl cursor-pointer"
              >
                <span>{isAdminAuthenticated ? 'ENTER ADMIN PORTAL' : 'LOGIN TO ADMIN PORTAL'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {isAdminAuthenticated && (
                <button
                  onClick={logoutAdmin}
                  className="w-full py-2.5 bg-zinc-800 hover:bg-rose-950 text-zinc-300 hover:text-rose-300 border border-zinc-700 hover:border-rose-800 text-xs font-sans font-bold flex items-center justify-center gap-1.5 transition-colors rounded-xl cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out Admin</span>
                </button>
              )}
            </div>
          </div>

          {/* Card 2: Employee / User Mobile App */}
          <div className="bg-zinc-900/90 border border-zinc-800 hover:border-sky-500/60 p-6 sm:p-8 flex flex-col justify-between space-y-6 transition-all duration-300 group shadow-xl rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Smartphone className="w-32 h-32 text-sky-500" />
            </div>

            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-sky-950 border border-sky-600/40 text-sky-400 rounded-2xl flex items-center justify-center">
                  <Smartphone className="w-6 h-6" />
                </div>
                {isEmployeeAuthenticated ? (
                  <span className="px-3 py-1 bg-sky-950 text-sky-400 border border-sky-800 text-xs font-geist font-bold uppercase rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> ACTIVE EMPLOYEE
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-zinc-800 text-zinc-400 border border-zinc-700 text-xs font-geist font-bold uppercase rounded-full">
                    SHOP FLOOR ROLE
                  </span>
                )}
              </div>

              <div>
                <h3 className="font-hanken font-extrabold text-2xl text-white group-hover:text-sky-400 transition-colors">
                  Employee Mobile App
                </h3>
                <p className="text-xs font-sans text-zinc-400 mt-1 leading-relaxed">
                  Shop floor order updates, stock counts, quick invoice entries, and worker alerts.
                </p>
              </div>

              <ul className="text-xs font-sans text-zinc-400 space-y-2.5 pt-3 border-t border-zinc-800/80">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  <span>Live Production Job Cards</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  <span>Godown Stock Adjustments</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  <span>Quick Order &amp; Billing Entry</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 space-y-2 relative z-10">
              <button
                onClick={handleChooseEmployeeLogin}
                className="w-full py-3.5 bg-sky-600 hover:bg-sky-500 text-white font-sans font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md rounded-xl cursor-pointer"
              >
                <span>{isEmployeeAuthenticated ? 'OPEN EMPLOYEE APP' : 'CONTINUE AS EMPLOYEE / WORKER'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {isEmployeeAuthenticated && (
                <button
                  onClick={logoutEmployee}
                  className="w-full py-2.5 bg-zinc-800 hover:bg-rose-950 text-zinc-300 hover:text-rose-300 border border-zinc-700 hover:border-rose-800 text-xs font-sans font-bold flex items-center justify-center gap-1.5 transition-colors rounded-xl cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out Employee</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-5xl mx-auto w-full text-center text-xs font-geist text-zinc-500 border-t border-zinc-800/80 pt-4">
        Fabriq Garment ERP System &copy; 2026. Toggle between Admin and Employee roles anytime.
      </div>
    </div>
  );
};
