import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ShoppingCart,
  Building2,
  PackageCheck,
  CreditCard,
  Percent,
  CheckCircle2,
  Save,
  Phone,
  MapPin,
  ArrowRight,
  Receipt
} from 'lucide-react';
import { useFabriqData } from '../../../../context/FabriqDataContext';
import { getNextInvoiceNumber } from '../../../../lib/invoiceUtils';

interface CreateSaleScreenProps {
  key?: string;
  onBack: () => void;
  onCreated: () => void;
}

export default function CreateSaleScreen({ onBack, onCreated }: CreateSaleScreenProps) {
  const {
    customers,
    finishedInventory,
    invoices,
    sales,
    settings,
    addSale,
    addCustomer
  } = useFabriqData();

  // Active verified customers
  const activeCustomers = useMemo(() => {
    return (customers || []).filter(c => c.status !== 'Inactive');
  }, [customers]);

  // Available finished goods
  const availableFinishedGoods = useMemo(() => {
    return (finishedInventory || []).filter(f => (f.availableQuantity ?? f.unitsAvailable ?? 0) > 0);
  }, [finishedInventory]);

  // Invoice sequence
  const nextInvoiceNumber = useMemo(() => {
    return getNextInvoiceNumber(invoices, sales);
  }, [invoices, sales]);

  // Customer State
  const [isCreatingNewCust, setIsCreatingNewCust] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(activeCustomers[0]?.id || '__NEW__');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');

  // Finished Goods Item Selection
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>(availableFinishedGoods[0]?.id || '');
  const [saleQuantity, setSaleQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(
    availableFinishedGoods[0]?.sellingPrice || availableFinishedGoods[0]?.unitPrice || 1200
  );

  // Taxation State
  const [gstRate, setGstRate] = useState<number>(settings?.defaultTaxRate !== undefined ? settings.defaultTaxRate : 5);

  // Payment Settlement State
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Partial' | 'Pending'>('Paid');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [paidAmount, setPaidAmount] = useState<number>(0);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Current selected item object
  const selectedInventory = useMemo(() => {
    return availableFinishedGoods.find(f => f.id === selectedInventoryId) || availableFinishedGoods[0] || null;
  }, [availableFinishedGoods, selectedInventoryId]);

  // Available stock
  const availableQty = selectedInventory ? (selectedInventory.availableQuantity ?? selectedInventory.unitsAvailable ?? 0) : 0;

  // Selected customer object
  const selectedCustomerObj = useMemo(() => {
    if (isCreatingNewCust || selectedCustomerId === '__NEW__') return null;
    return activeCustomers.find(c => c.id === selectedCustomerId) || activeCustomers[0] || null;
  }, [activeCustomers, selectedCustomerId, isCreatingNewCust]);

  // Financial Computations
  const subtotal = useMemo(() => {
    return saleQuantity * (unitPrice || 0);
  }, [saleQuantity, unitPrice]);

  const gstAmount = useMemo(() => {
    return gstRate > 0 ? Math.round((subtotal * (gstRate / 100)) * 100) / 100 : 0;
  }, [subtotal, gstRate]);

  const grandTotal = useMemo(() => {
    return subtotal + gstAmount;
  }, [subtotal, gstAmount]);

  const remainingDue = useMemo(() => {
    if (paymentStatus === 'Paid') return 0;
    if (paymentStatus === 'Pending') return grandTotal;
    return Math.max(0, grandTotal - (paidAmount || 0));
  }, [grandTotal, paymentStatus, paidAmount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedInventory) {
      alert('Please select a finished goods product from inventory.');
      return;
    }

    if (saleQuantity <= 0) {
      alert('Sale quantity must be at least 1 piece.');
      return;
    }

    if (saleQuantity > availableQty) {
      alert(`Cannot sell ${saleQuantity} — only ${availableQty} pcs available in Finished Goods!`);
      return;
    }

    // Resolve Customer
    let finalCustId = selectedCustomerId;
    let finalCustName = selectedCustomerObj?.name || 'Counter Sale';
    let finalCustPhone = selectedCustomerObj?.phone || '';

    if (isCreatingNewCust || selectedCustomerId === '__NEW__') {
      if (!newCustomerName.trim()) {
        alert('Please enter a customer account name.');
        return;
      }
      finalCustName = newCustomerName.trim();
      finalCustPhone = newCustomerPhone.trim();
      const newCust = {
        name: finalCustName,
        phone: finalCustPhone,
        address: newCustomerAddress.trim(),
        type: 'Retailer' as const,
        status: 'Active' as const,
        creditLimit: 200000,
        currentBalance: 0
      };
      if (addCustomer) {
        addCustomer(newCust);
      }
      finalCustId = `cust-${Date.now()}`;
    }

    setIsSubmitting(true);

    const finalPaidAmt = paymentStatus === 'Paid'
      ? grandTotal
      : (paymentStatus === 'Partial' ? (Number(paidAmount) || 0) : 0);

    const productName = selectedInventory.productName || selectedInventory.itemName || 'Finished Garment';

    await addSale({
      saleCode: nextInvoiceNumber,
      invoiceNumber: nextInvoiceNumber,
      customerId: finalCustId,
      customerName: finalCustName,
      customerPhone: finalCustPhone,
      items: [
        {
          finishedInventoryId: selectedInventory.id,
          productName,
          quantity: saleQuantity,
          unitPrice,
          total: subtotal
        }
      ],
      subtotal,
      gstRate,
      gstAmount,
      grandTotal,
      totalAmount: grandTotal,
      saleDate: new Date().toISOString().substring(0, 10),
      status: 'Confirmed',
      paymentStatus,
      paymentMethod,
      paymentMode: paymentMethod,
      paidAmount: finalPaidAmt
    });

    setIsSubmitting(false);
    onCreated();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.25 }}
      className="max-w-4xl mx-auto pb-28 text-gray-900 dark:text-neutral-100 font-mono"
    >
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-gray-200 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-700 dark:text-neutral-300 transition-colors shadow-2xs cursor-pointer flex items-center justify-center"
            title="Back to Sales List"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-hanken text-2xl font-black text-gray-900 dark:text-neutral-100 tracking-tight">
                Create Sales Order
              </h1>
              <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-md">
                Invoice {nextInvoiceNumber}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5 font-sans">
              Bill customer, record payment condition &amp; deduct Finished Goods stock
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || !selectedInventory || saleQuantity <= 0 || saleQuantity > availableQty}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-300 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{isSubmitting ? 'PROCESSING...' : 'CONFIRM SALE & INVOICE'}</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Section 1: Customer Account */}
        <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-neutral-800/80">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              <Building2 className="w-4 h-4" />
              <span>1. Customer Account &amp; Billing Contact</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsCreatingNewCust(!isCreatingNewCust);
                if (!isCreatingNewCust) {
                  setSelectedCustomerId('__NEW__');
                } else {
                  setSelectedCustomerId(activeCustomers[0]?.id || '');
                }
              }}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-500 cursor-pointer"
            >
              {isCreatingNewCust ? '← Choose Existing Customer' : '+ Register New Customer'}
            </button>
          </div>

          {!isCreatingNewCust ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-gray-600 dark:text-neutral-400 uppercase tracking-wider">
                  Select Customer Account *
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__NEW__') {
                      setIsCreatingNewCust(true);
                      setSelectedCustomerId('__NEW__');
                    } else {
                      setSelectedCustomerId(val);
                    }
                  }}
                  className="w-full h-11 px-3.5 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs font-bold text-gray-900 dark:text-neutral-100 cursor-pointer"
                >
                  <optgroup label="Verified Customer Accounts">
                    {activeCustomers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.type}) — {c.phone}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Actions">
                    <option value="__NEW__">➕ + Register New Customer Name...</option>
                  </optgroup>
                </select>
              </div>

              {selectedCustomerObj && (
                <div className="p-3 bg-gray-50 dark:bg-neutral-950/60 border border-gray-200 dark:border-neutral-800 rounded-xl flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
                  <span className="font-bold text-gray-900 dark:text-neutral-100">{selectedCustomerObj.name}</span>
                  {selectedCustomerObj.phone && (
                    <span className="text-gray-500 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      {selectedCustomerObj.phone}
                    </span>
                  )}
                  {selectedCustomerObj.address && (
                    <span className="text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      {selectedCustomerObj.address}
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-gray-600 dark:text-neutral-400 uppercase tracking-wider">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="e.g. Zara Lifestyle Retail"
                  className="w-full h-11 px-3 bg-gray-50 dark:bg-neutral-950 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold text-gray-900 dark:text-neutral-100 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-gray-600 dark:text-neutral-400 uppercase tracking-wider">
                  Phone (Optional)
                </label>
                <input
                  type="text"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder="e.g. +91 98250 11223"
                  className="w-full h-11 px-3 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl text-xs font-mono text-gray-900 dark:text-neutral-100 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-gray-600 dark:text-neutral-400 uppercase tracking-wider">
                  City / Address (Optional)
                </label>
                <input
                  type="text"
                  value={newCustomerAddress}
                  onChange={(e) => setNewCustomerAddress(e.target.value)}
                  placeholder="e.g. Commercial Street, Bangalore"
                  className="w-full h-11 px-3 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl text-xs text-gray-900 dark:text-neutral-100 outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Finished Goods Selection */}
        <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-neutral-800/80">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              <PackageCheck className="w-4 h-4" />
              <span>2. Select Finished Goods &amp; Quantity</span>
            </div>
            {selectedInventory && (
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                In Stock: {availableQty} Pcs
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5 md:col-span-1">
              <label className="block text-[11px] font-bold text-gray-600 dark:text-neutral-400 uppercase tracking-wider">
                Finished Garment Product *
              </label>
              <select
                value={selectedInventoryId}
                onChange={(e) => {
                  setSelectedInventoryId(e.target.value);
                  const fin = availableFinishedGoods.find(f => f.id === e.target.value);
                  if (fin) {
                    setUnitPrice(fin.sellingPrice || fin.unitPrice || 1200);
                  }
                }}
                className="w-full h-11 px-3.5 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs font-bold text-gray-900 dark:text-neutral-100 cursor-pointer"
                required
              >
                {availableFinishedGoods.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.productName || f.itemName} ({f.availableQuantity ?? f.unitsAvailable ?? 0} Pcs available)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <label className="font-bold text-gray-600 dark:text-neutral-400 uppercase tracking-wider">
                  Quantity to Sell *
                </label>
                <span className="text-[10px] text-gray-400">Max: {availableQty} Pcs</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  required
                  min={1}
                  max={availableQty}
                  value={saleQuantity || ''}
                  onChange={(e) => setSaleQuantity(parseInt(e.target.value, 10) || 0)}
                  placeholder="10"
                  className="w-full h-11 px-3.5 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs font-bold text-gray-900 dark:text-neutral-100 font-mono"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold pointer-events-none">
                  Pcs
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-600 dark:text-neutral-400 uppercase tracking-wider">
                Unit Selling Price (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold pointer-events-none">
                  ₹
                </span>
                <input
                  type="number"
                  required
                  min={1}
                  step="any"
                  value={unitPrice || ''}
                  onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                  placeholder="1200"
                  className="w-full h-11 pl-8 pr-3.5 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs font-bold text-gray-900 dark:text-neutral-100 font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Taxation & Total Summary */}
        <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 pb-2 border-b border-gray-100 dark:border-neutral-800/80">
            <Percent className="w-4 h-4" />
            <span>3. Goods &amp; Services Tax (GST) &amp; Total</span>
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-gray-600 dark:text-neutral-400 uppercase tracking-wider">
              Applicable GST Tax Bracket
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { rate: 0, label: '0% (Exempt)' },
                { rate: 5, label: '5% (Apparel Std)' },
                { rate: 12, label: '12% (Higher)' },
                { rate: 18, label: '18% (Special)' }
              ].map(opt => (
                <button
                  key={opt.rate}
                  type="button"
                  onClick={() => setGstRate(opt.rate)}
                  className={`py-2 px-3 text-xs font-mono font-bold rounded-xl border transition-all cursor-pointer text-center ${
                    gstRate === opt.rate
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-gray-50 dark:bg-neutral-950 text-gray-700 dark:text-neutral-300 border-gray-200 dark:border-neutral-800 hover:border-emerald-500'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Subtotal & Grand Total Box */}
          <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2.5 font-mono">
            <div className="flex justify-between text-xs text-gray-600 dark:text-neutral-400">
              <span>Items Subtotal:</span>
              <span className="font-bold text-gray-900 dark:text-neutral-100">₹{subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-600 dark:text-neutral-400">
              <span>GST Amount ({gstRate}%):</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {gstRate === 0 ? '₹0.00' : `+₹${gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
              </span>
            </div>
            <div className="border-t border-emerald-200 dark:border-emerald-800/80 pt-2 flex items-center justify-between">
              <div>
                <span className="text-sm font-extrabold text-emerald-800 dark:text-emerald-300 block">
                  TOTAL INVOICE AMOUNT: ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-emerald-600 flex items-center gap-1 mt-0.5">
                  <ArrowRight className="w-3 h-3" />
                  Tax Invoice {nextInvoiceNumber} will auto-generate immediately
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Payment Condition & Method */}
        <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 pb-2 border-b border-gray-100 dark:border-neutral-800/80">
            <CreditCard className="w-4 h-4" />
            <span>4. Payment Settlement &amp; Payment Method</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-gray-600 dark:text-neutral-400 uppercase tracking-wider">
                Payment Status *
              </label>
              <span className="text-[10px] text-gray-400">Select payment condition</span>
            </div>

            {/* Paid / Partial / Pending Tabs */}
            <div className="grid grid-cols-3 gap-2.5">
              {(['Paid', 'Partial', 'Pending'] as const).map((status) => {
                const isSelected = paymentStatus === status;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      setPaymentStatus(status);
                      if (status === 'Paid') {
                        setPaidAmount(grandTotal);
                      } else if (status === 'Pending') {
                        setPaidAmount(0);
                      }
                    }}
                    className={`py-2.5 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center ${
                      isSelected
                        ? status === 'Paid'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : status === 'Partial'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-gray-50 dark:bg-neutral-950 text-gray-700 dark:text-neutral-300 border-gray-200 dark:border-neutral-800 hover:border-gray-400'
                    }`}
                  >
                    {status === 'Paid' && '✓ Paid (Full)'}
                    {status === 'Partial' && '◐ Partial Payment'}
                    {status === 'Pending' && '⏳ Pending (Unpaid)'}
                  </button>
                );
              })}
            </div>

            {/* Method of Payment & Partial Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-gray-600 dark:text-neutral-400 uppercase tracking-wider">
                  Method of Payment *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full h-11 px-3.5 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs font-bold text-gray-900 dark:text-neutral-100 cursor-pointer"
                >
                  <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                  <option value="UPI / QR">UPI / QR Code</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Card">Debit / Credit Card</option>
                  <option value="Credit / On Account">Credit / On Account (Net 30)</option>
                </select>
              </div>

              {paymentStatus === 'Partial' ? (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[11px]">
                    <label className="font-bold text-amber-600 uppercase tracking-wider">
                      Amount Paid (₹) *
                    </label>
                    <span className="text-[10px] text-gray-500 font-mono">
                      Due: ₹{remainingDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={grandTotal}
                    step="0.01"
                    value={paidAmount || ''}
                    onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                    placeholder="Enter amount paid"
                    className="w-full h-11 px-3.5 bg-gray-50 dark:bg-neutral-950 border border-amber-400 dark:border-amber-700 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-xs font-mono font-bold text-gray-900 dark:text-neutral-100"
                    required
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Settlement Status
                  </label>
                  <div className="h-11 px-3.5 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl flex items-center text-xs font-mono font-bold">
                    {paymentStatus === 'Paid' ? (
                      <span className="text-emerald-600">Full Payment Received (₹{grandTotal.toLocaleString('en-IN')})</span>
                    ) : (
                      <span className="text-rose-600">Full Amount Pending (₹{grandTotal.toLocaleString('en-IN')})</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-full sm:w-auto px-6 py-3 bg-white dark:bg-neutral-900 border border-gray-300 dark:border-neutral-700 rounded-xl text-xs font-bold text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !selectedInventory || saleQuantity <= 0 || saleQuantity > availableQty}
            className="w-full sm:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-300 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-600/10 cursor-pointer transition-all uppercase tracking-wider"
          >
            <Receipt className="w-4 h-4" />
            <span>{isSubmitting ? 'Confirming...' : 'Confirm Sale & Generate Tax Invoice'}</span>
          </button>
        </div>
      </form>
    </motion.div>
  );
}
