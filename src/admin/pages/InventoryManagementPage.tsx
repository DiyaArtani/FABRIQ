import React, { useState } from 'react';
import { PackageCheck, Search, Edit, Trash2, Layers, Factory, ArrowRight } from 'lucide-react';
import { useFabriqData } from '../../context/FabriqDataContext';
import { RawInventoryItem, FinishedInventoryItem } from '../../types';
import { Badge, Modal, ConfirmDeleteModal } from '../components/AdminUIComponents';

type InventoryTab = 'raw' | 'finished';

export const InventoryManagementPage: React.FC = () => {
  const {
    rawInventory,
    finishedInventory,
    updateRawInventoryItem,
    updateFinishedInventoryItem
  } = useFabriqData();

  const [activeTab, setActiveTab] = useState<InventoryTab>('raw');
  const [searchTerm, setSearchTerm] = useState('');

  // Raw Inventory Edit
  const [isRawEditOpen, setIsRawEditOpen] = useState(false);
  const [editingRaw, setEditingRaw] = useState<RawInventoryItem | null>(null);
  const [rawAvailableMeters, setRawAvailableMeters] = useState(0);

  // Finished Inventory Edit
  const [isFinEditOpen, setIsFinEditOpen] = useState(false);
  const [editingFin, setEditingFin] = useState<FinishedInventoryItem | null>(null);
  const [finAvailableQty, setFinAvailableQty] = useState(0);
  const [finUnitPrice, setFinUnitPrice] = useState(0);

  const openRawEdit = (item: RawInventoryItem) => {
    setEditingRaw(item);
    setRawAvailableMeters(item.availableMeters);
    setIsRawEditOpen(true);
  };

  const handleRawEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRaw) {
      const newStatus = rawAvailableMeters <= 0 ? 'Depleted' : (rawAvailableMeters < 200 ? 'Low' : 'Available');
      updateRawInventoryItem({
        ...editingRaw,
        availableMeters: rawAvailableMeters,
        status: newStatus as RawInventoryItem['status']
      });
    }
    setIsRawEditOpen(false);
  };

  const openFinEdit = (item: FinishedInventoryItem) => {
    setEditingFin(item);
    setFinAvailableQty(item.availableQuantity);
    setFinUnitPrice(item.unitPrice);
    setIsFinEditOpen(true);
  };

  const handleFinEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingFin) {
      const newStatus = finAvailableQty <= 0 ? 'Sold Out' : (finAvailableQty < 20 ? 'Low' : 'Available');
      updateFinishedInventoryItem({
        ...editingFin,
        availableQuantity: finAvailableQty,
        unitPrice: finUnitPrice,
        status: newStatus as FinishedInventoryItem['status']
      });
    }
    setIsFinEditOpen(false);
  };

  // Filtered data
  const filteredRaw = rawInventory.filter((r) => {
    const term = searchTerm.toLowerCase();
    return (
      r.fabricName.toLowerCase().includes(term) ||
      r.batchId.toLowerCase().includes(term) ||
      r.supplierName.toLowerCase().includes(term) ||
      r.warehouse.toLowerCase().includes(term)
    );
  });

  const filteredFinished = finishedInventory.filter((f) => {
    const term = searchTerm.toLowerCase();
    return (
      f.productName.toLowerCase().includes(term) ||
      f.styleName.toLowerCase().includes(term) ||
      f.productionOrderId.toLowerCase().includes(term)
    );
  });

  const getRawStatusBadge = (status: string) => {
    const colorMap: Record<string, string> = {
      'Available': 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
      'Low': 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
      'Depleted': 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
    };
    return (
      <span className={`px-2 py-0.5 text-[11px] font-bold border rounded ${colorMap[status] || colorMap['Available']}`}>
        {status}
      </span>
    );
  };

  const getFinStatusBadge = (status: string) => {
    const colorMap: Record<string, string> = {
      'Available': 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
      'Low': 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
      'Sold Out': 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
    };
    return (
      <span className={`px-2 py-0.5 text-[11px] font-bold border rounded ${colorMap[status] || colorMap['Available']}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 mb-1">
            <PackageCheck className="w-4 h-4" />
            <span>PIPELINE INVENTORY — AUTO-POPULATED FROM PURCHASES & PRODUCTION</span>
          </div>
          <h1 className="font-hanken font-bold text-xl text-zinc-900 dark:text-zinc-100 tracking-tight">
            Inventory & Stock Master
          </h1>
          <p className="text-xs font-mono text-zinc-500 mt-0.5">
            Raw materials auto-populated from received purchases. Finished goods auto-populated from completed production.
          </p>
        </div>
      </div>

      {/* Pipeline Flow Indicator */}
      <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-3 flex items-center justify-center gap-2 text-[10px] font-mono text-zinc-500">
        <span className="font-bold text-emerald-600">Purchase (Received)</span>
        <ArrowRight className="w-3 h-3" />
        <span className={`font-bold ${activeTab === 'raw' ? 'text-sky-600 underline' : 'text-zinc-500'}`}>Raw Inventory</span>
        <ArrowRight className="w-3 h-3" />
        <span className="font-bold text-zinc-500">Production</span>
        <ArrowRight className="w-3 h-3" />
        <span className={`font-bold ${activeTab === 'finished' ? 'text-sky-600 underline' : 'text-zinc-500'}`}>Finished Inventory</span>
        <ArrowRight className="w-3 h-3" />
        <span className="font-bold text-zinc-500">Sales → Invoice</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab('raw')}
          className={`px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-colors ${
            activeTab === 'raw'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
              : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5" />
            Raw Materials ({rawInventory.length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab('finished')}
          className={`px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-colors ${
            activeTab === 'finished'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
              : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Factory className="w-3.5 h-3.5" />
            Finished Goods ({finishedInventory.length})
          </div>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 shadow-2xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder={activeTab === 'raw' ? 'Search fabric, batch, supplier...' : 'Search product, style, PO ID...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* ============ RAW MATERIALS TAB ============ */}
      {activeTab === 'raw' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs overflow-x-auto">
          {filteredRaw.length === 0 ? (
            <div className="p-12 text-center">
              <Layers className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
              <p className="text-sm font-mono text-zinc-500">No raw materials in inventory.</p>
              <p className="text-[10px] font-mono text-zinc-400 mt-1">Create a purchase with status "Received" to auto-populate raw inventory.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  <th className="p-3 font-bold">Batch ID</th>
                  <th className="p-3 font-bold">Fabric</th>
                  <th className="p-3 font-bold">Supplier</th>
                  <th className="p-3 font-bold">Total Meters</th>
                  <th className="p-3 font-bold">Available</th>
                  <th className="p-3 font-bold">Allocated</th>
                  <th className="p-3 font-bold">Location</th>
                  <th className="p-3 font-bold">Cost/m</th>
                  <th className="p-3 font-bold">Status</th>
                  <th className="p-3 font-bold text-right">Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                {filteredRaw.map((r, idx) => (
                  <tr key={`${r.id}-${idx}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100">
                      {r.batchId}
                      <div className="text-[10px] text-zinc-400 font-normal">PO: {r.purchaseId}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100 font-hanken text-sm">{r.fabricName}</div>
                      <div className="text-[10px] text-zinc-500">{r.color} | {r.width} | {r.gsmWeight}</div>
                    </td>
                    <td className="p-3 text-zinc-700 dark:text-zinc-300">{r.supplierName}</td>
                    <td className="p-3 text-zinc-800 dark:text-zinc-200">{r.totalMeters.toLocaleString()}m</td>
                    <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {r.availableMeters.toLocaleString()}m
                    </td>
                    <td className="p-3 text-amber-600 dark:text-amber-400">
                      {r.allocatedMeters.toLocaleString()}m
                    </td>
                    <td className="p-3 text-zinc-700 dark:text-zinc-300">
                      <div>{r.warehouse}</div>
                      <div className="text-[10px] text-zinc-500">Rack: {r.rackLocation}</div>
                    </td>
                    <td className="p-3 text-zinc-800 dark:text-zinc-200">₹{r.costPerMeter}</td>
                    <td className="p-3">{getRawStatusBadge(r.status)}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => openRawEdit(r)}
                        className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 rounded text-xs font-bold flex items-center gap-1"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        CORRECT
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ============ FINISHED GOODS TAB ============ */}
      {activeTab === 'finished' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs overflow-x-auto">
          {filteredFinished.length === 0 ? (
            <div className="p-12 text-center">
              <Factory className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
              <p className="text-sm font-mono text-zinc-500">No finished goods in inventory.</p>
              <p className="text-[10px] font-mono text-zinc-400 mt-1">Mark a production order as "Completed" to auto-populate finished goods.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  <th className="p-3 font-bold">Product</th>
                  <th className="p-3 font-bold">Production Order</th>
                  <th className="p-3 font-bold">Total Produced</th>
                  <th className="p-3 font-bold">Available</th>
                  <th className="p-3 font-bold">Sold</th>
                  <th className="p-3 font-bold">Unit Price</th>
                  <th className="p-3 font-bold">Warehouse</th>
                  <th className="p-3 font-bold">Status</th>
                  <th className="p-3 font-bold text-right">Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                {filteredFinished.map((f, idx) => (
                  <tr key={`${f.id}-${idx}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100 font-hanken text-sm">{f.productName}</div>
                      <div className="text-[10px] text-zinc-500">Style: {f.styleName}</div>
                    </td>
                    <td className="p-3 text-zinc-700 dark:text-zinc-300 text-[11px]">{f.productionOrderId}</td>
                    <td className="p-3 text-zinc-800 dark:text-zinc-200">{f.totalProduced.toLocaleString()} pcs</td>
                    <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {f.availableQuantity.toLocaleString()} pcs
                    </td>
                    <td className="p-3 text-rose-600 dark:text-rose-400">{f.soldQuantity.toLocaleString()} pcs</td>
                    <td className="p-3 text-zinc-800 dark:text-zinc-200">
                      {f.unitPrice > 0 ? `₹${f.unitPrice.toLocaleString()}` : <span className="text-amber-500 text-[10px]">SET PRICE</span>}
                    </td>
                    <td className="p-3 text-zinc-700 dark:text-zinc-300">{f.warehouse}</td>
                    <td className="p-3">{getFinStatusBadge(f.status)}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => openFinEdit(f)}
                        className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 rounded text-xs font-bold flex items-center gap-1"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        CORRECT
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Raw Inventory Edit Modal */}
      <Modal
        isOpen={isRawEditOpen}
        onClose={() => setIsRawEditOpen(false)}
        title={`Admin Correction — Raw Inventory (${editingRaw?.batchId})`}
        subtitle="Override available meters for stock corrections."
      >
        <form onSubmit={handleRawEditSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div className="bg-zinc-50 dark:bg-zinc-950 p-3 border border-zinc-200 dark:border-zinc-800">
              <div className="text-[10px] text-zinc-400 uppercase mb-0.5">Fabric</div>
              <div className="font-bold text-zinc-900 dark:text-zinc-100">{editingRaw?.fabricName} — {editingRaw?.color}</div>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-950 p-3 border border-zinc-200 dark:border-zinc-800">
              <div className="text-[10px] text-zinc-400 uppercase mb-0.5">Total Received</div>
              <div className="font-bold text-zinc-900 dark:text-zinc-100">{editingRaw?.totalMeters}m</div>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-mono font-bold uppercase text-zinc-500">Available Meters (Corrected)</label>
            <input
              type="number"
              required
              min={0}
              value={rawAvailableMeters}
              onChange={(e) => setRawAvailableMeters(Number(e.target.value))}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button type="button" onClick={() => setIsRawEditOpen(false)} className="px-4 py-2 text-xs font-mono font-bold border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800">CANCEL</button>
            <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold uppercase tracking-wider">APPLY CORRECTION</button>
          </div>
        </form>
      </Modal>

      {/* Finished Inventory Edit Modal */}
      <Modal
        isOpen={isFinEditOpen}
        onClose={() => setIsFinEditOpen(false)}
        title={`Admin Correction — Finished Goods (${editingFin?.productName})`}
        subtitle="Override available quantity and pricing for corrections."
      >
        <form onSubmit={handleFinEditSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div className="bg-zinc-50 dark:bg-zinc-950 p-3 border border-zinc-200 dark:border-zinc-800">
              <div className="text-[10px] text-zinc-400 uppercase mb-0.5">Product</div>
              <div className="font-bold text-zinc-900 dark:text-zinc-100">{editingFin?.productName}</div>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-950 p-3 border border-zinc-200 dark:border-zinc-800">
              <div className="text-[10px] text-zinc-400 uppercase mb-0.5">Total Produced</div>
              <div className="font-bold text-zinc-900 dark:text-zinc-100">{editingFin?.totalProduced} pcs</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Available Quantity (pcs)</label>
              <input
                type="number"
                required
                min={0}
                value={finAvailableQty}
                onChange={(e) => setFinAvailableQty(Number(e.target.value))}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Selling Price (₹/pc)</label>
              <input
                type="number"
                required
                min={0}
                value={finUnitPrice}
                onChange={(e) => setFinUnitPrice(Number(e.target.value))}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button type="button" onClick={() => setIsFinEditOpen(false)} className="px-4 py-2 text-xs font-mono font-bold border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800">CANCEL</button>
            <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold uppercase tracking-wider">APPLY CORRECTION</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
