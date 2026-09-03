import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFabriqData } from '../../context/FabriqDataContext';
import { RawInventoryItem, FinishedInventoryItem } from '../../types';
import { Search, MapPin, Package, Layers, Factory, ArrowRight, ShieldCheck, Edit3, X, SlidersHorizontal } from 'lucide-react';

export default function InventoryTab() {
  const { rawInventory, finishedInventory } = useFabriqData();
  const [activeTab, setActiveTab] = useState<'raw' | 'finished'>('raw');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLocation, setFilterLocation] = useState<string>('All');

  // Filter logic for Raw Inventory
  const filteredRaw = rawInventory.filter(item => {
    const name = item.fabricName || '';
    const color = item.color || '';
    const batch = item.batchId || '';
    const loc = item.warehouse || '';
    const supp = item.supplierName || '';

    const matchesSearch =
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      color.toLowerCase().includes(searchQuery.toLowerCase()) ||
      batch.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supp.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLocation = filterLocation === 'All' || loc === filterLocation || loc.includes(filterLocation);

    return matchesSearch && matchesLocation;
  });

  // Filter logic for Finished Inventory
  const filteredFinished = finishedInventory.filter(item => {
    const name = item.productName || '';
    const style = item.styleName || '';
    const po = item.productionOrderId || '';
    const loc = item.warehouse || '';

    const matchesSearch =
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      style.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLocation = filterLocation === 'All' || loc === filterLocation || loc.includes(filterLocation);

    return matchesSearch && matchesLocation;
  });

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'Available':
      case 'In Stock':
        return 'bg-emerald-100/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/40 dark:border-emerald-800/40';
      case 'Low':
      case 'Low Stock':
        return 'bg-amber-100/80 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/40 dark:border-amber-800/40';
      case 'Depleted':
      case 'Sold Out':
      case 'Out of Stock':
        return 'bg-rose-100/80 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/40 dark:border-rose-800/40';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const totalRawMeters = rawInventory.reduce((sum, r) => sum + r.availableMeters, 0);
  const totalFinishedPcs = finishedInventory.reduce((sum, f) => sum + f.availableQuantity, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="pb-24 select-none"
    >
      {/* Header section */}
      <section className="mb-4">
        <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold mb-1">
          <ShieldCheck className="w-4 h-4" />
          <span>FIREBASE LIVE SUPPLY CHAIN</span>
        </div>
        <h1 className="font-hanken text-3xl font-black text-gray-900 dark:text-neutral-100 tracking-tight">
          Inventory Ledger
        </h1>
        <p className="text-xs text-gray-400 dark:text-neutral-500 font-medium font-geist mt-0.5">
          {totalRawMeters.toLocaleString()}m Raw Fabric • {totalFinishedPcs.toLocaleString()} Finished Garments
        </p>
      </section>

      {/* Pipeline Navigation Switcher */}
      <div className="flex bg-gray-100 dark:bg-neutral-900 p-1 rounded-xl mb-4 border border-gray-200 dark:border-neutral-800">
        <button
          onClick={() => setActiveTab('raw')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold font-geist transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'raw'
              ? 'bg-white dark:bg-neutral-800 text-emerald-700 dark:text-emerald-400 shadow-sm font-black'
              : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Raw Materials ({rawInventory.length})
        </button>
        <button
          onClick={() => setActiveTab('finished')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold font-geist transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'finished'
              ? 'bg-white dark:bg-neutral-800 text-emerald-700 dark:text-emerald-400 shadow-sm font-black'
              : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900'
          }`}
        >
          <Factory className="w-3.5 h-3.5" />
          Finished Goods ({finishedInventory.length})
        </button>
      </div>

      {/* Filter and search bar controls */}
      <section className="mb-4 space-y-2">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-500 w-4 h-4 group-hover:text-emerald-600 transition-colors" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all outline-none text-xs text-gray-900 dark:text-neutral-100 placeholder:text-gray-400 shadow-sm"
            placeholder={activeTab === 'raw' ? "Search raw denim, batches, suppliers..." : "Search finished shirts, jeans, POs..."}
            type="text"
          />
        </div>
      </section>

      {/* RAW INVENTORY CARDS */}
      {activeTab === 'raw' && (
        <section className="space-y-3">
          {filteredRaw.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-neutral-900 border border-dashed border-gray-200 dark:border-neutral-800 rounded-2xl p-6">
              <Layers className="w-10 h-10 mx-auto text-gray-300 dark:text-neutral-700 mb-2" />
              <p className="text-xs text-gray-500 dark:text-neutral-400 font-bold">No raw materials in stock.</p>
              <p className="text-[10px] text-gray-400 mt-1">Create a purchase with status "Received" to auto-populate Raw Inventory.</p>
            </div>
          ) : (
            filteredRaw.map((r) => (
              <div
                key={r.id}
                className="bento-card bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 p-4 rounded-xl shadow-sm space-y-2"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">Batch: {r.batchId}</span>
                    </div>
                    <h3 className="font-hanken font-bold text-sm text-gray-900 dark:text-neutral-100 mt-0.5">
                      {r.fabricName} — {r.color}
                    </h3>
                    <p className="text-[10px] text-gray-400">{r.supplierName} • {r.width} • {r.gsmWeight}</p>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${getStatusBadgeStyle(r.status)}`}>
                    {r.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-gray-50 dark:bg-neutral-950 p-2 rounded-lg text-[10px] font-mono">
                  <div>
                    <span className="text-gray-400 block">Available</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">{r.availableMeters}m</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Allocated</span>
                    <span className="font-bold text-amber-600 text-xs">{r.allocatedMeters}m</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Total Received</span>
                    <span className="font-bold text-gray-700 dark:text-zinc-300 text-xs">{r.totalMeters}m</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] text-gray-400 pt-1 border-t border-gray-50 dark:border-neutral-800">
                  <span>Location: {r.warehouse} (Rack {r.rackLocation})</span>
                  <span>Cost: ₹{r.costPerMeter}/m</span>
                </div>
              </div>
            ))
          )}
        </section>
      )}

      {/* FINISHED GOODS CARDS */}
      {activeTab === 'finished' && (
        <section className="space-y-3">
          {filteredFinished.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-neutral-900 border border-dashed border-gray-200 dark:border-neutral-800 rounded-2xl p-6">
              <Factory className="w-10 h-10 mx-auto text-gray-300 dark:text-neutral-700 mb-2" />
              <p className="text-xs text-gray-500 dark:text-neutral-400 font-bold">No finished goods in stock.</p>
              <p className="text-[10px] text-gray-400 mt-1">Complete a production order to auto-populate Finished Goods.</p>
            </div>
          ) : (
            filteredFinished.map((f) => (
              <div
                key={f.id}
                className="bento-card bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 p-4 rounded-xl shadow-sm space-y-2"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono text-gray-400">PO: {f.productionOrderId}</span>
                    <h3 className="font-hanken font-bold text-sm text-gray-900 dark:text-neutral-100 mt-0.5">
                      {f.productName}
                    </h3>
                    <p className="text-[10px] text-gray-400">Style: {f.styleName}</p>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${getStatusBadgeStyle(f.status)}`}>
                    {f.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-gray-50 dark:bg-neutral-950 p-2 rounded-lg text-[10px] font-mono">
                  <div>
                    <span className="text-gray-400 block">Available to Sell</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">{f.availableQuantity} pcs</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Sold Units</span>
                    <span className="font-bold text-rose-600 text-xs">{f.soldQuantity} pcs</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Total Produced</span>
                    <span className="font-bold text-gray-700 dark:text-zinc-300 text-xs">{f.totalProduced} pcs</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] text-gray-400 pt-1 border-t border-gray-50 dark:border-neutral-800">
                  <span>Warehouse: {f.warehouse}</span>
                  <span className="font-bold text-emerald-600">Selling Price: ₹{f.unitPrice}/pc</span>
                </div>
              </div>
            ))
          )}
        </section>
      )}
    </motion.div>
  );
}
