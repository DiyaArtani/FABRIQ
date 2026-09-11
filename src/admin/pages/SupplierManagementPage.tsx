import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Truck, Plus, Edit, Trash2, Phone, MapPin, Building2, Landmark, CheckCircle2, FileSpreadsheet, Search } from 'lucide-react';
import { useFabriqData } from '../../context/FabriqDataContext';
import { Supplier } from '../../types';
import { Badge, Modal, ConfirmDeleteModal } from '../components/AdminUIComponents';

// Helper to generate next sequential Supplier ID
const generateNextSupplierId = (list: Supplier[]) => {
  let maxNum = 0;
  list.forEach(s => {
    const val = s.code || s.supplierId || s.id || '';
    const match = val.match(/(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  });
  return `SUP-${String(maxNum + 1).padStart(3, '0')}`;
};

export const SupplierManagementPage: React.FC = () => {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier } = useFabriqData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Supplier | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Supplier | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form Fields - strictly using supplierId instead of code
  const [supplierId, setSupplierId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [status, setStatus] = useState<'Active' | 'Blocked'>('Active');

  const openCreateModal = () => {
    setEditingItem(null);
    setSupplierId(generateNextSupplierId(suppliers));
    setName('');
    setPhone('');
    setAddress('');
    setGstin('');
    setAccountNumber('');
    setBankName('');
    setIfscCode('');
    setStatus('Active');
    setIsModalOpen(true);
  };

  const openEditModal = (item: Supplier) => {
    setEditingItem(item);
    setSupplierId(item.code || item.supplierId || item.id || '');
    setName(item.name);
    setPhone(item.phone);
    setAddress(item.address && item.address !== 'N/A' ? item.address : '');
    setGstin(item.gstin || '');
    setAccountNumber(item.accountNumber || '');
    setBankName(item.bankName || '');
    setIfscCode(item.ifscCode || '');
    setStatus(item.status);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = supplierId.trim();
    if (editingItem) {
      updateSupplier({
        ...editingItem,
        id: editingItem.id,
        code: cleanCode || editingItem.code || editingItem.id,
        supplierId: cleanCode || editingItem.supplierId || editingItem.id,
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim() || 'N/A',
        gstin: gstin.trim() || undefined,
        accountNumber: accountNumber.trim() || undefined,
        bankName: bankName.trim() || undefined,
        ifscCode: ifscCode.trim() || undefined,
        status
      });
    } else {
      addSupplier({
        ...(cleanCode ? { code: cleanCode, supplierId: cleanCode } : {}),
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim() || 'N/A',
        gstin: gstin.trim() || undefined,
        accountNumber: accountNumber.trim() || undefined,
        bankName: bankName.trim() || undefined,
        ifscCode: ifscCode.trim() || undefined,
        status
      });
    }
    setIsModalOpen(false);
  };

  const filteredSuppliers = useMemo(() => {
    if (!searchTerm.trim()) return suppliers;
    const term = searchTerm.toLowerCase();
    return suppliers.filter(s => {
      const sCode = (s.code || s.supplierId || s.id || '').toLowerCase();
      const sName = (s.name || '').toLowerCase();
      const sPhone = (s.phone || '').toLowerCase();
      const sGstin = (s.gstin || '').toLowerCase();
      const sAddr = (s.address || '').toLowerCase();
      const sBank = (s.bankName || '').toLowerCase();
      return (
        sCode.includes(term) ||
        sName.includes(term) ||
        sPhone.includes(term) ||
        sGstin.includes(term) ||
        sAddr.includes(term) ||
        sBank.includes(term)
      );
    });
  }, [suppliers, searchTerm]);

  // Export Suppliers Directory as genuine Excel (.xlsx)
  const handleExportExcel = () => {
    const listToExport = filteredSuppliers.length > 0 ? filteredSuppliers : suppliers;

    const headers = [
      'Supplier ID',
      'Supplier Name',
      'Mobile Number',
      'GST No (GSTIN)',
      'Address',
      'Bank Name',
      'Account Number',
      'IFSC Code',
      'Status'
    ];

    const dataRows = listToExport.map(s => [
      s.code || s.supplierId || s.id, // Fetch code from database and display as Supplier ID
      s.name || 'N/A',
      s.phone || 'N/A',
      s.gstin || 'N/A',
      s.address && s.address !== 'N/A' ? s.address : 'N/A',
      s.bankName || 'N/A',
      s.accountNumber || 'N/A',
      s.ifscCode || 'N/A',
      s.status || 'Active'
    ]);

    const summaryRow = [
      'TOTAL',
      `Total: ${listToExport.length} Suppliers`,
      '',
      '',
      '',
      '',
      '',
      '',
      ''
    ];

    const wsData = [
      ['FABRIQ APPAREL MANUFACTURING - SUPPLIER MASTER DIRECTORY'],
      [`Exported: ${new Date().toLocaleString('en-IN')}`, '', '', '', '', '', '', '', `Total Entries: ${listToExport.length}`],
      [],
      headers,
      ...dataRows,
      summaryRow
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Presentable column widths
    ws['!cols'] = [
      { wch: 18 }, // Supplier ID
      { wch: 32 }, // Supplier Name
      { wch: 18 }, // Mobile Number
      { wch: 20 }, // GST No (GSTIN)
      { wch: 38 }, // Address
      { wch: 22 }, // Bank Name
      { wch: 22 }, // Account Number
      { wch: 16 }, // IFSC Code
      { wch: 14 }  // Status
    ];

    // Merged headers
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Suppliers');

    // Generate real Excel binary .xlsx
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Fabriq_Suppliers_${new Date().toISOString().slice(0, 10)}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 mb-1">
            <Truck className="w-4 h-4" />
            <span>RAW MATERIALS &amp; MILL SUPPLIERS</span>
          </div>
          <h1 className="font-hanken font-bold text-xl text-zinc-900 dark:text-zinc-100 tracking-tight">
            Supplier Master Directory
          </h1>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleExportExcel}
            className={`px-3.5 py-2 border font-mono font-bold text-xs flex items-center gap-2 shadow-2xs transition-all cursor-pointer ${downloadSuccess
                ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200'
              }`}
            title="Download suppliers directory as Excel spreadsheet"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{downloadSuccess ? 'EXCEL DOWNLOADED!' : 'DOWNLOAD EXCEL'}</span>
          </button>

          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ONBOARD SUPPLIER</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 shadow-2xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search supplier name, ID, phone, GSTIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs overflow-x-auto">
        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead>
            <tr className="bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
              <th className="p-3 font-bold">Supplier ID</th>
              <th className="p-3 font-bold">Supplier Name &amp; Address</th>
              <th className="p-3 font-bold">Mobile Number</th>
              <th className="p-3 font-bold">GST No</th>
              <th className="p-3 font-bold">Bank Details</th>
              <th className="p-3 font-bold">Status</th>
              <th className="p-3 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {filteredSuppliers.length > 0 ? (
              filteredSuppliers.map((sup, idx) => (
                <tr key={`${sup.id}-${idx}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                    {sup.code || sup.id}
                  </td>
                  <td className="p-3">
                    <div className="font-bold text-zinc-900 dark:text-zinc-100 font-hanken text-sm">
                      {sup.name}
                    </div>
                    <div className="text-[10px] text-zinc-500 truncate max-w-xs">{sup.address && sup.address !== 'N/A' ? sup.address : 'Address not specified'}</div>
                  </td>
                  <td className="p-3 text-zinc-700 dark:text-zinc-300 font-bold">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>{sup.phone}</span>
                    </div>
                  </td>
                  <td className="p-3 text-zinc-600 dark:text-zinc-400 text-[11px] font-mono uppercase">
                    {sup.gstin || 'N/A'}
                  </td>
                  <td className="p-3 text-[11px] text-zinc-600 dark:text-zinc-400">
                    {sup.bankName || sup.accountNumber ? (
                      <div>
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">{sup.bankName || 'Bank'}</span>
                        {sup.accountNumber && <span className="text-[10px] text-zinc-500 block">A/C: {sup.accountNumber}</span>}
                        {sup.ifscCode && <span className="text-[10px] text-zinc-500 block">IFSC: {sup.ifscCode}</span>}
                      </div>
                    ) : (
                      <span className="text-zinc-400 italic">No bank details</span>
                    )}
                  </td>
                  <td className="p-3">
                    <Badge status={sup.status} />
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditModal(sup)}
                        className="p-1.5 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded cursor-pointer"
                        title="Edit"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteCandidate(sup)}
                        className="p-1.5 border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 hover:bg-rose-100 rounded cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="p-8 text-center text-zinc-500 font-mono">
                  {searchTerm ? `No suppliers match "${searchTerm}".` : 'No suppliers found. Click "Onboard Supplier" to register your fabric and raw material vendors.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Form */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? `Edit Supplier (ID: ${editingItem.code || editingItem.id})` : 'Onboard New Supplier'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Supplier ID */}
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500 flex items-center gap-1">
                <span>Supplier ID</span>
                <span className="text-[10px] text-zinc-400 font-normal">(Auto-generated, editable)</span>
              </label>
              <input
                type="text"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value.toUpperCase())}
                placeholder="e.g. SUP-001"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500 uppercase font-bold"
              />
            </div>

            {/* Status */}
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Supplier Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              >
                <option value="Active">Active</option>
                <option value="Blocked">Blocked</option>
              </select>
            </div>

            {/* Supplier Name - COMPULSORY */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500 flex items-center gap-1">
                <span>Supplier Name</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Arvind Mills Ltd or Royal Textiles"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              />
            </div>

            {/* Supplier Mobile No - COMPULSORY */}
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500 flex items-center gap-1">
                <span>Mobile Number</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              />
            </div>

            {/* GST Number - Optional */}
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500 flex items-center gap-1">
                <span>GST No (GSTIN)</span>
                <span className="text-[10px] text-zinc-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="24AAAAA0000A1Z5"
                maxLength={15}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500 uppercase"
              />
            </div>

            {/* Supplier Address - Optional */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500 flex items-center gap-1">
                <span>Address</span>
                <span className="text-[10px] text-zinc-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Plot 42, GIDC Industrial Estate, Surat, Gujarat"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              />
            </div>

            {/* Bank Details Section Header */}
            <div className="sm:col-span-2 pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-1.5 text-xs font-mono text-zinc-500 font-bold">
              <Landmark className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Bank Details for Remittance (Optional)</span>
            </div>

            {/* Bank Name - Optional */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Bank Name</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="HDFC Bank / State Bank of India"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              />
            </div>

            {/* Bank Account Number - Optional */}
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Account Number</label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="987654321000"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              />
            </div>

            {/* IFSC Code - Optional */}
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">IFSC Code</label>
              <input
                type="text"
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                placeholder="HDFC0001234"
                maxLength={11}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500 uppercase"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 text-xs font-mono font-bold uppercase hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold uppercase flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{editingItem ? 'Save Changes' : 'Onboard Supplier'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteCandidate}
        onClose={() => setDeleteCandidate(null)}
        onConfirm={() => {
          if (deleteCandidate) {
            deleteSupplier(deleteCandidate.id);
            setDeleteCandidate(null);
          }
        }}
        itemName={deleteCandidate ? `${deleteCandidate.name} (ID: ${deleteCandidate.code || deleteCandidate.id})` : ''}
      />
    </div>
  );
};
