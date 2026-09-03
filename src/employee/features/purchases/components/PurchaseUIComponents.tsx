import React from 'react';
import { motion } from 'motion/react';
import { 
  CheckCircle2, Clock, Truck, AlertCircle, X, Search, Filter, 
  ChevronDown, Calendar, CreditCard, Tag, Phone, Mail, MapPin, 
  User, Paperclip, FileText, ChevronRight, Stamp, Landmark, Building2, Layers,
  Edit3, PackageCheck
} from 'lucide-react';
import { Purchase, Supplier, PurchaseStatus, PurchasePaymentStatus } from '../types';

// Helper to calculate totals for FABRIC PURCHASES (Meters * Rate + GST)
export function calculatePurchaseTotals(purchase: {
  rate: number;
  meters: number;
  subtotal?: number;
  gstRate?: number;
  gstAmount?: number;
  totalAmount?: number;
}) {
  const subtotal = purchase.subtotal !== undefined 
    ? purchase.subtotal 
    : (Number(purchase.rate) || 0) * (Number(purchase.meters) || 0);
  const gstRate = purchase.gstRate !== undefined ? purchase.gstRate : 5;
  const gstAmount = purchase.gstAmount !== undefined ? purchase.gstAmount : (subtotal * gstRate) / 100;
  const grandTotal = purchase.totalAmount !== undefined ? purchase.totalAmount : (subtotal + gstAmount);
  return { subtotal, gstRate, gstAmount, grandTotal };
}

// 1. StatusChip Component
interface StatusChipProps {
  type: 'status' | 'payment';
  value: PurchaseStatus | PurchasePaymentStatus | string;
}

export function StatusChip({ type, value }: StatusChipProps) {
  let bg = '';
  let Icon = null;

  if (type === 'status') {
    switch (value) {
      case 'Received':
        bg = 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40';
        Icon = CheckCircle2;
        break;
      case 'In Transit':
        bg = 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40';
        Icon = Truck;
        break;
      case 'Ordered':
        bg = 'bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900/30';
        Icon = Clock;
        break;
      case 'Cancelled':
        bg = 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30';
        Icon = X;
        break;
      default:
        bg = 'bg-gray-50 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400 border border-gray-100';
    }
  } else {
    switch (value) {
      case 'Paid':
        bg = 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/20';
        break;
      case 'Pending':
        bg = 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/20';
        break;
      case 'Partial':
        bg = 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/20';
        break;
      default:
        bg = 'bg-gray-50 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400';
    }
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide ${bg}`}>
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {value}
    </span>
  );
}

// 2. PurchaseCard Component (List item in clean ERP cell style)
interface PurchaseCardProps {
  purchase: Purchase;
  onClick: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function PurchaseCard({ purchase, onClick, onEdit }: PurchaseCardProps) {
  const { grandTotal } = calculatePurchaseTotals(purchase);
  const qtyText = `${(purchase.meters || 0).toLocaleString()}m`;
  const isInTransit = purchase.status === 'In Transit';

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bento-card hover:bg-gray-50 dark:hover:bg-neutral-900/60 transition-all cursor-pointer group p-4 flex flex-col justify-between border border-gray-200 dark:border-neutral-800 rounded-2xl bg-white dark:bg-neutral-900 shadow-sm"
    >
      <div className="flex justify-between items-start gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/40">
              Invoice #{purchase.invoiceNumber || purchase.billNumber}
            </span>
            <span className="text-xs text-gray-400 font-mono">{purchase.purchaseDate}</span>
          </div>
          <h3 className="font-hanken font-bold text-sm text-gray-900 dark:text-neutral-100 mt-1 line-clamp-1">
            {purchase.fabricName}
          </h3>
          <p className="text-xs font-mono text-gray-500 dark:text-neutral-400 truncate">
            {purchase.supplier.name}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <StatusChip type="status" value={purchase.status || 'Received'} />
          <StatusChip type="payment" value={purchase.paymentStatus} />
        </div>
      </div>

      <div className="flex justify-between items-center border-t border-gray-100 dark:border-neutral-800/60 pt-2.5 mt-2">
        <div className="text-xs font-mono text-gray-500 dark:text-neutral-400">
          Qty: <strong className="text-gray-800 dark:text-neutral-200">{qtyText}</strong> {purchase.width ? `(${purchase.width})` : ''}
        </div>
        <div className="text-sm font-hanken font-bold text-emerald-600 dark:text-emerald-400">
          ₹{grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </div>
      </div>
    </motion.div>
  );
}

// 3. SearchBar Component
interface SearchBarProps {
  query?: string;
  onQueryChange?: (val: string) => void;
  paymentFilter?: string;
  onPaymentFilterChange?: (val: string) => void;
  warehouseFilter?: string;
  onWarehouseFilterChange?: (val: string) => void;
  warehouseOptions?: string[];
  sortBy?: string;
  onSortByChange?: (val: string) => void;
  value?: string;
  onChange?: (val: string) => void;
  placeholder?: string;
}

export function SearchBar({ 
  query, 
  onQueryChange, 
  paymentFilter = 'All', 
  onPaymentFilterChange, 
  warehouseFilter = 'All',
  onWarehouseFilterChange,
  warehouseOptions = [],
  sortBy = 'date-desc', 
  onSortByChange,
  value, 
  onChange, 
  placeholder = 'Search by fabric, invoice #, supplier...' 
}: SearchBarProps) {
  const currentVal = query !== undefined ? query : (value || '');
  const handleInput = (val: string) => {
    if (onQueryChange) onQueryChange(val);
    if (onChange) onChange(val);
  };

  const hasActiveFilters = 
    Boolean(currentVal) || 
    (paymentFilter && paymentFilter !== 'All') || 
    (warehouseFilter && warehouseFilter !== 'All');

  const handleResetFilters = () => {
    handleInput('');
    if (onPaymentFilterChange) onPaymentFilterChange('All');
    if (onWarehouseFilterChange) onWarehouseFilterChange('All');
  };

  return (
    <div className="space-y-2.5">
      {/* Search Input Bar */}
      <div className="relative w-full">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={currentVal}
          onChange={(e) => handleInput(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl text-xs font-mono text-gray-900 dark:text-neutral-100 placeholder-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none shadow-xs transition-all"
        />
        {currentVal && (
          <button
            type="button"
            onClick={() => handleInput('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 cursor-pointer transition-colors"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter Controls Row */}
      {(onPaymentFilterChange || onWarehouseFilterChange || onSortByChange) && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-0.5 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-2">
            {/* Payment Status Filter Buttons */}
            {onPaymentFilterChange && (
              <div className="flex items-center gap-1 bg-gray-100/70 dark:bg-neutral-900/90 p-0.5 rounded-xl border border-gray-200/60 dark:border-neutral-800/80">
                {['All', 'Paid', 'Pending', 'Partial'].map((pf) => (
                  <button
                    key={pf}
                    type="button"
                    onClick={() => onPaymentFilterChange(pf)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      paymentFilter === pf
                        ? 'bg-white dark:bg-neutral-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-neutral-200'
                    }`}
                  >
                    {pf}
                  </button>
                ))}
              </div>
            )}

            {/* Warehouse Filter Dropdown (Database Warehouses Only) */}
            {onWarehouseFilterChange && (
              <div className="relative flex items-center">
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-mono transition-all ${
                    warehouseFilter !== 'All'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-bold shadow-xs'
                      : 'border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-gray-700 dark:text-neutral-300 hover:border-gray-300 dark:hover:border-neutral-700'
                  }`}
                >
                  <Building2
                    className={`w-3.5 h-3.5 shrink-0 ${
                      warehouseFilter !== 'All'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-gray-400 dark:text-neutral-500'
                    }`}
                  />
                  <select
                    value={warehouseFilter}
                    onChange={(e) => onWarehouseFilterChange(e.target.value)}
                    className="bg-transparent outline-none cursor-pointer text-[11px] font-bold pr-5 appearance-none max-w-[150px] sm:max-w-[180px] truncate"
                  >
                    <option value="All" className="bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 font-normal">
                      All Warehouses {warehouseOptions.length > 0 ? `(${warehouseOptions.length})` : ''}
                    </option>
                    {warehouseOptions.length === 0 ? (
                      <option value="" disabled className="bg-white dark:bg-neutral-900 text-gray-400 font-normal">
                        No saved warehouses in DB
                      </option>
                    ) : (
                      warehouseOptions.map((wh) => (
                        <option key={wh} value={wh} className="bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 font-normal">
                          {wh}
                        </option>
                      ))
                    )}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            )}
          </div>

          {/* Sort Selector */}
          {onSortByChange && (
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-[10px] text-gray-400 dark:text-neutral-500 uppercase font-bold">Sort:</span>
              <div className="relative flex items-center">
                <select
                  value={sortBy}
                  onChange={(e) => onSortByChange(e.target.value)}
                  className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl px-2.5 py-1 text-[11px] font-mono text-gray-700 dark:text-neutral-300 outline-none cursor-pointer pr-6 appearance-none hover:border-gray-300 dark:hover:border-neutral-700 transition-colors"
                >
                  <option value="date-desc" className="bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 font-normal">Newest First</option>
                  <option value="date-asc" className="bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 font-normal">Oldest First</option>
                  <option value="amount-desc" className="bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 font-normal">Amount: High &rarr; Low</option>
                  <option value="amount-asc" className="bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 font-normal">Amount: Low &rarr; High</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active Filter Chips Bar (Enhanced Filter UX) */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] font-mono">
          <span className="text-gray-400 dark:text-neutral-500 text-[10px] uppercase font-bold">Active:</span>

          {currentVal && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 font-bold">
              <span>"{currentVal}"</span>
              <button
                type="button"
                onClick={() => handleInput('')}
                className="hover:text-emerald-900 dark:hover:text-emerald-200 cursor-pointer"
                title="Clear query"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {warehouseFilter !== 'All' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 font-bold">
              <Building2 className="w-3 h-3" />
              <span>{warehouseFilter}</span>
              <button
                type="button"
                onClick={() => onWarehouseFilterChange && onWarehouseFilterChange('All')}
                className="hover:text-emerald-900 dark:hover:text-emerald-200 cursor-pointer"
                title="Clear warehouse filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {paymentFilter !== 'All' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 font-bold">
              <span>Status: {paymentFilter}</span>
              <button
                type="button"
                onClick={() => onPaymentFilterChange && onPaymentFilterChange('All')}
                className="hover:text-amber-900 dark:hover:text-amber-200 cursor-pointer"
                title="Clear payment filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={handleResetFilters}
            className="text-[11px] text-gray-400 hover:text-rose-500 font-bold ml-auto cursor-pointer transition-colors"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

// 4. CustomButton
interface CustomButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  onClick?: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function CustomButton({
  variant = 'primary',
  onClick,
  icon,
  children,
  className = '',
  disabled = false
}: CustomButtonProps) {
  let style = 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm';
  if (variant === 'secondary') {
    style = 'bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-200';
  } else if (variant === 'outline') {
    style = 'border border-gray-200 dark:border-neutral-800 text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-800';
  } else if (variant === 'danger') {
    style = 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm';
  }

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ${style} ${className}`}
    >
      {icon}
      <span>{children}</span>
    </motion.button>
  );
}

// 5. SupplierCard
export function SupplierCard({ supplier }: { supplier: Purchase['supplier'] }) {
  return (
    <div className="bento-card p-5 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-sm space-y-3">
      <div className="flex items-center gap-2 border-b border-gray-100 dark:border-neutral-800 pb-3 text-xs font-mono font-bold uppercase text-gray-500 dark:text-neutral-400">
        <Building2 className="w-4 h-4 text-emerald-500" />
        <span>Supplier &amp; Remittance Details</span>
      </div>

      <div className="space-y-2 text-xs font-mono">
        <div>
          <span className="text-[10px] text-gray-400 dark:text-neutral-500 uppercase block">Supplier Name</span>
          <p className="font-bold text-gray-900 dark:text-neutral-100 font-hanken text-sm">{supplier.name}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-[10px] text-gray-400 dark:text-neutral-500 uppercase block">Phone</span>
            <p className="font-bold text-gray-800 dark:text-neutral-200 flex items-center gap-1">
              <Phone className="w-3 h-3 text-emerald-500" />
              <span>{supplier.phone || 'N/A'}</span>
            </p>
          </div>
          <div>
            <span className="text-[10px] text-gray-400 dark:text-neutral-500 uppercase block">GSTIN</span>
            <p className="font-bold text-gray-800 dark:text-neutral-200 uppercase">{supplier.gstin || 'N/A'}</p>
          </div>
        </div>

        {supplier.address && supplier.address !== 'N/A' && (
          <div>
            <span className="text-[10px] text-gray-400 dark:text-neutral-500 uppercase block">Address</span>
            <p className="text-gray-700 dark:text-neutral-300 text-[11px] truncate">{supplier.address}</p>
          </div>
        )}

        {(supplier.bankName || supplier.accountNumber) && (
          <div className="pt-2 border-t border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950 p-2.5 rounded-xl space-y-1">
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase flex items-center gap-1">
              <Landmark className="w-3 h-3" />
              <span>Bank Remittance</span>
            </span>
            <p className="text-[11px] font-bold text-gray-800 dark:text-neutral-200">
              {supplier.bankName || 'Bank'} • A/C: {supplier.accountNumber || '-'}
            </p>
            {supplier.ifscCode && (
              <p className="text-[10px] text-gray-500 dark:text-neutral-400 font-mono">
                IFSC: {supplier.ifscCode}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// 6. FabricItemCard
export function FabricItemCard({ purchase }: { purchase: Purchase }) {
  return (
    <div className="bento-card p-5 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-sm space-y-3">
      <div className="flex items-center gap-2 border-b border-gray-100 dark:border-neutral-800 pb-3 text-xs font-mono font-bold uppercase text-gray-500 dark:text-neutral-400">
        <Layers className="w-4 h-4 text-purple-500" />
        <span>Fabric Specifications</span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
        <div className="col-span-2">
          <span className="text-[10px] text-gray-400 dark:text-neutral-500 uppercase block">Fabric Item</span>
          <p className="font-bold text-gray-900 dark:text-neutral-100 text-sm">{purchase.fabricName}</p>
        </div>

        <div>
          <span className="text-[10px] text-gray-400 dark:text-neutral-500 uppercase block">Width</span>
          <p className="font-bold text-gray-800 dark:text-neutral-200">{purchase.width || '58"'}</p>
        </div>

        <div>
          <span className="text-[10px] text-gray-400 dark:text-neutral-500 uppercase block">Quantity</span>
          <p className="font-bold text-emerald-600 dark:text-emerald-400">{(purchase.meters || 0).toLocaleString()} m</p>
        </div>

        <div>
          <span className="text-[10px] text-gray-400 dark:text-neutral-500 uppercase block">Rate / Meter</span>
          <p className="font-bold text-gray-800 dark:text-neutral-200">₹{(purchase.rate || 0).toFixed(2)}</p>
        </div>

        <div>
          <span className="text-[10px] text-gray-400 dark:text-neutral-500 uppercase block">Warehouse</span>
          <p className="font-bold text-gray-800 dark:text-neutral-200">{purchase.warehouse || purchase.warehouseLocation || 'Default Godown'}</p>
        </div>
      </div>
    </div>
  );
}

// 7. SummaryCard
export function SummaryCard({ purchase }: { purchase: Purchase }) {
  const { subtotal, gstRate, gstAmount, grandTotal } = calculatePurchaseTotals(purchase);

  return (
    <div className="bento-card p-5 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-sm space-y-3">
      <div className="flex items-center gap-2 border-b border-gray-100 dark:border-neutral-800 pb-3 text-xs font-mono font-bold uppercase text-gray-500 dark:text-neutral-400">
        <CreditCard className="w-4 h-4 text-emerald-500" />
        <span>Financial Summary</span>
      </div>

      <div className="space-y-2 text-xs font-mono">
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-neutral-400">Subtotal:</span>
          <span className="font-bold text-gray-900 dark:text-neutral-100">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-neutral-400">GST ({gstRate}%):</span>
          <span className="font-bold text-gray-900 dark:text-neutral-100">₹{gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="pt-2 border-t border-gray-200 dark:border-neutral-800 flex justify-between text-sm font-bold">
          <span className="text-gray-900 dark:text-neutral-100">Grand Total:</span>
          <span className="text-emerald-600 dark:text-emerald-400 text-base">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    </div>
  );
}

// 8. TimelineCard
export function TimelineCard({ events }: { events?: any[] }) {
  if (!events || events.length === 0) return null;

  return (
    <div className="bento-card p-5 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-sm space-y-3">
      <div className="flex items-center gap-2 border-b border-gray-100 dark:border-neutral-800 pb-3 text-xs font-mono font-bold uppercase text-gray-500 dark:text-neutral-400">
        <Clock className="w-4 h-4 text-amber-500" />
        <span>Procurement Timeline</span>
      </div>

      <div className="space-y-2.5 text-xs font-mono">
        {events.map((ev, idx) => (
          <div key={idx} className="flex items-start gap-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5" />
            <div>
              <p className="font-bold text-gray-800 dark:text-neutral-200">{ev.title || ev.status}</p>
              <p className="text-[10px] text-gray-400">{ev.timestamp || ev.date}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
