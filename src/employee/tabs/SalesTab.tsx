import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Invoice } from '../../types';
import { useFabriqData } from '../../context/FabriqDataContext';
import { Search, Plus, ShoppingCart, FileText, Printer } from 'lucide-react';
import { TaxInvoiceModal } from '../components/TaxInvoiceModal';
import { WhatsAppShareModal, WhatsAppIcon } from '../../components/WhatsAppShareModal';
import { Customer } from '../../types';
import { sortLatest } from '../../utils/sortUtils';
import { resolveInvoiceForSale } from '../../lib/invoiceUtils';
import CreateSaleScreen from '../features/sales/screens/CreateSaleScreen';

interface SalesTabProps {
  key?: string;
  invoices?: Invoice[];
  initialView?: 'list' | 'create';
  onClearInitialView?: () => void;
  onAddInvoiceClick?: () => void;
  onUpdateInvoice?: (updated: Invoice) => void;
}

export default function SalesTab({ initialView, onClearInitialView }: SalesTabProps) {
  const { invoices, sales, customers } = useFabriqData();
  const [view, setView] = useState<'list' | 'create'>(initialView || 'list');

  React.useEffect(() => {
    if (initialView) {
      setView(initialView);
      if (onClearInitialView) onClearInitialView();
    }
  }, [initialView, onClearInitialView]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [whatsAppData, setWhatsAppData] = useState<{ invoice: Invoice; customer: Customer | null } | null>(null);

  // Calculate totals
  const totalPaid = invoices
    .filter(inv => inv.status === 'Paid')
    .reduce((sum, current) => sum + current.amount, 0);

  const totalPending = invoices
    .filter(inv => inv.status === 'Pending')
    .reduce((sum, current) => sum + current.amount, 0);

  const filteredSales = sortLatest(sales.filter(s => {
    const cust = (s.customerName || '').toLowerCase();
    const invNum = (s.invoiceNumber || s.invoiceId || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return cust.includes(q) || invNum.includes(q);
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="pb-24 select-none"
    >
      <AnimatePresence mode="wait">
        {view === 'create' ? (
          <CreateSaleScreen
            key="create-sale-screen"
            onBack={() => setView('list')}
            onCreated={() => setView('list')}
          />
        ) : (
          <motion.div
            key="sales-list-view"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header section */}
            <section className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="font-hanken text-3xl font-black text-gray-900 dark:text-neutral-100 tracking-tight">
                  Sales &amp; Invoices
                </h1>
                <p className="text-xs text-gray-400 dark:text-neutral-500 mt-0.5 font-medium font-geist">
                  Connected dispatch ledger — sell finished goods &amp; auto-generate customer invoices
                </p>
              </div>

              <button
                onClick={() => setView('create')}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-colors shrink-0 cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>New Customer Sale</span>
              </button>
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

            {/* Search */}
            <section className="mb-4">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-500 w-4 h-4 group-hover:text-emerald-600 transition-colors" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by customer or invoice #..."
                  className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl text-xs font-mono placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all text-gray-900 dark:text-neutral-100 shadow-2xs"
                />
              </div>
            </section>

            {/* SALES ORDERS LIST */}
            <section className="space-y-3">
              {filteredSales.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-neutral-900 border border-dashed border-gray-200 dark:border-neutral-800 rounded-2xl p-6">
                  <ShoppingCart className="w-10 h-10 mx-auto text-gray-300 dark:text-neutral-700 mb-2" />
                  <p className="text-xs text-gray-500 dark:text-neutral-400 font-bold">No sales orders found.</p>
                  <p className="text-[10px] text-gray-400 mt-1 mb-3">Create a customer sale and auto-generate invoice.</p>
                  <button
                    onClick={() => setView('create')}
                    className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold rounded-xl inline-flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Customer Sale</span>
                  </button>
                </div>
              ) : (
                filteredSales.map((s) => {
                  const invObj = resolveInvoiceForSale(s, invoices);
                  return (
                    <div
                      key={s.id}
                      className="bento-card bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 p-4 rounded-xl shadow-sm hover:shadow-md transition-all space-y-2.5"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <FileText className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {invObj.invoiceNumber || invObj.invoiceCode}
                            </span>
                          </div>
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
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setWhatsAppData({
                                invoice: invObj,
                                customer: customers.find(c => c.id === s.customerId) || null
                              });
                            }}
                            className="px-2 py-1 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] dark:text-[#25D366] border border-[#25D366]/30 rounded font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            title="Send Invoice on WhatsApp"
                          >
                            <WhatsAppIcon className="w-3 h-3 text-[#25D366]" />
                            <span>WhatsApp</span>
                          </button>
                          <button
                            onClick={() => setSelectedInvoice(invObj)}
                            className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Invoice</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </section>

            {/* Floating Action Button */}
            <button
              onClick={() => setView('create')}
              aria-label="Create Sale"
              className="fixed right-6 bottom-24 w-12 h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 z-40 cursor-pointer"
            >
              <Plus className="w-6 h-6 font-bold" />
            </button>

            {/* Printable Invoice Modal */}
            <TaxInvoiceModal
              isOpen={!!selectedInvoice}
              onClose={() => setSelectedInvoice(null)}
              invoice={selectedInvoice}
              customer={customers.find(c => c.id === selectedInvoice?.customerId) || null}
            />

            {/* WhatsApp Share Modal */}
            <WhatsAppShareModal
              isOpen={!!whatsAppData}
              onClose={() => setWhatsAppData(null)}
              invoice={whatsAppData?.invoice || null}
              customer={whatsAppData?.customer || null}
              onViewInvoice={() => {
                if (whatsAppData?.invoice) {
                  setSelectedInvoice(whatsAppData.invoice);
                  setWhatsAppData(null);
                }
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
