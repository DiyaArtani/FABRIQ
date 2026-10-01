import React, { useState, useMemo, useEffect } from 'react';
import { Receipt, Plus, Search, Edit, Trash2, ArrowRight, PackageCheck, ShoppingCart, FileText, Building2, CheckCircle2, User, Phone, ChevronDown, Printer, X } from 'lucide-react';
import { useFabriqData } from '../../context/FabriqDataContext';
import { Invoice, SaleOrder, SaleLineItem, FinishedInventoryItem, Customer } from '../../types';
import { Badge, Modal, ConfirmDeleteModal } from '../components/AdminUIComponents';
import { TaxInvoiceModal } from '../components/TaxInvoiceModal';
import { WhatsAppShareModal, WhatsAppIcon } from '../../components/WhatsAppShareModal';
import { sortLatest } from '../../utils/sortUtils';
import { getNextInvoiceNumber, resolveInvoiceForSale } from '../../lib/invoiceUtils';

export const SalesManagementPage: React.FC = () => {
  const {
    invoices,
    customers,
    sales,
    finishedInventory,
    settings,
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

  const [saleGstRate, setSaleGstRate] = useState<number>(5);
  const nextInvoiceNumber = useMemo(() => {
    return getNextInvoiceNumber(invoices, sales);
  }, [invoices, sales]);
  const [saleInvoiceNumber, setSaleInvoiceNumber] = useState('');

  const [saleLines, setSaleLines] = useState<Array<{
    finishedInventoryId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    maxQty: number;
  }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Payment Status & Method for New Sale
  const [salePaymentStatus, setSalePaymentStatus] = useState<'Paid' | 'Partial' | 'Pending'>('Paid');
  const [salePaymentMethod, setSalePaymentMethod] = useState('Bank Transfer');
  const [salePaidAmount, setSalePaidAmount] = useState<number>(0);

  // Invoice Edit & View Modals
  const [isInvEditOpen, setIsInvEditOpen] = useState(false);
  const [editingInv, setEditingInv] = useState<Invoice | null>(null);
  const [invStatus, setInvStatus] = useState<Invoice['status']>('Pending');
  const [invPaymentMode, setInvPaymentMode] = useState('Bank Transfer');
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [whatsAppData, setWhatsAppData] = useState<{ invoice: Invoice; customer: Customer | null } | null>(null);

  // Sale Delete
  const [deleteSaleCandidate, setDeleteSaleCandidate] = useState<SaleOrder | null>(null);

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

    setSaleInvoiceNumber(getNextInvoiceNumber(invoices, sales));
    setSaleGstRate(settings?.defaultTaxRate !== undefined ? settings.defaultTaxRate : 5);
    // When adding sales or items, start with an empty item with nothing selected
    setSaleLines([{
      finishedInventoryId: '',
      productName: '',
      quantity: 1,
      unitPrice: 0,
      maxQty: 0
    }]);

    setSalePaymentStatus('Paid');
    setSalePaymentMethod('Bank Transfer');
    setSalePaidAmount(0);

    setIsSaleModalOpen(true);
  };

  const addSaleLine = () => {
    setSaleLines(prev => [...prev, {
      finishedInventoryId: '',
      productName: '',
      quantity: 1,
      unitPrice: 0,
      maxQty: 0
    }]);
  };

  const updateSaleLine = (index: number, field: string, value: any) => {
    setSaleLines(prev => prev.map((line, i) => {
      if (i !== index) return line;
      if (field === 'finishedInventoryId') {
        if (!value) {
          return {
            ...line,
            finishedInventoryId: '',
            productName: '',
            unitPrice: 0,
            maxQty: 0,
            quantity: 1
          };
        }
        const finItem = finishedInventory.find(f => f.id === value);
        if (finItem) {
          return {
            ...line,
            finishedInventoryId: value,
            productName: finItem.productName,
            unitPrice: finItem.unitPrice || 1200,
            maxQty: finItem.availableQuantity,
            quantity: Math.min(line.quantity || 1, Math.max(1, finItem.availableQuantity))
          };
        }
      }
      if (field === 'quantity') {
        const qty = line.maxQty > 0 ? Math.min(Number(value), line.maxQty) : Number(value);
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

  const saleSubtotal = useMemo(() => {
    return saleLines.reduce((sum, line) => sum + (line.quantity * line.unitPrice), 0);
  }, [saleLines]);

  const saleGstAmount = useMemo(() => {
    if (saleGstRate <= 0) return 0;
    return Math.round((saleSubtotal * (saleGstRate / 100)) * 100) / 100;
  }, [saleSubtotal, saleGstRate]);

  const saleGrandTotal = useMemo(() => {
    return saleSubtotal + saleGstAmount;
  }, [saleSubtotal, saleGstAmount]);

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
        email: '',
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

    if (saleLines.length === 0 || saleLines.some(l => !l.finishedInventoryId)) {
      alert('Please select a finished garment product for each line item before completing the sale.');
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

      const finalInvNumber = saleInvoiceNumber.trim() || nextInvoiceNumber;
      const finalCustPhone = (saleCustomerId === '__NEW__' || isCreatingNewCust)
        ? newCustomerPhone.trim()
        : (selectedCustomerObj?.phone || '');

      const finalPaidAmt = salePaymentStatus === 'Paid'
        ? saleGrandTotal
        : (salePaymentStatus === 'Partial' ? (Number(salePaidAmount) || 0) : 0);

      const result = await addSale({
        saleCode: finalInvNumber,
        invoiceNumber: finalInvNumber,
        customerId: finalCustId,
        customerName: finalCustName,
        customerPhone: finalCustPhone,
        items,
        subtotal: saleSubtotal,
        gstRate: saleGstRate,
        gstAmount: saleGstAmount,
        grandTotal: saleGrandTotal,
        totalAmount: saleGrandTotal,
        saleDate: new Date().toISOString().substring(0, 10),
        status: 'Confirmed',
        paymentStatus: salePaymentStatus,
        paymentMethod: salePaymentMethod,
        paymentMode: salePaymentMethod,
        paidAmount: finalPaidAmt
      });

      setIsSaleModalOpen(false);

      if (result?.invoice) {
        const generatedInvoiceWithPhone: Invoice = {
          ...result.invoice,
          customerPhone: finalCustPhone,
          customerName: finalCustName,
          client: finalCustName
        };
        setViewingInvoice(generatedInvoiceWithPhone);
        setIsInvoiceModalOpen(true);
      }
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

  // Helper to resolve invoice for a given sale entry reliably
  const getSaleInvoiceObj = (s: SaleOrder): Invoice => {
    return resolveInvoiceForSale(s, invoices, (s as any).customerPhone || getCustomerObj(s.customerId)?.phone);
  };

  // Quick Action: Open WhatsApp share modal for a specific sales entry
  const handleOpenWhatsAppForSale = (s: SaleOrder) => {
    const inv = getSaleInvoiceObj(s);
    const resolvedCust = getCustomerObj(s.customerId) || {
      id: s.customerId || 'cust',
      code: 'CUST',
      name: s.customerName,
      companyName: s.customerName,
      contactPerson: s.customerName,
      phone: (s as any).customerPhone || inv.customerPhone || '',
      email: '',
      address: s.shippingAddress || '',
      category: 'Wholesale',
      creditLimit: 0,
      outstandingBalance: 0,
      paymentTerms: 'Immediate',
      status: 'Active' as const,
      ordersCount: 1
    };

    setWhatsAppData({
      invoice: inv,
      customer: resolvedCust
    });
  };

  // Filtered sales data (latest first)
  const filteredSales = useMemo(() => {
    const list = sales.filter((s) => {
      const term = searchTerm.toLowerCase();
      const custName = getCustomerDisplayName(s.customerId, s.customerName).toLowerCase();
      const invNumStr = (s.invoiceNumber || s.invoiceId || '').toLowerCase();
      const matchesSearch = custName.includes(term) || invNumStr.includes(term);
      const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
    return sortLatest(list);
  }, [sales, searchTerm, statusFilter, activeCustomers]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 mb-1">
            <Receipt className="w-4 h-4" />
            <span>SALES & BILLING </span>
          </div>
          <h1 className="font-hanken font-bold text-xl text-zinc-900 dark:text-zinc-100 tracking-tight">
            Sales & Billing Ledger
          </h1>
        </div>

        <button
          onClick={openSaleModal}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition-colors shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>CREATE SALE</span>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search sale code, invoice #, customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
          />
        </div>
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
      </div>

      {/* ============ SALES & BILLING TABLE ============ */}
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
                <th className="p-3 font-bold">Invoice #</th>
                <th className="p-3 font-bold">Customer Account</th>
                <th className="p-3 font-bold">Line Items</th>
                <th className="p-3 font-bold">Total Amount</th>
                <th className="p-3 font-bold">Date</th>
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
                    <td className="p-3">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                        {s.invoiceNumber || s.invoiceId || 'INV-PENDING'}
                      </span>
                    </td>
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
                            {(custObj?.phone || (s as any).customerPhone) && (
                              <span className="text-zinc-400">{custObj?.phone || (s as any).customerPhone}</span>
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
                    <td className="p-3"><Badge status={s.status} /></td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            const found = getSaleInvoiceObj(s);
                            setViewingInvoice(found);
                            setIsInvoiceModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                          title="View & Print Invoice"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          INVOICE
                        </button>
                        <button
                          onClick={() => handleOpenWhatsAppForSale(s)}
                          className="px-2.5 py-1 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] dark:text-[#25D366] border border-[#25D366]/30 rounded text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                          title="Send invoice directly to customer on WhatsApp"
                        >
                          <WhatsAppIcon className="w-3.5 h-3.5 text-[#25D366]" />
                          WHATSAPP
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
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-mono font-bold uppercase text-zinc-500">Contact Phone</label>
                      <span className="text-[10px] font-mono text-zinc-400">10 digits</span>
                    </div>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]{10}"
                      maxLength={10}
                      value={newCustomerPhone}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setNewCustomerPhone(cleaned);
                      }}
                      placeholder="9820011223"
                      className="w-full px-2 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded text-xs font-mono outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400">
                Sales Invoice Number
              </label>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded border border-emerald-300 dark:border-emerald-800">
                SEQUENTIAL &amp; EDITABLE
              </span>
            </div>
            <input
              type="text"
              required
              value={saleInvoiceNumber || nextInvoiceNumber}
              onChange={(e) => setSaleInvoiceNumber(e.target.value)}
              placeholder="e.g. INV-2026-0001"
              className="w-full px-3 py-2 bg-emerald-50/40 dark:bg-zinc-950 border border-emerald-300 dark:border-emerald-800 font-bold text-xs font-mono outline-none focus:border-emerald-500 text-emerald-900 dark:text-emerald-300"
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
                    className="w-full px-2 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500 cursor-pointer font-medium"
                  >
                    <option value="">-- Select Finished Garment Style / Product --</option>
                    {availableFinishedGoods.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.productName} — {f.availableQuantity} pcs in stock (₹{f.unitPrice || 1200}/pc)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-24 space-y-1">
                  <label className="text-[10px] font-mono text-zinc-400 uppercase">Qty {line.maxQty > 0 ? `(Max: ${line.maxQty})` : ''}</label>
                  <input
                    type="number"
                    min={1}
                    max={line.maxQty > 0 ? line.maxQty : undefined}
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
              <div className="space-y-3 pt-2">
                {/* GST Option Selection */}
                <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono font-bold uppercase text-zinc-600 dark:text-zinc-400">
                      GST Option:
                    </label>
                    <span className="text-[10px] font-mono text-zinc-500">
                      Select tax slab to apply on invoice
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { rate: 0, label: '0% (Exempt/None)' },
                      { rate: 5, label: '5% (Standard)' },
                      { rate: 12, label: '12% (Higher)' },
                      { rate: 18, label: '18% (Special)' }
                    ].map(opt => (
                      <button
                        key={opt.rate}
                        type="button"
                        onClick={() => setSaleGstRate(opt.rate)}
                        className={`py-1.5 px-2 text-xs font-mono font-bold rounded border transition-colors cursor-pointer text-center ${saleGstRate === opt.rate
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:border-emerald-500'
                          }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subtotal, GST & Total Summary */}
                <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-zinc-600 dark:text-zinc-400">
                    <span>Items Subtotal:</span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">₹{saleSubtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono text-zinc-600 dark:text-zinc-400">
                    <span>GST ({saleGstRate}%):</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {saleGstRate === 0 ? '₹0.00 (Exempt)' : `+₹${saleGstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                    </span>
                  </div>
                  <div className="border-t border-emerald-200 dark:border-emerald-800/80 pt-2 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono font-extrabold text-emerald-800 dark:text-emerald-300 block">
                        TOTAL INVOICE AMOUNT: ₹{saleGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-600 flex items-center gap-1 mt-0.5">
                        <ArrowRight className="w-3 h-3" />
                        Invoice {saleInvoiceNumber || nextInvoiceNumber} auto-generates immediately on confirm
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Condition & Method of Payment */}
                <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                      Payment Condition
                    </label>
                    <span className="text-[10px] font-mono text-zinc-500">Select payment status</span>
                  </div>

                  {/* Paid / Partial / Pending Tabs */}
                  <div className="grid grid-cols-3 gap-2">
                    {(['Paid', 'Partial', 'Pending'] as const).map((status) => {
                      const isSelected = salePaymentStatus === status;
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => {
                            setSalePaymentStatus(status);
                            if (status === 'Paid') {
                              setSalePaidAmount(saleGrandTotal);
                            } else if (status === 'Pending') {
                              setSalePaidAmount(0);
                            }
                          }}
                          className={`py-2 px-2 text-xs font-mono font-bold rounded border transition-all cursor-pointer text-center ${isSelected
                            ? status === 'Paid'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : status === 'Partial'
                                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                : 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:border-zinc-400'
                            }`}
                        >
                          {status === 'Paid' && ' Paid'}
                          {status === 'Partial' && ' Partial'}
                          {status === 'Pending' && ' Pending'}
                        </button>
                      );
                    })}
                  </div>

                  {/* Method of Payment & Partial Amount */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] font-mono font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
                        Method of Payment
                      </label>
                      <select
                        value={salePaymentMethod}
                        onChange={(e) => setSalePaymentMethod(e.target.value)}
                        className="w-full h-9 px-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded text-xs font-mono text-zinc-800 dark:text-zinc-200 focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer"
                      >
                        <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                        <option value="UPI / QR">UPI / QR Code</option>
                        <option value="Cash">Cash</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Card">Debit / Credit Card</option>
                        <option value="Credit / On Account">Credit / On Account (Net 30)</option>
                      </select>
                    </div>

                    {salePaymentStatus === 'Partial' ? (
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-[10px] font-mono font-bold text-amber-600 uppercase tracking-wider">
                            Amount Paid (₹)
                          </label>
                          <span className="text-[10px] font-mono text-zinc-500">
                            Due: ₹{Math.max(0, saleGrandTotal - (salePaidAmount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          max={saleGrandTotal}
                          step="0.01"
                          value={salePaidAmount || ''}
                          onChange={(e) => setSalePaidAmount(parseFloat(e.target.value) || 0)}
                          placeholder="Enter amount paid"
                          className="w-full h-9 px-2.5 bg-white dark:bg-zinc-900 border border-amber-400 dark:border-amber-700 rounded text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200 focus:ring-1 focus:ring-amber-500 outline-none"
                          required
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider mb-1">
                          Settlement Summary
                        </label>
                        <div className="h-9 px-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded flex items-center text-xs font-mono font-bold">
                          {salePaymentStatus === 'Paid' ? (
                            <span className="text-emerald-600 dark:text-emerald-400">Full Payment Received (₹{saleGrandTotal.toLocaleString('en-IN')})</span>
                          ) : (
                            <span className="text-rose-600 dark:text-rose-400">Pending Full Balance (₹{saleGrandTotal.toLocaleString('en-IN')})</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
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
          itemName={`Invoice ${deleteSaleCandidate.invoiceNumber || deleteSaleCandidate.id} (${getCustomerDisplayName(deleteSaleCandidate.customerId, deleteSaleCandidate.customerName)}) — Sold inventory will be restored back to Finished Goods.`}
          itemType="Sale Order"
        />
      )}

      {/* Printable Invoice View & Print Modal */}
      <TaxInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => {
          setIsInvoiceModalOpen(false);
          setViewingInvoice(null);
        }}
        invoice={viewingInvoice}
        customer={activeCustomers.find(c => c.id === viewingInvoice?.customerId) || null}
      />

      {/* WhatsApp Share Modal */}
      <WhatsAppShareModal
        isOpen={!!whatsAppData}
        onClose={() => setWhatsAppData(null)}
        invoice={whatsAppData?.invoice || null}
        customer={whatsAppData?.customer || null}
        onViewInvoice={() => {
          if (whatsAppData?.invoice) {
            setViewingInvoice(whatsAppData.invoice);
            setIsInvoiceModalOpen(true);
          }
        }}
      />
    </div>
  );
};

