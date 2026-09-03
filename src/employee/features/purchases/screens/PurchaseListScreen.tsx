import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, ShoppingBag, HelpCircle, CheckCircle2, ChevronRight, AlertCircle, Building2
} from 'lucide-react';
import { Purchase } from '../types';
import { PurchaseCard, SearchBar } from '../components/PurchaseUIComponents';
import { useFabriqData } from '../../../../context/FabriqDataContext';

interface PurchaseListScreenProps {
  purchases: Purchase[];
  onSelectPurchase: (id: string) => void;
  onAddNewClick: () => void;
}

export default function PurchaseListScreen({
  purchases,
  onSelectPurchase,
  onAddNewClick
}: PurchaseListScreenProps) {
  const { warehouses } = useFabriqData();
  const [query, setQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [warehouseFilter, setWarehouseFilter] = useState('All');
  const [sortBy, setSortBy] = useState('date-desc');
  const [isLoading, setIsLoading] = useState(false);

  // Compile ONLY warehouses saved in the database
  const warehouseOptions = useMemo(() => {
    return (warehouses || [])
      .map(w => w?.name?.trim())
      .filter((name): name is string => Boolean(name))
      .filter((name, idx, arr) => arr.indexOf(name) === idx)
      .sort((a, b) => a.localeCompare(b));
  }, [warehouses]);

  // Filter and sort computation
  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      const q = query.toLowerCase();
      const matchQuery =
        !q ||
        (p.billNumber && p.billNumber.toLowerCase().includes(q)) ||
        (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(q)) ||
        (p.supplier?.name && p.supplier.name.toLowerCase().includes(q)) ||
        (p.fabricName && p.fabricName.toLowerCase().includes(q)) ||
        (p.color && p.color.toLowerCase().includes(q)) ||
        (p.warehouse && p.warehouse.toLowerCase().includes(q)) ||
        (p.batchNumber && p.batchNumber.toLowerCase().includes(q));

      // 2. Payment Filter
      const matchPayment = paymentFilter === 'All' || p.paymentStatus === paymentFilter;

      // 3. Warehouse Filter
      const pWarehouse = (p.warehouse || p.warehouseLocation || '').trim().toLowerCase();
      const matchWarehouse =
        warehouseFilter === 'All' ||
        pWarehouse === warehouseFilter.trim().toLowerCase();

      return matchQuery && matchPayment && matchWarehouse;
    });
  }, [purchases, query, paymentFilter, warehouseFilter]);

  // Chronological Sorting: Newest purchases always first by default
  const sortedPurchases = useMemo(() => {
    return [...filteredPurchases].sort((a, b) => {
      if (sortBy === 'date-desc') {
        // 1. Exact ISO creation timestamp
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (timeA && timeB && timeB !== timeA) {
          return timeB - timeA;
        }

        // 2. Calendar purchase date
        const dateA = a.purchaseDate ? new Date(a.purchaseDate).getTime() : 0;
        const dateB = b.purchaseDate ? new Date(b.purchaseDate).getTime() : 0;
        if (dateA && dateB && dateB !== dateA) {
          return dateB - dateA;
        }

        // 3. ID timestamp extracted (e.g. pur-1788374...)
        const idNumA = parseInt((a.id || '').replace(/\D/g, ''), 10) || 0;
        const idNumB = parseInt((b.id || '').replace(/\D/g, ''), 10) || 0;
        if (idNumA && idNumB && idNumB !== idNumA) {
          return idNumB - idNumA;
        }

        return (b.id || '').localeCompare(a.id || '');
      }

      if (sortBy === 'date-asc') {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (timeA && timeB && timeA !== timeB) {
          return timeA - timeB;
        }

        const dateA = a.purchaseDate ? new Date(a.purchaseDate).getTime() : 0;
        const dateB = b.purchaseDate ? new Date(b.purchaseDate).getTime() : 0;
        if (dateA && dateB && dateA !== dateB) {
          return dateA - dateB;
        }

        const idNumA = parseInt((a.id || '').replace(/\D/g, ''), 10) || 0;
        const idNumB = parseInt((b.id || '').replace(/\D/g, ''), 10) || 0;
        if (idNumA && idNumB && idNumA !== idNumB) {
          return idNumA - idNumB;
        }

        return (a.id || '').localeCompare(b.id || '');
      }

      if (sortBy === 'amount-desc') {
        return (b.totalAmount || 0) - (a.totalAmount || 0);
      }
      if (sortBy === 'amount-asc') {
        return (a.totalAmount || 0) - (b.totalAmount || 0);
      }
      if (sortBy === 'bill-asc') {
        return (a.invoiceNumber || a.billNumber || '').localeCompare(b.invoiceNumber || b.billNumber || '');
      }
      return 0;
    });
  }, [filteredPurchases, sortBy]);

  // Calculate stats
  const activeUnpaidCount = purchases.filter(p => p.paymentStatus === 'Pending' || p.paymentStatus === 'Partial').length;

  return (
    <div className="space-y-5 select-none relative pb-6">
      {/* Header Row */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-hanken font-black text-2xl text-gray-950 dark:text-zinc-50 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-emerald-500" />
            Raw Denim Procurement
          </h2>
          <p className="text-xs text-gray-400 dark:text-zinc-500 font-medium">
            Manage purchases, suppliers, and roll inventories for raw denim fabrics
          </p>
        </div>

        {/* Quick Action: Add Purchase */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onAddNewClick}
          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Purchase</span>
        </motion.button>
      </div>

      {/* Advanced Search & Filters Panel */}
      <SearchBar
        query={query}
        onQueryChange={setQuery}
        paymentFilter={paymentFilter}
        onPaymentFilterChange={setPaymentFilter}
        warehouseFilter={warehouseFilter}
        onWarehouseFilterChange={setWarehouseFilter}
        warehouseOptions={warehouseOptions}
        sortBy={sortBy}
        onSortByChange={setSortBy}
      />

      {/* Statistics Quick Strip */}
      <div className="grid grid-cols-2 gap-3 mt-1 text-xs">
        <div className="bento-card p-3 flex flex-col gap-0.5 bg-emerald-50/10 dark:bg-emerald-950/5 border-emerald-500/10">
          <span className="text-gray-400 dark:text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">Total Denim Logs</span>
          <span className="text-lg font-hanken font-black text-emerald-600 dark:text-emerald-400">
            {purchases.length} logs
          </span>
        </div>
        <div className="bento-card p-3 flex flex-col gap-0.5 bg-amber-50/10 dark:bg-amber-950/5 border-amber-500/10">
          <span className="text-gray-400 dark:text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">Pending/Partial Bills</span>
          <span className="text-lg font-hanken font-black text-amber-500">
            {activeUnpaidCount} logs
          </span>
        </div>
      </div>

      {/* Main List Stage */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          // Skeleton loader
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {[1, 2, 3].map((n) => (
              <div key={n} className="bento-card p-5 space-y-4 animate-pulse">
                <div className="flex justify-between items-center">
                  <div className="space-y-2 w-1/3">
                    <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded-md" />
                    <div className="h-5 bg-gray-200 dark:bg-zinc-800 rounded-md" />
                  </div>
                  <div className="h-6 w-20 bg-gray-200 dark:bg-zinc-800 rounded-full" />
                </div>
                <div className="h-8 bg-gray-200 dark:bg-zinc-800 rounded-xl" />
                <div className="flex justify-between items-center pt-2">
                  <div className="h-6 w-24 bg-gray-200 dark:bg-zinc-800 rounded-md" />
                  <div className="h-6 w-16 bg-gray-200 dark:bg-zinc-800 rounded-full" />
                </div>
              </div>
            ))}
          </motion.div>
        ) : sortedPurchases.length > 0 ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {sortedPurchases.map((purchase, idx) => (
              <div key={`${purchase.id}-${idx}`} className="relative group">
                <PurchaseCard
                  purchase={purchase}
                  onClick={() => onSelectPurchase(purchase.id)}
                />
              </div>
            ))}
          </motion.div>
        ) : (
          // Empty State
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bento-card p-12 text-center flex flex-col items-center justify-center gap-3 bg-white dark:bg-zinc-900 border-dashed border-gray-200 dark:border-zinc-800"
          >
            <div className="w-14 h-14 rounded-full bg-gray-50 dark:bg-zinc-850 flex items-center justify-center text-gray-300 dark:text-zinc-600 border border-gray-100 dark:border-zinc-800/20">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-hanken font-bold text-sm text-gray-800 dark:text-zinc-200">
                No purchases found
              </h3>
              <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1 max-w-xs mx-auto">
                No matching denim procurement logs found in this query. Try adjusting your search keywords or clear filters.
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setQuery('');
                setPaymentFilter('All');
                setWarehouseFilter('All');
              }}
              className="px-4 py-2 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded-xl text-xs font-bold hover:bg-emerald-500 hover:text-white transition-all cursor-pointer"
            >
              Clear Filters
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button (FAB) */}
      <motion.button
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
        onClick={onAddNewClick}
        className="fixed bottom-24 right-5 sm:right-10 w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl flex items-center justify-center z-40 cursor-pointer border border-emerald-400/30"
        title="Procure new fabrics"
      >
        <Plus className="w-7 h-7" />
      </motion.button>
    </div>
  );
}
