import React from 'react';
import { History, ShieldCheck } from 'lucide-react';
import { useFabriqData } from '../../context/FabriqDataContext';

export const SettingsPage: React.FC = () => {
  const { auditLogs } = useFabriqData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>SECURITY AUDIT TRAIL & SYSTEM LOGS</span>
          </div>
          <h1 className="font-hanken font-bold text-xl text-zinc-900 dark:text-zinc-100 tracking-tight">
            Security Audit Log Directory
          </h1>
          <p className="text-xs font-mono text-zinc-500 mt-0.5">
            Real-time immutable log of administrator overrides, data modifications, and employee system events.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 text-xs font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded">
            Total Logs: {auditLogs.length} Records
          </span>
        </div>
      </div>

      {/* Full-width Audit Log Directory */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div>
            <h3 className="font-hanken font-bold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-500" />
              Activity & Override History
            </h3>
            <p className="text-xs font-mono text-zinc-500">
              Chronological log of transactions, master data changes, and user authentications
            </p>
          </div>
        </div>

        <div className="space-y-3 max-h-[650px] overflow-y-auto pr-1">
          {auditLogs.length === 0 ? (
            <div className="p-8 text-center text-xs font-mono text-zinc-500">
              No audit logs recorded yet.
            </div>
          ) : (
            auditLogs.map((log, idx) => (
              <div
                key={`${log.id}-${idx}`}
                className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 font-mono text-xs space-y-2 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      {log.module}
                    </span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 uppercase">
                      {log.action}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-500 font-medium">{log.timestamp}</span>
                </div>
                <p className="text-zinc-800 dark:text-zinc-200 font-sans text-sm">
                  {log.details}
                </p>
                <div className="text-[10px] text-zinc-500 pt-1.5 border-t border-zinc-200/60 dark:border-zinc-900 flex items-center justify-between">
                  <span>Actor / User: <strong className="text-zinc-700 dark:text-zinc-300">{log.actor}</strong></span>
                  <span className="text-zinc-400">ID: {log.id}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
