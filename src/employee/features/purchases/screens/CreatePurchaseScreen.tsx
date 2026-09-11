import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Calendar,
  FileText,
  Building2,
  CreditCard,
  Layers,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Phone,
  Landmark,
  Percent,
  Coins,
  Warehouse as WarehouseIcon,
  Plus,
  BookmarkCheck,
  UserPlus,
  Edit3,
  Receipt,
  Truck,
  PackageCheck,
  Lock
} from 'lucide-react';
import { Purchase, Supplier, PurchaseStatus, PurchaseItem } from '../types';
import { useFabriqData } from '../../../../context/FabriqDataContext';

interface CreatePurchaseScreenProps {
  purchaseToEdit?: Purchase | null;
  onBack: () => void;
  onSave: (purchase: Purchase) => void;
}

interface EmployeeFabricItem {
  id: string;
  fabricName: string;
  width: string;
  meters: string;
  ratePerMeter: string;
}

export default function CreatePurchaseScreen({
  purchaseToEdit,
  onBack,
  onSave
}: CreatePurchaseScreenProps) {
  const { suppliers, warehouses, addSupplier, updateSupplier, purchases } = useFabriqData();

  // Filter out any suppliers marked as Blocked by Admin
  const activeSuppliers = useMemo(() => {
    return (suppliers || []).filter(s => s.status !== 'Blocked');
  }, [suppliers]);

  // Auto-generate Bill Number sequence: BILL-YYYY-XXXX
  const nextBillNumber = useMemo(() => {
    const year = new Date().getFullYear();
    let maxNum = 0;
    (purchases || []).forEach(p => {
      if (p.billNumber) {
        const match = p.billNumber.match(/BILL-(\d{4})-(\d+)/i) || p.billNumber.match(/BILL-(\d+)/i);
        if (match) {
          const num = parseInt(match[2] || match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    });
    return `BILL-${year}-${String(maxNum + 1).padStart(4, '0')}`;
  }, [purchases]);

  // Mode: 'saved' (pick from registered suppliers) vs 'new' (enter fresh supplier)
  const [vendorMode, setVendorMode] = useState<'saved' | 'new'>(() => {
    if (purchaseToEdit) return 'new';
    return activeSuppliers && activeSuppliers.length > 0 ? 'saved' : 'new';
  });

  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(() => {
    if (purchaseToEdit) return 'custom';
    return activeSuppliers && activeSuppliers.length > 0 ? activeSuppliers[0].id : 'custom';
  });

  // 1. SUPPLIER DETAILS
  const [supplierName, setSupplierName] = useState('');
  const [supplierMobile, setSupplierMobile] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');
  const [supplierGstin, setSupplierGstin] = useState('');

  // Bank Details (Optional)
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankIfscCode, setBankIfscCode] = useState('');

  // Whether employee wants to manually tweak/override the saved vendor fields
  const [allowManualOverride, setAllowManualOverride] = useState(false);

  // 2. PURCHASE DETAILS
  const [deliveryStatus, setDeliveryStatus] = useState<PurchaseStatus>(() => {
    return purchaseToEdit?.status || 'Received';
  });
  const [purchaseDate, setPurchaseDate] = useState(() => {
    return new Date().toISOString().substring(0, 10);
  });
  const [billNumber, setBillNumber] = useState(() => purchaseToEdit?.billNumber || '');
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState(() => purchaseToEdit?.invoiceNumber || '');
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Partial' | 'Pending'>('Paid');
  const [paymentMode, setPaymentMode] = useState<'Bank Transfer' | 'Cash' | 'UPI' | 'Credit'>('Bank Transfer');
  const [remarks, setRemarks] = useState('');

  // 3. FABRIC DETAILS & WAREHOUSE
  const [warehouseLocation, setWarehouseLocation] = useState(() => {
    return warehouses && warehouses.length > 0 ? warehouses[0].name : '';
  });

  // 4. MULTIPLE FABRIC ITEMS (multiple fabrics from same supplier at different prices)
  const [fabricItems, setFabricItems] = useState<EmployeeFabricItem[]>([
    { id: 'item-1', fabricName: '', width: '', meters: '', ratePerMeter: '' }
  ]);
  const [gstRate, setGstRate] = useState<number>(5); // 5% default, editable

  const handleAddFabricItem = () => {
    setFabricItems(prev => [
      ...prev,
      { id: `item-${Date.now()}-${prev.length}`, fabricName: '', width: '', meters: '', ratePerMeter: '' }
    ]);
  };

  const handleRemoveFabricItem = (id: string) => {
    if (fabricItems.length <= 1) return;
    setFabricItems(prev => prev.filter(it => it.id !== id));
  };

  const handleFabricItemChange = (id: string, field: keyof EmployeeFabricItem, value: string) => {
    setFabricItems(prev => prev.map(it => it.id === id ? { ...it, [field]: value } : it));
  };

  // Validation state
  const [validationError, setValidationError] = useState<string | null>(null);

  // Function to load a saved supplier into form states
  const applySavedSupplier = (sup: Supplier) => {
    setSupplierName(sup.name || '');
    setSupplierMobile(sup.phone || '');
    setSupplierAddress(sup.address && sup.address !== 'N/A' ? sup.address : '');
    setSupplierGstin(sup.gstin || '');
    setBankAccountNumber(sup.accountNumber || '');
    setBankName(sup.bankName || '');
    setBankIfscCode(sup.ifscCode || '');
  };

  // Populate initial vendor and warehouse on mount
  useEffect(() => {
    if (!purchaseToEdit && vendorMode === 'saved') {
      if (activeSuppliers && activeSuppliers.length > 0) {
        const matched = activeSuppliers.find(s => s.id === selectedSupplierId) || activeSuppliers[0];
        setSelectedSupplierId(matched.id);
        applySavedSupplier(matched);
      } else {
        setVendorMode('new');
        setSelectedSupplierId('new');
      }
    }
  }, [activeSuppliers, vendorMode]);

  useEffect(() => {
    if (!purchaseToEdit && warehouses && warehouses.length > 0 && !warehouseLocation) {
      setWarehouseLocation(warehouses[0].name);
    }
  }, [warehouses, purchaseToEdit]);

  // Populate form if editing an existing purchase
  useEffect(() => {
    if (purchaseToEdit) {
      setSupplierName(purchaseToEdit.supplier.name || '');
      setSupplierMobile(purchaseToEdit.supplier.phone || '');
      setSupplierAddress(purchaseToEdit.supplier.address || '');
      setSupplierGstin(purchaseToEdit.supplier.gstin || '');
      setBankAccountNumber(purchaseToEdit.supplier.accountNumber || '');
      setBankName(purchaseToEdit.supplier.bankName || '');
      setBankIfscCode(purchaseToEdit.supplier.ifscCode || '');

      setDeliveryStatus(purchaseToEdit.status || 'Received');
      setPurchaseDate(purchaseToEdit.purchaseDate);
      setBillNumber(purchaseToEdit.billNumber || '');
      setSupplierInvoiceNumber(purchaseToEdit.invoiceNumber || purchaseToEdit.billNumber || '');
      setPaymentStatus(purchaseToEdit.paymentStatus);
      setPaymentMode(purchaseToEdit.paymentMode || 'Bank Transfer');
      setRemarks(purchaseToEdit.remarks || '');

      setWarehouseLocation(purchaseToEdit.warehouse || purchaseToEdit.warehouseLocation || (warehouses[0]?.name || ''));

      if (purchaseToEdit.items && purchaseToEdit.items.length > 0) {
        setFabricItems(purchaseToEdit.items.map((it, idx) => ({
          id: it.id || `item-${idx}`,
          fabricName: it.fabricName || '',
          width: it.width || '',
          meters: it.meters !== undefined ? String(it.meters) : '',
          ratePerMeter: it.rate !== undefined ? String(it.rate) : ''
        })));
      } else {
        setFabricItems([
          {
            id: `item-${Date.now()}`,
            fabricName: purchaseToEdit.fabricName || '',
            width: purchaseToEdit.width || '',
            meters: purchaseToEdit.meters ? String(purchaseToEdit.meters) : '',
            ratePerMeter: purchaseToEdit.rate ? String(purchaseToEdit.rate) : ''
          }
        ]);
      }

      setGstRate(purchaseToEdit.gstRate !== undefined ? purchaseToEdit.gstRate : 5);

      setVendorMode('new');
      setSelectedSupplierId('custom');
      setAllowManualOverride(true);
    }
  }, [purchaseToEdit]);

  // Handle dropdown selection change
  const handleSupplierSelectChange = (supId: string) => {
    setSelectedSupplierId(supId);
    if (supId === 'new') {
      setVendorMode('new');
      setAllowManualOverride(true);
      setSupplierName('');
      setSupplierMobile('');
      setSupplierAddress('');
      setSupplierGstin('');
      setBankAccountNumber('');
      setBankName('');
      setBankIfscCode('');
    } else {
      setVendorMode('saved');
      setAllowManualOverride(false);
      const found = activeSuppliers.find(s => s.id === supId);
      if (found) {
        applySavedSupplier(found);
      }
    }
  };

  const selectedSupplierObj = useMemo(() => {
    if (vendorMode === 'saved') {
      return activeSuppliers.find(s => s.id === selectedSupplierId) || null;
    }
    return null;
  }, [activeSuppliers, selectedSupplierId, vendorMode]);

  // Calculations across multiple fabric items
  const totalMeters = useMemo(() => {
    return fabricItems.reduce((sum, it) => sum + (parseFloat(it.meters) || 0), 0);
  }, [fabricItems]);

  const totalCost = useMemo(() => {
    return fabricItems.reduce((sum, it) => {
      const m = parseFloat(it.meters) || 0;
      const r = parseFloat(it.ratePerMeter) || 0;
      return sum + (m * r);
    }, 0);
  }, [fabricItems]);

  const averageRate = useMemo(() => {
    return totalMeters > 0 ? totalCost / totalMeters : 0;
  }, [totalCost, totalMeters]);

  // GST Amount (Total Cost × GST Rate %)
  const gstAmount = useMemo(() => {
    return (totalCost * (gstRate || 0)) / 100;
  }, [totalCost, gstRate]);

  // Grand Total Amount
  const grandTotal = useMemo(() => {
    return totalCost + gstAmount;
  }, [totalCost, gstAmount]);

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Compulsory Field 1: Supplier Name
    if (!supplierName.trim()) {
      setValidationError('Supplier Name is required.');
      return;
    }

    // Compulsory Field 2: Supplier Invoice Number (Strictly manually entered)
    if (!supplierInvoiceNumber.trim()) {
      setValidationError('Please enter the Supplier Invoice Number.');
      return;
    }

    // Compulsory Field 4: Destination Warehouse Facility
    if (!warehouseLocation.trim()) {
      setValidationError('Please select a registered Warehouse Facility.');
      return;
    }

    // Validate multi-fabric items
    if (fabricItems.length === 0) {
      setValidationError('Please add at least one fabric item.');
      return;
    }

    for (let i = 0; i < fabricItems.length; i++) {
      const it = fabricItems[i];
      if (!it.fabricName.trim()) {
        setValidationError(`Fabric Name is required for item #${i + 1}.`);
        return;
      }
      const m = parseFloat(it.meters) || 0;
      if (m <= 0) {
        setValidationError(`Please enter valid Fabric Meters (> 0) for "${it.fabricName || `Item #${i + 1}`}".`);
        return;
      }
      const r = parseFloat(it.ratePerMeter) || 0;
      if (r <= 0) {
        setValidationError(`Please enter a valid Rate per Meter (> 0) for "${it.fabricName || `Item #${i + 1}`}".`);
        return;
      }
    }

    // Auto-persist / Update Vendor in Master Database
    const cleanName = supplierName.trim();

    // Safety check: Block purchase creation if supplier is Blocked by Administrator
    const isBlocked = (suppliers || []).find(
      s => s.status === 'Blocked' && (
        s.name.trim().toLowerCase() === cleanName.toLowerCase() ||
        (supplierMobile && s.phone && s.phone.trim() === supplierMobile.trim())
      )
    );
    if (isBlocked) {
      setValidationError(`Supplier "${isBlocked.name}" has been blocked by Administrator. Purchases cannot be created for blocked vendors.`);
      return;
    }

    const existingSupplier = suppliers.find(
      s => s.name.trim().toLowerCase() === cleanName.toLowerCase()
    );

    if (!existingSupplier) {
      // Auto-save new Vendor/Supplier into the database (reflects in Admin & Employee immediately)
      const newSupplierRecord: Supplier = {
        id: `sup-${Date.now()}`,
        code: `SUP-${String(Date.now()).slice(-4)}`,
        name: cleanName,
        contactPerson: cleanName,
        phone: supplierMobile.trim(),
        email: `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}@supplier.com`,
        address: supplierAddress.trim() || 'N/A',
        gstin: supplierGstin.trim() || undefined,
        accountNumber: bankAccountNumber.trim() || undefined,
        bankName: bankName.trim() || undefined,
        ifscCode: bankIfscCode.trim() || undefined,
        status: 'Active'
      };
      addSupplier(newSupplierRecord);
    } else {
      // Update existing supplier record if details like Bank/GST/Address/Mobile are provided
      const updatedSupplierRecord: Supplier = {
        ...existingSupplier,
        phone: supplierMobile.trim() || existingSupplier.phone,
        address: supplierAddress.trim() && supplierAddress.trim() !== 'N/A' ? supplierAddress.trim() : existingSupplier.address,
        gstin: supplierGstin.trim() || existingSupplier.gstin,
        accountNumber: bankAccountNumber.trim() || existingSupplier.accountNumber,
        bankName: bankName.trim() || existingSupplier.bankName,
        ifscCode: bankIfscCode.trim() || existingSupplier.ifscCode
      };
      updateSupplier(updatedSupplierRecord);
    }

    const activeBillNum = purchaseToEdit ? (billNumber || purchaseToEdit.billNumber || nextBillNumber) : nextBillNumber;
    const manualSupplierInv = supplierInvoiceNumber.trim();

    const compiledItems: PurchaseItem[] = fabricItems.map(it => {
      const m = parseFloat(it.meters) || 0;
      const r = parseFloat(it.ratePerMeter) || 0;
      return {
        id: it.id,
        fabricName: it.fabricName.trim(),
        width: it.width.trim() || '',
        meters: m,
        rate: r,
        amount: m * r,
        subtotal: m * r
      };
    });

    const joinedFabricName = compiledItems.map(it => it.fabricName).join(', ');

    const compiledPurchase: Purchase = {
      id: purchaseToEdit?.id || `pur-${Date.now()}`,
      billNumber: activeBillNum,
      invoiceNumber: manualSupplierInv,
      supplier: {
        name: cleanName,
        phone: supplierMobile.trim(),
        address: supplierAddress.trim() || 'N/A',
        gstin: supplierGstin.trim() || undefined,
        accountNumber: bankAccountNumber.trim() || undefined,
        bankName: bankName.trim() || undefined,
        ifscCode: bankIfscCode.trim() || undefined
      },
      purchaseDate,
      status: deliveryStatus,
      paymentStatus,
      paymentMode,
      remarks: remarks.trim() || undefined,

      // Fabric Details (summarized for 1 log view)
      fabricName: joinedFabricName,
      width: compiledItems[0]?.width || '',
      meters: totalMeters,
      rate: averageRate,
      subtotal: totalCost,
      gstRate: gstRate,
      gstAmount: gstAmount,
      totalAmount: grandTotal,

      // Pre-saved Warehouse Facility
      warehouse: warehouseLocation.trim(),
      warehouseLocation: warehouseLocation.trim(),

      items: compiledItems,
      createdAt: purchaseToEdit?.createdAt || new Date().toISOString()
    };

    onSave(compiledPurchase);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20 select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 border-b border-gray-200 dark:border-neutral-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-700 dark:text-neutral-200 flex items-center justify-center transition-colors cursor-pointer"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-hanken font-extrabold text-xl sm:text-2xl text-gray-900 dark:text-neutral-100 tracking-tight">
              {purchaseToEdit ? 'Edit Purchase Record' : 'Add Fabric Purchase'}
            </h1>
            <p className="text-xs text-gray-400 font-sans">
              Choose saved vendor or enter new &bull; Fabric details, Pricing &amp; GST calculation
            </p>
          </div>
        </div>

        <div className="text-right hidden sm:block">
          <span className="text-[10px] font-mono text-gray-400 uppercase font-bold block">Tax Rate</span>
          <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
            GST {gstRate}%
          </span>
        </div>
      </div>

      {/* Validation Error Banner */}
      {validationError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-mono rounded-xl flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{validationError}</span>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ================= SECTION 1: SUPPLIER DETAILS ================= */}
        <div className="bento-card p-5 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <h2 className="font-hanken font-bold text-sm text-gray-900 dark:text-neutral-100 uppercase tracking-wider">
                1. Supplier / Vendor Details
              </h2>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex bg-gray-100 dark:bg-neutral-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setVendorMode('saved');
                  if (activeSuppliers.length > 0) {
                    const first = activeSuppliers[0];
                    setSelectedSupplierId(first.id);
                    applySavedSupplier(first);
                    setAllowManualOverride(false);
                  }
                }}
                className={`px-3 py-1 text-xs font-mono font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${vendorMode === 'saved'
                  ? 'bg-white dark:bg-neutral-900 text-sky-700 dark:text-sky-400 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                <BookmarkCheck className="w-3.5 h-3.5" />
                <span>Choose Saved Vendor ({activeSuppliers.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setVendorMode('new');
                  setSelectedSupplierId('new');
                  setAllowManualOverride(true);
                  setSupplierName('');
                  setSupplierMobile('');
                  setSupplierAddress('');
                  setSupplierGstin('');
                  setBankAccountNumber('');
                  setBankName('');
                  setBankIfscCode('');
                }}
                className={`px-3 py-1 text-xs font-mono font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${vendorMode === 'new'
                  ? 'bg-white dark:bg-neutral-900 text-sky-700 dark:text-sky-400 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Add New Vendor</span>
              </button>
            </div>
          </div>

          {/* If Mode === 'saved': Show Quick Searchable Dropdown & Auto-Loaded Card */}
          {vendorMode === 'saved' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-gray-700 dark:text-zinc-300 block">
                  Select Registered Vendor (Auto-fills All Info)
                </label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => handleSupplierSelectChange(e.target.value)}
                  className="w-full px-3.5 py-3 bg-gray-50 dark:bg-neutral-950 border-2 border-sky-500/40 dark:border-sky-500/30 rounded-xl text-xs font-mono text-gray-900 dark:text-neutral-100 focus:border-sky-500 outline-none cursor-pointer font-bold"
                >
                  {activeSuppliers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} — Phone: {s.phone} {s.gstin ? `(GST: ${s.gstin})` : ''}
                    </option>
                  ))}
                  <option value="new">+ Register New Vendor</option>
                </select>
              </div>

              {/* Verified Auto-Filled Vendor Preview Card */}
              {selectedSupplierObj && (
                <div className="p-4 bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/50 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="font-hanken font-bold text-sm text-gray-900 dark:text-white">
                        {selectedSupplierObj.name}
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                        SAVED VENDOR
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs font-mono text-gray-600 dark:text-zinc-300">
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase">Mobile No:</span>
                      <span className="font-bold text-gray-900 dark:text-zinc-100">{supplierMobile || 'N/A'}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase">GSTIN:</span>
                      <span className="font-bold text-gray-900 dark:text-zinc-100">{supplierGstin || 'Not provided'}</span>
                    </div>

                    <div className="sm:col-span-2">
                      <span className="text-[10px] text-gray-400 block uppercase">Bank Account:</span>
                      <span className="font-bold text-gray-900 dark:text-zinc-100">
                        {bankName ? `${bankName} • ` : ''}{bankAccountNumber ? `A/C ${bankAccountNumber}` : 'No bank on file'}{bankIfscCode ? ` (${bankIfscCode})` : ''}
                      </span>
                    </div>
                  </div>

                  {supplierAddress && supplierAddress !== 'N/A' && (
                    <div className="text-[11px] font-mono text-gray-500 dark:text-zinc-400 pt-1 border-t border-sky-200/60 dark:border-sky-900/40">
                      <strong>Address:</strong> {supplierAddress}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Form Inputs for Vendor (Shown ONLY for New Mode) */}
          {vendorMode === 'new' && (
            <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-neutral-800">
              <div className="flex items-center justify-between text-xs font-mono text-gray-500">
                <span className="font-bold text-gray-700 dark:text-zinc-300">
                  New Vendor Registration
                </span>
                <span className="text-[10px] text-emerald-600 font-bold">
                  * Name &amp; Mobile are compulsory
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Supplier Name - COMPULSORY */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-gray-700 dark:text-zinc-300 flex items-center gap-1">
                    <span>Supplier / Vendor Name</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="e.g. Arvind Mills Ltd or Royal Textiles"
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl text-xs font-mono text-gray-900 dark:text-neutral-100 focus:border-sky-500 outline-none"
                  />
                </div>

                {/* Supplier Mobile No - COMPULSORY */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-gray-700 dark:text-zinc-300 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-sky-500" />
                    <span>Mobile Number</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={supplierMobile}
                    onChange={(e) => setSupplierMobile(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl text-xs font-mono text-gray-900 dark:text-neutral-100 focus:border-sky-500 outline-none"
                  />
                </div>

                {/* Supplier Address - Optional */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-gray-700 dark:text-zinc-300 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span>Address</span>
                    <span className="text-[10px] text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={supplierAddress}
                    onChange={(e) => setSupplierAddress(e.target.value)}
                    placeholder="Plot 42, GIDC Industrial Estate, Surat"
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl text-xs font-mono text-gray-900 dark:text-neutral-100 focus:border-sky-500 outline-none"
                  />
                </div>

                {/* GST Number - Optional */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-gray-700 dark:text-zinc-300 flex items-center gap-1">
                    <span>GST No (GSTIN)</span>
                    <span className="text-[10px] text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={supplierGstin}
                    onChange={(e) => setSupplierGstin(e.target.value.toUpperCase())}
                    placeholder="24AAAAA0000A1Z5"
                    maxLength={15}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl text-xs font-mono text-gray-900 dark:text-neutral-100 focus:border-sky-500 outline-none uppercase"
                  />
                </div>
              </div>

              {/* Bank Details (Optional) */}
              <div className="pt-2 border-t border-gray-100 dark:border-neutral-800/80">
                <span className="text-[11px] font-mono font-bold text-gray-500 dark:text-zinc-400 flex items-center gap-1.5 mb-2.5">
                  <Landmark className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Bank Account Details (Optional)</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-gray-500 dark:text-zinc-400">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="HDFC Bank / SBI"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-lg text-xs font-mono text-gray-900 dark:text-neutral-100 focus:border-sky-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-gray-500 dark:text-zinc-400">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value)}
                      placeholder="987654321000"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-lg text-xs font-mono text-gray-900 dark:text-neutral-100 focus:border-sky-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-gray-500 dark:text-zinc-400">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      value={bankIfscCode}
                      onChange={(e) => setBankIfscCode(e.target.value.toUpperCase())}
                      placeholder="HDFC0001234"
                      maxLength={11}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-lg text-xs font-mono text-gray-900 dark:text-neutral-100 focus:border-sky-500 outline-none uppercase"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================= SECTION 2: PURCHASE & INVOICE DETAILS ================= */}
        <div className="bento-card p-5 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-neutral-800 pb-3">
            <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-hanken font-bold text-sm text-gray-900 dark:text-neutral-100 uppercase tracking-wider">
              2. Purchase &amp; Invoice Information
            </h2>
          </div>

          {/* Delivery & Receiving Status Selector (Forward-only state: once Received, it is locked) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-bold text-gray-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Delivery / Receiving Status</span>
                <span className="text-rose-500">*</span>
              </label>

              {purchaseToEdit?.status === 'Received' && (
                <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-600" />
                  <span>LOCKED (RECEIVED)</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Received */}
              <button
                type="button"
                onClick={() => setDeliveryStatus('Received')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${deliveryStatus === 'Received'
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-2 border-emerald-500 text-emerald-950 dark:text-emerald-100 shadow-sm'
                  : 'bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  }`}
              >
                <div className={`p-2.5 rounded-xl shrink-0 ${deliveryStatus === 'Received' ? 'bg-emerald-600 text-white' : 'bg-gray-200 dark:bg-neutral-800 text-gray-500'}`}>
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="font-mono text-xs font-bold flex items-center justify-between">
                    <span>Received at Warehouse</span>
                    {deliveryStatus === 'Received' && (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        {purchaseToEdit?.status === 'Received' && <Lock className="w-3 h-3" />}
                        <CheckCircle2 className="w-4 h-4" />
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-gray-500 dark:text-gray-400 mt-0.5">
                    {purchaseToEdit?.status === 'Received' ? 'Fabric received & stocked into warehouse inventory (Settled)' : 'Fabric arrived, unloaded & added to raw stock'}
                  </div>
                </div>
              </button>

              {/* Option 2: In Transit */}
              <button
                type="button"
                disabled={purchaseToEdit?.status === 'Received'}
                onClick={() => {
                  if (purchaseToEdit?.status === 'Received') return;
                  setDeliveryStatus('In Transit');
                }}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-center gap-3 ${purchaseToEdit?.status === 'Received'
                  ? 'opacity-40 cursor-not-allowed bg-gray-100 dark:bg-neutral-900 border-gray-200 dark:border-neutral-800 text-gray-400'
                  : deliveryStatus === 'In Transit'
                    ? 'bg-amber-50/80 dark:bg-amber-950/40 border-2 border-amber-500 text-amber-950 dark:text-amber-100 shadow-sm cursor-pointer'
                    : 'bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 cursor-pointer'
                  }`}
              >
                <div className={`p-2.5 rounded-xl shrink-0 ${deliveryStatus === 'In Transit' ? 'bg-amber-600 text-white' : 'bg-gray-200 dark:bg-neutral-800 text-gray-500'}`}>
                  <Truck className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="font-mono text-xs font-bold flex items-center justify-between">
                    <span>In Transit (On the Way)</span>
                    {deliveryStatus === 'In Transit' && <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
                  </div>
                  <div className="text-[11px] font-mono text-gray-500 dark:text-gray-400 mt-0.5">
                    {purchaseToEdit?.status === 'Received' ? 'Cannot regress: shipment already received' : 'Dispatched from mill; editable upon arrival'}
                  </div>
                </div>
              </button>
            </div>

            {purchaseToEdit?.status === 'Received' && (
              <div className="p-2.5 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-[11px] font-mono text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Delivery status is <strong>Received &amp; Stocked (Locked)</strong>. Once fabric is confirmed received at the warehouse, it cannot be reverted to In Transit.</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100 dark:border-neutral-800">
            {/* Bill Number (Internal) - Auto-generated */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold text-gray-700 dark:text-zinc-300">
                  Bill Number (Internal)
                </label>
                <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                  AUTO-GENERATED
                </span>
              </div>
              <input
                type="text"
                disabled
                readOnly
                value={purchaseToEdit ? (billNumber || purchaseToEdit.billNumber || nextBillNumber) : nextBillNumber}
                className="w-full px-3.5 py-2.5 bg-gray-100 dark:bg-neutral-800/60 border border-gray-200 dark:border-neutral-700 rounded-xl text-xs font-mono text-gray-500 dark:text-neutral-400 font-bold cursor-not-allowed"
              />
            </div>

            {/* Supplier Invoice Number - Manual & Compulsory */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-gray-700 dark:text-zinc-300 flex items-center gap-1">
                <span>Supplier Invoice Number</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={supplierInvoiceNumber}
                onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                placeholder="e.g. INV-98234 or 10452"
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl text-xs font-mono text-gray-900 dark:text-neutral-100 focus:border-sky-500 outline-none font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Purchase Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-gray-700 dark:text-zinc-300">
                Purchase Date
              </label>
              <input
                type="date"
                required
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl text-xs font-mono text-gray-900 dark:text-neutral-100 focus:border-sky-500 outline-none cursor-pointer"
              />
            </div>

            {/* Payment Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-gray-700 dark:text-zinc-300">
                Payment Status
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl text-xs font-mono text-gray-900 dark:text-neutral-100 focus:border-sky-500 outline-none cursor-pointer"
              >
                <option value="Paid">Paid (Settled)</option>
                <option value="Partial">Partial</option>
                <option value="Pending">Pending (Unpaid)</option>
              </select>
            </div>

            {/* Payment Mode */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-gray-700 dark:text-zinc-300">
                Payment Mode
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl text-xs font-mono text-gray-900 dark:text-neutral-100 focus:border-sky-500 outline-none cursor-pointer"
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="UPI">UPI</option>
                <option value="Credit">Credit</option>
                <option value="Cash">Cash</option>
              </select>
            </div>

            {/* Remarks */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-mono font-bold text-gray-700 dark:text-zinc-300">
                Remarks / Notes (Optional)
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Dispatched via truck MH-12-AB-1234"
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl text-xs font-mono text-gray-900 dark:text-neutral-100 focus:border-sky-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* ================= SECTION 3: FABRIC SPECIFICATIONS & WAREHOUSE ================= */}
        <div className="bento-card p-5 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <h2 className="font-hanken font-bold text-sm text-gray-900 dark:text-neutral-100 uppercase tracking-wider">
                3. Fabric Inward Specifications ({fabricItems.length} {fabricItems.length === 1 ? 'Fabric' : 'Fabrics'})
              </h2>
            </div>
            <button
              type="button"
              onClick={handleAddFabricItem}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Another Fabric</span>
            </button>
          </div>

          {/* Warehouse Facility Dropdown (Pre-saved Warehouses Only) */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold text-gray-700 dark:text-zinc-300 flex items-center gap-1">
              <WarehouseIcon className="w-3.5 h-3.5 text-sky-500" />
              <span>Destination Warehouse Facility</span>
              <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={warehouseLocation}
              onChange={(e) => setWarehouseLocation(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl text-xs font-mono text-gray-900 dark:text-neutral-100 focus:border-sky-500 outline-none cursor-pointer font-bold"
            >
              {warehouses && warehouses.length > 0 ? (
                warehouses.map(w => (
                  <option key={w.id} value={w.name}>
                    {w.name} {w.location ? `(${w.location})` : ''}
                  </option>
                ))
              ) : (
                <option value="" disabled>No registered warehouses (Add in Admin)</option>
              )}
            </select>
          </div>

          {/* Multiple Fabric Items */}
          <div className="space-y-4 pt-1">
            {fabricItems.map((item, index) => {
              const itemMeters = parseFloat(item.meters) || 0;
              const itemRate = parseFloat(item.ratePerMeter) || 0;
              const itemTotal = itemMeters * itemRate;

              return (
                <div
                  key={item.id}
                  className="p-4 bg-gray-50 dark:bg-neutral-950/70 border border-gray-200 dark:border-neutral-800 rounded-xl space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-gray-200/60 dark:border-neutral-800 pb-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                      <span>Fabric #{index + 1}</span>
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        Item Subtotal: ₹{itemTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </span>
                      {fabricItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFabricItem(item.id)}
                          className="text-xs font-mono text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-1 rounded-lg transition-colors cursor-pointer"
                          title="Remove fabric"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Fabric Name */}
                    <div className="space-y-1.5 lg:col-span-2">
                      <label className="text-xs font-mono font-bold text-gray-700 dark:text-zinc-300 flex items-center gap-1">
                        <span>Fabric Name</span>
                        <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={item.fabricName}
                        onChange={(e) => handleFabricItemChange(item.id, 'fabricName', e.target.value)}
                        placeholder="e.g. 100% Cotton Denim / Twill"
                        className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl text-xs font-mono text-gray-900 dark:text-neutral-100 focus:border-sky-500 outline-none"
                      />
                    </div>

                    {/* Fabric Width */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono font-bold text-gray-700 dark:text-zinc-300">
                        Width (Inches)
                      </label>
                      <input
                        type="text"
                        value={item.width}
                        onChange={(e) => handleFabricItemChange(item.id, 'width', e.target.value)}
                        placeholder='e.g. 58", 60"'
                        className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl text-xs font-mono text-gray-900 dark:text-neutral-100 focus:border-sky-500 outline-none"
                      />
                    </div>

                    {/* Fabric Meters */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono font-bold text-gray-700 dark:text-zinc-300 flex items-center gap-1">
                        <span>Meters</span>
                        <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0.1"
                        required
                        value={item.meters}
                        onChange={(e) => handleFabricItemChange(item.id, 'meters', e.target.value)}
                        placeholder="1000"
                        className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl text-xs font-mono font-bold text-gray-900 dark:text-neutral-100 focus:border-sky-500 outline-none"
                      />
                    </div>

                    {/* Rate per Meter */}
                    <div className="space-y-1.5 lg:col-start-4">
                      <label className="text-xs font-mono font-bold text-gray-700 dark:text-zinc-300 flex items-center gap-1">
                        <span>Rate / Meter (₹)</span>
                        <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0.1"
                        required
                        value={item.ratePerMeter}
                        onChange={(e) => handleFabricItemChange(item.id, 'ratePerMeter', e.target.value)}
                        placeholder="145"
                        className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 focus:border-sky-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ================= SECTION 4: PRICING & GST VALUATION ================= */}
        <div className="bento-card p-5 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="font-hanken font-bold text-sm text-gray-900 dark:text-neutral-100 uppercase tracking-wider">
                4. Pricing &amp; GST Calculation
              </h2>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
              Grand Total: ₹{grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-gray-700 dark:text-zinc-300">
                Total Meters
              </label>
              <div className="px-3.5 py-2.5 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl text-xs font-mono font-bold text-gray-900 dark:text-neutral-100">
                {totalMeters.toLocaleString()} m
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-gray-700 dark:text-zinc-300">
                Subtotal (Pre-GST)
              </label>
              <div className="px-3.5 py-2.5 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl text-xs font-mono font-bold text-gray-900 dark:text-neutral-100">
                ₹{totalCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-mono font-bold text-gray-700 dark:text-zinc-300">
                  GST Rate (% Tax)
                </label>
                <div className="flex gap-1">
                  {[0, 5, 12, 18].map((rateOption) => (
                    <button
                      key={rateOption}
                      type="button"
                      onClick={() => setGstRate(rateOption)}
                      className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded cursor-pointer transition-colors ${gstRate === rateOption
                        ? 'bg-amber-500 text-white'
                        : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-200'
                        }`}
                    >
                      {rateOption}%
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={gstRate}
                  onChange={(e) => setGstRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl text-xs font-mono text-gray-900 dark:text-neutral-100 focus:border-sky-500 outline-none pr-8 font-bold"
                />
                <Percent className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                Grand Total Amount
              </label>
              <div className="px-3.5 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300">
                ₹{grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Pricing Calculation Breakdown Card */}
          <div className="p-4 bg-gray-50 dark:bg-neutral-950/70 border border-gray-200/80 dark:border-neutral-800 rounded-xl space-y-2.5 font-mono text-xs">
            <div className="flex justify-between items-center text-gray-600 dark:text-zinc-300">
              <span>Fabric Subtotal ({totalMeters.toLocaleString()} m total across {fabricItems.length} {fabricItems.length === 1 ? 'item' : 'items'})</span>
              <span className="font-bold text-gray-900 dark:text-white">
                ₹{totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-between items-center text-amber-600 dark:text-amber-400">
              <span>GST Amount ({gstRate}% Tax)</span>
              <span className="font-bold">
                + ₹{gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="pt-2.5 border-t border-gray-200 dark:border-neutral-800 flex justify-between items-center text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
              <span>Grand Total Billed</span>
              <span className="text-base">
                ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-3 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-700 dark:text-neutral-200 font-mono font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-emerald-600/30 flex items-center gap-2 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{purchaseToEdit ? 'Save Changes' : 'Record Fabric Purchase'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
