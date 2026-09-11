import React, { useState, useMemo, useEffect } from 'react';
import { Receipt, Plus, Search, Edit, Trash2, ArrowRight, PackageCheck, ShoppingCart, FileText, Building2, CheckCircle2, User, Phone, ChevronDown, Printer } from 'lucide-react';
import { useFabriqData } from '../../context/FabriqDataContext';
import { Invoice, SaleOrder, SaleLineItem, FinishedInventoryItem, Customer } from '../../types';
import { Badge, Modal, ConfirmDeleteModal } from '../components/AdminUIComponents';
import { TaxInvoiceModal } from '../components/TaxInvoiceModal';

type SalesTab = 'sales' | 'invoices';

export const SalesManagementPage: React.FC = () => {
  const {
    invoices,
    customers,
    sales,
    finishedInventory,
    addSale,
    addCustomer,
    updateInvoice,
    deleteInvoice,
    deleteSale
  } = useFabriqData();

  // Active customer list
  const activeCustomers: Customer[] = useMemo(() => {
    return customers || [];
  }, [customers]);

  const [activeTab, setActiveTab] = useState<SalesTab>('sales');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Sale Creation Modal
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [saleCustomerId, setSaleCustomerId] = useState(activeCustomers[0]?.id || '');
  const [saleCustomerName, setSaleCustomerName] = useState(activeCustomers[0]?.name || '');
  const [isCreatingNewCust, setIsCreatingNewCust] = useState(false);
  
  // Custom Customer Inputs
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerType, setNewCustomerType] = useState<'Wholesale' | 'Retailer' | 'Boutique' | 'Export'>('Wholesale');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');

  const [saleCode, setSaleCode] = useState('');
  const [saleLines, setSaleLines] = useState<Array<{
    finishedInventoryId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    maxQty: number;
  }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Invoice Edit & View Modals
  const [isInvEditOpen, setIsInvEditOpen] = useState(false);
  const [editingInv, setEditingInv] = useState<Invoice | null>(null);
  const [invStatus, setInvStatus] = useState<Invoice['status']>('Pending');
  const [invPaymentMode, setInvPaymentMode] = useState('Bank Transfer');
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // Sale Delete
  const [deleteSaleCandidate, setDeleteSaleCandidate] = useState<SaleOrder | null>(null);
  const [deleteInvCandidate, setDeleteInvCandidate] = useState<Invoice | null>(null);

  // Available finished goods for sale
  const availableFinishedGoods = useMemo(() => {
    return finishedInventory.filter(f => f.availableQuantity > 0);
  }, [finishedInventory]);

  // Selected customer object
  const selectedCustomerObj = useMemo(() => {
    if (saleCustomerId === '__NEW__') return null;
    return activeCustomers.find(c => c.id === saleCustomerId) || activeCustomers[0] || null;
  }, [activeCustomers, saleCustomerId]);

  // Open modal handler
  const openSaleModal = () => {
    const firstCust = activeCustomers[0];
    if (!firstCust) {
      setIsCreatingNewCust(true);
      setSaleCustomerId('__NEW__');
      setSaleCustomerName('');
    } else {
      setIsCreatingNewCust(false);
      setSaleCustomerId(firstCust.id);
      setSaleCustomerName(firstCust.name);
    }
    setNewCustomerName('');
    setNewCustomerPhone('');
    setNewCustomerAddress('');

    setSaleCode(`SALE-${Date.now().toString().slice(-6)}`);
    setSaleLines([]);
    
    // Auto-add first line item if finished goods exist
    if (availableFinishedGoods.length > 0) {
      const first = availableFinishedGoods[0];
      setSaleLines([{
        finishedInventoryId: first.id,
        productName: first.productName,
        quantity: 1,
        unitPrice: first.unitPrice || 1200,
        maxQty: first.availableQuantity
      }]);
    }
    
    setIsSaleModalOpen(true);
  };

  const addSaleLine = () => {
    if (availableFinishedGoods.length === 0) return;
    const firstAvailable = availableFinishedGoods[0];
    setSaleLines(prev => [...prev, {
      finishedInventoryId: firstAvailable.id,
      productName: firstAvailable.productName,
      quantity: 1,
      unitPrice: firstAvailable.unitPrice || 1200,
      maxQty: firstAvailable.availableQuantity
    }]);
  };

  const updateSaleLine = (index: number, field: string, value: any) => {
    setSaleLines(prev => prev.map((line, i) => {
      if (i !== index) return line;
      if (field === 'finishedInventoryId') {
        const finItem = finishedInventory.find(f => f.id === value);
        if (finItem) {
          return {
            ...line,
            finishedInventoryId: value,
            productName: finItem.productName,
            unitPrice: finItem.unitPrice || 1200,
            maxQty: finItem.availableQuantity,
            quantity: Math.min(line.quantity, finItem.availableQuantity)
          };
        }
      }
      if (field === 'quantity') {
        const qty = Math.min(Number(value), line.maxQty);
        return { ...line, quantity: Math.max(1, qty) };
      }
      if (field === 'unitPrice') {
        return { ...line, unitPrice: Number(value) };
      }
      return line;
    }));
  };

  const removeSaleLine = (index: number) => {
    setSaleLines(prev => prev.filter((_, i) => i !== index));
  };

  const saleTotalAmount = useMemo(() => {
    return saleLines.reduce((sum, line) => sum + (line.quantity * line.unitPrice), 0);
  }, [saleLines]);

  const handleSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Determine final customer details
    let finalCustId = saleCustomerId;
    let finalCustName = saleCustomerName;

    if (saleCustomerId === '__NEW__' || isCreatingNewCust) {
      if (!newCustomerName.trim()) {
        alert('Please enter the customer / client name.');
        return;
      }
      finalCustId = `cust-${Date.now()}`;
      finalCustName = newCustomerName.trim();

      // Register new customer in CRM
      addCustomer({
        code: `CUST-${Math.floor(100 + Math.random() * 900)}`,
        name: finalCustName,
        type: newCustomerType,
        contactPerson: finalCustName,
        email: `${finalCustName.toLowerCase().replace(/[^a-z0-9]/g, '')}@client.com`,
        phone: newCustomerPhone.trim() || '+91 98200 00000',
        address: newCustomerAddress.trim() || 'Commercial District',
        creditLimit: 500000,
        outstandingBalance: 0,
        status: 'Active'
      });
    } else {
      const selected = activeCustomers.find(c => c.id === finalCustId) || activeCustomers[0];
      if (selected) {
        finalCustId = selected.id;
        finalCustName = selected.name;
      } else {
        finalCustId = 'cust-1';
        finalCustName = 'Westside Retail Ltd';
      }
    }

    if (saleLines.length === 0) {
      alert('Add at least one product line item to the sale.');
      return;
    }

    // Validate quantities against live finished inventory
    for (const line of saleLines) {
      const finItem = finishedInventory.find(f => f.id === line.finishedInventoryId);
      if (!finItem || line.quantity > finItem.availableQuantity) {
        alert(`Cannot sell ${line.quantity} of ${line.productName} — only ${finItem?.availableQuantity || 0} available in Finished Goods.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const items: SaleLineItem[] = saleLines.map(line => ({
        finishedInventoryId: line.finishedInventoryId,
        productName: line.productName,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        total: line.quantity * line.unitPrice
      }));

      await addSale({
        saleCode,
        customerId: finalCustId,
        customerName: finalCustName,
        items,
        totalAmount: saleTotalAmount,
        saleDate: new Date().toISOString().substring(0, 10),
        status: 'Confirmed'
      });

      setIsSaleModalOpen(false);
    } catch (err: any) {
      alert(`Error creating sale: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openInvEdit = (inv: Invoice) => {
    setEditingInv(inv);
    setInvStatus(inv.status);
    setInvPaymentMode(inv.paymentMode || 'Bank Transfer');
    setIsInvEditOpen(true);
  };

  const handleInvEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingInv) {
      updateInvoice({
        ...editingInv,
        status: invStatus,
        paymentMode: invPaymentMode
      });
    }
    setIsInvEditOpen(false);
  };

  // Helper to resolve customer name reliably
  const getCustomerDisplayName = (customerId?: string, fallbackName?: string) => {
    if (fallbackName && fallbackName.trim() !== '') return fallbackName;
    if (customerId) {
      const matched = activeCustomers.find(c => c.id === customerId);
      if (matched) return matched.name;
    }
    return 'Direct Customer';
  };

  // Helper to get customer object
  const getCustomerObj = (customerId?: string) => {
    if (!customerId) return null;
    return activeCustomers.find(c => c.id === customerId) || null;
  };

  // Filtered data
  const filteredSales = sales.filter((s) => {
    const term = searchTerm.toLowerCase();
    const custName = getCustomerDisplayName(s.customerId, s.customerName).toLowerCase();
    return (
      (s.saleCode || '').toLowerCase().includes(term) ||
      custName.includes(term)
    );
  });

  const filteredInvoices = invoices.filter((inv) => {
    const invCode = (inv.invoiceNumber || inv.invoiceCode || '').toLowerCase();
    const custName = getCustomerDisplayName(inv.customerId, inv.customerName || inv.client).toLowerCase();
    const matchesSearch = invCode.includes(searchTerm.toLowerCase()) || custName.includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 mb-1">
            <Receipt className="w-4 h-4" />
            <span>SALES & BILLING — PIPELINE CONNECTED</span>
          </div>
          <h1 className="font-hanken font-bold text-xl text-zinc-900 dark:text-zinc-100 tracking-tight">
            Sales & Billing Ledger
          </h1>
          <p className="text-xs font-mono text-zinc-500 mt-0.5">
            Sell from finished goods with automatic invoice generation and verified customer accounts.
          </p>
        </div>

        <button
          onClick={openSaleModal}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition-colors shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>CREATE SALE</span>
        </button>
      </div>

      {/* Pipeline Flow Indicator */}
      <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-3 flex items-center justify-center gap-2 text-[10px] font-mono text-zinc-500">
        <span className="font-bold text-zinc-500">Finished Inventory</span>
        <ArrowRight className="w-3 h-3" />
        <span className={`font-bold ${activeTab === 'sales' ? 'text-emerald-600 underline' : 'text-zinc-500'}`}>Customer Sale (deducts stock)</span>
        <ArrowRight className="w-3 h-3" />
        <span className={`font-bold ${activeTab === 'invoices' ? 'text-emerald-600 underline' : 'text-zinc-500'}`}>Tax Invoice (auto-generated)</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab('sales')}
          className={`px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
            activeTab === 'sales'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
              : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-3.5 h-3.5" />
            Sales Orders ({sales.length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
            activeTab === 'invoices'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
              : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5" />
            Invoices ({invoices.length})
          </div>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder={activeTab === 'sales' ? 'Search sale code, customer...' : 'Search invoice #, customer...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
          />
        </div>
        {activeTab === 'invoices' && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Overdue">Overdue</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        )}
      </div>

      {/* ============ SALES TAB ============ */}
      {activeTab === 'sales' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs overflow-x-auto">
          {filteredSales.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingCart className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
              <p className="text-sm font-mono text-zinc-500">No sales orders recorded.</p>
              <p className="text-[10px] font-mono text-zinc-400 mt-1">Create a sale to bill a customer and deduct Finished Goods stock.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  <th className="p-3 font-bold">Sale Code</th>
                  <th className="p-3 font-bold">Customer Account</th>
                  <th className="p-3 font-bold">Line Items</th>
                  <th className="p-3 font-bold">Total Amount</th>
                  <th className="p-3 font-bold">Date</th>
                  <th className="p-3 font-bold">Auto-Invoice</th>
                  <th className="p-3 font-bold">Status</th>
                  <th className="p-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                {filteredSales.map((s, idx) => {
                  const dispName = getCustomerDisplayName(s.customerId, s.customerName);
                  const custObj = getCustomerObj(s.customerId);
                  return (
                    <tr key={`${s.id}-${idx}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100">{s.saleCode}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                            {dispName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-hanken font-bold text-sm text-zinc-900 dark:text-zinc-100">
                              {dispName}
                            </div>
                            <div className="text-[10px] font-mono text-zinc-500 flex items-center gap-1.5 mt-0.5">
                              <span className="px-1.5 py-0.2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded font-semibold">
                                {custObj?.type || 'Client'}
                              </span>
                              {custObj?.phone && (
                                <span className="text-zinc-400">{custObj.phone}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-zinc-700 dark:text-zinc-300">
                        {s.items.map((item, i) => (
                          <div key={i} className="text-[11px]">
                            {item.quantity} × {item.productName} @ ₹{item.unitPrice}
                          </div>
                        ))}
                      </td>
                      <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        ₹{s.totalAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-zinc-600 dark:text-zinc-400">{s.saleDate}</td>
                      <td className="p-3">
                        {s.invoiceId ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            GENERATED
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="p-3"><Badge status={s.status} /></td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
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
                              setViewingInvoice(found);
                              setIsInvoiceModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                            title="View & Print Tax Invoice"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            INVOICE
                          </button>
                          <button
                            onClick={() => setDeleteSaleCandidate(s)}
                            className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950 hover:bg-rose-100 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            DELETE
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ============ INVOICES TAB ============ */}
      {activeTab === 'invoices' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs overflow-x-auto">
          {filteredInvoices.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
              <p className="text-sm font-mono text-zinc-500">No invoices yet.</p>
              <p className="text-[10px] font-mono text-zinc-400 mt-1">Invoices auto-generate when a customer sale is confirmed.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  <th className="p-3 font-bold">Invoice #</th>
                  <th className="p-3 font-bold">Client Account</th>
                  <th className="p-3 font-bold">Line Items</th>
                  <th className="p-3 font-bold">Amount</th>
                  <th className="p-3 font-bold">Date</th>
                  <th className="p-3 font-bold">Pipeline Source</th>
                  <th className="p-3 font-bold">Status</th>
                  <th className="p-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                {filteredInvoices.map((inv, idx) => {
                  const dispName = getCustomerDisplayName(inv.customerId, inv.customerName || inv.client);
                  return (
                    <tr key={`${inv.id}-${idx}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100">{inv.invoiceNumber || inv.invoiceCode}</td>
                      <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100 font-hanken text-sm">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{dispName}</span>
                        </div>
                      </td>
                      <td className="p-3 text-zinc-700 dark:text-zinc-300">
                        {inv.items && inv.items.length > 0 ? (
                          inv.items.map((item, i) => (
                            <div key={i} className="text-[11px]">{item.quantity} × {item.productName}</div>
                          ))
                        ) : (
                          <span className="text-[11px]">{inv.itemsSummary || `${inv.itemsCount || 0} items`}</span>
                        )}
                      </td>
                      <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        ₹{inv.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-zinc-600 dark:text-zinc-400">{inv.date}</td>
                      <td className="p-3">
                        {inv.saleId ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800 rounded">
                            <ArrowRight className="w-2.5 h-2.5" />
                            FROM SALE
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-400">Direct</span>
                        )}
                      </td>
                      <td className="p-3"><Badge status={inv.status} /></td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setViewingInvoice(inv);
                              setIsInvoiceModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                            title="View & Print GST Tax Invoice"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            VIEW / PRINT
                          </button>
                          <button
                            onClick={() => openInvEdit(inv)}
                            className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 rounded text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            EDIT
                          </button>
                          <button
                            onClick={() => setDeleteInvCandidate(inv)}
                            className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950 hover:bg-rose-100 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            DELETE
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ============ CREATE SALE MODAL ============ */}
      <Modal
        isOpen={isSaleModalOpen}
        onClose={() => setIsSaleModalOpen(false)}
        title="Create Sale & Auto-Generate Invoice"
        subtitle="Select customer account, pick finished goods. Deducts stock and auto-creates invoice."
      >
        <form onSubmit={handleSaleSubmit} className="space-y-4">
          
          {/* Customer Selection Section - ALWAYS VISIBLE */}
          <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-bold uppercase text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>CUSTOMER ACCOUNT *</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  if (saleCustomerId === '__NEW__') {
                    setSaleCustomerId(activeCustomers[0]?.id || 'cust-1');
                    setSaleCustomerName(activeCustomers[0]?.name || 'Westside Retail Ltd');
                  } else {
                    setSaleCustomerId('__NEW__');
                  }
                }}
                className="text-[11px] font-mono font-bold text-emerald-600 hover:text-emerald-500 flex items-center gap-1 cursor-pointer"
              >
                {saleCustomerId === '__NEW__' ? '← Choose Existing Account' : '+ Add New Customer'}
              </button>
            </div>

            {/* Main Customer Dropdown */}
            <div className="relative">
              <select
                value={saleCustomerId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSaleCustomerId(val);
                  if (val !== '__NEW__') {
                    const cust = activeCustomers.find(c => c.id === val);
                    setSaleCustomerName(cust?.name || '');
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border-2 border-emerald-500 dark:border-emerald-600 rounded text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 outline-none shadow-xs cursor-pointer"
              >
                <optgroup label="Verified Customer Accounts">
                  {activeCustomers.map((c) => (
                    <option key={c.id} value={c.id} className="py-1">
                      {c.name} ({c.type}) — {c.phone}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Actions">
                  <option value="__NEW__" className="font-bold text-emerald-600">
                    ➕ + Register New Customer Name...
                  </option>
                </optgroup>
              </select>
            </div>

            {/* Selected Customer Preview Card */}
            {selectedCustomerObj && saleCustomerId !== '__NEW__' && (
              <div className="p-2.5 bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-900/60 rounded flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                    {selectedCustomerObj.name.charAt(0)}
                  </div>
                  <div>
                    <span className="font-bold font-hanken text-zinc-900 dark:text-zinc-100 block">
                      {selectedCustomerObj.name}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {selectedCustomerObj.type} • {selectedCustomerObj.address || selectedCustomerObj.phone}
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded">
                  BILL TO CLIENT
                </span>
              </div>
            )}

            {/* Inline New Customer Creation Form */}
            {saleCustomerId === '__NEW__' && (
              <div className="p-3 bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-800 rounded space-y-3">
                <div className="text-xs font-mono font-bold text-emerald-600 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Enter New Customer Details:</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-mono font-bold uppercase text-zinc-500">Business / Customer Name *</label>
                    <input
                      type="text"
                      required
                      value={newCustomerName}
                      onChange={(e) => {
                        setNewCustomerName(e.target.value);
                        setSaleCustomerName(e.target.value);
                      }}
                      placeholder="e.g. Reliance Trends, Pantaloons"
                      className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded text-xs font-mono outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold uppercase text-zinc-500">Category</label>
                    <select
                      value={newCustomerType}
                      onChange={(e) => setNewCustomerType(e.target.value as any)}
                      className="w-full px-2 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded text-xs font-mono outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="Wholesale">Wholesale</option>
                      <option value="Retailer">Retailer</option>
                      <option value="Boutique">Boutique</option>
                      <option value="Export">Export</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold uppercase text-zinc-500">Contact Phone</label>
                    <input
                      type="text"
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                      placeholder="+91 98200 11223"
                      className="w-full px-2 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded text-xs font-mono outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-mono font-bold uppercase text-zinc-500">Sale Reference Code</label>
            <input
              type="text"
              required
              value={saleCode}
              onChange={(e) => setSaleCode(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
            />
          </div>

          {/* Line Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <PackageCheck className="w-3.5 h-3.5" />
                SELECT FINISHED GOODS (PIPELINE)
              </label>
              <button
                type="button"
                onClick={addSaleLine}
                disabled={availableFinishedGoods.length === 0}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-400 text-white text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> ADD LINE ITEM
              </button>
            </div>

            {availableFinishedGoods.length === 0 && (
              <div className="text-[10px] font-mono text-amber-600 dark:text-amber-400 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded">
                ⚠ No finished goods in stock. Mark a production order as Completed first.
              </div>
            )}

            {saleLines.map((line, i) => (
              <div key={i} className="flex items-end gap-2 p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-mono text-zinc-400 uppercase">Product</label>
                  <select
                    value={line.finishedInventoryId}
                    onChange={(e) => updateSaleLine(i, 'finishedInventoryId', e.target.value)}
                    className="w-full px-2 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {availableFinishedGoods.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.productName} — {f.availableQuantity} pcs in stock
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-24 space-y-1">
                  <label className="text-[10px] font-mono text-zinc-400 uppercase">Qty (Max: {line.maxQty})</label>
                  <input
                    type="number"
                    min={1}
                    max={line.maxQty}
                    value={line.quantity}
                    onChange={(e) => updateSaleLine(i, 'quantity', e.target.value)}
                    className="w-full px-2 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="w-28 space-y-1">
                  <label className="text-[10px] font-mono text-zinc-400 uppercase">Price (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={line.unitPrice}
                    onChange={(e) => updateSaleLine(i, 'unitPrice', e.target.value)}
                    className="w-full px-2 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="w-24 text-right">
                  <div className="text-[10px] font-mono text-zinc-400 uppercase mb-1">Subtotal</div>
                  <div className="text-xs font-mono font-bold text-emerald-600">₹{(line.quantity * line.unitPrice).toLocaleString()}</div>
                </div>
                <button
                  type="button"
                  onClick={() => removeSaleLine(i)}
                  className="px-2 py-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {saleLines.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded">
                <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  TOTAL AMOUNT: ₹{saleTotalAmount.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] font-mono text-emerald-600 flex items-center gap-1">
                  <ArrowRight className="w-3 h-3" />
                  Invoice auto-generates immediately on confirm
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setIsSaleModalOpen(false)}
              className="px-4 py-2 text-xs font-mono font-bold border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={isSubmitting || saleLines.length === 0}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-400 text-white text-xs font-mono font-bold uppercase tracking-wider cursor-pointer"
            >
              {isSubmitting ? 'PROCESSING...' : 'CONFIRM SALE & GENERATE INVOICE'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Invoice Edit Modal */}
      <Modal
        isOpen={isInvEditOpen}
        onClose={() => setIsInvEditOpen(false)}
        title={`Edit Invoice (${editingInv?.invoiceNumber || editingInv?.invoiceCode})`}
      >
        <form onSubmit={handleInvEditSubmit} className="space-y-4">
          {editingInv?.items && editingInv.items.length > 0 && (
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-zinc-400 uppercase">Line Items (from sale)</label>
              <div className="bg-zinc-50 dark:bg-zinc-950 p-3 border border-zinc-200 dark:border-zinc-800 space-y-1 text-xs font-mono">
                {editingInv.items.map((item, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{item.quantity} × {item.productName}</span>
                    <span className="font-bold text-emerald-600">₹{item.total.toLocaleString()}</span>
                  </div>
                ))}
                <div className="border-t border-zinc-200 dark:border-zinc-800 pt-1 mt-1 flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-emerald-600">₹{editingInv.amount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Invoice Status</label>
              <select
                value={invStatus}
                onChange={(e) => setInvStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Overdue">Overdue</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Payment Mode</label>
              <select
                value={invPaymentMode}
                onChange={(e) => setInvPaymentMode(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Letter of Credit">Letter of Credit</option>
                <option value="UPI">UPI</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button type="button" onClick={() => setIsInvEditOpen(false)} className="px-4 py-2 text-xs font-mono font-bold border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">CANCEL</button>
            <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold uppercase tracking-wider cursor-pointer">SAVE CHANGES</button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmations */}
      {deleteSaleCandidate && (
        <ConfirmDeleteModal
          isOpen={!!deleteSaleCandidate}
          onClose={() => setDeleteSaleCandidate(null)}
          onConfirm={() => deleteSale(deleteSaleCandidate.id)}
          itemName={`Sale ${deleteSaleCandidate.saleCode} (${getCustomerDisplayName(deleteSaleCandidate.customerId, deleteSaleCandidate.customerName)})`}
          itemType="Sale Order"
        />
      )}
      {deleteInvCandidate && (
        <ConfirmDeleteModal
          isOpen={!!deleteInvCandidate}
          onClose={() => setDeleteInvCandidate(null)}
          onConfirm={() => deleteInvoice(deleteInvCandidate.id)}
          itemName={`Invoice ${deleteInvCandidate.invoiceNumber || deleteInvCandidate.invoiceCode} (${getCustomerDisplayName(deleteInvCandidate.customerId, deleteInvCandidate.customerName || deleteInvCandidate.client)})`}
          itemType="Invoice"
        />
      )}

      {/* Tax Invoice View & Print Modal */}
      <TaxInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => {
          setIsInvoiceModalOpen(false);
          setViewingInvoice(null);
        }}
        invoice={viewingInvoice}
        customer={activeCustomers.find(c => c.id === viewingInvoice?.customerId) || null}
      />
    </div>
  );
};

