import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  HardHat,
  Plus,
  Edit,
  Trash2,
  Phone,
  MapPin,
  Search,
  Filter,
  X,
  CheckCircle2,
  Clock,
  Layers,
  ArrowUpRight,
  Activity,
  ChevronRight,
  FileSpreadsheet
} from 'lucide-react';
import { useFabriqData } from '../../context/FabriqDataContext';
import { Contractor, ContractorSpecialty } from '../../types';
import { Badge, Modal, ConfirmDeleteModal } from '../components/AdminUIComponents';
import { sortLatest } from '../../utils/sortUtils';

// Helper to generate next sequential Contractor ID
const generateNextContractorId = (list: Contractor[]) => {
  let maxNum = 0;
  list.forEach(c => {
    const val = c.code || c.id || '';
    const match = val.match(/(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  });
  return `CTR-${String(maxNum + 1).padStart(3, '0')}`;
};

export const ContractorManagementPage: React.FC = () => {
  const { contractors, productionOrders, addContractor, updateContractor, deleteContractor } = useFabriqData();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState<'ALL' | 'Cutting' | 'Stitching' | 'Washing' | 'Packaging'>('ALL');

  // Selected Contractor for Above Details & Orders view
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null);
  const [ordersViewTab, setOrdersViewTab] = useState<'working' | 'done' | 'all'>('working');
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Contractor | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Contractor | null>(null);

  // Form Fields
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState<ContractorSpecialty>('Cutting');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');

  // Compute active orders count dynamically per contractor
  const getContractorActiveOrders = (contractorName: string) => {
    return productionOrders.filter(
      po => (po.contractorName === contractorName || po.assignedTo === contractorName) &&
        po.overallStatus !== 'Completed' && po.status !== 'Completed' && po.currentStage !== 'Finished Goods'
    ).length;
  };

  // Check if a production order is related to the given contractor
  const isContractorOrder = (order: any, ctr: Contractor) => {
    const cName = (ctr.name || '').trim().toLowerCase();
    const cCode = (ctr.code || ctr.id || '').trim().toLowerCase();
    const cId = (ctr.id || '').trim().toLowerCase();

    const oCtrName = (order.contractorName || order.assignedTo || '').trim().toLowerCase();
    const oCtrId = (order.assignedContractorId || '').trim().toLowerCase();

    if (oCtrName === cName || (oCtrId !== '' && (oCtrId === cId || oCtrId === cCode))) {
      return true;
    }

    if (Array.isArray(order.stageHistory)) {
      return order.stageHistory.some((s: any) => {
        const sCtr = (s.contractorName || s.assignedWorker || '').trim().toLowerCase();
        const sId = (s.contractorId || '').trim().toLowerCase();
        return sCtr === cName || (sId !== '' && (sId === cId || sId === cCode));
      });
    }

    return false;
  };

  // Check if the order is currently "working on" (in progress) for this contractor
  const isOrderWorkingOn = (order: any, ctr: Contractor) => {
    if (order.overallStatus === 'Completed' || order.status === 'Completed' || order.currentStage === 'Finished Goods') {
      return false;
    }

    const cName = (ctr.name || '').trim().toLowerCase();
    const cCode = (ctr.code || ctr.id || '').trim().toLowerCase();
    const cId = (ctr.id || '').trim().toLowerCase();

    // 1. If order has stageHistory, check contractor's stage status specifically
    if (Array.isArray(order.stageHistory) && order.stageHistory.length > 0) {
      const contractorStages = order.stageHistory.filter((s: any) => {
        const sCtr = (s.contractorName || s.assignedWorker || '').trim().toLowerCase();
        const sId = (s.contractorId || '').trim().toLowerCase();
        return sCtr === cName || (sId !== '' && (sId === cId || sId === cCode));
      });

      if (contractorStages.length > 0) {
        const hasUnfinished = contractorStages.some((s: any) => s.status !== 'Completed' && !s.completedDate);
        if (hasUnfinished) return true;
        return false;
      }
    }

    // 2. Check stage sequence vs contractor specialty
    const stageSeq = ['cutting', 'stitching', 'washing', 'packaging', 'finished goods'];
    const spec = (ctr.specialty || '').toLowerCase();
    const curStage = (order.currentStage || order.stage || '').toLowerCase();

    const ctrIdx = stageSeq.findIndex(s => spec.includes(s.slice(0, 4)));
    const curIdx = stageSeq.findIndex(s => curStage.includes(s.slice(0, 4)));

    if (ctrIdx !== -1 && curIdx !== -1) {
      if (curIdx < ctrIdx) return false;
      if (curIdx === ctrIdx) return true;
      if (curIdx > ctrIdx) return false;
    }

    // 3. Fallback: if current stage matches specialty
    if (spec && curStage && curStage.includes(spec.slice(0, 4))) {
      return true;
    }

    const oCtrName = (order.contractorName || order.assignedTo || '').trim().toLowerCase();
    const oCtrId = (order.assignedContractorId || '').trim().toLowerCase();
    if (oCtrName === cName || (oCtrId !== '' && (oCtrId === cId || oCtrId === cCode))) {
      return true;
    }

    return false;
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setCode(generateNextContractorId(contractors));
    setName('');
    setSpecialty('Cutting');
    setContactPerson('');
    setPhone('');
    setLocation('');
    setStatus('Active');
    setIsModalOpen(true);
  };

  const openEditModal = (item: Contractor) => {
    setEditingItem(item);
    setCode(item.code || item.id);
    setName(item.name);
    // Normalize specialty if legacy
    const norm = item.specialty?.toLowerCase().includes('cut') ? 'Cutting'
      : item.specialty?.toLowerCase().includes('stitch') ? 'Stitching'
        : item.specialty?.toLowerCase().includes('wash') ? 'Washing'
          : item.specialty?.toLowerCase().includes('pack') ? 'Packaging'
            : item.specialty || 'Cutting';
    setSpecialty(norm as ContractorSpecialty);
    setContactPerson(item.contactPerson);
    setPhone(item.phone);
    setLocation(item.location);
    setStatus(item.status);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      const updatedContractor: Contractor = {
        ...editingItem,
        code,
        name,
        specialty,
        contactPerson,
        phone,
        location,
        activeOrdersCount: getContractorActiveOrders(name),
        status
      };
      updateContractor(updatedContractor);
      if (selectedContractor?.id === editingItem.id) {
        setSelectedContractor(updatedContractor);
      }
    } else {
      addContractor({
        code,
        name,
        specialty,
        contactPerson,
        phone,
        location,
        activeOrdersCount: 0,
        status
      });
    }
    setIsModalOpen(false);
  };

  // Helper for specialty badge styles
  const getSpecialtyBadge = (spec: string) => {
    const s = spec.toLowerCase();
    if (s.includes('cut')) {
      return {
        label: 'Cutting',
        style: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800'
      };
    } else if (s.includes('stitch')) {
      return {
        label: 'Stitching',
        style: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 border-sky-300 dark:border-sky-800'
      };
    } else if (s.includes('wash')) {
      return {
        label: 'Washing',
        style: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-800'
      };
    } else if (s.includes('pack')) {
      return {
        label: 'Packaging',
        style: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border-indigo-300 dark:border-indigo-800'
      };
    }
    return {
      label: spec,
      style: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300'
    };
  };

  // Filter contractors
  const filteredContractors = useMemo(() => {
    const list = (contractors || []).filter(c => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.location.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (specialtyFilter === 'ALL') return true;

      const s = (c.specialty || '').toLowerCase();
      if (specialtyFilter === 'Cutting') return s.includes('cut');
      if (specialtyFilter === 'Stitching') return s.includes('stitch');
      if (specialtyFilter === 'Washing') return s.includes('wash');
      if (specialtyFilter === 'Packaging') return s.includes('pack');
      return true;
    });

    return sortLatest(list);
  }, [contractors, searchTerm, specialtyFilter]);

  // Counts per specialty
  const counts = useMemo(() => {
    const list = contractors || [];
    return {
      all: list.length,
      cutting: list.filter(c => c.specialty?.toLowerCase().includes('cut')).length,
      stitching: list.filter(c => c.specialty?.toLowerCase().includes('stitch')).length,
      washing: list.filter(c => c.specialty?.toLowerCase().includes('wash')).length,
      packaging: list.filter(c => c.specialty?.toLowerCase().includes('pack')).length
    };
  }, [contractors]);

  // Memoized orders and metrics for selected contractor
  const selectedContractorOrders = useMemo(() => {
    if (!selectedContractor) return [];
    return productionOrders.filter(po => isContractorOrder(po, selectedContractor));
  }, [selectedContractor, productionOrders]);

  const workingOnOrders = useMemo(() => {
    if (!selectedContractor) return [];
    return selectedContractorOrders.filter(po => isOrderWorkingOn(po, selectedContractor));
  }, [selectedContractor, selectedContractorOrders]);

  const doneOrders = useMemo(() => {
    if (!selectedContractor) return [];
    return selectedContractorOrders.filter(po => !isOrderWorkingOn(po, selectedContractor));
  }, [selectedContractor, selectedContractorOrders]);

  const workingOnPcs = useMemo(() => {
    return workingOnOrders.reduce((sum, o) => sum + Number(o.quantity || o.targetQuantity || o.plannedQuantity || 0), 0);
  }, [workingOnOrders]);

  const donePcs = useMemo(() => {
    return doneOrders.reduce((sum, o) => sum + Number(o.finalQuantity || o.completedQuantity || o.completed || o.quantity || o.targetQuantity || 0), 0);
  }, [doneOrders]);

  const displayedOrders = useMemo(() => {
    if (ordersViewTab === 'working') return workingOnOrders;
    if (ordersViewTab === 'done') return doneOrders;
    return selectedContractorOrders;
  }, [ordersViewTab, workingOnOrders, doneOrders, selectedContractorOrders]);

  // Export Contractor Master Directory as genuine Excel (.xlsx)
  const handleExportExcel = () => {
    const listToExport = filteredContractors.length > 0 ? filteredContractors : contractors;

    const headers = [
      'Contractor ID',
      'Contractor / Workshop Name',
      'Specialty Stage',
      'Contact Person',
      'Mobile Phone',
      'Workshop Location',
      'Active Production Batches',
      'Status'
    ];

    const dataRows = listToExport.map(c => [
      c.code || c.id,
      c.name,
      c.specialty,
      c.contactPerson,
      c.phone,
      c.location || 'N/A',
      getContractorActiveOrders(c.name),
      c.status || 'Active'
    ]);

    const totalActiveBatches = listToExport.reduce((sum, c) => sum + getContractorActiveOrders(c.name), 0);

    const summaryRow = [
      'TOTAL SUMMARY',
      `Total: ${listToExport.length} Contractors`,
      '',
      '',
      '',
      '',
      totalActiveBatches,
      ''
    ];

    const wsData = [
      ['FABRIQ APPAREL MANUFACTURING - STAGE CONTRACTORS MASTER DIRECTORY'],
      [`Exported: ${new Date().toLocaleString('en-IN')}`, '', '', '', '', '', '', `Total Entries: ${listToExport.length}`],
      [],
      headers,
      ...dataRows,
      summaryRow
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Presentable column widths
    ws['!cols'] = [
      { wch: 16 }, // Contractor ID
      { wch: 32 }, // Workshop Name
      { wch: 18 }, // Specialty
      { wch: 22 }, // Contact Person
      { wch: 18 }, // Phone
      { wch: 36 }, // Location
      { wch: 24 }, // Active Batches
      { wch: 14 }  // Status
    ];

    // Merged headers
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contractors');

    // Generate real Excel binary .xlsx
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Fabriq_Contractors_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
            <HardHat className="w-4 h-4" />
            <span>PRODUCTION STAGE CONTRACTORS MASTER</span>
          </div>
          <h1 className="font-hanken font-bold text-xl text-zinc-900 dark:text-zinc-100 tracking-tight">
            Stage Contractors Directory
          </h1>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Download Excel Button */}
          <button
            type="button"
            onClick={handleExportExcel}
            className={`px-3.5 py-2 border font-mono font-bold text-xs flex items-center gap-2 shadow-2xs transition-all cursor-pointer ${
              downloadSuccess
                ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200'
            }`}
            title="Download stage contractors directory as Excel spreadsheet"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{downloadSuccess ? 'EXCEL DOWNLOADED!' : 'DOWNLOAD EXCEL'}</span>
          </button>

          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>REGISTER STAGE CONTRACTOR</span>
          </button>
        </div>
      </div>

      {/* Specialty Filter Buttons & Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* 4 Stage Specialty Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs w-full md:w-auto">
          <button
            onClick={() => setSpecialtyFilter('ALL')}
            className={`px-3 py-1.5 border font-bold transition-colors cursor-pointer ${specialtyFilter === 'ALL'
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white'
              : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400'
              }`}
          >
            All Stages
          </button>
          <button
            onClick={() => setSpecialtyFilter('Cutting')}
            className={`px-3 py-1.5 border font-bold transition-colors cursor-pointer ${specialtyFilter === 'Cutting'
              ? 'bg-amber-600 text-white border-amber-600'
              : 'bg-white dark:bg-zinc-900 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50 hover:border-amber-400'
              }`}
          >
            Cutting
          </button>
          <button
            onClick={() => setSpecialtyFilter('Stitching')}
            className={`px-3 py-1.5 border font-bold transition-colors cursor-pointer ${specialtyFilter === 'Stitching'
              ? 'bg-sky-600 text-white border-sky-600'
              : 'bg-white dark:bg-zinc-900 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-900/50 hover:border-sky-400'
              }`}
          >
            Stitching
          </button>
          <button
            onClick={() => setSpecialtyFilter('Washing')}
            className={`px-3 py-1.5 border font-bold transition-colors cursor-pointer ${specialtyFilter === 'Washing'
              ? 'bg-purple-600 text-white border-purple-600'
              : 'bg-white dark:bg-zinc-900 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900/50 hover:border-purple-400'
              }`}
          >
            Washing
          </button>
          <button
            onClick={() => setSpecialtyFilter('Packaging')}
            className={`px-3 py-1.5 border font-bold transition-colors cursor-pointer ${specialtyFilter === 'Packaging'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white dark:bg-zinc-900 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50 hover:border-indigo-400'
              }`}
          >
            Packaging
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search contractor, city, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500 rounded"
          />
        </div>
      </div>

      {/* Selected Contractor Details & Orders Panel (Displays ABOVE contractor grid) */}
      {selectedContractor && (
        <div id="contractor-details-panel" className="bg-white dark:bg-zinc-900 border-2 border-emerald-500 rounded-xl p-5 sm:p-6 shadow-md space-y-6 animate-in fade-in duration-200">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 text-xs font-mono font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded">
                  {selectedContractor.code || selectedContractor.id}
                </span>
                <span className={`px-2.5 py-0.5 text-xs font-mono font-bold border rounded ${getSpecialtyBadge(selectedContractor.specialty).style}`}>
                  {getSpecialtyBadge(selectedContractor.specialty).label}
                </span>
              </div>
              <h2 className="font-hanken font-bold text-2xl text-zinc-900 dark:text-zinc-100 tracking-tight">
                {selectedContractor.name}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => openEditModal(selectedContractor)}
                className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-mono font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 rounded cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
              <button
                onClick={() => setSelectedContractor(null)}
                className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-mono font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 rounded cursor-pointer transition-colors"
                title="Close Contractor Details"
              >
                <X className="w-4 h-4" />
                <span>Close Details</span>
              </button>
            </div>
          </div>

          {/* Details Overview Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-lg">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">Contact Person</span>
              <div className="flex items-center gap-2 text-xs font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                <HardHat className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>{selectedContractor.contactPerson || 'N/A'}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">Phone Number</span>
              <div className="flex items-center gap-2 text-xs font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                {selectedContractor.phone ? (
                  <a href={`tel:${selectedContractor.phone}`} className="hover:text-emerald-600 underline">
                    {selectedContractor.phone}
                  </a>
                ) : (
                  <span>N/A</span>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">Workshop Location</span>
              <div className="flex items-center gap-2 text-xs font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="truncate">{selectedContractor.location || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Quick Stats: Working On vs Done */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div 
              onClick={() => setOrdersViewTab('working')}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                ordersViewTab === 'working' 
                  ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 ring-1 ring-amber-500' 
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-amber-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-mono text-amber-700 dark:text-amber-400 font-bold mb-1">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  WORKING ON (IN PROGRESS)
                </span>
                <span className="text-[10px] uppercase tracking-wider">Active</span>
              </div>
              <div className="font-hanken font-bold text-2xl text-zinc-900 dark:text-zinc-100">
                {workingOnOrders.length} <span className="text-sm font-normal text-zinc-500">Orders</span>
              </div>
              <div className="text-xs font-mono text-zinc-500 mt-1">
                {workingOnPcs.toLocaleString()} pcs in production
              </div>
            </div>

            <div 
              onClick={() => setOrdersViewTab('done')}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                ordersViewTab === 'done' 
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-500' 
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-mono text-emerald-700 dark:text-emerald-400 font-bold mb-1">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  DONE (COMPLETED)
                </span>
                <span className="text-[10px] uppercase tracking-wider">Completed</span>
              </div>
              <div className="font-hanken font-bold text-2xl text-zinc-900 dark:text-zinc-100">
                {doneOrders.length} <span className="text-sm font-normal text-zinc-500">Orders</span>
              </div>
              <div className="text-xs font-mono text-zinc-500 mt-1">
                {donePcs.toLocaleString()} pcs completed
              </div>
            </div>

            <div 
              onClick={() => setOrdersViewTab('all')}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                ordersViewTab === 'all' 
                  ? 'border-zinc-800 dark:border-zinc-200 bg-zinc-100/50 dark:bg-zinc-800/40 ring-1 ring-zinc-800 dark:ring-zinc-200' 
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-400'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-mono text-zinc-700 dark:text-zinc-300 font-bold mb-1">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4" />
                  TOTAL ASSIGNED ORDERS
                </span>
                <span className="text-[10px] uppercase tracking-wider">All Batches</span>
              </div>
              <div className="font-hanken font-bold text-2xl text-zinc-900 dark:text-zinc-100">
                {selectedContractorOrders.length} <span className="text-sm font-normal text-zinc-500">Orders</span>
              </div>
              <div className="text-xs font-mono text-zinc-500 mt-1">
                {(workingOnPcs + donePcs).toLocaleString()} total pcs tracked
              </div>
            </div>
          </div>

          {/* Orders Section & Sub-tabs */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="font-hanken font-bold text-base text-zinc-900 dark:text-zinc-100">
                  {ordersViewTab === 'working' ? 'Orders Currently Working On' : ordersViewTab === 'done' ? 'Completed Orders (Done)' : 'All Contractor Orders'}
                </h3>
                <p className="text-xs font-mono text-zinc-500">
                  Showing {displayedOrders.length} production orders assigned to {selectedContractor.name}
                </p>
              </div>

              {/* Sub-tabs */}
              <div className="flex items-center gap-1.5 font-mono text-xs">
                <button
                  onClick={() => setOrdersViewTab('working')}
                  className={`px-3 py-1.5 border font-bold rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                    ordersViewTab === 'working'
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white dark:bg-zinc-900 text-amber-700 dark:text-amber-400 border-zinc-200 dark:border-zinc-800 hover:border-amber-300'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Working On ({workingOnOrders.length})</span>
                </button>
                <button
                  onClick={() => setOrdersViewTab('done')}
                  className={`px-3 py-1.5 border font-bold rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                    ordersViewTab === 'done'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 border-zinc-200 dark:border-zinc-800 hover:border-emerald-300'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Done ({doneOrders.length})</span>
                </button>
                <button
                  onClick={() => setOrdersViewTab('all')}
                  className={`px-3 py-1.5 border font-bold rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                    ordersViewTab === 'all'
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white'
                      : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>All ({selectedContractorOrders.length})</span>
                </button>
              </div>
            </div>

            {/* Orders Table */}
            {displayedOrders.length === 0 ? (
              <div className="p-8 text-center bg-zinc-50 dark:bg-zinc-950/40 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg space-y-2">
                <Clock className="w-6 h-6 text-zinc-400 mx-auto" />
                <p className="font-mono text-xs text-zinc-500">
                  {ordersViewTab === 'working'
                    ? `No orders currently in progress for ${selectedContractor.name}.`
                    : ordersViewTab === 'done'
                    ? `No completed orders recorded yet for ${selectedContractor.name}.`
                    : `No production orders found associated with ${selectedContractor.name}.`}
                </p>
              </div>
            ) : (
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-x-auto bg-white dark:bg-zinc-900">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="px-4 py-3">Order / Batch ID</th>
                      <th className="px-4 py-3">Product / Style</th>
                      <th className="px-4 py-3">Stage</th>
                      <th className="px-4 py-3 text-right">Quantity</th>
                      <th className="px-4 py-3 text-center">Contractor Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {displayedOrders.map((order: any, oIdx: number) => {
                      const isWorking = isOrderWorkingOn(order, selectedContractor);
                      const orderIdDisplay = order.batchNumber || order.poCode || order.orderNumber || order.id;
                      const orderQty = Number(order.quantity || order.targetQuantity || order.plannedQuantity || 0);
                      const completedQty = Number(order.finalQuantity || order.completedQuantity || order.completed || 0);

                      return (
                        <tr key={`${order.id || oIdx}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                          <td className="px-4 py-3 font-bold text-zinc-900 dark:text-zinc-100">
                            {orderIdDisplay}
                            {order.challanNumber && (
                              <span className="block text-[10px] text-zinc-400 font-normal">
                                Challan: {order.challanNumber}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                              {order.productName || order.name || 'Apparel Item'}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              {order.category || 'Garments'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded">
                              {order.currentStage || order.stage || 'Production'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-zinc-800 dark:text-zinc-200">
                            {isWorking ? (
                              <span>{orderQty.toLocaleString()} pcs</span>
                            ) : (
                              <span>{completedQty > 0 ? completedQty.toLocaleString() : orderQty.toLocaleString()} pcs</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isWorking ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 rounded-full">
                                <Clock className="w-3 h-3 text-amber-500" />
                                Working On
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 rounded-full">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                Done
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => navigate('/admin/production')}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded transition-colors cursor-pointer"
                            >
                              <span>View Batch</span>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Directory Title with Selection Hint */}
      <div className="flex items-center justify-between text-xs font-mono text-zinc-500 pt-2">
        <span>
          Contractors Directory ({filteredContractors.length})
          <span className="text-[11px] text-zinc-400 ml-2 hidden sm:inline">
            — Click any contractor card to view full details and active/done orders above
          </span>
        </span>
        {selectedContractor && (
          <button
            onClick={() => setSelectedContractor(null)}
            className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold cursor-pointer"
          >
            Clear Selected Contractor
          </button>
        )}
      </div>

      {/* Contractors Grid */}
      {filteredContractors.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg space-y-2">
          <HardHat className="w-8 h-8 text-zinc-400 mx-auto" />
          <p className="font-mono text-sm text-zinc-500">No stage contractors found matching this criteria.</p>
          <button
            onClick={openCreateModal}
            className="mt-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 underline font-bold cursor-pointer"
          >
            + Register a new contractor now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredContractors.map((ctr, idx) => {
            const badge = getSpecialtyBadge(ctr.specialty);
            const activeRuns = getContractorActiveOrders(ctr.name);
            const isSelected = selectedContractor?.id === ctr.id;

            return (
              <div
                key={`${ctr.id}-${idx}`}
                onClick={() => {
                  setSelectedContractor(isSelected ? null : ctr);
                  // Optional smooth scroll to top of details if selecting
                  if (!isSelected) {
                    const el = document.getElementById('contractor-details-panel');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }
                }}
                className={`bg-white dark:bg-zinc-900 border p-5 shadow-2xs space-y-4 transition-all flex flex-col justify-between rounded-lg cursor-pointer ${
                  isSelected
                    ? 'border-emerald-500 ring-2 ring-emerald-500/50 bg-emerald-50/10 dark:bg-emerald-950/20 shadow-md'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/60 hover:shadow-xs'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-xs">
                          {ctr.code || ctr.id}
                        </span>
                        {isSelected && (
                          <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 rounded">
                            Viewing Details Above
                          </span>
                        )}
                      </div>
                      <h3 className="font-hanken font-bold text-base text-zinc-900 dark:text-zinc-100 mt-1">
                        {ctr.name}
                      </h3>
                    </div>
                    <Badge status={ctr.status} />
                  </div>

                  {/* Stage Specialty Badge */}
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-1 text-xs font-mono font-bold border rounded ${badge.style}`}>
                      {badge.label}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs font-mono text-zinc-600 dark:text-zinc-400 pt-1">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{ctr.contactPerson} ({ctr.phone})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{ctr.location}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs font-mono text-zinc-500 flex justify-between">
                    <span>Active Production Batches:</span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">
                      {activeRuns} {activeRuns === 1 ? 'Batch' : 'Batches'}
                    </span>
                  </div>
                </div>

                {/* Actions & Click Hint */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span>{isSelected ? 'Viewing Above ↑' : 'View Orders →'}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(ctr);
                      }}
                      className="px-2.5 py-1 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-mono text-zinc-700 dark:text-zinc-300 flex items-center gap-1 rounded cursor-pointer"
                      title="Edit Contractor"
                    >
                      <Edit className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteCandidate(ctr);
                      }}
                      className="px-2.5 py-1 border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-xs font-mono flex items-center gap-1 rounded cursor-pointer"
                      title="Delete Contractor"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Form */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? `Edit Stage Contractor (${editingItem.code || editingItem.id})` : 'Register Stage Contractor'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">
                Contractor ID
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. CTR-001"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500 uppercase font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Contractor / Workshop Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Paramount Cutting Masters"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">
                Specialty
              </label>
              <select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value as ContractorSpecialty)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500 font-bold text-emerald-700 dark:text-emerald-400"
              >
                <option value="Cutting">Cutting</option>
                <option value="Stitching">Stitching</option>
                <option value="Washing">Washing</option>
                <option value="Packaging">Packaging</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Contact Person</label>
              <input
                type="text"
                required
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="Harish Mehta"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold uppercase text-zinc-500">Phone Number</label>
                <span className="text-[10px] font-mono text-zinc-400">10 digits</span>
              </div>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]{10}"
                maxLength={10}
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="9825099887"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Location / Industrial Belt</label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Sector 4, Udyog Vihar, Gurugram"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-mono font-bold border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded cursor-pointer"
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold uppercase tracking-wider rounded cursor-pointer"
            >
              {editingItem ? 'SAVE CHANGES' : 'REGISTER CONTRACTOR'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      {deleteCandidate && (
        <ConfirmDeleteModal
          isOpen={!!deleteCandidate}
          onClose={() => setDeleteCandidate(null)}
          onConfirm={() => {
            if (selectedContractor?.id === deleteCandidate.id) {
              setSelectedContractor(null);
            }
            deleteContractor(deleteCandidate.id);
          }}
          itemName={deleteCandidate.name}
          itemType="Contractor Record"
        />
      )}
    </div>
  );
};
