import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { ShoppingBag, Plus, Search, Edit, Trash2, CheckCircle2, Building2, Landmark, PackageCheck, FileSpreadsheet, Download } from 'lucide-react';
import { useFabriqData } from '../../context/FabriqDataContext';
import { Purchase, Supplier, PurchaseItem } from '../../types';
import { Badge, Modal, ConfirmDeleteModal } from '../components/AdminUIComponents';

interface FormFabricItem {
  id: string;
  fabricName: string;
  width: string;
  meters: number | '';
  rate: number | '';
}

export const PurchaseManagementPage: React.FC = () => {
  const { purchases, suppliers, addSupplier, updateSupplier, addPurchase, updatePurchase, deletePurchase, warehouses } = useFabriqData();

  // Active non-blocked suppliers for purchase procurement
  const activeSuppliers = useMemo(() => {
    return (suppliers || []).filter(s => s.status !== 'Blocked');
  }, [suppliers]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Purchase | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Purchase | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Form Fields - strictly aligned with Add Purchase fields
  // 1. Supplier Details
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');
  const [supplierGstin, setSupplierGstin] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankIfscCode, setBankIfscCode] = useState('');

  // 2. Purchase Details
  const [billNumber, setBillNumber] = useState('');
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [status, setStatus] = useState<Purchase['status']>('Received');
  const [paymentStatus, setPaymentStatus] = useState<Purchase['paymentStatus']>('Paid');
  const [paymentMode, setPaymentMode] = useState<Purchase['paymentMode']>('Bank Transfer');
  const [remarks, setRemarks] = useState('');

  // 3. Storage Warehouse Facility
  const [warehouse, setWarehouse] = useState('');

  // 4. Fabric Items List (multiple fabrics at different prices from same supplier)
  const [fabricItems, setFabricItems] = useState<FormFabricItem[]>([
    { id: 'item-1', fabricName: '', width: '58"', meters: '', rate: '' }
  ]);
  const [gstRate, setGstRate] = useState<number>(5);

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

  const handleAddFabricItem = () => {
    setFabricItems(prev => [
      ...prev,
      { id: `item-${Date.now()}-${prev.length}`, fabricName: '', width: '58"', meters: '', rate: '' }
    ]);
  };

  const handleRemoveFabricItem = (id: string) => {
    if (fabricItems.length <= 1) return;
    setFabricItems(prev => prev.filter(it => it.id !== id));
  };

  const handleFabricItemChange = (id: string, field: keyof FormFabricItem, value: any) => {
    setFabricItems(prev => prev.map(it => it.id === id ? { ...it, [field]: value } : it));
  };

  const applySupplierFields = (sup: Supplier) => {
    setSupplierName(sup.name || '');
    setSupplierPhone(sup.phone || '');
    setSupplierAddress(sup.address && sup.address !== 'N/A' ? sup.address : '');
    setSupplierGstin(sup.gstin || '');
    setBankAccountNumber(sup.accountNumber || '');
    setBankName(sup.bankName || '');
    setBankIfscCode(sup.ifscCode || '');
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setBillNumber('');
    setSupplierInvoiceNumber('');
    setPurchaseDate(new Date().toISOString().substring(0, 10));
    setStatus('Received');
    setPaymentStatus('Paid');
    setPaymentMode('Bank Transfer');
    setRemarks('');

    if (activeSuppliers.length > 0) {
      setSelectedSupplierId(activeSuppliers[0].id);
      applySupplierFields(activeSuppliers[0]);
    } else {
      setSelectedSupplierId('custom');
      setSupplierName('');
      setSupplierPhone('');
      setSupplierAddress('');
      setSupplierGstin('');
      setBankAccountNumber('');
      setBankName('');
      setBankIfscCode('');
    }

    setWarehouse(warehouses[0]?.name || '');
    setFabricItems([
      { id: `item-${Date.now()}`, fabricName: '', width: '58"', meters: '', rate: '' }
    ]);
    setGstRate(5);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Purchase) => {
    setEditingItem(p);
    setBillNumber(p.billNumber || '');
    setSupplierInvoiceNumber(p.invoiceNumber || p.billNumber || '');
    setPurchaseDate(p.purchaseDate || new Date().toISOString().substring(0, 10));
    setStatus(p.status || 'Received');
    setPaymentStatus(p.paymentStatus || 'Paid');
    setPaymentMode(p.paymentMode || 'Bank Transfer');
    setRemarks(p.remarks || '');

    // Match supplier or populate custom
    const matchedSup = suppliers.find(s => s.name.trim().toLowerCase() === (p.supplier?.name || '').trim().toLowerCase());
    if (matchedSup) {
      setSelectedSupplierId(matchedSup.id);
      setSupplierName(p.supplier?.name || matchedSup.name);
      setSupplierPhone(p.supplier?.phone || matchedSup.phone);
      setSupplierAddress(p.supplier?.address || matchedSup.address || '');
      setSupplierGstin(p.supplier?.gstin || matchedSup.gstin || '');
      setBankAccountNumber(p.supplier?.accountNumber || matchedSup.accountNumber || '');
      setBankName(p.supplier?.bankName || matchedSup.bankName || '');
      setBankIfscCode(p.supplier?.ifscCode || matchedSup.ifscCode || '');
    } else {
      setSelectedSupplierId('custom');
      setSupplierName(p.supplier?.name || '');
      setSupplierPhone(p.supplier?.phone || '');
      setSupplierAddress(p.supplier?.address || '');
      setSupplierGstin(p.supplier?.gstin || '');
      setBankAccountNumber(p.supplier?.accountNumber || '');
      setBankName(p.supplier?.bankName || '');
      setBankIfscCode(p.supplier?.ifscCode || '');
    }

    setWarehouse(p.warehouse || p.warehouseLocation || (warehouses[0]?.name || ''));
    if (p.items && p.items.length > 0) {
      setFabricItems(p.items.map((it, idx) => ({
        id: it.id || `item-${idx}`,
        fabricName: it.fabricName || '',
        width: it.width || '58"',
        meters: it.meters !== undefined ? it.meters : '',
        rate: it.rate !== undefined ? it.rate : ''
      })));
    } else {
      setFabricItems([
        {
          id: `item-${Date.now()}`,
          fabricName: p.fabricName || '',
          width: p.width || '58"',
          meters: p.meters !== undefined ? p.meters : '',
          rate: p.rate !== undefined ? p.rate : ''
        }
      ]);
    }
    setGstRate(p.gstRate !== undefined ? p.gstRate : 5);
    setIsModalOpen(true);
  };

  const handleSupplierSelectChange = (supId: string) => {
    setSelectedSupplierId(supId);
    if (supId === 'custom') {
      setSupplierName('');
      setSupplierPhone('');
      setSupplierAddress('');
      setSupplierGstin('');
      setBankAccountNumber('');
      setBankName('');
      setBankIfscCode('');
    } else {
      const found = activeSuppliers.find(s => s.id === supId);
      if (found) {
        applySupplierFields(found);
      }
    }
  };

  // Calculations across multiple fabric items
  const totalMeters = useMemo(() => {
    return fabricItems.reduce((sum, it) => {
      const m = typeof it.meters === 'number' ? it.meters : (parseFloat(it.meters) || 0);
      return sum + m;
    }, 0);
  }, [fabricItems]);

  const subtotal = useMemo(() => {
    return fabricItems.reduce((sum, it) => {
      const m = typeof it.meters === 'number' ? it.meters : (parseFloat(it.meters) || 0);
      const r = typeof it.rate === 'number' ? it.rate : (parseFloat(it.rate) || 0);
      return sum + (m * r);
    }, 0);
  }, [fabricItems]);

  const averageRate = totalMeters > 0 ? subtotal / totalMeters : 0;
  const gstAmount = (subtotal * (Number(gstRate) || 0)) / 100;
  const totalAmount = subtotal + gstAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierName.trim()) {
      alert('Supplier Name is required.');
      return;
    }
    if (!supplierPhone.trim()) {
      alert('Supplier Mobile Number is required.');
      return;
    }
    if (!supplierInvoiceNumber.trim()) {
      alert('Supplier Invoice Number is required.');
      return;
    }
    if (!warehouse.trim()) {
      alert('Please select a storage godown / warehouse.');
      return;
    }
    if (fabricItems.length === 0) {
      alert('Please add at least one fabric.');
      return;
    }

    for (let i = 0; i < fabricItems.length; i++) {
      const it = fabricItems[i];
      if (!it.fabricName.trim()) {
        alert(`Fabric Name is required for item #${i + 1}.`);
        return;
      }
      const m = typeof it.meters === 'number' ? it.meters : (parseFloat(it.meters) || 0);
      if (m <= 0) {
        alert(`Please enter valid fabric meters (> 0) for "${it.fabricName || `Item #${i + 1}`}".`);
        return;
      }
      const r = typeof it.rate === 'number' ? it.rate : (parseFloat(it.rate) || 0);
      if (r <= 0) {
        alert(`Please enter a valid rate per meter (> 0) for "${it.fabricName || `Item #${i + 1}`}".`);
        return;
      }
    }

    // Safety check: Block purchase creation if supplier is Blocked by Administrator
    const cleanSupName = supplierName.trim();
    const isBlocked = (suppliers || []).find(
      s => s.status === 'Blocked' && (
        s.name.trim().toLowerCase() === cleanSupName.toLowerCase() ||
        (supplierPhone && s.phone && s.phone.trim() === supplierPhone.trim())
      )
    );
    if (isBlocked && (!editingItem || isBlocked.name.toLowerCase() !== editingItem.supplier.name.toLowerCase())) {
      alert(`Supplier "${isBlocked.name}" is currently Blocked. Unblock in Supplier Master or choose an active supplier.`);
      return;
    }

    // Auto-sync supplier in Master Directory
    const existingSupplier = suppliers.find(
      s => s.name.trim().toLowerCase() === cleanSupName.toLowerCase()
    );
    if (!existingSupplier) {
      addSupplier({
        code: `SUP-${String(Date.now()).slice(-4)}`,
        name: cleanSupName,
        phone: supplierPhone.trim(),
        address: supplierAddress.trim() || 'N/A',
        gstin: supplierGstin.trim() || undefined,
        accountNumber: bankAccountNumber.trim() || undefined,
        bankName: bankName.trim() || undefined,
        ifscCode: bankIfscCode.trim() || undefined,
        status: 'Active'
      });
    } else {
      updateSupplier({
        ...existingSupplier,
        phone: supplierPhone.trim() || existingSupplier.phone,
        address: supplierAddress.trim() && supplierAddress.trim() !== 'N/A' ? supplierAddress.trim() : existingSupplier.address,
        gstin: supplierGstin.trim() || existingSupplier.gstin,
        accountNumber: bankAccountNumber.trim() || existingSupplier.accountNumber,
        bankName: bankName.trim() || existingSupplier.bankName,
        ifscCode: bankIfscCode.trim() || existingSupplier.ifscCode
      });
    }

    const activeBill = editingItem ? (billNumber || editingItem.billNumber || nextBillNumber) : nextBillNumber;
    const manualSupplierInv = supplierInvoiceNumber.trim();

    const compiledItems: PurchaseItem[] = fabricItems.map(it => {
      const m = typeof it.meters === 'number' ? it.meters : (parseFloat(it.meters) || 0);
      const r = typeof it.rate === 'number' ? it.rate : (parseFloat(it.rate) || 0);
      return {
        id: it.id,
        fabricName: it.fabricName.trim(),
        width: it.width.trim() || '58"',
        meters: m,
        rate: r,
        amount: m * r,
        subtotal: m * r
      };
    });

    const joinedFabricName = compiledItems.map(it => it.fabricName).join(', ');

    // Database payload strictly containing ONLY the Add Purchase fields
    const purchasePayload: Purchase = {
      id: editingItem ? editingItem.id : `pur-${Date.now()}`,
      billNumber: activeBill,
      invoiceNumber: manualSupplierInv,
      supplier: {
        name: cleanSupName,
        phone: supplierPhone.trim(),
        address: supplierAddress.trim() || 'N/A',
        gstin: supplierGstin.trim() || undefined,
        accountNumber: bankAccountNumber.trim() || undefined,
        bankName: bankName.trim() || undefined,
        ifscCode: bankIfscCode.trim() || undefined
      },
      purchaseDate,
      status,
      paymentStatus,
      paymentMode,
      remarks: remarks.trim() || undefined,
      fabricName: joinedFabricName,
      width: compiledItems[0]?.width || '58"',
      meters: totalMeters,
      rate: averageRate,
      subtotal,
      gstRate: Number(gstRate) || 0,
      gstAmount,
      totalAmount,
      warehouse: warehouse.trim(),
      warehouseLocation: warehouse.trim(),
      items: compiledItems,
      createdAt: editingItem ? editingItem.createdAt : new Date().toISOString()
    };

    if (editingItem) {
      updatePurchase(purchasePayload);
    } else {
      addPurchase(purchasePayload);
    }
    setIsModalOpen(false);
  };

  // Compile ONLY warehouses saved in the database
  const warehouseOptions = useMemo(() => {
    return (warehouses || [])
      .map(w => w?.name?.trim())
      .filter((name): name is string => Boolean(name))
      .filter((name, idx, arr) => arr.indexOf(name) === idx)
      .sort((a, b) => a.localeCompare(b));
  }, [warehouses]);

  const filteredPurchases = useMemo(() => {
    return purchases
      .filter((p) => {
        const bill = p.billNumber || '';
        const inv = p.invoiceNumber || '';
        const supp = p.supplier?.name || '';
        const fab = p.fabricName || '';

        const matchesSearch =
          bill.toLowerCase().includes(searchTerm.toLowerCase()) ||
          inv.toLowerCase().includes(searchTerm.toLowerCase()) ||
          supp.toLowerCase().includes(searchTerm.toLowerCase()) ||
          fab.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;

        const pWarehouse = (p.warehouse || p.warehouseLocation || '').trim().toLowerCase();
        const matchesWarehouse =
          warehouseFilter === 'ALL' ||
          pWarehouse === warehouseFilter.trim().toLowerCase();

        return matchesSearch && matchesStatus && matchesWarehouse;
      })
      .sort((a, b) => {
        // Sort newest purchases first
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (timeA && timeB && timeB !== timeA) {
          return timeB - timeA;
        }

        const dateA = a.purchaseDate ? new Date(a.purchaseDate).getTime() : 0;
        const dateB = b.purchaseDate ? new Date(b.purchaseDate).getTime() : 0;
        if (dateA && dateB && dateB !== dateA) {
          return dateB - dateA;
        }

        const idTimeA = parseInt(a.id.replace(/\D/g, ''), 10) || 0;
        const idTimeB = parseInt(b.id.replace(/\D/g, ''), 10) || 0;
        if (idTimeA && idTimeB && idTimeB !== idTimeA) {
          return idTimeB - idTimeA;
        }

        return (b.id || '').localeCompare(a.id || '');
      });
  }, [purchases, searchTerm, statusFilter, warehouseFilter]);

  // Export Presentable Purchase Ledger as genuine Excel (.xlsx)
  const handleExportExcel = () => {
    const listToExport = filteredPurchases.length > 0 ? filteredPurchases : purchases;

    // The exact 8 required columns in user-specified order
    const headers = [
      'Bill Number',
      'Supplier Invoice Ref',
      'Purchase Date',
      'Supplier Name',
      'Grand Total (INR)',
      'Delivery Status',
      'Payment Status',
      'Warehouse Facility'
    ];

    const dataRows = listToExport.map(p => [
      p.billNumber || 'N/A',
      p.invoiceNumber || 'N/A',
      p.purchaseDate || '',
      p.supplier?.name || 'N/A',
      Number(p.totalAmount) || 0,
      p.status || 'Received',
      p.paymentStatus || 'Paid',
      p.warehouse || p.warehouseLocation || 'Main Godown'
    ]);

    const totalGrandVal = listToExport.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);

    const summaryRow = [
      'TOTAL',
      '',
      '',
      `Total POs: ${listToExport.length}`,
      totalGrandVal,
      '',
      '',
      ''
    ];

    const wsData = [
      ['FABRIQ APPAREL MANUFACTURING - PURCHASE PROCUREMENT LEDGER'],
      [`Exported: ${new Date().toLocaleString('en-IN')}`, '', '', '', '', '', '', `Total Entries: ${listToExport.length}`],
      [],
      headers,
      ...dataRows,
      summaryRow
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Presentable column widths so all headers and values are neatly readable
    ws['!cols'] = [
      { wch: 22 }, // Bill Number
      { wch: 24 }, // Supplier Invoice Ref
      { wch: 16 }, // Purchase Date
      { wch: 32 }, // Supplier Name
      { wch: 20 }, // Grand Total (INR)
      { wch: 18 }, // Delivery Status
      { wch: 18 }, // Payment Status
      { wch: 26 }  // Warehouse Facility
    ];

    // Merge title and metadata across columns
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Purchase Ledger');

    // Generate real Excel binary .xlsx
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Fabriq_Purchase_Ledger_${new Date().toISOString().slice(0, 10)}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 mb-1">
            <ShoppingBag className="w-4 h-4" />
            <span>PURCHASE PROCUREMENT LEDGER</span>
          </div>
          <h1 className="font-hanken font-bold text-xl text-zinc-900 dark:text-zinc-100 tracking-tight">
            Purchase Ledger Management
          </h1>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleExportExcel}
            className={`px-3.5 py-2 border font-mono font-bold text-xs flex items-center gap-2 shadow-2xs transition-all cursor-pointer ${
              downloadSuccess
                ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200'
            }`}
            title="Download full purchase ledger as Excel spreadsheet"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{downloadSuccess ? 'EXCEL DOWNLOADED!' : 'DOWNLOAD EXCEL'}</span>
          </button>

          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>NEW PURCHASE ENTRY</span>
          </button>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search invoice #, supplier, fabric..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-500 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Warehouse:
            </span>
            <select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              className={`px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border ${warehouseFilter !== 'ALL'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200'
                } text-xs font-mono outline-none focus:border-emerald-500 cursor-pointer`}
            >
              <option value="ALL">All Warehouses {warehouseOptions.length > 0 ? `(${warehouseOptions.length})` : ''}</option>
              {warehouseOptions.length === 0 ? (
                <option value="" disabled>No saved warehouses in DB</option>
              ) : (
                warehouseOptions.map((wh) => (
                  <option key={wh} value={wh}>{wh}</option>
                ))
              )}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Received">Received</option>
              <option value="Ordered">Ordered</option>
              <option value="In Transit">In Transit</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs overflow-x-auto">
        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead>
            <tr className="bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
              <th className="p-3 font-bold">Invoice no.</th>
              <th className="p-3 font-bold">Supplier</th>
              <th className="p-3 font-bold">Fabric</th>
              <th className="p-3 font-bold">Meters</th>
              <th className="p-3 font-bold">Pricing</th>
              <th className="p-3 font-bold">Delivery Status</th>
              <th className="p-3 font-bold">Payment</th>
              <th className="p-3 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {filteredPurchases.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-zinc-500 font-mono">
                  No purchases found matching your filter criteria.
                </td>
              </tr>
            ) : (
              filteredPurchases.map((p, idx) => (
                <tr key={`${p.id}-${idx}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="p-3 text-zinc-900 dark:text-zinc-100">
                    <div className="font-bold font-mono text-sm">{p.billNumber || p.invoiceNumber}</div>
                    {p.invoiceNumber && p.invoiceNumber !== p.billNumber && (
                      <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                        Inv: {p.invoiceNumber}
                      </div>
                    )}
                    <div className="text-[10px] text-zinc-400 font-normal mt-0.5">{p.purchaseDate}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-bold text-zinc-900 dark:text-zinc-100 font-hanken text-sm">
                      {p.supplier?.name}
                    </div>
                    <div className="text-[10px] text-zinc-500">{p.supplier?.phone || 'No phone'}</div>
                  </td>
                  <td className="p-3 text-zinc-700 dark:text-zinc-300">
                    <div className="font-bold flex items-center gap-1.5 flex-wrap">
                      <span>{p.fabricName}</span>
                      {p.items && p.items.length > 1 && (
                        <span className="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] rounded font-bold border border-emerald-200 dark:border-emerald-800/40">
                          {p.items.length} fabrics
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-500">{p.width || '58"'} | {p.warehouse || p.warehouseLocation}</div>
                  </td>
                  <td className="p-3 text-zinc-800 dark:text-zinc-200">
                    <div className="font-bold">{(p.meters || 0).toLocaleString()} m</div>
                    <div className="text-[10px] text-zinc-500">
                      {p.items && p.items.length > 1 ? `₹${p.rate.toFixed(1)} avg/m` : `₹${p.rate} /m`}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      ₹{p.totalAmount.toLocaleString('en-IN')}
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge status={p.status} />
                  </td>
                  <td className="p-3">
                    <Badge status={p.paymentStatus} />
                    <div className="text-[10px] text-zinc-400 mt-0.5">{p.paymentMode}</div>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditModal(p)}
                        className="p-1.5 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded cursor-pointer"
                        title="Edit Purchase"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteCandidate(p)}
                        className="p-1.5 border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 hover:bg-rose-100 rounded cursor-pointer"
                        title="Delete Purchase"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Form — STRICTLY ALIGNED WITH ADD PURCHASE FIELDS */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? `Edit Purchase Bill (${editingItem.invoiceNumber || editingItem.billNumber})` : 'New Purchase Entry'}
        subtitle="Manage and edit raw fabric purchase records matching the Add Purchase schema."
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION 1: SUPPLIER DETAILS */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3">
            <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
              <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                1. Supplier / Vendor Details
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-mono font-bold uppercase text-zinc-500">
                  Select Registered Vendor (Auto-fills Info)
                </label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => handleSupplierSelectChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
                >
                  <option value="custom">-- Custom / Manual Vendor --</option>
                  {activeSuppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — Phone: {s.phone} {s.gstin ? `(GST: ${s.gstin})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono font-bold uppercase text-zinc-500 flex items-center gap-1">
                  <span>Supplier Name</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="e.g. Arvind Mills Ltd"
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono font-bold uppercase text-zinc-500 flex items-center gap-1">
                  <span>Mobile Number</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={supplierPhone}
                  onChange={(e) => setSupplierPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-mono font-bold uppercase text-zinc-500">
                  Address (Optional)
                </label>
                <input
                  type="text"
                  value={supplierAddress}
                  onChange={(e) => setSupplierAddress(e.target.value)}
                  placeholder="Plot 42, GIDC Industrial Complex, Surat"
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono font-bold uppercase text-zinc-500">
                  GST No (GSTIN)
                </label>
                <input
                  type="text"
                  value={supplierGstin}
                  onChange={(e) => setSupplierGstin(e.target.value.toUpperCase())}
                  placeholder="24AAAAA0000A1Z5"
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500 uppercase"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono font-bold uppercase text-zinc-500">
                  Bank Name (Optional)
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="HDFC Bank"
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono font-bold uppercase text-zinc-500">
                  Account Number (Optional)
                </label>
                <input
                  type="text"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  placeholder="50200012345678"
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono font-bold uppercase text-zinc-500">
                  IFSC Code (Optional)
                </label>
                <input
                  type="text"
                  value={bankIfscCode}
                  onChange={(e) => setBankIfscCode(e.target.value.toUpperCase())}
                  placeholder="HDFC0001234"
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500 uppercase"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: PURCHASE & INVOICE DETAILS */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3">
            <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
              <ShoppingBag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                2. Purchase &amp; Invoice Details
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold uppercase text-zinc-500">
                    Bill Number (Internal)
                  </label>
                  <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                    AUTO-GENERATED
                  </span>
                </div>
                <input
                  type="text"
                  disabled
                  readOnly
                  value={editingItem ? (billNumber || editingItem.billNumber || nextBillNumber) : nextBillNumber}
                  className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs font-mono text-zinc-500 dark:text-zinc-400 font-bold cursor-not-allowed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono font-bold uppercase text-zinc-500 flex items-center gap-1">
                  <span>Supplier Invoice Number</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={supplierInvoiceNumber}
                  onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                  placeholder="e.g. INV-2026-001 or 98234"
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500 font-bold text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono font-bold uppercase text-zinc-500">
                  Purchase Date
                </label>
                <input
                  type="date"
                  required
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono font-bold uppercase text-zinc-500">
                  Delivery Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
                >
                  <option value="Received">Received</option>
                  <option value="Ordered">Ordered</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono font-bold uppercase text-zinc-500">
                  Payment Status
                </label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
                >
                  <option value="Paid">Paid</option>
                  <option value="Partial">Partial</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono font-bold uppercase text-zinc-500">
                  Payment Mode
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="Credit">Credit</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono font-bold uppercase text-zinc-500">
                  Remarks / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Standard mill delivery"
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: FABRICS PROCUREMENT (MULTIPLE FABRICS AT DIFFERENT PRICES) */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                  3. Fabrics Inward ({fabricItems.length} {fabricItems.length === 1 ? 'Fabric' : 'Fabrics'})
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddFabricItem}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5 rounded cursor-pointer transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Fabric</span>
              </button>
            </div>

            {/* Storage Warehouse Facility selection */}
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Storage Godown / Warehouse Facility</span>
                <span className="text-rose-500">*</span>
              </label>
              <select
                value={warehouse}
                onChange={(e) => setWarehouse(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              >
                {warehouses.map((wh, idx) => (
                  <option key={`${wh.id}-${idx}`} value={wh.name}>
                    {wh.name} {wh.location ? `(${wh.location})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Itemized Fabric Rows */}
            <div className="space-y-3">
              {fabricItems.map((item, index) => {
                const itemMeters = typeof item.meters === 'number' ? item.meters : (parseFloat(item.meters) || 0);
                const itemRate = typeof item.rate === 'number' ? item.rate : (parseFloat(item.rate) || 0);
                const itemSubtotal = itemMeters * itemRate;

                return (
                  <div
                    key={item.id}
                    className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        Fabric #{index + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-zinc-500">
                          Total: ₹{itemSubtotal.toLocaleString('en-IN')}
                        </span>
                        {fabricItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveFabricItem(item.id)}
                            className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 rounded cursor-pointer transition-colors"
                            title="Remove fabric item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[11px] font-mono font-bold uppercase text-zinc-500 flex items-center gap-1">
                          <span>Fabric Name</span>
                          <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={item.fabricName}
                          onChange={(e) => handleFabricItemChange(item.id, 'fabricName', e.target.value)}
                          placeholder="e.g. Rigid Denim 14oz / Twill"
                          className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-mono font-bold uppercase text-zinc-500">
                          Width
                        </label>
                        <input
                          type="text"
                          value={item.width}
                          onChange={(e) => handleFabricItemChange(item.id, 'width', e.target.value)}
                          placeholder='58"'
                          className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-mono font-bold uppercase text-zinc-500 flex items-center gap-1">
                          <span>Meters</span>
                          <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          required
                          min="0.1"
                          step="any"
                          value={item.meters}
                          onChange={(e) => handleFabricItemChange(item.id, 'meters', e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="1000"
                          className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono font-bold outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="space-y-1 sm:col-start-3">
                        <label className="text-[11px] font-mono font-bold uppercase text-zinc-500 flex items-center gap-1">
                          <span>Rate / Meter (₹)</span>
                          <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          required
                          min="0.1"
                          step="any"
                          value={item.rate}
                          onChange={(e) => handleFabricItemChange(item.id, 'rate', e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="120"
                          className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono font-bold outline-none focus:border-emerald-500 text-emerald-600 dark:text-emerald-400"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-mono font-bold uppercase text-zinc-500">
                          Subtotal (₹)
                        </label>
                        <div className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300">
                          ₹{itemSubtotal.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 4: INVOICE PRICING & GST VALUATION */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3">
            <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
              <Landmark className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                4. Invoice Valuation Summary
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-mono font-bold uppercase text-zinc-500">
                  Total Meters
                </label>
                <input
                  type="text"
                  readOnly
                  value={`${totalMeters.toLocaleString()} m`}
                  className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono font-bold uppercase text-zinc-500">
                  Subtotal (Pre-GST)
                </label>
                <input
                  type="text"
                  readOnly
                  value={`₹${subtotal.toLocaleString('en-IN')}`}
                  className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono font-bold uppercase text-zinc-500">
                  GST Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="28"
                  value={gstRate}
                  onChange={(e) => setGstRate(Number(e.target.value) || 0)}
                  placeholder="5"
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono font-bold outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400">
                  Grand Total Amount (₹)
                </label>
                <input
                  type="text"
                  readOnly
                  value={`₹${totalAmount.toLocaleString('en-IN')}`}
                  className="w-full px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-mono font-bold border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{editingItem ? 'APPLY OVERRIDE' : 'CREATE PURCHASE ENTRY'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      {deleteCandidate && (
        <ConfirmDeleteModal
          isOpen={!!deleteCandidate}
          onClose={() => setDeleteCandidate(null)}
          onConfirm={() => deletePurchase(deleteCandidate.id)}
          itemName={`Invoice ${deleteCandidate.invoiceNumber || deleteCandidate.billNumber} (${deleteCandidate.supplier?.name})`}
          itemType="Purchase Bill"
        />
      )}
    </div>
  );
};
