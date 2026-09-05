import React, { useState } from 'react';
import { Warehouse as WarehouseIcon, Plus, Edit, Trash2, Phone, MapPin, Building, Layers, CheckCircle2 } from 'lucide-react';
import { useFabriqData } from '../../context/FabriqDataContext';
import { Warehouse } from '../../types';
import { Badge, Modal, ConfirmDeleteModal } from '../components/AdminUIComponents';

export const WarehouseManagementPage: React.FC = () => {
  const { warehouses, addWarehouse, updateWarehouse, deleteWarehouse } = useFabriqData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Warehouse | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Warehouse | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Form Fields
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [capacityUnits, setCapacityUnits] = useState(100000);
  const [currentUnits, setCurrentUnits] = useState(0);
  const [managerName, setManagerName] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'Active' | 'Maintenance' | 'Full'>('Active');

  const openCreateModal = () => {
    setEditingItem(null);
    setCode(`WH-00${warehouses.length + 1}`);
    setName('');
    setLocation('');
    setAddress('');
    setCapacityUnits(100000);
    setCurrentUnits(0);
    setManagerName('');
    setPhone('');
    setStatus('Active');
    setIsModalOpen(true);
  };

  const openEditModal = (item: Warehouse) => {
    setEditingItem(item);
    setCode(item.code);
    setName(item.name);
    setLocation(item.location);
    setAddress(item.address);
    setCapacityUnits(item.capacityUnits);
    setCurrentUnits(item.currentUnits);
    setManagerName(item.managerName);
    setPhone(item.phone);
    setStatus(item.status);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateWarehouse({
        ...editingItem,
        code,
        name,
        location,
        address,
        capacityUnits: Number(capacityUnits) || 0,
        currentUnits: Number(currentUnits) || 0,
        managerName,
        phone,
        status
      });
    } else {
      addWarehouse({
        code,
        name,
        location,
        address,
        capacityUnits: Number(capacityUnits) || 0,
        currentUnits: Number(currentUnits) || 0,
        managerName,
        phone,
        status
      });
    }
    setIsModalOpen(false);
  };

  // Filtered warehouses
  const filteredWarehouses = warehouses.filter(wh => {
    const matchesSearch = 
      wh.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wh.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wh.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wh.managerName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || wh.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate totals
  const totalCapacity = warehouses.reduce((acc, w) => acc + (w.capacityUnits || 0), 0);
  const activeCount = warehouses.filter(w => w.status === 'Active').length;

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
          <p className="text-xs font-mono text-zinc-500 mt-0.5">
            Register and manage fabric mills, godowns, raw storage yards, and supervisor assignments.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition-colors shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>ADD WAREHOUSE FACILITY</span>
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <span className="text-[10px] text-zinc-500 uppercase block">Total Facilities</span>
          <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{warehouses.length}</span>
        </div>
        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <span className="text-[10px] text-zinc-500 uppercase block">Active Warehouses</span>
          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{activeCount}</span>
        </div>
        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <span className="text-[10px] text-zinc-500 uppercase block">Total Storage Capacity</span>
          <span className="text-lg font-bold text-sky-600 dark:text-sky-400">{totalCapacity.toLocaleString()} m</span>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-zinc-900 p-3 border border-zinc-200 dark:border-zinc-800">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by facility name, city, manager..."
            className="w-full pl-3 pr-8 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
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

      {/* Warehouses Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs overflow-x-auto">
        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead>
            <tr className="bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
              <th className="p-3 font-bold">Code</th>
              <th className="p-3 font-bold">Facility Name &amp; Address</th>
              <th className="p-3 font-bold">City / Location</th>
              <th className="p-3 font-bold">Max Capacity</th>
              <th className="p-3 font-bold">Supervisor / Manager</th>
              <th className="p-3 font-bold">Status</th>
              <th className="p-3 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {filteredWarehouses.length > 0 ? (
              filteredWarehouses.map((wh, idx) => (
                <tr key={`${wh.id}-${idx}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100">
                    {wh.code}
                  </td>
                  <td className="p-3">
                    <div className="font-bold text-zinc-900 dark:text-zinc-100 font-hanken text-sm">
                      {wh.name}
                    </div>
                    <div className="text-[10px] text-zinc-500 truncate max-w-xs">{wh.address}</div>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 text-[11px] font-bold bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-400 border border-sky-300 dark:border-sky-800">
                      {wh.location}
                    </span>
                  </td>
                  <td className="p-3 text-zinc-700 dark:text-zinc-300 font-bold">
                    {wh.capacityUnits ? `${wh.capacityUnits.toLocaleString()} m` : 'Unspecified'}
                  </td>
                  <td className="p-3 text-zinc-700 dark:text-zinc-300">
                    <div>{wh.managerName || 'Unassigned'}</div>
                    <div className="text-[10px] text-zinc-500">{wh.phone}</div>
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
              ))
            ) : (
              <tr>
                <td colSpan={7} className="p-8 text-center text-zinc-500 font-mono">
                  No warehouse facilities found. Click "Add Warehouse Facility" to register godowns for employee purchases.
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
        title={editingItem ? `Edit Facility (${editingItem.code})` : 'Register New Warehouse Facility'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Facility Code</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="WH-001"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Facility Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Godown A - Main Mill"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Location / City Area *</label>
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
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Complete Physical Address *</label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Plot 42, GIDC Industrial Complex, Ring Road, Surat"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Max Capacity (Meters / Units)</label>
              <input
                type="number"
                min="1000"
                value={capacityUnits}
                onChange={(e) => setCapacityUnits(Number(e.target.value) || 0)}
                placeholder="150000"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500 font-bold"
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
              className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 text-xs font-mono font-bold uppercase hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold uppercase flex items-center gap-1.5"
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
