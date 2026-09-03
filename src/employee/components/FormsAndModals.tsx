import React, { useState } from 'react';
import { ProductionOrder, StockItem, Invoice, RawInventoryItem, FinishedInventoryItem } from '../../types';
import { X, Save, Sparkles, PackageCheck, ArrowRight, Layers, Building2 } from 'lucide-react';
import { useFabriqData } from '../../context/FabriqDataContext';

interface FormModalsProps {
  isOpen: boolean;
  onClose: () => void;
  formType: 'new_order' | 'add_stock' | 'invoice' | 'new_purchase' | 'add_customer' | null;
  onSubmitNewOrder: (order: any) => void;
  onSubmitAddStock: (stock: Omit<StockItem, 'id' | 'status'>) => void;
  onSubmitInvoice: (invoice: Omit<Invoice, 'id'>) => void;
  onSubmitPurchase?: (purchase: any) => void;
  onSubmitCustomer?: (customer: any) => void;
  stockItemsList?: StockItem[];
}

export default function FormsAndModals({
  isOpen,
  onClose,
  formType,
  onSubmitNewOrder,
  onSubmitAddStock,
  onSubmitInvoice,
  onSubmitPurchase,
  onSubmitCustomer,
  stockItemsList = []
}: FormModalsProps) {
  const { rawInventory, finishedInventory, customers, contractors, warehouses, addSale } = useFabriqData();
  const activeCustomers = customers || [];

  // New Order State
  const [orderName, setOrderName] = useState('');
  const [orderCollection, setOrderCollection] = useState('');
  const [orderStage, setOrderStage] = useState('Fabric Cutting');
  const [orderTotal, setOrderTotal] = useState(100);
  const [orderAssigned, setOrderAssigned] = useState(contractors[0]?.name || '');
  const [orderDueDate, setOrderDueDate] = useState('');
  const [selectedRawInvId, setSelectedRawInvId] = useState('');
  const [metersToUse, setMetersToUse] = useState(0);

  // Add Stock State
  const [isNewItemType, setIsNewItemType] = useState(false);
  const [selectedStockId, setSelectedStockId] = useState(stockItemsList[0]?.id || '');
  const [newItemName, setNewItemName] = useState('');
  const [newItemColor, setNewItemColor] = useState('');
  const [newItemSize, setNewItemSize] = useState('M');
  const [unitsToAdd, setUnitsToAdd] = useState(0);
  const [stockLocation, setStockLocation] = useState(warehouses[0]?.name || 'Main Warehouse');

  // Invoice / Sale State
  const [selectedCustId, setSelectedCustId] = useState(activeCustomers[0]?.id || '');
  const [selectedFinId, setSelectedFinId] = useState('');
  const [saleQuantity, setSaleQuantity] = useState(1);
  const [salePrice, setSalePrice] = useState(1200);

  // New Purchase State
  const [supplierName, setSupplierName] = useState('');
  const [purchaseMaterial, setPurchaseMaterial] = useState('Raw Denim Fabric');
  const [purchaseQty, setPurchaseQty] = useState(500);
  const [purchaseRate, setPurchaseRate] = useState(280);

  // New Customer State
  const [customerName, setCustomerName] = useState('');
  const [customerType, setCustomerType] = useState<'Wholesale' | 'Retailer' | 'Boutique' | 'Export'>('Wholesale');
  const [customerPhone, setCustomerPhone] = useState('');

  if (!isOpen || !formType) return null;

  const availableRawMaterials = rawInventory.filter(r => r.availableMeters > 0);
  const selectedRaw = rawInventory.find(r => r.id === selectedRawInvId);

  const availableFinished = finishedInventory.filter(f => f.availableQuantity > 0);
  const selectedFin = finishedInventory.find(f => f.id === selectedFinId);

  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderName.trim()) return;

    if (selectedRawInvId && selectedRaw) {
      if (metersToUse > selectedRaw.availableMeters) {
        alert(`Cannot use ${metersToUse}m — only ${selectedRaw.availableMeters}m available in stock!`);
        return;
      }
    }

    const code = `PRD-2026-${Math.floor(100 + Math.random() * 900)}`;

    onSubmitNewOrder({
      poCode: code,
      orderCode: code,
      name: orderName,
      styleName: orderName,
      collection: orderCollection,
      stage: orderStage,
      total: orderTotal,
      quantity: orderTotal,
      assignedTo: orderAssigned,
      contractorName: orderAssigned,
      dueDate: orderDueDate || '2026-03-15',
      status: 'In Progress',
      rawInventoryId: selectedRawInvId || undefined,
      rawBatchId: selectedRaw?.batchId || undefined,
      fabricName: selectedRaw?.fabricName || undefined,
      metersRequired: metersToUse || undefined,
      metersAllocated: metersToUse || undefined,
      producedItemName: orderName
    });

    setOrderName('');
    setSelectedRawInvId('');
    setMetersToUse(0);
    onClose();
  };

  const handleStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNewItemType) {
      if (!newItemName.trim()) return;
      onSubmitAddStock({
        name: newItemName,
        color: newItemColor,
        size: newItemSize,
        availableUnits: unitsToAdd,
        location: stockLocation
      });
    } else {
      const selectedItem = stockItemsList.find(x => x.id === selectedStockId);
      if (!selectedItem) return;
      onSubmitAddStock({
        name: selectedItem.name,
        color: selectedItem.color,
        size: selectedItem.size,
        availableUnits: unitsToAdd,
        location: stockLocation
      });
    }
    setNewItemName('');
    onClose();
  };

  const handleSaleOrInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find(c => c.id === selectedCustId) || { id: 'cust-1', name: 'Westside Retail Ltd' };

    if (selectedFinId && selectedFin) {
      if (saleQuantity > selectedFin.availableQuantity) {
        alert(`Cannot sell ${saleQuantity} — only ${selectedFin.availableQuantity} pcs available in Finished Goods!`);
        return;
      }

      await addSale({
        saleCode: `SALE-2026-${Math.floor(100 + Math.random() * 900)}`,
        customerId: cust.id,
        customerName: cust.name,
        items: [
          {
            finishedInventoryId: selectedFin.id,
            productName: selectedFin.productName,
            quantity: saleQuantity,
            unitPrice: salePrice || selectedFin.unitPrice || 1200,
            total: saleQuantity * (salePrice || selectedFin.unitPrice || 1200)
          }
        ],
        totalAmount: saleQuantity * (salePrice || selectedFin.unitPrice || 1200),
        saleDate: new Date().toISOString().substring(0, 10),
        status: 'Confirmed'
      });
    } else {
      onSubmitInvoice({
        client: cust.name,
        customerName: cust.name,
        date: new Date().toISOString().substring(0, 10),
        invoiceCode: `INV-2026-${Math.floor(100 + Math.random() * 900)}`,
        amount: saleQuantity * salePrice,
        status: 'Pending',
        itemsSummary: `${saleQuantity} Pcs Garments`
      });
    }

    onClose();
  };

  const handlePurchaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmitPurchase) {
      const totalAmount = purchaseQty * purchaseRate;
      onSubmitPurchase({
        billNumber: `RMI-2026-${Math.floor(100 + Math.random() * 900)}`,
        invoiceNumber: `PO-${Math.floor(1000 + Math.random() * 9000)}`,
        supplier: {
          name: supplierName || 'Arvind Denim Mills',
          contactPerson: 'Manager',
          phone: '+91 79 6826 8000',
          email: 'sales@arvinddenim.com',
          address: 'Ahmedabad Mill'
        },
        purchaseDate: new Date().toISOString().substring(0, 10),
        status: 'Received',
        paymentStatus: 'Paid',
        paymentMode: 'Bank Transfer',
        fabricName: purchaseMaterial,
        color: 'Indigo Blue',
        width: '58 inch',
        gsmWeight: '12 oz',
        rollQuantity: Math.ceil(purchaseQty / 50),
        meters: purchaseQty,
        rate: purchaseRate,
        totalAmount,
        warehouse: 'Main Godown',
        section: 'Raw Fabric',
        rack: 'A-12',
        batchNumber: `DF-2026-${Math.floor(100 + Math.random() * 900)}`,
        fabricMill: supplierName || 'Arvind Denim Mills'
      });
    }
    onClose();
  };

  const handleCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) return;
    if (onSubmitCustomer) {
      onSubmitCustomer({
        code: `CUST-${Math.floor(100 + Math.random() * 900)}`,
        name: customerName,
        type: customerType,
        contactPerson: customerName,
        email: `${customerName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        phone: customerPhone || '+91 98200 12345',
        address: '102 Fashion Avenue, Industrial Hub',
        creditLimit: 50000,
        outstandingBalance: 0,
        status: 'Active'
      });
    }
    setCustomerName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bento-card bg-white dark:bg-[#18181b] w-full max-w-md shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto custom-scrollbar select-none text-gray-900 dark:text-zinc-100 transition-all duration-300">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-400 dark:text-neutral-500 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* -------------------- New Production Order Form -------------------- */}
        {formType === 'new_order' && (
          <form onSubmit={handleOrderSubmit} className="space-y-4">
            <div className="mb-4">
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold font-geist uppercase tracking-wider">
                <Sparkles className="w-4 h-4" /> Production Workflow
              </span>
              <h2 className="font-hanken font-extrabold text-xl md:text-2xl mt-1 text-gray-900 dark:text-neutral-100">
                Launch Production Run
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              {/* Raw Material Selection */}
              <div>
                <label className="block text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" /> 1. Select Raw Fabric (Pipeline)
                </label>
                <select
                  value={selectedRawInvId}
                  onChange={(e) => {
                    setSelectedRawInvId(e.target.value);
                    const mat = rawInventory.find(r => r.id === e.target.value);
                    if (mat && metersToUse === 0) setMetersToUse(Math.min(100, mat.availableMeters));
                  }}
                  className="w-full h-11 px-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm cursor-pointer"
                >
                  <option value="">— Select fabric from Raw Inventory —</option>
                  {availableRawMaterials.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.fabricName} ({r.color}) — {r.availableMeters}m available (Batch: {r.batchId})
                    </option>
                  ))}
                </select>
                {availableRawMaterials.length === 0 && (
                  <p className="text-[10px] text-amber-600 mt-1">⚠ No raw stock in inventory. Create a purchase first.</p>
                )}
              </div>

              {selectedRaw && (
                <div>
                  <div className="flex justify-between text-[11px] font-bold mb-1">
                    <span className="text-gray-500">Meters to Allocate</span>
                    <span className="text-emerald-600">Available: {selectedRaw.availableMeters}m</span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max={selectedRaw.availableMeters}
                    value={metersToUse}
                    onChange={(e) => setMetersToUse(Math.min(selectedRaw.availableMeters, parseInt(e.target.value) || 0))}
                    className="w-full h-11 px-3.5 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  />
                  <div className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">
                    <ArrowRight className="w-3 h-3" /> Will deduct {metersToUse}m from {selectedRaw.fabricName}.
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-wider mb-1">
                  Garment Style Name
                </label>
                <input
                  required
                  type="text"
                  value={orderName}
                  onChange={(e) => setOrderName(e.target.value)}
                  placeholder="e.g. Slim Fit Denim Jeans, Indigo Shirts"
                  className="w-full h-11 px-3.5 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-wider mb-1">
                    Current Stage
                  </label>
                  <select
                    value={orderStage}
                    onChange={(e) => setOrderStage(e.target.value)}
                    className="w-full h-11 px-3 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm cursor-pointer"
                  >
                    <option value="Cutting">Cutting</option>
                    <option value="Stitching">Stitching</option>
                    <option value="Washing">Washing</option>
                    <option value="Finishing">Finishing</option>
                    <option value="Quality Control">Quality Control</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-wider mb-1">
                    Target Batch Units
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={orderTotal}
                    onChange={(e) => setOrderTotal(parseInt(e.target.value) || 0)}
                    className="w-full h-11 px-3 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-wider mb-1">
                  Contractor Partner
                </label>
                <select
                  value={orderAssigned}
                  onChange={(e) => setOrderAssigned(e.target.value)}
                  className="w-full h-11 px-3 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm cursor-pointer"
                >
                  {contractors && contractors.length > 0 ? (
                    contractors.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))
                  ) : (
                    <option value="">-- No Contractors Configured --</option>
                  )}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 mt-4 cursor-pointer shadow-md shadow-emerald-600/10 active:scale-95 transition-all"
            >
              <Save className="w-4.5 h-4.5" /> Launch & Deduct Raw Stock
            </button>
          </form>
        )}

        {/* -------------------- Add Stock Quantity Form -------------------- */}
        {formType === 'add_stock' && (
          <form onSubmit={handleStockSubmit} className="space-y-4">
            <div className="mb-4">
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold font-geist uppercase tracking-wider block">
                Warehouse Stock
              </span>
              <h2 className="font-hanken font-extrabold text-xl md:text-2xl mt-1 text-gray-900 dark:text-neutral-100">
                Log Warehouse SKU
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-wider mb-1">
                  Item Description
                </label>
                <input
                  required
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. 12oz Indigo Denim Roll"
                  className="w-full h-11 px-3.5 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-wider mb-1">
                    Units to Allocate
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={unitsToAdd}
                    onChange={(e) => setUnitsToAdd(parseInt(e.target.value) || 0)}
                    className="w-full h-11 px-3.5 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-wider mb-1">
                    Warehouse Godown
                  </label>
                  <select
                    value={stockLocation}
                    onChange={(e) => setStockLocation(e.target.value)}
                    className="w-full h-11 px-3 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm cursor-pointer"
                  >
                    {warehouses && warehouses.length > 0 ? (
                      warehouses.map(w => (
                        <option key={w.id} value={w.name}>{w.name}</option>
                      ))
                    ) : (
                      <option value="Main Warehouse">Main Warehouse</option>
                    )}
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 mt-4 cursor-pointer shadow-md shadow-emerald-600/10 active:scale-95 transition-all"
            >
              <Save className="w-4.5 h-4.5" /> Submit Stock Entry
            </button>
          </form>
        )}

        {/* -------------------- New Sale / Invoice Form -------------------- */}
        {formType === 'invoice' && (
          <form onSubmit={handleSaleOrInvoiceSubmit} className="space-y-4">
            <div className="mb-4">
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold font-geist uppercase tracking-wider block">
                Sales & Invoicing Workflow
              </span>
              <h2 className="font-hanken font-extrabold text-xl md:text-2xl mt-1 text-gray-900 dark:text-neutral-100">
                Create Sale & Auto-Invoice
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-wider mb-1">
                  Customer Account
                </label>
                <select
                  value={selectedCustId || activeCustomers[0]?.id || ''}
                  onChange={(e) => setSelectedCustId(e.target.value)}
                  className="w-full h-11 px-3 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm cursor-pointer"
                >
                  {activeCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type}) — {c.phone}
                    </option>
                  ))}
                </select>
                {/* Live Customer Preview */}
                {(() => {
                  const currCust = activeCustomers.find(c => c.id === (selectedCustId || activeCustomers[0]?.id)) || activeCustomers[0];
                  if (!currCust) return null;
                  return (
                    <div className="mt-2 p-2.5 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center justify-between">
                      <div className="text-xs">
                        <span className="font-bold text-emerald-900 dark:text-emerald-200">{currCust.name}</span>
                        <span className="text-[10px] text-emerald-600 block">{currCust.type} • {currCust.phone}</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 rounded">
                        BILL TO
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Finished Goods Selection */}
              <div>
                <label className="block text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <PackageCheck className="w-3.5 h-3.5" /> Product from Finished Goods
                </label>
                <select
                  value={selectedFinId}
                  onChange={(e) => {
                    setSelectedFinId(e.target.value);
                    const item = finishedInventory.find(f => f.id === e.target.value);
                    if (item) setSalePrice(item.unitPrice || 1200);
                  }}
                  className="w-full h-11 px-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm cursor-pointer"
                >
                  <option value="">— Select from Finished Inventory —</option>
                  {availableFinished.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.productName} — {f.availableQuantity} pcs available
                    </option>
                  ))}
                </select>
                {availableFinished.length === 0 && (
                  <p className="text-[10px] text-amber-600 mt-1">⚠ No finished goods in inventory. Complete a production order first.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-[11px] font-bold mb-1">
                    <span className="text-gray-500">Sale Quantity</span>
                    {selectedFin && <span className="text-emerald-600">Max: {selectedFin.availableQuantity}</span>}
                  </div>
                  <input
                    type="number"
                    min="1"
                    max={selectedFin ? selectedFin.availableQuantity : 9999}
                    value={saleQuantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      setSaleQuantity(selectedFin ? Math.min(selectedFin.availableQuantity, val) : val);
                    }}
                    className="w-full h-11 px-3.5 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-wider mb-1">
                    Price per Unit (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={salePrice}
                    onChange={(e) => setSalePrice(parseFloat(e.target.value) || 0)}
                    className="w-full h-11 px-3.5 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex justify-between items-center text-xs font-mono font-bold">
                <span>Calculated Total:</span>
                <span className="text-emerald-700 dark:text-emerald-400 text-sm">₹{(saleQuantity * salePrice).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 mt-4 cursor-pointer shadow-md shadow-emerald-600/10 active:scale-95 transition-all"
            >
              <Save className="w-4.5 h-4.5" /> Confirm Sale & Auto-Generate Invoice
            </button>
          </form>
        )}

        {/* -------------------- New Purchase Form -------------------- */}
        {formType === 'new_purchase' && (
          <form onSubmit={handlePurchaseSubmit} className="space-y-4">
            <div className="mb-4">
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold font-geist uppercase tracking-wider block">
                Procurement Entry
              </span>
              <h2 className="font-hanken font-extrabold text-xl md:text-2xl mt-1 text-gray-900 dark:text-neutral-100">
                Log New Purchase Bill
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-wider mb-1">
                  Supplier Mill
                </label>
                <input
                  required
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="Arvind Denim Mills / Raymond"
                  className="w-full h-11 px-3.5 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-wider mb-1">
                  Fabric Type
                </label>
                <input
                  required
                  type="text"
                  value={purchaseMaterial}
                  onChange={(e) => setPurchaseMaterial(e.target.value)}
                  placeholder="e.g. Rigid Denim, Stretch Denim"
                  className="w-full h-11 px-3.5 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-wider mb-1">
                    Quantity (Meters)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={purchaseQty}
                    onChange={(e) => setPurchaseQty(parseInt(e.target.value) || 0)}
                    className="w-full h-11 px-3.5 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-wider mb-1">
                    Rate / Meter (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={purchaseRate}
                    onChange={(e) => setPurchaseRate(parseFloat(e.target.value) || 0)}
                    className="w-full h-11 px-3.5 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex justify-between items-center text-xs font-mono font-bold">
                <span>Total Amount:</span>
                <span className="text-emerald-700 dark:text-emerald-400 text-sm">₹{(purchaseQty * purchaseRate).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 mt-4 cursor-pointer shadow-md shadow-emerald-600/10 active:scale-95 transition-all"
            >
              <Save className="w-4.5 h-4.5" /> Save Purchase → Auto-add to Raw Stock
            </button>
          </form>
        )}

        {/* -------------------- Add Customer Form -------------------- */}
        {formType === 'add_customer' && (
          <form onSubmit={handleCustomerSubmit} className="space-y-4">
            <div className="mb-4">
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold font-geist uppercase tracking-wider block">
                CRM Master Data
              </span>
              <h2 className="font-hanken font-extrabold text-xl md:text-2xl mt-1 text-gray-900 dark:text-neutral-100">
                Register New Customer
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-wider mb-1">
                  Customer / Business Name
                </label>
                <input
                  required
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Metro Fashion Outlets"
                  className="w-full h-11 px-3.5 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-wider mb-1">
                    Customer Category
                  </label>
                  <select
                    value={customerType}
                    onChange={(e) => setCustomerType(e.target.value as any)}
                    className="w-full h-11 px-3 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm cursor-pointer"
                  >
                    <option value="Wholesale">Wholesale</option>
                    <option value="Retailer">Retailer</option>
                    <option value="Boutique">Boutique</option>
                    <option value="Export">Export</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+91 98200 12345"
                    className="w-full h-11 px-3.5 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 mt-4 cursor-pointer shadow-md shadow-emerald-600/10 active:scale-95 transition-all"
            >
              <Save className="w-4.5 h-4.5" /> Save Customer Record
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
