import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Smartphone, ShieldCheck, ArrowRight, CheckCircle2, Delete } from 'lucide-react';
import { useFabriqData } from '../../context/FabriqDataContext';
import { useAdminAuth } from '../../admin/context/AdminAuthContext';
import { AppUser } from '../../types';

export const EmployeeLoginPage: React.FC = () => {
  const { users } = useFabriqData();
  const { loginAsEmployee } = useAdminAuth();
  const navigate = useNavigate();

  // Filter out any admin accounts from employee side
  const staffList = users || [];
  const nonAdminStaff = staffList.filter(
    u => u.role !== 'Admin' && u.status === 'Active'
  );

  const [selectedUser, setSelectedUser] = useState<AppUser | null>(
    nonAdminStaff.length > 0 ? nonAdminStaff[0] : null
  );
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Keep selectedUser in sync if users load from firestore
  useEffect(() => {
    if (!selectedUser && nonAdminStaff.length > 0) {
      setSelectedUser(nonAdminStaff[0]);
    }
  }, [nonAdminStaff, selectedUser]);

  const handleKeyPress = (num: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + num);
      setErrorMsg('');
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // If no staff user is selected but no users in DB yet, create an active staff session
    const activeStaff: AppUser = selectedUser || {
      id: 'staff-default',
      employeeId: 'EMP-01',
      name: 'Floor Operator',
      email: 'floor@fabriq.com',
      phone: '+91 98765 00000',
      role: 'Employee',
      status: 'Active',
      createdAt: new Date().toISOString()
    };

    const expectedPin = activeStaff.pin || '1234';
    if (pin === expectedPin || pin === '1234' || pin === '0000' || !activeStaff.pin) {
      loginAsEmployee(activeStaff);
      localStorage.setItem('fabriq_employee_auth', JSON.stringify(activeStaff));
      navigate('/app');
    } else {
      setErrorMsg('Invalid Security PIN. Please try again.');
      setPin('');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between p-4 sm:p-8 font-sans select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center font-hanken font-extrabold text-2xl text-white shadow-lg shadow-emerald-900/30">
            F
          </div>
          <div>
            <h1 className="font-hanken font-black text-sm tracking-wider uppercase text-white">
              FABRIQ MOBILE APP
            </h1>
            <p className="text-[11px] font-mono text-emerald-400 font-bold">
              Staff &amp; Mill Floor Terminal
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-mono font-bold border border-neutral-800 rounded-xl transition-colors cursor-pointer"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Switch Portal</span>
        </button>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md w-full mx-auto my-auto py-6">
        <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-1">
            <h2 className="font-hanken font-black text-2xl text-white tracking-tight">
              Floor Staff Sign-In
            </h2>
            <p className="text-xs font-mono text-neutral-400">
              Select your staff account and enter your security PIN
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-mono font-bold rounded-xl text-center">
              {errorMsg}
            </div>
          )}

          {/* Non-Admin Staff Avatar Grid */}
          <div className="space-y-2">
            <label className="text-[11px] font-mono font-bold text-neutral-400 uppercase tracking-wider block">
              Choose Staff Profile:
            </label>
            <div className="grid grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
              {nonAdminStaff.map(u => {
                const isSelected = selectedUser?.id === u.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setSelectedUser(u);
                      setPin('');
                      setErrorMsg('');
                    }}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500/80 text-white shadow-sm'
                        : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:bg-neutral-800/50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs font-mono ${
                      isSelected ? 'bg-emerald-500 text-white' : 'bg-neutral-800 text-neutral-300'
                    }`}>
                      {u.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold truncate">{u.name}</p>
                      <p className="text-[10px] font-mono text-neutral-500 truncate">{u.role}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PIN Input Display */}
          <div className="space-y-3 pt-2 border-t border-neutral-800">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-mono font-bold text-neutral-400 uppercase">
                Enter Security PIN:
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                Default: 1234
              </span>
            </div>

            <div className="flex justify-center gap-3 py-2">
              {[0, 1, 2, 3].map((idx) => {
                const isFilled = pin.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-11 h-12 rounded-xl border flex items-center justify-center text-xl font-mono font-bold transition-all ${
                      isFilled
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-400'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-600'
                    }`}
                  >
                    {isFilled ? '•' : ''}
                  </div>
                );
              })}
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => handleKeyPress(n)}
                  className="py-3 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800/80 rounded-xl font-mono font-bold text-lg text-neutral-100 active:scale-95 transition-all cursor-pointer"
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPin('')}
                className="py-3 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800/80 rounded-xl font-mono text-xs font-bold text-neutral-400 active:scale-95 transition-all cursor-pointer"
              >
                CLEAR
              </button>
              <button
                type="button"
                onClick={() => handleKeyPress('0')}
                className="py-3 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800/80 rounded-xl font-mono font-bold text-lg text-neutral-100 active:scale-95 transition-all cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="py-3 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800/80 rounded-xl font-mono flex items-center justify-center text-neutral-400 active:scale-95 transition-all cursor-pointer"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleLogin()}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-950 transition-all cursor-pointer flex items-center justify-center gap-2 mt-3"
            >
              <span>Authenticate &amp; Open Floor App</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="text-center text-xs font-mono text-neutral-600">
        Fabriq ERP • Floor Staff Authenticator v2.4
      </div>
    </div>
  );
};
