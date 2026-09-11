import React from 'react';
import { LucideIcon, X, AlertTriangle, Trash2, Edit, Plus, Check } from 'lucide-react';

// Status Badge Component
interface BadgeProps {
  status: string;
  variant?: 'emerald' | 'amber' | 'rose' | 'zinc' | 'blue' | 'purple';
}

export const Badge: React.FC<BadgeProps> = ({ status, variant }) => {
  let colorClasses = 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700';

  const lower = status.toLowerCase();
  if (variant === 'emerald' || lower.includes('active') || lower.includes('paid') || lower.includes('received') || lower.includes('in stock') || lower.includes('on track')) {
    colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/60';
  } else if (variant === 'amber' || lower.includes('pending') || lower.includes('low') || lower.includes('partial') || lower.includes('review') || lower.includes('transit') || lower.includes('hold')) {
    colorClasses = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800/60';
  } else if (variant === 'rose' || lower.includes('disabled') || lower.includes('out of stock') || lower.includes('overdue') || lower.includes('cancelled') || lower.includes('blocked') || lower.includes('blacklist')) {
    colorClasses = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800/60';
  } else if (variant === 'blue' || lower.includes('ordered') || lower.includes('stitching') || lower.includes('cutting')) {
    colorClasses = 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-400 dark:border-sky-800/60';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-geist font-semibold border rounded-full ${colorClasses}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {status}
    </span>
  );
};

// KPI Card Component
interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: string;
  trendUp?: boolean;
  icon: LucideIcon;
  badgeText?: string;
  badgeVariant?: 'emerald' | 'amber' | 'rose' | 'blue';
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  trendUp,
  icon: Icon,
  badgeText,
  badgeVariant = 'emerald'
}) => {
  return (
    <div className="bento-card bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 p-5 shadow-sm rounded-2xl hover:border-emerald-500/40 transition-all">
      <div className="flex items-start justify-between">
        <span className="text-xs font-geist font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {title}
        </span>
        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
          <Icon className="w-4.5 h-4.5" />
        </div>
      </div>
      
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-extrabold font-hanken tracking-tight text-zinc-900 dark:text-zinc-100">
          {value}
        </span>
        {badgeText && <Badge status={badgeText} variant={badgeVariant} />}
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 font-geist">
          <span>{subtitle}</span>
          {trend && (
            <span className={`font-semibold ${trendUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {trend}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// Modal Wrapper
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-2xl'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className={`w-full ${maxWidth} bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-2xl overflow-hidden max-h-[90vh] flex flex-col`}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/80">
          <div>
            <h3 className="font-hanken font-bold text-lg text-zinc-900 dark:text-zinc-100 tracking-tight">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-geist mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 text-zinc-800 dark:text-zinc-200 font-sans">
          {children}
        </div>
      </div>
    </div>
  );
};

// Confirm Delete Dialog
interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  itemType?: string;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType = 'record'
}) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Override Delete ${itemType}`} maxWidth="max-w-md">
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 rounded-xl">
          <AlertTriangle className="w-6 h-6 shrink-0 text-rose-600 dark:text-rose-400" />
          <p className="text-xs font-geist">
            <strong>CRITICAL ADMIN ACTION:</strong> You are about to permanently delete <strong>{itemName}</strong>. This record will be expunged from the active ledger.
          </p>
        </div>

        <p className="text-sm text-zinc-600 dark:text-zinc-300 font-sans">
          Are you sure you want to proceed? An entry will be saved in the system Audit Log.
        </p>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800 font-sans">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl cursor-pointer transition-colors"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-sm rounded-xl cursor-pointer transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            CONFIRM DELETE
          </button>
        </div>
      </div>
    </Modal>
  );
};
