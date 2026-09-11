import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Warehouse as WarehouseIcon, Plus, Edit, Trash2, Phone, MapPin, Building, Layers, Box, CheckCircle2, FileSpreadsheet, Search } from 'lucide-react';
import { useFabriqData } from '../../context/FabriqDataContext';
import { Warehouse } from '../../types';
import { Badge, Modal, ConfirmDeleteModal } from '../components/AdminUIComponents';

// Helper to generate next sequential Warehouse ID
const generateNextWarehouseId = (list: Warehouse[]) => {
  let maxNum = 0;
  list.forEach(w => {
    const val = w.code || w.id || '';
    const match = val.match(/(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  });
  return `WH-${String(maxNum + 1).padStart(3, '0')}`;
};

export const WarehouseManagementPage: React.FC = () => {
  const { warehouses, addWarehouse, updateWarehouse, deleteWarehouse, rawInventory, finishedInventory } = useFabriqData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Warehouse | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Warehouse | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Form Fields
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [rawMaterialCapacityMeters, setRawMaterialCapacityMeters] = useState<number | ''>('');
  const [finishedGoodsCapacityUnits, setFinishedGoodsCapacityUnits] = useState<number | ''>('');
  const [managerName, setManagerName] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'Active' | 'Maintenance' | 'Full'>('Active');

  const openCreateModal = () => {
    setEditingItem(null);
    setCode(generateNextWarehouseId(warehouses));
    setName('');
    setLocation('');
    setAddress('');
    setRawMaterialCapacityMeters('');
    setFinishedGoodsCapacityUnits('');
    setManagerName('');
    setPhone('');
    setStatus('Active');
    setIsModalOpen(true);
  };

  const openEditModal = (item: Warehouse) => {
    setEditingItem(item);
    setCode(item.code || item.id);
    setName(item.name);
    setLocation(item.location);
    setAddress(item.address);
    setRawMaterialCapacityMeters(item.rawMaterialCapacityMeters !== undefined ? item.rawMaterialCapacityMeters : (item.capacityUnits !== undefined ? item.capacityUnits : ''));
    setFinishedGoodsCapacityUnits(item.finishedGoodsCapacityUnits !== undefined ? item.finishedGoodsCapacityUnits : '');
    setManagerName(item.managerName);
    setPhone(item.phone);
    setStatus(item.status);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rawCap = Number(rawMaterialCapacityMeters) || 0;
    const finCap = Number(finishedGoodsCapacityUnits) || 0;

    if (editingItem) {
      updateWarehouse({
        ...editingItem,
        code,
        name: name.trim(),
        location: location.trim(),
        address: address.trim(),
        rawMaterialCapacityMeters: rawCap,
        finishedGoodsCapacityUnits: finCap,
        capacityUnits: rawCap,
        managerName: managerName.trim(),
        phone: phone.trim(),
        status
      });
    } else {
      addWarehouse({
        code,
        name: name.trim(),
        location: location.trim(),
        address: address.trim(),
        rawMaterialCapacityMeters: rawCap,
        finishedGoodsCapacityUnits: finCap,
        capacityUnits: rawCap,
        managerName: managerName.trim(),
        phone: phone.trim(),
        status
      });
    }
    setIsModalOpen(false);
  };

  // Warehouse inventory utilization metrics strictly from user-entered capacities
  const getWarehouseMetrics = (wh: Warehouse) => {
    const whRawMeters = rawInventory
      .filter(r => (r.warehouse || '').trim().toLowerCase() === wh.name.trim().toLowerCase() || (r.warehouse || '').trim().toLowerCase() === wh.code.trim().toLowerCase())
      .reduce((sum, r) => sum + (Number(r.availableMeters) || 0), 0);

    const whFinUnits = finishedInventory
      .filter(f => (f.warehouse || '').trim().toLowerCase() === wh.name.trim().toLowerCase() || (f.warehouse || '').trim().toLowerCase() === wh.code.trim().toLowerCase())
      .reduce((sum, f) => sum + (Number(f.availableQuantity) || 0), 0);

    const rawCap = Number(wh.rawMaterialCapacityMeters ?? wh.capacityUnits) || 0;
    const finCap = Number(wh.finishedGoodsCapacityUnits) || 0;

    const rawPercent = rawCap > 0 ? Math.min(100, Math.round((whRawMeters / rawCap) * 100)) : 0;
    const finPercent = finCap > 0 ? Math.min(100, Math.round((whFinUnits / finCap) * 100)) : 0;

    return { whRawMeters, whFinUnits, rawCap, finCap, rawPercent, finPercent };
  };

  // Filtered warehouses
  const filteredWarehouses = useMemo(() => {
    return warehouses.filter(wh => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        wh.name.toLowerCase().includes(q) ||
        wh.code.toLowerCase().includes(q) ||
        wh.location.toLowerCase().includes(q) ||
        wh.managerName.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'All' || wh.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [warehouses, searchQuery, statusFilter]);

  // Overall Totals
  const totalRawCap = warehouses.reduce((acc, w) => acc + (Number(w.rawMaterialCapacityMeters ?? w.capacityUnits) || 0), 0);
  const totalFinCap = warehouses.reduce((acc, w) => acc + (Number(w.finishedGoodsCapacityUnits) || 0), 0);
  const totalRawStored = rawInventory.reduce((acc, r) => acc + (Number(r.availableMeters) || 0), 0);
  const totalFinStored = finishedInventory.reduce((acc, f) => acc + (Number(f.availableQuantity) || 0), 0);
  const activeCount = warehouses.filter(w => w.status === 'Active').length;

  // Export Warehouse Directory as genuine Excel (.xlsx)
  const handleExportExcel = () => {
    const listToExport = filteredWarehouses.length > 0 ? filteredWarehouses : warehouses;

    const headers = [
      'Warehouse ID',
      'Facility Name',
      'City / Location',
      'Physical Address',
      'Raw Material Capacity (Meters)',
      'Raw Material Current Stock (Meters)',
      'Raw Material Utilization (%)',
      'Finished Goods Capacity (Pieces)',
      'Finished Goods Current Stock (Pieces)',
      'Finished Goods Utilization (%)',
      'Supervisor / Manager',
      'Contact Phone',
      'Facility Status'
    ];

    const dataRows = listToExport.map(wh => {
      const { whRawMeters, whFinUnits, rawCap, finCap, rawPercent, finPercent } = getWarehouseMetrics(wh);
      return [
        wh.code,
        wh.name,
        wh.location,
        wh.address || 'N/A',
        rawCap,
        whRawMeters,
        `${rawPercent}%`,
        finCap,
        whFinUnits,
        `${finPercent}%`,
        wh.managerName || 'Unassigned',
        wh.phone || 'N/A',
        wh.status || 'Active'
      ];
    });

    const sumRawCap = listToExport.reduce((acc, w) => acc + (Number(w.rawMaterialCapacityMeters ?? w.capacityUnits) || 0), 0);
    const sumRawStored = listToExport.reduce((acc, w) => acc + getWarehouseMetrics(w).whRawMeters, 0);
    const sumFinCap = listToExport.reduce((acc, w) => acc + (Number(w.finishedGoodsCapacityUnits) || 0), 0);
    const sumFinStored = listToExport.reduce((acc, w) => acc + getWarehouseMetrics(w).whFinUnits, 0);

    const summaryRow = [
      'TOTAL SUMMARY',
      `Total Facilities: ${listToExport.length}`,
      '',
      '',
      sumRawCap,
      sumRawStored,
      sumRawCap > 0 ? `${Math.round((sumRawStored / sumRawCap) * 100)}%` : '0%',
      sumFinCap,
      sumFinStored,
      sumFinCap > 0 ? `${Math.round((sumFinStored / sumFinCap) * 100)}%` : '0%',
      '',
      '',
      ''
    ];

    const wsData = [
      ['FABRIQ APPAREL MANUFACTURING - WAREHOUSE & GODOWN MASTER DIRECTORY'],
      [`Exported: ${new Date().toLocaleString('en-IN')}`, '', '', '', '', '', '', '', '', '', '', '', `Total Facilities: ${listToExport.length}`],
      [],
      headers,
      ...dataRows,
      summaryRow
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Presentable column widths
    ws['!cols'] = [
      { wch: 16 }, // Facility Code
      { wch: 30 }, // Facility Name
      { wch: 22 }, // City / Location
      { wch: 38 }, // Physical Address
      { wch: 28 }, // Raw Material Capacity (Meters)
      { wch: 28 }, // Raw Material Current Stock (Meters)
      { wch: 24 }, // Raw Material Utilization (%)
      { wch: 28 }, // Finished Goods Capacity (Pieces)
      { wch: 28 }, // Finished Goods Current Stock (Pieces)
      { wch: 24 }, // Finished Goods Utilization (%)
      { wch: 24 }, // Supervisor / Manager
      { wch: 18 }, // Contact Phone
      { wch: 16 }  // Facility Status
    ];

    // Merged headers
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Warehouse Directory');

    // Generate real Excel binary .xlsx
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Fabriq_Warehouses_${new Date().toISOString().slice(0, 10)}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 mb-1">
            <WarehouseIcon className="w-4 h-4" />
            <span>GODOWNS &amp; STORAGE FACILITIES</span>
          </div>
          <h1 className="font-hanken font-bold text-xl text-zinc-900 dark:text-zinc-100 tracking-tight">
            Warehouse Master Facilities
          </h1>

        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleExportExcel}
            className={`px-3.5 py-2.5 border font-mono font-bold text-xs flex items-center gap-2 shadow-2xs transition-all cursor-pointer ${downloadSuccess
              ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
              : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200'
              }`}
            title="Download warehouse directory as Excel spreadsheet"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{downloadSuccess ? 'EXCEL DOWNLOADED!' : 'DOWNLOAD EXCEL'}</span>
          </button>

          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ADD WAREHOUSE FACILITY</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar with Dual Capacities */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <span className="text-[10px] text-zinc-500 uppercase block">Total Facilities</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{warehouses.length}</span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400">({activeCount} Active)</span>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between text-[10px] text-zinc-500 uppercase mb-1">
            <span className="flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400">
              <Layers className="w-3 h-3" /> Raw Material Storage
            </span>
            <span>{totalRawCap > 0 ? Math.round((totalRawStored / totalRawCap) * 100) : 0}%</span>
          </div>
          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {totalRawStored.toLocaleString()} m <span className="text-xs text-zinc-400 font-normal">/ {totalRawCap.toLocaleString()} m</span>
          </div>
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all"
              style={{ width: `${totalRawCap > 0 ? Math.min(100, Math.round((totalRawStored / totalRawCap) * 100)) : 0}%` }}
            />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between text-[10px] text-zinc-500 uppercase mb-1">
            <span className="flex items-center gap-1 font-bold text-sky-700 dark:text-sky-400">
              <Box className="w-3 h-3" /> Finished Goods Storage
            </span>
            <span>{totalFinCap > 0 ? Math.round((totalFinStored / totalFinCap) * 100) : 0}%</span>
          </div>
          <div className="text-lg font-bold text-sky-600 dark:text-sky-400">
            {totalFinStored.toLocaleString()} pcs <span className="text-xs text-zinc-400 font-normal">/ {totalFinCap.toLocaleString()} pcs</span>
          </div>
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-sky-500 h-full rounded-full transition-all"
              style={{ width: `${totalFinCap > 0 ? Math.min(100, Math.round((totalFinStored / totalFinCap) * 100)) : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-zinc-900 p-3 border border-zinc-200 dark:border-zinc-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search facility name, code, city, manager..."
            className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-mono text-zinc-500 uppercase">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="All">All Facilities ({warehouses.length})</option>
            <option value="Active">Active</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Full">Full</option>
          </select>
        </div>
      </div>

      {/* Warehouses Table with Two Capacities */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs overflow-x-auto">
        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead>
            <tr className="bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
              <th className="p-3 font-bold w-40 min-w-[140px]">Warehouse ID</th>
              <th className="p-3 font-bold">Facility Name &amp; Address</th>
              <th className="p-3 font-bold whitespace-nowrap">City / Location</th>
              <th className="p-3 font-bold whitespace-nowrap">Raw Material Capacity</th>
              <th className="p-3 font-bold whitespace-nowrap">Finished Goods Capacity</th>
              <th className="p-3 font-bold">Supervisor / Manager</th>
              <th className="p-3 font-bold">Status</th>
              <th className="p-3 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {filteredWarehouses.length > 0 ? (
              filteredWarehouses.map((wh, idx) => {
                const { whRawMeters, whFinUnits, rawCap, finCap, rawPercent, finPercent } = getWarehouseMetrics(wh);

                return (
                  <tr key={`${wh.id}-${idx}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100 font-mono w-40 min-w-[140px] whitespace-nowrap">
                      {wh.code || wh.id}
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100 font-hanken text-sm">
                        {wh.name}
                      </div>
                      <div className="text-[11px] text-zinc-500 truncate max-w-xs">{wh.address || 'Address not specified'}</div>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="px-2.5 py-1 text-[11px] font-mono font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-sm inline-block">
                        {wh.location}
                      </span>
                    </td>

                    {/* Raw Material Capacity */}
                    <td className="p-3 whitespace-nowrap">
                      {rawCap > 0 ? (
                        <div className="space-y-1 font-mono">
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                              {rawCap.toLocaleString()} m
                            </span>
                            <span className="text-[10px] text-zinc-400 uppercase">Cap</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 font-semibold text-[10px]">
                              {whRawMeters.toLocaleString()} m used
                            </span>
                            <span className={`text-[10px] font-medium ${rawPercent >= 90 ? 'text-rose-600 font-bold' : 'text-zinc-400'}`}>
                              ({rawPercent}%)
                            </span>
                          </div>
                        </div>
                      ) : whRawMeters > 0 ? (
                        <div className="space-y-1 font-mono">
                          <span className="text-zinc-400 text-xs">—</span>
                          <div>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 font-semibold text-[10px]">
                              {whRawMeters.toLocaleString()} m used
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-zinc-400 font-mono text-xs">—</span>
                      )}
                    </td>

                    {/* Finished Goods Capacity */}
                    <td className="p-3 whitespace-nowrap">
                      {finCap > 0 ? (
                        <div className="space-y-1 font-mono">
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                              {finCap.toLocaleString()} pcs
                            </span>
                            <span className="text-[10px] text-zinc-400 uppercase">Cap</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span className="px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800/60 font-semibold text-[10px]">
                              {whFinUnits.toLocaleString()} pcs used
                            </span>
                            <span className={`text-[10px] font-medium ${finPercent >= 90 ? 'text-rose-600 font-bold' : 'text-zinc-400'}`}>
                              ({finPercent}%)
                            </span>
                          </div>
                        </div>
                      ) : whFinUnits > 0 ? (
                        <div className="space-y-1 font-mono">
                          <span className="text-zinc-400 text-xs">—</span>
                          <div>
                            <span className="px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800/60 font-semibold text-[10px]">
                              {whFinUnits.toLocaleString()} pcs used
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-zinc-400 font-mono text-xs">—</span>
                      )}
                    </td>

                    <td className="p-3 text-zinc-700 dark:text-zinc-300">
                      <div>{wh.managerName || 'Unassigned'}</div>
                      <div className="text-[10px] text-zinc-500">{wh.phone || 'No phone'}</div>
                    </td>
                    <td className="p-3">
                      <Badge status={wh.status} />
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(wh)}
                          className="p-1.5 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded cursor-pointer"
                          title="Edit Facility"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteCandidate(wh)}
                          className="p-1.5 border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 hover:bg-rose-100 rounded cursor-pointer"
                          title="Delete Facility"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="p-8 text-center text-zinc-500 font-mono">
                  {searchQuery ? `No facilities match "${searchQuery}".` : 'No warehouse facilities found. Click "Add Warehouse Facility" to register godowns.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Form with Dual Capacities */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? `Edit Facility (${editingItem.code || editingItem.id})` : 'Register New Warehouse Facility'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500 flex items-center gap-1">
                <span>Warehouse ID</span>
                <span className="text-[10px] text-zinc-400 font-normal">(Auto-generated, editable)</span>
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. WH-001"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500 uppercase font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Facility Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              >
                <option value="Active">Active</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Full">Full</option>
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500 flex items-center gap-1">
                <span>Facility Name</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Godown A - Naroda Textile Hub"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500 flex items-center gap-1">
                <span>Location / City Area</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Ahmedabad (Naroda GIDC) or Surat Textile SEZ"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500 flex items-center gap-1">
                <span>Complete Physical Address</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Plot 42, GIDC Industrial Complex, Ring Road, Surat"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              />
            </div>

            {/* DUAL CAPACITIES SECTION */}
            <div className="sm:col-span-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <span className="text-xs font-mono font-bold uppercase text-zinc-500 block mb-2">
                Facility Storage Capacities
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Raw Material Capacity */}
                <div className="space-y-1">
                  <label className="text-xs font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Raw Material Capacity (Meters)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={rawMaterialCapacityMeters}
                    onChange={(e) => setRawMaterialCapacityMeters(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="50000"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500 font-bold"
                  />
                  <span className="text-[10px] text-zinc-400 font-mono block">Max meters of raw denim / rolls</span>
                </div>

                {/* Finished Goods Capacity */}
                <div className="space-y-1">
                  <label className="text-xs font-mono font-bold uppercase text-sky-600 dark:text-sky-400 flex items-center gap-1">
                    <Box className="w-3.5 h-3.5" />
                    <span>Finished Goods Capacity (Units / Pcs)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={finishedGoodsCapacityUnits}
                    onChange={(e) => setFinishedGoodsCapacityUnits(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="10000"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500 font-bold"
                  />
                  <span className="text-[10px] text-zinc-400 font-mono block">Max pieces of finished garments</span>
                </div>
              </div>
            </div>

            {/* Supervisor Details */}
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Supervisor / Manager Name</label>
              <input
                type="text"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                placeholder="Priya Patel"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Supervisor Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
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
              <span>{editingItem ? 'Save Changes' : 'Register Facility'}</span>
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
            deleteWarehouse(deleteCandidate.id);
            setDeleteCandidate(null);
          }
        }}
        itemName={deleteCandidate ? `${deleteCandidate.name} (${deleteCandidate.code})` : ''}
      />
    </div>
  );
};
