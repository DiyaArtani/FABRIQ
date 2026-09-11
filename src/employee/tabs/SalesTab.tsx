import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Invoice, SaleOrder } from '../../types';
import { useFabriqData } from '../../context/FabriqDataContext';
import { Search, Plus, CheckCircle, Clock, X, DollarSign, ArrowUpRight, TrendingUp, ShoppingCart, FileText, PackageCheck, Printer } from 'lucide-react';
import { TaxInvoiceModal } from '../components/TaxInvoiceModal';

interface SalesTabProps {
  key?: string;
  invoices?: Invoice[];
  onAddInvoiceClick: () => void;
  onUpdateInvoice?: (updated: Invoice) => void;
}

export default function SalesTab({ onAddInvoiceClick }: SalesTabProps) {
  const { invoices, sales, customers } = useFabriqData();
  const [activeSubTab, setActiveSubTab] = useState<'sales' | 'invoices'>('sales');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Calculate totals
  const totalPaid = invoices
    .filter(inv => inv.status === 'Paid')
    .reduce((sum, current) => sum + current.amount, 0);

  const totalPending = invoices
    .filter(inv => inv.status === 'Pending')
    .reduce((sum, current) => sum + current.amount, 0);

  const filteredSales = sales.filter(s => {
    const cust = s.customerName || '';
    const code = s.saleCode || '';
    return cust.toLowerCase().includes(searchQuery.toLowerCase()) || code.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredInvoices = invoices.filter(inv => {
    const client = inv.client || inv.customerName || '';
    const code = inv.invoiceCode || inv.invoiceNumber || '';
    return client.toLowerCase().includes(searchQuery.toLowerCase()) || code.toLowerCase().includes(searchQuery.toLowerCase());
  });

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
        <h1 className="font-hanken text-3xl font-black text-gray-900 dark:text-neutral-100 tracking-tight">
          Sales &amp; Invoices
        </h1>
        <p className="text-xs text-gray-400 dark:text-neutral-500 mt-0.5 font-medium font-geist">
          Connected dispatch ledger — sell finished goods &amp; auto-generate customer tax invoices
        </p>
      </section>

      {/* Financial KPI Banner */}
      <section className="grid grid-cols-2 gap-3 mb-4">
        <div className="bento-card bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 p-3 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-400 block mb-0.5">Paid Invoices</span>
          <span className="text-lg font-black text-emerald-700 dark:text-emerald-400 font-mono">₹{totalPaid.toLocaleString('en-IN')}</span>
        </div>
        <div className="bento-card bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 p-3 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-400 block mb-0.5">Pending Receivables</span>
          <span className="text-lg font-black text-amber-700 dark:text-amber-400 font-mono">₹{totalPending.toLocaleString('en-IN')}</span>
        </div>
      </section>

      {/* Tab Switcher */}
      <div className="flex bg-gray-100 dark:bg-neutral-900 p-1 rounded-xl mb-4 border border-gray-200 dark:border-neutral-800">
        <button
          onClick={() => setActiveSubTab('sales')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold font-geist transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeSubTab === 'sales'
              ? 'bg-white dark:bg-neutral-800 text-emerald-700 dark:text-emerald-400 shadow-sm font-black'
              : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900'
            }`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          Sales Orders ({sales.length})
        </button>
        <button
          onClick={() => setActiveSubTab('invoices')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold font-geist transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeSubTab === 'invoices'
              ? 'bg-white dark:bg-neutral-800 text-emerald-700 dark:text-emerald-400 shadow-sm font-black'
              : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900'
            }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Invoices ({invoices.length})
        </button>
      </div>

      {/* Search */}
      <section className="mb-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-500 w-4 h-4 group-hover:text-emerald-600 transition-colors" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeSubTab === 'sales' ? "Search by customer or sale code..." : "Search by invoice # or client..."}
            className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl text-xs font-mono placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all text-gray-900 dark:text-neutral-100 shadow-2xs"
          />
        </div>
      </section>

      {/* SALES ORDERS LIST */}
      {activeSubTab === 'sales' && (
        <section className="space-y-3">
          {filteredSales.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-neutral-900 border border-dashed border-gray-200 dark:border-neutral-800 rounded-2xl p-6">
              <ShoppingCart className="w-10 h-10 mx-auto text-gray-300 dark:text-neutral-700 mb-2" />
              <p className="text-xs text-gray-500 dark:text-neutral-400 font-bold">No sales orders found.</p>
              <p className="text-[10px] text-gray-400 mt-1">Tap the plus button below to create a customer sale.</p>
            </div>
          ) : (
            filteredSales.map((s) => (
              <div
                key={s.id}
                className="bento-card bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 p-4 rounded-xl shadow-sm hover:shadow-md transition-all space-y-2.5"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-gray-400">{s.saleCode}</span>
                    <h3 className="font-hanken font-bold text-sm text-gray-900 dark:text-neutral-100 mt-0.5">
                      {s.customerName}
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                    {s.status}
                  </span>
                </div>

                <div className="space-y-1 bg-gray-50 dark:bg-neutral-950 p-2 rounded-lg text-xs font-mono">
                  {s.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-[11px]">
                      <span>{item.quantity} × {item.productName}</span>
                      <span className="font-bold text-emerald-600">₹{item.total.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-200 dark:border-neutral-800 pt-1 flex justify-between font-bold text-xs">
                    <span>Total Billed</span>
                    <span className="text-emerald-700 dark:text-emerald-400">₹{s.totalAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] text-gray-400 pt-1 border-t border-gray-50 dark:border-neutral-800">
                  <span>Date: {s.saleDate}</span>
                  <button
                    onClick={() => {
                      const found = invoices.find(inv => inv.id === s.invoiceId || inv.saleId === s.id) || {
                        id: `inv-${s.id}`,
                        invoiceCode: `INV-${s.saleCode}`,
                        invoiceNumber: `INV-${s.saleCode}`,
                        customerId: s.customerId,
                        customerName: s.customerName,
                        client: s.customerName,
                        amount: s.totalAmount,
                        date: s.saleDate,
                        status: 'Paid' as const,
                        items: s.items.map(it => ({
                          finishedInventoryId: it.finishedInventoryId,
                          productName: it.productName,
                          quantity: it.quantity,
                          unitPrice: it.unitPrice,
                          total: it.total
                        })),
                        saleId: s.id
                      };
                      setSelectedInvoice(found);
                    }}
                    className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Printer className="w-3 h-3" />
                    <span>View Tax Invoice</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      )}

      {/* INVOICES LIST */}
      {activeSubTab === 'invoices' && (
        <section className="space-y-3">
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-neutral-900 border border-dashed border-gray-200 dark:border-neutral-800 rounded-2xl p-6">
              <FileText className="w-10 h-10 mx-auto text-gray-300 dark:text-neutral-700 mb-2" />
              <p className="text-xs text-gray-500 dark:text-neutral-400 font-bold">No invoices generated yet.</p>
            </div>
          ) : (
            filteredInvoices.map((inv) => (
              <div
                key={inv.id}
                onClick={() => setSelectedInvoice(inv)}
                className="bento-card bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 p-4 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer space-y-2.5 group"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-gray-400">{inv.invoiceNumber || inv.invoiceCode}</span>
                    <h3 className="font-hanken font-bold text-sm text-gray-900 dark:text-neutral-100 mt-0.5 group-hover:text-emerald-600 transition-colors">
                      {inv.customerName || inv.client}
                    </h3>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${inv.status === 'Paid'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                    }`}>
                    {inv.status}
                  </span>
                </div>

                <div className="flex justify-between items-center bg-gray-50 dark:bg-neutral-950 p-2 rounded-lg text-xs font-mono">
                  <span className="text-[11px] text-gray-500">{inv.itemsSummary || `${inv.itemsCount || 0} items`}</span>
                  <span className="font-extrabold text-emerald-700 dark:text-emerald-400">₹{inv.amount.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex justify-between items-center text-[10px] text-gray-400 pt-1 border-t border-gray-50 dark:border-neutral-800">
                  <span>Issued: {inv.date}</span>
                  <span className="text-emerald-600 font-bold flex items-center gap-1 group-hover:underline">
                    <Printer className="w-3 h-3" /> View &amp; Print Invoice
                  </span>
                </div>
              </div>
            ))
          )}
        </section>
      )}

      {/* Floating Action Button */}
      <button
        onClick={onAddInvoiceClick}
        aria-label="Create Sale"
        className="fixed right-6 bottom-24 w-12 h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 z-40 cursor-pointer"
      >
        <Plus className="w-6 h-6 font-bold" />
      </button>

      {/* Full Tax Invoice Modal */}
      <TaxInvoiceModal
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        invoice={selectedInvoice}
        customer={customers.find(c => c.id === selectedInvoice?.customerId) || null}
      />
    </motion.div>
  );
}
