import React from 'react';
import { X, Layers, Building2, MapPin, Tag, User, FileText, Printer, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, DollarSign } from 'lucide-react';
import { RawInventoryItem } from '../../types';
import { useFabriqData } from '../../context/FabriqDataContext';

interface RawInventoryDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: RawInventoryItem | null;
  onViewInvoice: (item: RawInventoryItem) => void;
}

export const RawInventoryDetailsModal: React.FC<RawInventoryDetailsModalProps> = ({
  isOpen,
  onClose,
  item,
  onViewInvoice
}) => {
  const { warehouses, purchases, suppliers } = useFabriqData();

  if (!isOpen || !item) return null;

  // Resolve matching purchase
  const matchedPurchase = purchases.find(
    (p) =>
      p.id === item.purchaseId ||
      p.billNumber === item.billNumber ||
      p.billNumber === item.purchaseId ||
      p.invoiceNumber === item.invoiceNumber ||
      p.invoiceNumber === item.purchaseId
  );

  // Resolve warehouse
  const matchedWarehouse = warehouses.find(
    (w) =>
      w.name.toLowerCase() === (item.warehouse || '').toLowerCase() ||
      (item.warehouse && w.name.toLowerCase().includes(item.warehouse.toLowerCase()))
  );

  // Resolve supplier
  const matchedSupplier = suppliers.find(
    (s) => s.name.toLowerCase() === item.supplierName.toLowerCase()
  );

  const billNo = matchedPurchase?.billNumber || item.billNumber || 'BILL-2026-0001';
  const invoiceNo = matchedPurchase?.invoiceNumber || item.invoiceNumber || 'INV-TEX-892';

  const totalMeters = Number(item.totalMeters) || 0;
  const availableMeters = Number(item.availableMeters) || 0;
  const allocatedMeters = Number(item.allocatedMeters) || 0;
  const usedMeters = Math.max(0, totalMeters - availableMeters - allocatedMeters);

  const availablePercent = totalMeters > 0 ? Math.round((availableMeters / totalMeters) * 100) : 0;
  const allocatedPercent = totalMeters > 0 ? Math.round((allocatedMeters / totalMeters) * 100) : 0;
  const usedPercent = totalMeters > 0 ? Math.round((usedMeters / totalMeters) * 100) : 0;

  const unitCost = Number(item.costPerMeter) || 0;
  const availableValuation = Math.round(availableMeters * unitCost);
  const totalLotValuation = Math.round(totalMeters * unitCost);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available':
      case 'In Stock':
        return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40';
      case 'Low':
      case 'Low Stock':
        return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/40';
      case 'Depleted':
      case 'Out of Stock':
        return 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/40';
      default:
        return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-2xl w-full my-6 flex flex-col rounded-2xl overflow-hidden font-mono text-zinc-900 dark:text-zinc-100">
        
        {/* Header */}
        <div className="p-5 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-hanken font-black text-lg text-zinc-900 dark:text-zinc-100">
                  {item.fabricName}
                </h2>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${getStatusColor(item.status)}`}>
                  {item.status}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Lot / Batch Ref: <strong className="text-zinc-700 dark:text-zinc-300">{item.batchId || item.id}</strong> • Bill #{billNo}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - All Inventory Related Details */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">
                Available In Stock
              </span>
              <div className="text-xl font-bold font-hanken text-emerald-600 dark:text-emerald-400 mt-1">
                {availableMeters.toLocaleString()} m
              </div>
              <span className="text-[10px] text-zinc-500 mt-0.5 block">{availablePercent}% of total batch</span>
            </div>

            <div className="p-3.5 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 block">
                Allocated to Runs
              </span>
              <div className="text-xl font-bold font-hanken text-amber-600 dark:text-amber-400 mt-1">
                {allocatedMeters.toLocaleString()} m
              </div>
              <span className="text-[10px] text-zinc-500 mt-0.5 block">{allocatedPercent}% reserved</span>
            </div>

            <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                Total Received
              </span>
              <div className="text-xl font-bold font-hanken text-zinc-900 dark:text-zinc-100 mt-1">
                {totalMeters.toLocaleString()} m
              </div>
              <span className="text-[10px] text-zinc-400 mt-0.5 block">100% Inward Lot</span>
            </div>

            <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                Available Valuation
              </span>
              <div className="text-xl font-bold font-hanken text-zinc-900 dark:text-zinc-100 mt-1">
                ₹{availableValuation.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-zinc-400 mt-0.5 block">@ ₹{unitCost}/m</span>
            </div>
          </div>

          {/* Allocation Progress Bar */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span>Lot Utilization Breakdown</span>
              <span className="text-zinc-500">{totalMeters.toLocaleString()} meters total</span>
            </div>
            <div className="w-full h-3 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${availablePercent}%` }}
                className="bg-emerald-500 h-full"
                title={`Available: ${availableMeters}m (${availablePercent}%)`}
              />
              <div
                style={{ width: `${allocatedPercent}%` }}
                className="bg-amber-500 h-full"
                title={`Allocated: ${allocatedMeters}m (${allocatedPercent}%)`}
              />
              <div
                style={{ width: `${usedPercent}%` }}
                className="bg-zinc-400 dark:bg-zinc-600 h-full"
                title={`Consumed: ${usedMeters}m (${usedPercent}%)`}
              />
            </div>
            <div className="flex items-center gap-4 text-[10px] text-zinc-500 pt-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                Available ({availableMeters}m)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                Allocated in Runs ({allocatedMeters}m)
              </span>
              {usedMeters > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-400 dark:bg-zinc-600 inline-block" />
                  Consumed in Finished Goods ({usedMeters}m)
                </span>
              )}
            </div>
          </div>

          {/* Storage & Facility Location */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>Storage Facility &amp; Godown</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <span className="text-[10px] text-zinc-400 block">Warehouse / Godown</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{item.warehouse || 'Central Godown'}</span>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {matchedWarehouse?.location || 'Main Depot'} • {matchedWarehouse?.address || 'Warehouse Location'}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block">Warehouse Supervisor</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{matchedWarehouse?.managerName || 'Stores Incharge'}</span>
                {matchedWarehouse?.phone && (
                  <p className="text-[11px] text-zinc-500 mt-0.5">Contact: {matchedWarehouse.phone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Commercial & Specification Details */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              <Tag className="w-4 h-4 text-emerald-600" />
              <span>Commercial &amp; Fabric Specifications</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-zinc-400 block">Fabric Name</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{item.fabricName}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block">Width</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{item.width || '58"'}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block">Color / Shade</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{item.color || 'Standard Indigo'}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block">Supplier / Vendor</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{item.supplierName}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block">Cost per Meter</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{unitCost}/m</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block">Total Lot Value</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">₹{totalLotValuation.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block">Purchase Bill No</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{billNo}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block">Supplier Invoice Ref</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{invoiceNo}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block">Date Added</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                  {matchedPurchase?.purchaseDate || item.createdAt?.substring(0, 10) || 'Recent'}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer with "View and Print Invoice" option */}
        <div className="p-4 bg-zinc-100 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onViewInvoice(item);
            }}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>View &amp; Print Invoice</span>
          </button>
        </div>

      </div>
    </div>
  );
};
