import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, ArrowRight, Smartphone } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';

export const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { loginAsAdmin } = useAdminAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const res = await loginAsAdmin(email, password);
    if (res.success) {
      navigate('/admin/dashboard');
    } else {
      setErrorMsg(res.message || 'Authentication failed');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between p-4 sm:p-8 font-sans antialiased">
      {/* Top Header Row */}
      <div className="flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center font-hanken font-extrabold text-2xl text-white shadow-md">
            F
          </div>
          <div>
            <h1 className="font-hanken font-extrabold text-base uppercase tracking-wide text-white">
              FABRIQ INDUSTRIAL LEDGER
            </h1>
            <p className="text-[11px] font-geist text-emerald-400 font-semibold">
              Desktop Enterprise Admin Portal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-sans font-medium border border-zinc-800 rounded-xl transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Choose Role / Portal</span>
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-sans font-medium border border-zinc-800 rounded-xl transition-colors cursor-pointer"
          >
            <Smartphone className="w-4 h-4 text-sky-400" />
            <span className="hidden sm:inline">Employee App</span>
          </button>
        </div>
      </div>

      {/* Center Auth Card */}
      <div className="my-auto max-w-md w-full mx-auto">
        <div className="bg-zinc-900/90 border border-zinc-800 p-8 shadow-2xl rounded-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-950/80 border border-emerald-600/40 text-emerald-400 rounded-2xl mb-1">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="font-hanken font-extrabold text-2xl text-white tracking-tight">
              Administrator Login
            </h2>
            <p className="text-xs font-sans text-zinc-400">
              Enter your credentials to access system master controls
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-geist rounded-xl">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-sans font-bold uppercase text-zinc-400 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-400" />
                Admin Email
              </label>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@fabriq.com"
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-emerald-500 text-white font-sans text-xs rounded-xl outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-sans font-bold uppercase text-zinc-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                Security Key / Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-emerald-500 text-white font-sans text-xs rounded-xl outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md rounded-xl cursor-pointer"
            >
              <span>ACCESS CONTROL PANEL</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>


        </div>
      </div>

      {/* Footer */}
      <div className="max-w-6xl mx-auto w-full text-center text-xs font-geist text-zinc-600 py-4">
        Fabriq Textile &amp; Garment ERP &copy; 2026. All rights reserved.
      </div>
    </div>
  );
};
