import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { PackageCheck, Search, Layers, Factory, FileSpreadsheet, FileText } from 'lucide-react';
import { useFabriqData } from '../../context/FabriqDataContext';
import { RawInventoryItem, FinishedInventoryItem } from '../../types';
import { sortLatest } from '../../utils/sortUtils';
import { PurchaseBillModal } from '../components/PurchaseBillModal';
import { RawInventoryDetailsModal } from '../components/RawInventoryDetailsModal';

type InventoryTab = 'raw' | 'finished';

export const InventoryManagementPage: React.FC = () => {
  const {
    rawInventory,
    finishedInventory,
    purchases
  } = useFabriqData();

  const [activeTab, setActiveTab] = useState<InventoryTab>('raw');
  const [searchTerm, setSearchTerm] = useState('');
  const [downloadSuccessRaw, setDownloadSuccessRaw] = useState(false);
  const [downloadSuccessFin, setDownloadSuccessFin] = useState(false);
  const [selectedRawItem, setSelectedRawItem] = useState<RawInventoryItem | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const handleOpenDetails = (r: RawInventoryItem) => {
    setSelectedRawItem(r);
    setIsDetailsModalOpen(true);
  };

  const handleOpenInvoiceFromDetails = (r: RawInventoryItem) => {
    setSelectedRawItem(r);
    setIsInvoiceModalOpen(true);
  };

  const getRawInvoice = (r: RawInventoryItem) => {
    const p = purchases.find(
      (item) => item.id === r.purchaseId || item.billNumber === r.purchaseId || item.invoiceNumber === r.purchaseId
    );
    return (
      p?.billNumber ||
      r.billNumber ||
      p?.invoiceNumber ||
      (r.invoiceNumber && !r.invoiceNumber.startsWith('DF-2026-') ? r.invoiceNumber : '') ||
      (r.batchId && !r.batchId.startsWith('DF-2026-') ? r.batchId : 'N/A')
    );
  };

  // Condition for raw fabric that is active (excludes depleted or completely allocated fabric)
  const isRawActive = (r: RawInventoryItem) => {
    const available = Number(r.availableMeters) || 0;
    const total = Number(r.totalMeters) || 0;
    const allocated = Number(r.allocatedMeters) || 0;
    if (available <= 0) return false;
    if (r.status === 'Depleted') return false;
    if (total > 0 && allocated >= total) return false;
    return true;
  };

  // Condition for finished goods that are active (excludes sold out or out of stock items)
  const isFinishedActive = (f: FinishedInventoryItem) => {
    const available = Number(f.availableQuantity ?? f.unitsAvailable ?? 0);
    const total = Number(f.totalProduced ?? f.unitsProduced ?? 0);
    const sold = Number(f.soldQuantity ?? f.unitsSold ?? 0);
    if (available <= 0) return false;
    if (f.status === 'Sold Out' || f.status === 'Out of Stock') return false;
    if (total > 0 && sold >= total) return false;
    return true;
  };

  // Filtered data (Exclude completely allocated fabric, sorted latest first)
  const filteredRaw = useMemo(() => {
    const list = rawInventory.filter((r) => {
      if (!isRawActive(r)) return false;

      const term = searchTerm.toLowerCase();
      const inv = getRawInvoice(r).toLowerCase();
      return (
        r.fabricName.toLowerCase().includes(term) ||
        inv.includes(term) ||
        r.supplierName.toLowerCase().includes(term) ||
        (r.warehouse || '').toLowerCase().includes(term)
      );
    });
    return sortLatest(list);
  }, [rawInventory, searchTerm, purchases]);

  // Filtered data (Exclude sold out products, sorted latest first)
  const filteredFinished = useMemo(() => {
    const list = finishedInventory.filter((f) => {
      if (!isFinishedActive(f)) return false;

      const term = searchTerm.toLowerCase();
      return (
        (f.productName || '').toLowerCase().includes(term) ||
        (f.styleName || '').toLowerCase().includes(term) ||
        (f.productionOrderId || '').toLowerCase().includes(term) ||
        (f.warehouse || '').toLowerCase().includes(term)
      );
    });
    return sortLatest(list);
  }, [finishedInventory, searchTerm]);

  // Export Raw Materials Excel
  const handleExportRawExcel = () => {
    const listToExport = filteredRaw.length > 0 ? filteredRaw : rawInventory.filter(isRawActive);

    const headers = [
      'Bill Number',
      'Fabric Description',
      'Fabric Width',
      'Supplier / Mill',
      'Total Received (Meters)',
      'Available Stock (Meters)',
      'Allocated In Production (Meters)',
      'Warehouse Facility',
      'Cost Per Meter (INR)',
      'Available Stock Valuation (INR)',
      'Stock Status',
      'Receipt Date'
    ];

    const dataRows = listToExport.map(r => {
      const available = Number(r.availableMeters) || 0;
      const cost = Number(r.costPerMeter) || 0;
      const valuation = Math.round(available * cost);
      return [
        getRawInvoice(r),
        r.fabricName,
        r.width || '58"',
        r.supplierName,
        Number(r.totalMeters) || 0,
        available,
        Number(r.allocatedMeters) || 0,
        r.warehouse || 'Unassigned',
        cost,
        valuation,
        r.status || 'Available',
        r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : 'N/A'
      ];
    });

    const sumTotalMeters = listToExport.reduce((acc, r) => acc + (Number(r.totalMeters) || 0), 0);
    const sumAvailableMeters = listToExport.reduce((acc, r) => acc + (Number(r.availableMeters) || 0), 0);
    const sumAllocatedMeters = listToExport.reduce((acc, r) => acc + (Number(r.allocatedMeters) || 0), 0);
    const sumValuation = listToExport.reduce((acc, r) => acc + ((Number(r.availableMeters) || 0) * (Number(r.costPerMeter) || 0)), 0);

    const summaryRow = [
      'TOTAL SUMMARY',
      `Total Lots: ${listToExport.length}`,
      '',
      '',
      sumTotalMeters,
      sumAvailableMeters,
      sumAllocatedMeters,
      '',
      '',
      Math.round(sumValuation),
      '',
      ''
    ];

    const wsData = [
      ['FABRIQ APPAREL MANUFACTURING - RAW MATERIALS INVENTORY LEDGER'],
      [`Exported: ${new Date().toLocaleString('en-IN')}`, '', '', '', '', '', '', '', '', '', `Active Lots: ${listToExport.length}`],
      [],
      headers,
      ...dataRows,
      summaryRow
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws['!cols'] = [
      { wch: 22 }, // Invoice Ref
      { wch: 30 }, // Fabric Description
      { wch: 14 }, // Fabric Width
      { wch: 26 }, // Supplier
      { wch: 24 }, // Total Received
      { wch: 24 }, // Available Stock
      { wch: 28 }, // Allocated In Production
      { wch: 22 }, // Warehouse
      { wch: 20 }, // Cost/m
      { wch: 26 }, // Stock Valuation
      { wch: 16 }, // Status
      { wch: 16 }  // Date
    ];

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Raw Materials Stock');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Fabriq_Raw_Materials_Inventory_${new Date().toISOString().slice(0, 10)}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccessRaw(true);
    setTimeout(() => setDownloadSuccessRaw(false), 2500);
  };

  // Export Finished Goods Excel
  const handleExportFinishedExcel = () => {
    const listToExport = filteredFinished.length > 0 ? filteredFinished : finishedInventory.filter(isFinishedActive);

    const headers = [
      'Product Name',
      'Challan Number',
      'Production Order ID',
      'Style / Model',
      'Category',
      'Color / Shade',
      'Size',
      'Total Produced (Pieces)',
      'Available In Stock (Pieces)',
      'Sold Units (Pieces)',
      'Unit Selling Price (INR)',
      'Total Stock Valuation (INR)',
      'Warehouse Facility',
      'Stock Status',
      'Completion Date'
    ];

    const dataRows = listToExport.map(f => {
      const available = Number(f.availableQuantity ?? f.unitsAvailable ?? 0);
      const price = Number(f.unitPrice ?? f.sellingPrice ?? 0);
      const valuation = Math.round(available * price);
      return [
        f.productName || 'Standard Apparel Item',
        f.challanNumber || 'N/A',
        f.productionOrderId || 'N/A',
        f.styleName || 'N/A',
        f.category || 'Garments',
        f.color || 'Standard',
        f.size || 'Standard',
        Number(f.totalProduced ?? f.unitsProduced ?? 0),
        available,
        Number(f.soldQuantity ?? f.unitsSold ?? 0),
        price,
        valuation,
        f.warehouse || 'Finished Goods Godown',
        f.status || 'Available',
        f.createdAt ? new Date(f.createdAt).toLocaleDateString('en-IN') : 'N/A'
      ];
    });

    const sumTotalProduced = listToExport.reduce((acc, f) => acc + (Number(f.totalProduced ?? f.unitsProduced ?? 0)), 0);
    const sumAvailable = listToExport.reduce((acc, f) => acc + (Number(f.availableQuantity ?? f.unitsAvailable ?? 0)), 0);
    const sumSold = listToExport.reduce((acc, f) => acc + (Number(f.soldQuantity ?? f.unitsSold ?? 0)), 0);
    const sumValuation = listToExport.reduce((acc, f) => {
      const qty = Number(f.availableQuantity ?? f.unitsAvailable ?? 0);
      const prc = Number(f.unitPrice ?? f.sellingPrice ?? 0);
      return acc + (qty * prc);
    }, 0);

    const summaryRow = [
      'TOTAL SUMMARY',
      `Total Garment Items: ${listToExport.length}`,
      '',
      '',
      '',
      '',
      sumTotalProduced,
      sumAvailable,
      sumSold,
      '',
      Math.round(sumValuation),
      '',
      '',
      ''
    ];

    const wsData = [
      ['FABRIQ APPAREL MANUFACTURING - FINISHED GOODS INVENTORY LEDGER'],
      [`Exported: ${new Date().toLocaleString('en-IN')}`, '', '', '', '', '', '', '', '', '', '', '', `Total SKUs: ${listToExport.length}`],
      [],
      headers,
      ...dataRows,
      summaryRow
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws['!cols'] = [
      { wch: 30 }, // Product Name
      { wch: 22 }, // Style
      { wch: 22 }, // Production Order
      { wch: 16 }, // Category
      { wch: 16 }, // Color
      { wch: 14 }, // Size
      { wch: 24 }, // Total Produced
      { wch: 24 }, // Available Stock
      { wch: 20 }, // Sold Units
      { wch: 22 }, // Unit Selling Price
      { wch: 26 }, // Stock Valuation
      { wch: 24 }, // Warehouse
      { wch: 16 }, // Status
      { wch: 16 }  // Date
    ];

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 13 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Finished Goods Stock');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Fabriq_Finished_Goods_Inventory_${new Date().toISOString().slice(0, 10)}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccessFin(true);
    setTimeout(() => setDownloadSuccessFin(false), 2500);
  };

  const getRawStatusBadge = (status: string) => {
    const colorMap: Record<string, string> = {
      'Available': 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
      'Low': 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
      'Depleted': 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
    };
    return (
      <span className={`px-2 py-0.5 text-[11px] font-bold border rounded ${colorMap[status] || colorMap['Available']}`}>
        {status}
      </span>
    );
  };

  const getFinStatusBadge = (status: string) => {
    const colorMap: Record<string, string> = {
      'Available': 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
      'Low': 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
      'Sold Out': 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
    };
    return (
      <span className={`px-2 py-0.5 text-[11px] font-bold border rounded ${colorMap[status] || colorMap['Available']}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 mb-1">
            <PackageCheck className="w-4 h-4" />
            <span>RAW AND FINISHED INVENTORY</span>
          </div>
          <h1 className="font-hanken font-bold text-xl text-zinc-900 dark:text-zinc-100 tracking-tight">
            Inventory &amp; Stock Master
          </h1>
        </div>

        {/* Tab-Specific Excel Download Button */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {activeTab === 'raw' ? (
            <button
              type="button"
              onClick={handleExportRawExcel}
              className={`px-3.5 py-2 border font-mono font-bold text-xs flex items-center gap-2 shadow-2xs transition-all cursor-pointer ${
                downloadSuccessRaw
                  ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                  : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200'
              }`}
              title="Download Raw Materials Inventory as Excel spreadsheet"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{downloadSuccessRaw ? 'RAW MATERIAL EXCEL DOWNLOADED!' : 'DOWNLOAD RAW MATERIAL EXCEL'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleExportFinishedExcel}
              className={`px-3.5 py-2 border font-mono font-bold text-xs flex items-center gap-2 shadow-2xs transition-all cursor-pointer ${
                downloadSuccessFin
                  ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                  : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200'
              }`}
              title="Download Finished Goods Inventory as Excel spreadsheet"
            >
              <FileSpreadsheet className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>{downloadSuccessFin ? 'FINISHED GOODS EXCEL DOWNLOADED!' : 'DOWNLOAD FINISHED GOODS EXCEL'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab('raw')}
          className={`px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
            activeTab === 'raw'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
              : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5" />
            Raw Materials ({rawInventory.filter(isRawActive).length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab('finished')}
          className={`px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
            activeTab === 'finished'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
              : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Factory className="w-3.5 h-3.5" />
            Finished Goods ({finishedInventory.filter(isFinishedActive).length})
          </div>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 shadow-2xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder={activeTab === 'raw' ? 'Search fabric, bill no, supplier, warehouse...' : 'Search product, style, PO ID, warehouse...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* ============ RAW MATERIALS TAB ============ */}
      {activeTab === 'raw' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs overflow-x-auto">
          {filteredRaw.length === 0 ? (
            <div className="p-12 text-center">
              <Layers className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
              <p className="text-sm font-mono text-zinc-500">No raw materials in inventory.</p>
              <p className="text-[10px] font-mono text-zinc-400 mt-1">Create a purchase with status "Received" to auto-populate raw inventory.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  <th className="p-3 font-bold">Fabric</th>
                  <th className="p-3 font-bold">Supplier</th>
                  <th className="p-3 font-bold">Total Meters</th>
                  <th className="p-3 font-bold">Available</th>
                  <th className="p-3 font-bold">Allocated</th>
                  <th className="p-3 font-bold">Location</th>
                  <th className="p-3 font-bold">Cost/m</th>
                  <th className="p-3 font-bold text-right">Valuation</th>
                  <th className="p-3 font-bold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                {filteredRaw.map((r, idx) => (
                  <tr
                    key={`${r.id}-${idx}`}
                    onClick={() => handleOpenDetails(r)}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer group"
                    title="Click to view full inventory details & invoice"
                  >
                    <td className="p-3">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100 font-hanken text-sm group-hover:text-emerald-600 transition-colors">
                        {r.fabricName}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        {r.width || '58"'}
                      </div>
                    </td>
                    <td className="p-3 text-zinc-700 dark:text-zinc-300 font-medium">
                      {r.supplierName || '—'}
                    </td>
                    <td className="p-3 text-zinc-800 dark:text-zinc-200">{r.totalMeters.toLocaleString()}m</td>
                    <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {r.availableMeters.toLocaleString()}m
                    </td>
                    <td className="p-3 text-amber-600 dark:text-amber-400">
                      {r.allocatedMeters.toLocaleString()}m
                    </td>
                    <td className="p-3 text-zinc-700 dark:text-zinc-300">
                      <div>{r.warehouse}</div>
                    </td>
                    <td className="p-3 text-zinc-800 dark:text-zinc-200">₹{r.costPerMeter}</td>
                    <td className="p-3 font-bold text-right text-zinc-900 dark:text-zinc-100">
                      ₹{Math.round(r.availableMeters * r.costPerMeter).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetails(r);
                        }}
                        className="px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 text-zinc-700 dark:text-zinc-300 font-bold text-[11px] rounded flex items-center gap-1.5 transition-colors mx-auto cursor-pointer shadow-2xs"
                        title="View Inventory Details"
                      >
                        <Layers className="w-3.5 h-3.5 text-emerald-600 group-hover:text-white" />
                        <span>VIEW DETAILS</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ============ FINISHED GOODS TAB ============ */}
      {activeTab === 'finished' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs overflow-x-auto">
          {filteredFinished.length === 0 ? (
            <div className="p-12 text-center">
              <Factory className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
              <p className="text-sm font-mono text-zinc-500">No finished goods in inventory.</p>
              <p className="text-[10px] font-mono text-zinc-400 mt-1">Mark a production order as "Completed" to auto-populate finished goods.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  <th className="p-3 font-bold">Product</th>
                  <th className="p-3 font-bold">Challan / Order No.</th>
                  <th className="p-3 font-bold">Total Produced</th>
                  <th className="p-3 font-bold">Available</th>
                  <th className="p-3 font-bold">Sold</th>
                  <th className="p-3 font-bold">Unit Price</th>
                  <th className="p-3 font-bold">Warehouse</th>
                  <th className="p-3 font-bold">Status</th>
                  <th className="p-3 font-bold text-right">Valuation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                {filteredFinished.map((f, idx) => (
                  <tr key={`${f.id}-${idx}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100 font-hanken text-sm">{f.productName}</div>
                      <div className="text-[10px] text-zinc-500">Style: {f.styleName}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{f.challanNumber || 'N/A'}</div>
                      <div className="text-[10px] text-zinc-400">PO: {f.productionOrderId || 'N/A'}</div>
                    </td>
                    <td className="p-3 text-zinc-800 dark:text-zinc-200">{f.totalProduced.toLocaleString()} pcs</td>
                    <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {f.availableQuantity.toLocaleString()} pcs
                    </td>
                    <td className="p-3 text-rose-600 dark:text-rose-400">{f.soldQuantity.toLocaleString()} pcs</td>
                    <td className="p-3 text-zinc-800 dark:text-zinc-200">
                      {f.unitPrice > 0 ? `₹${f.unitPrice.toLocaleString('en-IN')}` : <span className="text-zinc-400 text-[10px]">₹0</span>}
                    </td>
                    <td className="p-3 text-zinc-700 dark:text-zinc-300">{f.warehouse}</td>
                    <td className="p-3">{getFinStatusBadge(f.status)}</td>
                    <td className="p-3 font-bold text-right text-zinc-900 dark:text-zinc-100">
                      ₹{Math.round(f.availableQuantity * f.unitPrice).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Raw Inventory Details Modal */}
      <RawInventoryDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        item={selectedRawItem}
        onViewInvoice={handleOpenInvoiceFromDetails}
      />

      {/* Printable Purchase Bill & Material Details Modal */}
      <PurchaseBillModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        rawItem={selectedRawItem}
      />
    </div>
  );
};
