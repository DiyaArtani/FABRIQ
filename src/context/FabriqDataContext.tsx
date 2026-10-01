import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  ProductionOrder,
  StockItem,
  Invoice,
  InvoiceStatus,
  Notification,
  AppUser,
  Warehouse,
  Contractor,
  Supplier,
  Customer,
  AuditLog,
  SystemSettings,
  RawInventoryItem,
  FinishedInventoryItem,
  SaleOrder,
  SaleLineItem,
  InvoiceLineItem,
  Purchase,
  PurchaseItem,
  StageHistoryEntry
} from '../types';
import {
  INITIAL_PRODUCTION_ORDERS,
  INITIAL_STOCK_ITEMS,
  INITIAL_INVOICES,
  INITIAL_NOTIFICATIONS,
  MOCK_PURCHASES
} from '../data';
import {
  INITIAL_USERS,
  INITIAL_WAREHOUSES,
  INITIAL_CONTRACTORS,
  INITIAL_SUPPLIERS,
  INITIAL_CUSTOMERS,
  INITIAL_AUDIT_LOGS
} from '../data/initialMasterData';
import { isFirebaseConfigured, db, createFirebaseAuthUser } from '../lib/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import {
  COLLECTIONS,
  subscribeCollection,
  subscribeDocument,
  saveDocument,
  removeDocument,
  seedFirestoreDatabase
} from '../services/firebaseService';
import { sortLatest } from '../utils/sortUtils';
import { getNextInvoiceNumber } from '../lib/invoiceUtils';
import { getNextSupplierId } from '../utils/supplierUtils';

interface FabriqDataContextType {
  // Firebase state flag & error tracking
  isFirebaseConnected: boolean;
  firebaseError: string | null;
  seedFirestore: () => Promise<{ success: boolean; message: string }>;

  // Data arrays
  productionOrders: ProductionOrder[];
  stockItems: StockItem[];
  invoices: Invoice[];
  notifications: Notification[];
  users: AppUser[];
  warehouses: Warehouse[];
  contractors: Contractor[];
  suppliers: Supplier[];
  customers: Customer[];
  purchases: Purchase[];
  auditLogs: AuditLog[];
  settings: SystemSettings;
  rawInventory: RawInventoryItem[];
  finishedInventory: FinishedInventoryItem[];
  sales: SaleOrder[];

  // Master Data CRUD - Users
  addUser: (user: Omit<AppUser, 'id' | 'createdAt'>) => void;
  updateUser: (user: AppUser) => void;
  toggleUserStatus: (id: string) => void;
  deleteUser: (id: string) => void;

  // Master Data CRUD - Warehouses
  addWarehouse: (warehouse: Omit<Warehouse, 'id'>) => void;
  updateWarehouse: (warehouse: Warehouse) => void;
  deleteWarehouse: (id: string) => void;

  // Master Data CRUD - Contractors
  addContractor: (contractor: Omit<Contractor, 'id'>) => void;
  updateContractor: (contractor: Contractor) => void;
  deleteContractor: (id: string) => void;

  // Master Data CRUD - Suppliers
  addSupplier: (supplier: Omit<Supplier, 'id'>) => void;
  updateSupplier: (supplier: Supplier) => void;
  deleteSupplier: (id: string) => void;

  // Master Data CRUD - Customers
  addCustomer: (customer: Omit<Customer, 'id'>) => void;
  updateCustomer: (customer: Customer) => void;
  deleteCustomer: (id: string) => void;

  // Operational Data CRUD - Purchases
  addPurchase: (purchase: Omit<Purchase, 'id' | 'createdAt'> | Purchase) => void;
  updatePurchase: (purchase: Purchase) => void;
  deletePurchase: (id: string) => void;

  // Operational Data CRUD - Production
  addProductionOrder: (order: Omit<ProductionOrder, 'id'>) => void;
  updateProductionOrder: (order: ProductionOrder) => void;
  deleteProductionOrder: (id: string) => void;

  // Operational Data CRUD - Inventory
  addStockItem: (item: Omit<StockItem, 'id'>) => void;
  updateStockItem: (item: StockItem) => void;
  deleteStockItem: (id: string) => void;

  // Operational Data CRUD - Sales / Invoices
  addInvoice: (invoice: Omit<Invoice, 'id'>) => void;
  updateInvoice: (invoice: Invoice) => void;
  deleteInvoice: (id: string) => void;

  // === Connected Pipeline CRUD ===
  updateRawInventoryItem: (item: RawInventoryItem) => void;
  updateFinishedInventoryItem: (item: FinishedInventoryItem) => void;
  addSale: (sale: Omit<SaleOrder, 'id' | 'createdAt' | 'invoiceId'>) => Promise<{ sale: SaleOrder; invoice: Invoice }>;
  updateSale: (sale: SaleOrder) => void;
  deleteSale: (id: string) => void;

  // Notifications, Audit & Settings
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  addAuditLog: (actor: string, action: string, module: string, details: string) => void;
  updateSettings: (newSettings: Partial<SystemSettings>) => void;
  resetAllDataToDefaults: () => void;
}

const FabriqDataContext = createContext<FabriqDataContextType | undefined>(undefined);

export const FabriqDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>(() => sortLatest(INITIAL_PRODUCTION_ORDERS));
  const [stockItems, setStockItems] = useState<StockItem[]>(() => sortLatest(INITIAL_STOCK_ITEMS));
  const [invoices, setInvoices] = useState<Invoice[]>(() => sortLatest(INITIAL_INVOICES));
  const [notifications, setNotifications] = useState<Notification[]>(() => sortLatest(INITIAL_NOTIFICATIONS));
  const [users, setUsers] = useState<AppUser[]>(() => sortLatest(INITIAL_USERS));
  const [warehouses, setWarehouses] = useState<Warehouse[]>(() => sortLatest(INITIAL_WAREHOUSES));
  const [contractors, setContractors] = useState<Contractor[]>(() => sortLatest(INITIAL_CONTRACTORS));
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => sortLatest(INITIAL_SUPPLIERS));
  const [customers, setCustomers] = useState<Customer[]>(() => sortLatest(INITIAL_CUSTOMERS));
  const [purchases, setPurchases] = useState<Purchase[]>(() => sortLatest(MOCK_PURCHASES));
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => sortLatest(INITIAL_AUDIT_LOGS));
  const [settings, setSettings] = useState<SystemSettings>({
    companyName: '',
    gstin: '',
    currencySymbol: '₹',
    defaultTaxRate: 18,
    adminNotificationEmail: '',
    inventoryAlertThreshold: 0,
    firebaseConfigured: isFirebaseConfigured,
    ledgerTheme: ''
  });
  const [rawInventory, setRawInventory] = useState<RawInventoryItem[]>([]);
  const [finishedInventory, setFinishedInventory] = useState<FinishedInventoryItem[]>([]);
  const [sales, setSales] = useState<SaleOrder[]>([]);

  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  // Firestore Real-time Subscriptions (Pure live database streams)
  useEffect(() => {
    if (!isFirebaseConfigured || !db) return;

    const unsubs: Array<(() => void) | null> = [
      subscribeCollection<AppUser>(
        COLLECTIONS.USERS,
        (items) => {
          setUsers(sortLatest(items));
          setFirebaseError(null);
        },
        (err) => setFirebaseError(err?.message || 'Firebase permission error on users collection')
      ),
      subscribeCollection<Warehouse>(COLLECTIONS.WAREHOUSES, (items) => { setWarehouses(sortLatest(items)); }, (err) => setFirebaseError(err?.message)),
      subscribeCollection<Contractor>(COLLECTIONS.CONTRACTORS, (items) => { setContractors(sortLatest(items)); }, (err) => setFirebaseError(err?.message)),
      subscribeCollection<Supplier>(COLLECTIONS.SUPPLIERS, (items) => { setSuppliers(sortLatest(items)); }, (err) => setFirebaseError(err?.message)),
      subscribeCollection<Customer>(COLLECTIONS.CUSTOMERS, (items) => { setCustomers(sortLatest(items)); }, (err) => setFirebaseError(err?.message)),
      subscribeCollection<Purchase>(COLLECTIONS.PURCHASES, (items) => { setPurchases(sortLatest(items)); }, (err) => setFirebaseError(err?.message)),
      subscribeCollection<ProductionOrder>(COLLECTIONS.PRODUCTION_ORDERS, (items) => { setProductionOrders(sortLatest(items)); }, (err) => setFirebaseError(err?.message)),
      subscribeCollection<StockItem>(COLLECTIONS.STOCK_ITEMS, (items) => { setStockItems(sortLatest(items)); }, (err) => setFirebaseError(err?.message)),
      subscribeCollection<Invoice>(COLLECTIONS.INVOICES, (items) => { setInvoices(sortLatest(items)); }, (err) => setFirebaseError(err?.message)),
      subscribeCollection<AuditLog>(COLLECTIONS.AUDIT_LOGS, (items) => { setAuditLogs(sortLatest(items)); }, (err) => setFirebaseError(err?.message)),
      subscribeDocument<SystemSettings>(COLLECTIONS.SETTINGS, 'global', (data) => {
        if (data) setSettings(prev => ({ ...prev, ...data, firebaseConfigured: true }));
      }),
      // Connected Pipeline collections
      subscribeCollection<RawInventoryItem>(COLLECTIONS.RAW_INVENTORY, (items) => { setRawInventory(sortLatest(items)); }, (err) => setFirebaseError(err?.message)),
      subscribeCollection<FinishedInventoryItem>(COLLECTIONS.FINISHED_INVENTORY, (items) => { setFinishedInventory(sortLatest(items)); }, (err) => setFirebaseError(err?.message)),
      subscribeCollection<SaleOrder>(COLLECTIONS.SALES, (items) => { setSales(sortLatest(items)); }, (err) => setFirebaseError(err?.message)),
    ];

    return () => {
      unsubs.forEach((unsub) => unsub && unsub());
    };
  }, []);

  // Notifications Helpers
  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  // Audit Log Helper
  const addAuditLog = (actor: string, action: string, module: string, details: string) => {
    const now = new Date();
    const dateStr = now.toISOString().replace('T', ' ').substring(0, 19);
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: dateStr,
      actor,
      action,
      module,
      details,
      ipAddress: '127.0.0.1'
    };
    setAuditLogs(prev => [newLog, ...prev]);
    if (isFirebaseConfigured) {
      saveDocument(COLLECTIONS.AUDIT_LOGS, newLog).catch(console.error);
    }
  };

  // User Actions
  const addUser = (userData: Omit<AppUser, 'id' | 'createdAt'> | AppUser) => {
    let empId = userData.employeeId;
    if (!empId || empId.trim() === '') {
      let maxId = 0;
      users.forEach((u) => {
        if (u.employeeId) {
          const match = u.employeeId.match(/EMP-?(\d+)/i) || u.employeeId.match(/(\d+)/);
          if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxId) maxId = num;
          }
        }
      });
      empId = `EMP-${String(maxId + 1).padStart(3, '0')}`;
    }

    const newU: AppUser = {
      ...userData,
      employeeId: empId,
      id: (userData as AppUser).id || `u-${Date.now()}`,
      createdAt: (userData as AppUser).createdAt || new Date().toISOString().substring(0, 10),
      lastLogin: (userData as AppUser).lastLogin || 'Never',
      pin: userData.pin || ''
    };

    setUsers(prev => sortLatest([newU, ...prev.filter(u => u.id !== newU.id)]));
    if (isFirebaseConfigured) {
      saveDocument(COLLECTIONS.USERS, newU).catch(console.error);
      if (newU.email) {
        const rawPass = (newU.password || newU.pin || '123456').trim();
        const authPass = rawPass.length >= 6 ? rawPass : rawPass.padEnd(6, '0');
        createFirebaseAuthUser(newU.email, authPass, newU.name).catch((err) => {
          console.warn('Firebase Auth registration notice for user:', err?.message);
        });
      }
    }
    addAuditLog('Admin', 'USER_CREATE', 'User Management', `Created user account for ${newU.name} (${newU.role})`);
  };

  const updateUser = (updatedUser: AppUser) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (isFirebaseConfigured) saveDocument(COLLECTIONS.USERS, updatedUser).catch(console.error);
    addAuditLog('Admin', 'USER_UPDATE', 'User Management', `Updated profile/role for user ${updatedUser.name}`);
  };

  const toggleUserStatus = (id: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === id) {
        const nextStatus = u.status === 'Active' ? 'Disabled' : 'Active';
        const updated = { ...u, status: nextStatus };
        if (isFirebaseConfigured) saveDocument(COLLECTIONS.USERS, updated).catch(console.error);
        addAuditLog('Admin', 'USER_STATUS_TOGGLE', 'User Management', `Changed status of ${u.name} to ${nextStatus}`);
        return updated;
      }
      return u;
    }));
  };

  const deleteUser = (id: string) => {
    const target = users.find(u => u.id === id);
    setUsers(prev => prev.filter(u => u.id !== id));
    if (isFirebaseConfigured) removeDocument(COLLECTIONS.USERS, id).catch(console.error);
    if (target) {
      addAuditLog('Admin', 'USER_DELETE', 'User Management', `Permanently removed user ${target.name} (${target.employeeId})`);
    }
  };

  // Warehouse Actions
  const addWarehouse = (data: Omit<Warehouse, 'id'> & { id?: string }) => {
    const newId = (data as any).id?.trim() || `w-${Date.now()}`;
    const cleanCode = data.code?.trim() || newId;
    const newW: Warehouse = {
      ...data,
      id: newId,
      code: cleanCode,
      createdAt: (data as any).createdAt || new Date().toISOString()
    };
    setWarehouses(prev => sortLatest([newW, ...prev]));
    if (isFirebaseConfigured) saveDocument(COLLECTIONS.WAREHOUSES, newW, newId).catch(console.error);
    addAuditLog('Admin', 'WAREHOUSE_CREATE', 'Master Data', `Added new warehouse facility ${newW.name} (${cleanCode})`);
  };

  const updateWarehouse = (data: Warehouse) => {
    const oldWarehouse = warehouses.find(w => w.id === data.id);
    const oldName = oldWarehouse?.name?.trim();
    const oldCode = oldWarehouse?.code?.trim();
    const newName = data.name.trim();

    setWarehouses(prev => prev.map(w => w.id === data.id ? data : w));

    if (oldName && oldName.toLowerCase() !== newName.toLowerCase()) {
      // 1. Cascade to Purchases
      setPurchases(prev => prev.map(p => {
        const pWh = (p.warehouse || '').trim();
        const pWhLoc = (p.warehouseLocation || '').trim();
        const matches = pWh.toLowerCase() === oldName.toLowerCase() || (oldCode && pWh.toLowerCase() === oldCode.toLowerCase()) ||
                        pWhLoc.toLowerCase() === oldName.toLowerCase() || (oldCode && pWhLoc.toLowerCase() === oldCode.toLowerCase());
        if (matches) {
          const updatedP = { ...p, warehouse: newName, warehouseLocation: newName };
          if (isFirebaseConfigured) saveDocument(COLLECTIONS.PURCHASES, updatedP, updatedP.id).catch(console.error);
          return updatedP;
        }
        return p;
      }));

      // 2. Cascade to Raw Inventory
      setRawInventory(prev => prev.map(r => {
        const rWh = (r.warehouse || '').trim();
        if (rWh.toLowerCase() === oldName.toLowerCase() || (oldCode && rWh.toLowerCase() === oldCode.toLowerCase())) {
          const updatedR = { ...r, warehouse: newName };
          if (isFirebaseConfigured) saveDocument(COLLECTIONS.RAW_INVENTORY, updatedR, updatedR.id).catch(console.error);
          return updatedR;
        }
        return r;
      }));

      // 3. Cascade to Finished Goods Inventory
      setFinishedInventory(prev => prev.map(f => {
        const fWh = (f.warehouse || '').trim();
        if (fWh.toLowerCase() === oldName.toLowerCase() || (oldCode && fWh.toLowerCase() === oldCode.toLowerCase())) {
          const updatedF = { ...f, warehouse: newName };
          if (isFirebaseConfigured) saveDocument(COLLECTIONS.FINISHED_INVENTORY, updatedF, updatedF.id).catch(console.error);
          return updatedF;
        }
        return f;
      }));

      // 4. Cascade to Production Orders
      setProductionOrders(prev => prev.map(po => {
        let poWh = (po.warehouse || '').trim();
        let poGodown = (po.godown || '').trim();
        let changed = false;
        if (poWh.toLowerCase() === oldName.toLowerCase() || (oldCode && poWh.toLowerCase() === oldCode.toLowerCase())) {
          poWh = newName;
          changed = true;
        }
        if (poGodown.toLowerCase() === oldName.toLowerCase() || (oldCode && poGodown.toLowerCase() === oldCode.toLowerCase())) {
          poGodown = newName;
          changed = true;
        }
        if (changed) {
          const updatedPo = { ...po, warehouse: poWh, godown: poGodown };
          if (isFirebaseConfigured) saveDocument(COLLECTIONS.PRODUCTION_ORDERS, updatedPo, updatedPo.id).catch(console.error);
          return updatedPo;
        }
        return po;
      }));
    }

    if (isFirebaseConfigured) saveDocument(COLLECTIONS.WAREHOUSES, data).catch(console.error);
    addAuditLog('Admin', 'WAREHOUSE_UPDATE', 'Master Data', `Updated facility details for ${data.name} (Cascaded to linked purchases, inventory & orders)`);
  };

  const deleteWarehouse = (id: string) => {
    const target = warehouses.find(w => w.id === id);
    const targetName = target?.name?.trim();
    const targetCode = target?.code?.trim();
    const fallbackWarehouse = warehouses.find(w => w.id !== id)?.name || 'Main Godown';

    setWarehouses(prev => prev.filter(w => w.id !== id));

    if (targetName) {
      // Reassign inventory and purchases from deleted warehouse to fallback warehouse
      setPurchases(prev => prev.map(p => {
        const pWh = (p.warehouse || '').trim().toLowerCase();
        if (pWh === targetName.toLowerCase() || (targetCode && pWh === targetCode.toLowerCase())) {
          return { ...p, warehouse: fallbackWarehouse, warehouseLocation: fallbackWarehouse };
        }
        return p;
      }));

      setRawInventory(prev => prev.map(r => {
        const rWh = (r.warehouse || '').trim().toLowerCase();
        if (rWh === targetName.toLowerCase() || (targetCode && rWh === targetCode.toLowerCase())) {
          return { ...r, warehouse: fallbackWarehouse };
        }
        return r;
      }));

      setFinishedInventory(prev => prev.map(f => {
        const fWh = (f.warehouse || '').trim().toLowerCase();
        if (fWh === targetName.toLowerCase() || (targetCode && fWh === targetCode.toLowerCase())) {
          return { ...f, warehouse: fallbackWarehouse };
        }
        return f;
      }));
    }

    if (isFirebaseConfigured) removeDocument(COLLECTIONS.WAREHOUSES, id).catch(console.error);
    if (target) {
      addAuditLog('Admin', 'WAREHOUSE_DELETE', 'Master Data', `Deleted warehouse ${target.name} (Stock reassigned to ${fallbackWarehouse})`);
    }
  };

  // Contractor Actions
  const addContractor = (data: Omit<Contractor, 'id'> & { id?: string }) => {
    const newId = (data as any).id?.trim() || `c-${Date.now()}`;
    const cleanCode = data.code?.trim() || newId;
    const newC: Contractor = {
      ...data,
      id: newId,
      code: cleanCode,
      createdAt: (data as any).createdAt || new Date().toISOString()
    };
    setContractors(prev => sortLatest([newC, ...prev]));
    if (isFirebaseConfigured) saveDocument(COLLECTIONS.CONTRACTORS, newC, newId).catch(console.error);
    addAuditLog('Admin', 'CONTRACTOR_CREATE', 'Master Data', `Registered new contractor ${newC.name} (${cleanCode})`);
  };

  const updateContractor = (data: Contractor) => {
    const oldContractor = contractors.find(c => c.id === data.id);
    const oldName = oldContractor?.name?.trim();
    const newName = data.name.trim();

    setContractors(prev => prev.map(c => c.id === data.id ? data : c));

    // Cascade to active production orders and stage execution histories
    setProductionOrders(prev => prev.map(po => {
      let changed = false;
      let updatedAssignedTo = po.assignedTo;
      let updatedContractorName = po.contractorName;
      let updatedCutting = po.cuttingContractor;
      let updatedStitching = po.stitchingContractor;
      let updatedWashing = po.washingContractor;
      let updatedPackaging = po.packagingContractor;
      const updatedStageContractors = { ...(po.stageContractors || {}) };

      if (oldName && oldName.toLowerCase() !== newName.toLowerCase()) {
        if (po.contractorName?.trim().toLowerCase() === oldName.toLowerCase()) {
          updatedContractorName = newName;
          changed = true;
        }
        if (po.assignedTo?.trim().toLowerCase() === oldName.toLowerCase()) {
          updatedAssignedTo = newName;
          changed = true;
        }
        if (po.cuttingContractor?.trim().toLowerCase() === oldName.toLowerCase()) {
          updatedCutting = newName;
          changed = true;
        }
        if (po.stitchingContractor?.trim().toLowerCase() === oldName.toLowerCase()) {
          updatedStitching = newName;
          changed = true;
        }
        if (po.washingContractor?.trim().toLowerCase() === oldName.toLowerCase()) {
          updatedWashing = newName;
          changed = true;
        }
        if (po.packagingContractor?.trim().toLowerCase() === oldName.toLowerCase()) {
          updatedPackaging = newName;
          changed = true;
        }
        Object.keys(updatedStageContractors).forEach(k => {
          if (updatedStageContractors[k]?.trim().toLowerCase() === oldName.toLowerCase()) {
            updatedStageContractors[k] = newName;
            changed = true;
          }
        });
      }

      // Update stageHistory entries matching contractorId or contractorName
      const updatedStageHistory = (po.stageHistory || []).map(entry => {
        const matchesId = entry.contractorId && entry.contractorId === data.id;
        const matchesName = oldName && entry.contractorName?.trim().toLowerCase() === oldName.toLowerCase();
        if (matchesId || matchesName) {
          changed = true;
          return {
            ...entry,
            contractorId: data.id,
            contractorName: newName,
            contractorPhone: data.phone || entry.contractorPhone,
            contractorLocation: data.location || entry.contractorLocation
          };
        }
        return entry;
      });

      if (changed) {
        const updatedPo: ProductionOrder = {
          ...po,
          assignedTo: updatedAssignedTo,
          contractorName: updatedContractorName,
          cuttingContractor: updatedCutting,
          stitchingContractor: updatedStitching,
          washingContractor: updatedWashing,
          packagingContractor: updatedPackaging,
          stageContractors: updatedStageContractors,
          stageHistory: updatedStageHistory
        };
        if (isFirebaseConfigured) saveDocument(COLLECTIONS.PRODUCTION_ORDERS, updatedPo, updatedPo.id).catch(console.error);
        return updatedPo;
      }
      return po;
    }));

    if (isFirebaseConfigured) saveDocument(COLLECTIONS.CONTRACTORS, data).catch(console.error);
    addAuditLog('Admin', 'CONTRACTOR_UPDATE', 'Master Data', `Updated contractor ${data.name} (Cascaded to active production orders & stage history)`);
  };

  const deleteContractor = (id: string) => {
    const target = contractors.find(c => c.id === id);
    setContractors(prev => prev.filter(c => c.id !== id));
    if (isFirebaseConfigured) removeDocument(COLLECTIONS.CONTRACTORS, id).catch(console.error);
    if (target) {
      addAuditLog('Admin', 'CONTRACTOR_DELETE', 'Master Data', `Removed contractor ${target.name}`);
    }
  };

  // Supplier Actions
  const addSupplier = (data: Omit<Supplier, 'id'> & { id?: string }) => {
    let cleanCode = data.code?.trim() || data.supplierId?.trim();
    if (!cleanCode || cleanCode.match(/^sup-\d{5,}$/i)) {
      cleanCode = getNextSupplierId(suppliers);
    }
    const newId = data.id?.trim() && !data.id.match(/^sup-\d{5,}$/i) ? data.id.trim() : cleanCode;
    const newS: Supplier = {
      ...data,
      id: newId,
      code: cleanCode,
      supplierId: cleanCode,
      createdAt: (data as any).createdAt || new Date().toISOString()
    };
    setSuppliers(prev => sortLatest([newS, ...prev]));
    if (isFirebaseConfigured) saveDocument(COLLECTIONS.SUPPLIERS, newS, newId).catch(console.error);
    addAuditLog('Admin', 'SUPPLIER_CREATE', 'Master Data', `Onboarded new supplier ${newS.name} (${cleanCode})`);
  };

  const updateSupplier = (data: Supplier) => {
    const cleanCode = data.code?.trim() || data.supplierId?.trim() || data.id;
    const oldSupplier = suppliers.find(s => s.id === data.id);
    const oldName = oldSupplier?.name?.trim();
    const newName = data.name.trim();
    const updated: Supplier = { ...data, code: cleanCode, supplierId: cleanCode };

    setSuppliers(prev => prev.map(s => s.id === data.id ? updated : s));

    if (oldName && oldName.toLowerCase() !== newName.toLowerCase()) {
      // 1. Cascade to Purchases
      setPurchases(prev => prev.map(p => {
        const pSuppName = typeof p.supplier === 'string' ? p.supplier : p.supplier?.name;
        if (pSuppName && pSuppName.trim().toLowerCase() === oldName.toLowerCase()) {
          const updatedP = {
            ...p,
            supplier: typeof p.supplier === 'object' ? { ...p.supplier, name: newName } : newName
          };
          if (isFirebaseConfigured) saveDocument(COLLECTIONS.PURCHASES, updatedP, updatedP.id).catch(console.error);
          return updatedP;
        }
        return p;
      }));

      // 2. Cascade to Raw Inventory
      setRawInventory(prev => prev.map(r => {
        if (r.supplierName && r.supplierName.trim().toLowerCase() === oldName.toLowerCase()) {
          const updatedR = { ...r, supplierName: newName };
          if (isFirebaseConfigured) saveDocument(COLLECTIONS.RAW_INVENTORY, updatedR, updatedR.id).catch(console.error);
          return updatedR;
        }
        return r;
      }));
    }

    if (isFirebaseConfigured) saveDocument(COLLECTIONS.SUPPLIERS, updated, data.id).catch(console.error);
    addAuditLog('Admin', 'SUPPLIER_UPDATE', 'Master Data', `Updated supplier ${data.name} (${cleanCode}) → Cascaded to purchases & raw inventory`);
  };

  const deleteSupplier = (id: string) => {
    const target = suppliers.find(s => s.id === id);
    setSuppliers(prev => prev.filter(s => s.id !== id));
    if (isFirebaseConfigured) removeDocument(COLLECTIONS.SUPPLIERS, id).catch(console.error);
    if (target) {
      addAuditLog('Admin', 'SUPPLIER_DELETE', 'Master Data', `Removed supplier ${target.name}`);
    }
  };

  // Customer Actions
  const addCustomer = (data: Omit<Customer, 'id'> & { id?: string }) => {
    const newId = (data as any).id?.trim() || `cust-${Date.now()}`;
    const cleanCode = data.code?.trim() || newId;
    const newCust: Customer = {
      ...data,
      id: newId,
      code: cleanCode,
      createdAt: (data as any).createdAt || new Date().toISOString()
    };
    setCustomers(prev => sortLatest([newCust, ...prev]));
    if (isFirebaseConfigured) saveDocument(COLLECTIONS.CUSTOMERS, newCust, newId).catch(console.error);
    addAuditLog('Admin', 'CUSTOMER_CREATE', 'Master Data', `Added customer account ${newCust.name} (${cleanCode})`);
  };

  const updateCustomer = (data: Customer) => {
    const oldCustomer = customers.find(c => c.id === data.id);
    const oldName = oldCustomer?.name?.trim();
    const newName = data.name.trim();

    setCustomers(prev => prev.map(c => c.id === data.id ? data : c));

    if (oldName && oldName.toLowerCase() !== newName.toLowerCase()) {
      // 1. Cascade to Sales Orders
      setSales(prev => prev.map(s => {
        if (s.customerName && s.customerName.trim().toLowerCase() === oldName.toLowerCase()) {
          const updatedS = {
            ...s,
            customerName: newName,
            customerPhone: data.phone || s.customerPhone,
            shippingAddress: data.address || s.shippingAddress
          };
          if (isFirebaseConfigured) saveDocument(COLLECTIONS.SALES, updatedS, updatedS.id).catch(console.error);
          return updatedS;
        }
        return s;
      }));

      // 2. Cascade to Invoices
      setInvoices(prev => prev.map(inv => {
        if (inv.customerName && inv.customerName.trim().toLowerCase() === oldName.toLowerCase()) {
          const updatedInv = {
            ...inv,
            client: newName,
            customerName: newName,
            customerPhone: data.phone || inv.customerPhone,
            customerAddress: data.address || inv.customerAddress,
            customerGstin: data.gstin || inv.customerGstin
          };
          if (isFirebaseConfigured) saveDocument(COLLECTIONS.INVOICES, updatedInv, updatedInv.id).catch(console.error);
          return updatedInv;
        }
        return inv;
      }));
    }

    if (isFirebaseConfigured) saveDocument(COLLECTIONS.CUSTOMERS, data).catch(console.error);
    addAuditLog('Admin', 'CUSTOMER_UPDATE', 'Master Data', `Updated customer account ${data.name} → Cascaded to sales & invoices`);
  };

  const deleteCustomer = (id: string) => {
    const target = customers.find(c => c.id === id);
    setCustomers(prev => prev.filter(c => c.id !== id));
    if (isFirebaseConfigured) removeDocument(COLLECTIONS.CUSTOMERS, id).catch(console.error);
    if (target) {
      addAuditLog('Admin', 'CUSTOMER_DELETE', 'Master Data', `Deleted customer ${target.name}`);
    }
  };

  // =====================================================================
  // 1. PIPELINE: Purchase → Raw Inventory
  // =====================================================================
  // Helper to compile RawInventoryItems from a Purchase (one per fabric item)
  const buildRawItemsFromPurchase = (p: Purchase): RawInventoryItem[] => {
    const billOrInv = p.billNumber || p.invoiceNumber || `BILL-${Date.now().toString().slice(-4)}`;
    const warehouse = p.warehouse?.trim() || p.warehouseLocation?.trim() || 'Main Godown';
    const supplierName = typeof p.supplier === 'string' ? p.supplier : (p.supplier?.name || 'Supplier');

    // Filter valid fabric items (with name or meters)
    const validItems = (p.items || []).filter(
      it => (Number(it.meters) || 0) > 0 || (it.fabricName && it.fabricName.trim().length > 0)
    );

    if (validItems.length > 0) {
      return validItems.map((item, index) => {
        const itemMeters = Number(item.meters) || Number(p.meters) || 0;
        const rawInvStatus = itemMeters > 200 ? 'Available' : (itemMeters > 0 ? 'Low' : 'Depleted');
        const rawInvId = `rinv-${p.id}-${index}`;
        return {
          id: rawInvId,
          purchaseId: p.id,
          batchId: p.invoiceNumber || p.billNumber || billOrInv,
          billNumber: p.billNumber || billOrInv,
          invoiceNumber: p.invoiceNumber || p.billNumber || billOrInv,
          fabricName: item.fabricName || p.fabricName || 'Raw Fabric',
          width: item.width || p.width || '58"',
          supplierName,
          totalMeters: itemMeters,
          availableMeters: itemMeters,
          allocatedMeters: 0,
          warehouse,
          costPerMeter: Number(item.rate) || Number(p.rate) || 0,
          status: rawInvStatus as RawInventoryItem['status'],
          createdAt: p.createdAt || p.purchaseDate || new Date().toISOString()
        };
      });
    }

    const meters = Number(p.meters) || 0;
    const rawInvStatus = meters > 200 ? 'Available' : (meters > 0 ? 'Low' : 'Depleted');
    return [{
      id: `rinv-${p.id}-0`,
      purchaseId: p.id,
      batchId: p.invoiceNumber || p.billNumber || billOrInv,
      billNumber: p.billNumber || billOrInv,
      invoiceNumber: p.invoiceNumber || p.billNumber || billOrInv,
      fabricName: p.fabricName || 'Raw Fabric',
      width: p.width || '58"',
      supplierName,
      totalMeters: meters,
      availableMeters: meters,
      allocatedMeters: 0,
      warehouse,
      costPerMeter: Number(p.rate) || 0,
      status: rawInvStatus as RawInventoryItem['status'],
      createdAt: p.createdAt || p.purchaseDate || new Date().toISOString()
    }];
  };

  // Auto-reconcile Raw Inventory from purchases:
  // Guarantees all Received purchases have corresponding raw inventory items in state & Firestore,
  // and guarantees warehouse storage location and supplier details stay synchronized.
  useEffect(() => {
    if (!purchases || purchases.length === 0) return;

    const receivedPurchases = purchases.filter(p => p.status === 'Received' || !p.status);
    if (receivedPurchases.length === 0) return;

    setRawInventory(prev => {
      let changed = false;
      const updatedList = [...prev];

      receivedPurchases.forEach(p => {
        const targetWarehouse = (p.warehouse || p.warehouseLocation || 'Main Godown').trim();
        const matchingExisting = updatedList.filter(
          r => r.purchaseId === p.id ||
               r.id === `rinv-${p.id}` ||
               r.id.startsWith(`rinv-${p.id}-`) ||
               (p.billNumber && (r.billNumber === p.billNumber || r.batchId === p.billNumber || r.purchaseId === p.billNumber)) ||
               (p.invoiceNumber && (r.invoiceNumber === p.invoiceNumber || r.batchId === p.invoiceNumber || r.purchaseId === p.invoiceNumber))
        );

        if (matchingExisting.length === 0) {
          const newItems = buildRawItemsFromPurchase(p);
          if (newItems.length > 0) {
            updatedList.push(...newItems);
            changed = true;
            if (isFirebaseConfigured && db) {
              newItems.forEach(item => {
                saveDocument(COLLECTIONS.RAW_INVENTORY, item, item.id).catch(console.error);
              });
            }
          }
        } else {
          // Align warehouse location and supplier if out of sync
          matchingExisting.forEach(ex => {
            if (targetWarehouse && ex.warehouse?.trim().toLowerCase() !== targetWarehouse.toLowerCase()) {
              ex.warehouse = targetWarehouse;
              changed = true;
              if (isFirebaseConfigured && db) {
                saveDocument(COLLECTIONS.RAW_INVENTORY, ex, ex.id).catch(console.error);
              }
            }
            const suppName = typeof p.supplier === 'string' ? p.supplier : p.supplier?.name;
            if (suppName && ex.supplierName?.trim().toLowerCase() !== suppName.trim().toLowerCase()) {
              ex.supplierName = suppName.trim();
              changed = true;
              if (isFirebaseConfigured && db) {
                saveDocument(COLLECTIONS.RAW_INVENTORY, ex, ex.id).catch(console.error);
              }
            }
          });
        }
      });

      return changed ? updatedList : prev;
    });
  }, [purchases]);

  const addPurchase = (data: Omit<Purchase, 'id' | 'createdAt'> | Purchase) => {
    const purchaseId = (data as Purchase).id || `p-${Date.now()}`;

    // Auto-generate unique Bill Number: BILL-YYYY-XXXX
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
    const autoBill = data.billNumber?.trim() || `BILL-${year}-${String(maxNum + 1).padStart(4, '0')}`;

    const newP: Purchase = {
      ...data,
      id: purchaseId,
      billNumber: autoBill,
      invoiceNumber: data.invoiceNumber?.trim() || autoBill,
      createdAt: (data as Purchase).createdAt || new Date().toISOString()
    };

    setPurchases(prev => [newP, ...prev.filter(p => p.id !== purchaseId)]);

    const isReceived = newP.status === 'Received' || !newP.status;
    let generatedRawItems: RawInventoryItem[] = [];

    if (isReceived) {
      generatedRawItems = buildRawItemsFromPurchase(newP);
      // Clean previous items for this purchase and insert the newly generated ones
      setRawInventory(prev => [
        ...generatedRawItems,
        ...prev.filter(r => r.purchaseId !== purchaseId && !r.id.startsWith(`rinv-${purchaseId}`))
      ]);
    }

    if (isFirebaseConfigured && db) {
      if (generatedRawItems.length > 0) {
        const batch = writeBatch(db);
        const purchaseRef = doc(db, COLLECTIONS.PURCHASES, purchaseId);
        batch.set(purchaseRef, JSON.parse(JSON.stringify(newP)), { merge: true });
        generatedRawItems.forEach(rawItem => {
          const rawRef = doc(db, COLLECTIONS.RAW_INVENTORY, rawItem.id);
          batch.set(rawRef, JSON.parse(JSON.stringify(rawItem)), { merge: true });
        });
        batch.commit().catch(err => {
          console.error('Firebase error saving purchase + raw inventory:', err);
          setFirebaseError(err?.message || 'Error saving purchase');
        });
      } else {
        saveDocument(COLLECTIONS.PURCHASES, newP, purchaseId).catch(console.error);
      }
    }

    const fabricSummary = newP.items && newP.items.length > 1
      ? `${newP.items.length} fabrics (${newP.meters}m)`
      : `${newP.meters}m ${newP.fabricName}`;

    addAuditLog('Admin', 'PURCHASE_CREATE', 'Purchase Management', `Created purchase bill ${newP.billNumber} for ${newP.supplier?.name || 'Supplier'} (${fabricSummary}) → Auto-added to Raw Inventory`);
  };

  const updatePurchase = (data: Purchase) => {
    const oldPurchase = purchases.find(p => p.id === data.id);
    const newWarehouse = (data.warehouse || data.warehouseLocation || 'Main Godown').trim();

    setPurchases(prev => prev.map(p => p.id === data.id ? data : p));

    // Comprehensive predicate to find all raw inventory items corresponding to this purchase
    const isMatchingRawItem = (r: RawInventoryItem) => {
      if (!r) return false;
      if (r.purchaseId === data.id) return true;
      if (r.id === `rinv-${data.id}` || r.id.startsWith(`rinv-${data.id}-`)) return true;
      if (oldPurchase) {
        if (oldPurchase.id && r.purchaseId === oldPurchase.id) return true;
        if (oldPurchase.billNumber && (r.purchaseId === oldPurchase.billNumber || r.billNumber === oldPurchase.billNumber || r.batchId === oldPurchase.billNumber)) return true;
        if (oldPurchase.invoiceNumber && (r.purchaseId === oldPurchase.invoiceNumber || r.invoiceNumber === oldPurchase.invoiceNumber || r.batchId === oldPurchase.invoiceNumber)) return true;
      }
      if (data.billNumber && (r.purchaseId === data.billNumber || r.billNumber === data.billNumber || r.batchId === data.billNumber)) return true;
      if (data.invoiceNumber && (r.purchaseId === data.invoiceNumber || r.invoiceNumber === data.invoiceNumber || r.batchId === data.invoiceNumber)) return true;
      return false;
    };

    let syncedRawIds: string[] = [];

    // When marked as Received, ensure stock is created/synced in Raw Inventory with the NEW warehouse location
    if (data.status === 'Received' || !data.status) {
      const generatedRawItems = buildRawItemsFromPurchase(data);

      setRawInventory(prev => {
        const existingMatches = prev.filter(isMatchingRawItem);

        const syncedItems = generatedRawItems.map((newR, idx) => {
          const existing = existingMatches.find(r => r.id === newR.id || r.fabricName?.trim().toLowerCase() === newR.fabricName?.trim().toLowerCase()) || existingMatches[idx];
          const allocated = existing ? (Number(existing.allocatedMeters) || 0) : 0;
          const total = Number(newR.totalMeters) || 0;
          const avail = Math.max(0, total - allocated);
          const rawStatus = avail > 200 ? 'Available' : (avail > 0 ? 'Low' : 'Depleted');

          return {
            ...newR,
            id: existing ? existing.id : newR.id,
            warehouse: newWarehouse, // Updated warehouse location!
            allocatedMeters: allocated,
            availableMeters: avail,
            status: rawStatus as RawInventoryItem['status'],
            supplierName: typeof data.supplier === 'string' ? data.supplier : (data.supplier?.name || 'Supplier'),
            billNumber: data.billNumber || newR.billNumber,
            invoiceNumber: data.invoiceNumber || data.billNumber || newR.invoiceNumber,
            batchId: data.invoiceNumber || data.billNumber || newR.batchId
          };
        });

        syncedRawIds = syncedItems.map(s => s.id);

        if (isFirebaseConfigured && db) {
          syncedItems.forEach(rawItem => {
            saveDocument(COLLECTIONS.RAW_INVENTORY, rawItem, rawItem.id).catch(console.error);
          });
          existingMatches.forEach(oldR => {
            if (!syncedRawIds.includes(oldR.id)) {
              removeDocument(COLLECTIONS.RAW_INVENTORY, oldR.id).catch(console.error);
            }
          });
        }

        // Clean out ALL old records matching this purchase and replace with synced items in the new warehouse
        return [...syncedItems, ...prev.filter(r => !isMatchingRawItem(r))];
      });
    } else {
      // If purchase status is no longer Received, remove all corresponding raw inventory stock
      setRawInventory(prev => {
        const toDelete = prev.filter(isMatchingRawItem);
        if (isFirebaseConfigured && db) {
          toDelete.forEach(r => removeDocument(COLLECTIONS.RAW_INVENTORY, r.id).catch(console.error));
        }
        return prev.filter(r => !isMatchingRawItem(r));
      });
    }

    // Cascade to active Production Orders linked to this purchase or its raw items
    setProductionOrders(prev => prev.map(po => {
      const isLinkedPo = (po.rawInventoryId && syncedRawIds.includes(po.rawInventoryId)) ||
        (oldPurchase && (po.rawBatchId === oldPurchase.billNumber || po.rawBatchId === oldPurchase.invoiceNumber)) ||
        (data.billNumber && po.rawBatchId === data.billNumber);

      if (isLinkedPo) {
        return {
          ...po,
          rawBatchId: data.billNumber || data.invoiceNumber || po.rawBatchId,
          fabricName: data.fabricName || po.fabricName,
          warehouse: (po.currentStage === 'Cutting' || !po.currentStage) ? newWarehouse : po.warehouse
        };
      }
      return po;
    }));

    if (isFirebaseConfigured) saveDocument(COLLECTIONS.PURCHASES, data, data.id).catch(console.error);
    addAuditLog('Admin', 'PURCHASE_OVERRIDE', 'Purchase Management', `Updated purchase bill ${data.billNumber} (Storage: ${newWarehouse}, Status: ${data.status}) → Raw inventory transferred to ${newWarehouse}`);
  };

  const deletePurchase = (id: string) => {
    const target = purchases.find(p => p.id === id);

    // Identify all corresponding raw inventory items created by/linked to this purchase
    const isMatchingRawItem = (r: RawInventoryItem) => {
      if (r.purchaseId === id) return true;
      if (r.id === `rinv-${id}` || r.id.startsWith(`rinv-${id}-`)) return true;
      if (target) {
        if (target.billNumber && (r.purchaseId === target.billNumber || r.billNumber === target.billNumber || r.batchId === target.billNumber)) return true;
        if (target.invoiceNumber && (r.purchaseId === target.invoiceNumber || r.invoiceNumber === target.invoiceNumber || r.batchId === target.invoiceNumber)) return true;
      }
      return false;
    };

    const rawItemsToDelete = rawInventory.filter(isMatchingRawItem);

    // Remove purchase and all corresponding inventory items from state
    setPurchases(prev => prev.filter(p => p.id !== id));
    setRawInventory(prev => prev.filter(r => !isMatchingRawItem(r)));

    // Clean up Firebase documents for both the purchase and all corresponding raw inventory
    if (isFirebaseConfigured) {
      removeDocument(COLLECTIONS.PURCHASES, id).catch(console.error);
      rawItemsToDelete.forEach(rawItem => {
        removeDocument(COLLECTIONS.RAW_INVENTORY, rawItem.id).catch(console.error);
      });
    }

    if (target) {
      addAuditLog('Admin', 'PURCHASE_DELETE', 'Purchase Management', `Permanently deleted purchase bill ${target.billNumber} and corresponding inventory items (${rawItemsToDelete.length} raw inventory records removed)`);
    }
  };

  // =====================================================================
  // 2. PIPELINE: Raw Inventory → Production (allocation & Challan Number)
  // 3. PIPELINE: Production Stages → Finished Inventory (on completion)
  // =====================================================================
  const addProductionOrder = (data: Omit<ProductionOrder, 'id'>) => {
    const poId = `po-${Date.now()}`;

    // Auto-generate persistent unique Challan Number: CH-YYYY-XXXX
    let maxNum = 0;
    productionOrders.forEach(po => {
      if (po.challanNumber) {
        const match = po.challanNumber.match(/CH-(\d{4})-(\d+)/i) || po.challanNumber.match(/CH-(\d+)/i);
        if (match) {
          const num = parseInt(match[2] || match[1], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      }
    });
    const year = new Date().getFullYear();
    const generatedChallan = data.challanNumber || `CH-${year}-${String(maxNum + 1).padStart(4, '0')}`;

    const plannedQty = Number(data.plannedQuantity || data.quantity || data.total) || 0;
    const initialStage = (data.currentStage || 'Cutting') as ProductionOrder['currentStage'];

    const initialHistory: StageHistoryEntry[] = (data.stageHistory && data.stageHistory.length > 0)
      ? data.stageHistory
      : [
        {
          stageName: 'Cutting',
          contractorId: '',
          contractorName: data.contractorName || data.assignedTo || 'Cutting Unit',
          quantitySent: plannedQty,
          quantityReceived: 0,
          quantityCompleted: 0,
          rejectedQuantity: 0,
          wastageQuantity: 0,
          assignedDate: data.startDate || new Date().toISOString().substring(0, 10),
          completedDate: '',
          status: 'In Progress',
          remarks: 'Production job assigned for raw fabric cutting'
        }
      ];

    const newO: ProductionOrder = {
      ...data,
      id: poId,
      productionOrderId: poId,
      challanNumber: generatedChallan,
      currentStage: initialStage,
      stage: initialStage,
      progress: data.progress || 10,
      plannedQuantity: plannedQty,
      total: plannedQty,
      quantity: plannedQty,
      completed: data.completed || 0,
      completedQuantity: data.completedQuantity || 0,
      totalRejectedQuantity: data.totalRejectedQuantity || 0,
      overallStatus: data.overallStatus || 'In Progress',
      status: data.status || 'In Progress',
      createdAt: data.createdAt || new Date().toISOString(),
      stageHistory: initialHistory,
      inventoryTransferred: false
    };

    setProductionOrders(prev => [newO, ...prev.filter(o => o.id !== poId)]);

    let rawItemToUpdate: RawInventoryItem | null = null;
    if (data.rawInventoryId && data.metersAllocated && data.metersAllocated > 0) {
      const existingRaw = rawInventory.find(r => r.id === data.rawInventoryId);
      if (existingRaw) {
        const newAvailable = Math.max(0, existingRaw.availableMeters - data.metersAllocated);
        const newAllocated = existingRaw.allocatedMeters + data.metersAllocated;
        const newStatus = newAvailable <= 0 ? 'Depleted' : (newAvailable < 200 ? 'Low' : 'Available');

        rawItemToUpdate = {
          ...existingRaw,
          availableMeters: newAvailable,
          allocatedMeters: newAllocated,
          status: newStatus as RawInventoryItem['status']
        };

        // Always update local React state immediately
        setRawInventory(prev => prev.map(r => r.id === data.rawInventoryId ? rawItemToUpdate! : r));
      }
    }

    // If order was created already in Finished Goods / Completed stage
    let finItemToAdd: FinishedInventoryItem | null = null;
    if (newO.currentStage === 'Finished Goods' || newO.status === 'Completed') {
      const goodQty = plannedQty;
      const targetProductName = (newO.productName || newO.producedItemName || newO.styleName || newO.name || 'Finished Denim Jeans').trim();
      const normTarget = targetProductName.toLowerCase();
      const existingProduct = finishedInventory.find(
        f => (f.productName || f.itemName || '').trim().toLowerCase() === normTarget
      );

      if (existingProduct) {
        const newProduced = (Number(existingProduct.totalProduced ?? existingProduct.unitsProduced ?? 0)) + goodQty;
        const newAvailable = (Number(existingProduct.availableQuantity ?? existingProduct.unitsAvailable ?? 0)) + goodQty;
        finItemToAdd = {
          ...existingProduct,
          totalProduced: newProduced,
          availableQuantity: newAvailable,
          unitsProduced: newProduced,
          unitsAvailable: newAvailable,
          status: newAvailable > 0 ? (newAvailable < 20 ? 'Low Stock' : 'In Stock') : 'Sold Out',
          productionOrderId: existingProduct.productionOrderId && !existingProduct.productionOrderId.includes(poId)
            ? `${existingProduct.productionOrderId}, ${poId}`
            : existingProduct.productionOrderId || poId,
          challanNumber: existingProduct.challanNumber && newO.challanNumber && !existingProduct.challanNumber.includes(newO.challanNumber)
            ? `${existingProduct.challanNumber}, ${newO.challanNumber}`
            : existingProduct.challanNumber || newO.challanNumber,
          warehouse: newO.warehouse || newO.godown || existingProduct.warehouse || (warehouses[0]?.name || '')
        };
        setFinishedInventory(prev => prev.map(f => f.id === existingProduct.id ? finItemToAdd! : f));
      } else {
        const finId = `finv-${Date.now()}`;
        finItemToAdd = {
          id: finId,
          productionOrderId: poId,
          challanNumber: newO.challanNumber,
          productName: targetProductName,
          styleName: newO.styleName || newO.name || 'Standard Style',
          totalProduced: goodQty,
          availableQuantity: goodQty,
          unitsProduced: goodQty,
          unitsAvailable: goodQty,
          soldQuantity: 0,
          unitPrice: 1200,
          warehouse: newO.warehouse || newO.godown || (warehouses[0]?.name || ''),
          status: goodQty > 0 ? 'In Stock' : 'Sold Out',
          createdAt: new Date().toISOString()
        };
        setFinishedInventory(prev => [finItemToAdd!, ...prev.filter(f => f.id !== finId)]);
      }
    }

    if (isFirebaseConfigured && db) {
      const batch = writeBatch(db);
      const poRef = doc(db, COLLECTIONS.PRODUCTION_ORDERS, poId);
      batch.set(poRef, JSON.parse(JSON.stringify(newO)));
      if (rawItemToUpdate) {
        const rawRef = doc(db, COLLECTIONS.RAW_INVENTORY, rawItemToUpdate.id);
        batch.update(rawRef, {
          availableMeters: rawItemToUpdate.availableMeters,
          allocatedMeters: rawItemToUpdate.allocatedMeters,
          status: rawItemToUpdate.status
        });
      }
      if (finItemToAdd) {
        const finRef = doc(db, COLLECTIONS.FINISHED_INVENTORY, finItemToAdd.id);
        batch.set(finRef, JSON.parse(JSON.stringify(finItemToAdd)), { merge: true });
      }
      batch.commit().catch(err => {
        console.error('Firebase error creating production order:', err);
        setFirebaseError(err?.message || 'Error saving production order');
      });
    }

    addAuditLog('Admin', 'PRODUCTION_CREATE', 'Production Management', `Created production order ${newO.orderCode || newO.poCode} (Challan: ${newO.challanNumber}, Style: ${newO.styleName || newO.name})${data.rawInventoryId ? ` — deducted ${data.metersAllocated}m from Raw Stock` : ''}`);
  };

  const updateProductionOrder = (data: ProductionOrder) => {
    const prevOrder = productionOrders.find(o => o.id === data.id);
    const wasNotCompleted = prevOrder && prevOrder.status !== 'Completed' && prevOrder.currentStage !== 'Finished Goods';
    const isNowCompleted = data.status === 'Completed' || data.overallStatus === 'Completed' || data.currentStage === 'Finished Goods';
    const shouldCreateFinished = isNowCompleted && (!data.finishedInventoryCreated || wasNotCompleted);

    // Reconcile raw inventory allocation if rawInventoryId or metersAllocated changed
    const prevAllocatedMeters = Number(prevOrder?.metersAllocated || prevOrder?.metersRequired || 0);
    const newAllocatedMeters = Number(data.metersAllocated || data.metersRequired || 0);
    const prevRawId = prevOrder?.rawInventoryId;
    const newRawId = data.rawInventoryId;

    if ((prevRawId || newRawId) && (prevRawId !== newRawId || prevAllocatedMeters !== newAllocatedMeters)) {
      setRawInventory(prev => {
        return prev.map(r => {
          // If changing to another raw item, restore previous raw item
          if (prevRawId && r.id === prevRawId && prevRawId !== newRawId) {
            const avail = Number(r.availableMeters || 0) + prevAllocatedMeters;
            const alloc = Math.max(0, Number(r.allocatedMeters || 0) - prevAllocatedMeters);
            const status: RawInventoryItem['status'] = avail > 200 ? 'Available' : (avail > 0 ? 'Low' : 'Depleted');
            const updated = { ...r, availableMeters: avail, allocatedMeters: alloc, status };
            if (isFirebaseConfigured) saveDocument(COLLECTIONS.RAW_INVENTORY, updated, updated.id).catch(console.error);
            return updated;
          }
          // If changing to another raw item, deduct on new raw item
          if (newRawId && r.id === newRawId && prevRawId !== newRawId) {
            const avail = Math.max(0, Number(r.availableMeters || 0) - newAllocatedMeters);
            const alloc = Number(r.allocatedMeters || 0) + newAllocatedMeters;
            const status: RawInventoryItem['status'] = avail > 200 ? 'Available' : (avail > 0 ? 'Low' : 'Depleted');
            const updated = { ...r, availableMeters: avail, allocatedMeters: alloc, status };
            if (isFirebaseConfigured) saveDocument(COLLECTIONS.RAW_INVENTORY, updated, updated.id).catch(console.error);
            return updated;
          }
          // If same raw item, adjust delta
          if (newRawId && r.id === newRawId && prevRawId === newRawId && prevAllocatedMeters !== newAllocatedMeters) {
            const delta = newAllocatedMeters - prevAllocatedMeters;
            const avail = Math.max(0, Number(r.availableMeters || 0) - delta);
            const alloc = Math.max(0, Number(r.allocatedMeters || 0) + delta);
            const status: RawInventoryItem['status'] = avail > 200 ? 'Available' : (avail > 0 ? 'Low' : 'Depleted');
            const updated = { ...r, availableMeters: avail, allocatedMeters: alloc, status };
            if (isFirebaseConfigured) saveDocument(COLLECTIONS.RAW_INVENTORY, updated, updated.id).catch(console.error);
            return updated;
          }
          return r;
        });
      });
    }

    let finItem: FinishedInventoryItem | null = null;
    let orderToSave: ProductionOrder = {
      ...data,
      stage: data.currentStage || data.stage
    };

    if (shouldCreateFinished) {
      const goodQty = Number(data.finalQuantity || data.completedQuantity || data.completed || data.quantity || data.total || data.plannedQuantity || 0);
      const targetProductName = (data.productName || data.producedItemName || data.styleName || data.name || 'Finished Denim Jeans').trim();

      // Check if finished product with the same product name already exists (case-insensitive)
      const existingProduct = finishedInventory.find(
        f => (f.productName || f.itemName || '').trim().toLowerCase() === targetProductName.toLowerCase()
      );

      const targetUnitPrice = Number(data.unitPrice || data.pricePerPiece || (existingProduct ? existingProduct.unitPrice : 1200));
      const targetWarehouse = (data.warehouse || data.godown || (existingProduct ? existingProduct.warehouse : (warehouses[0]?.name || ''))).trim();

      if (existingProduct) {
        // ADD inventory to the SAME product
        const newProduced = (Number(existingProduct.totalProduced ?? existingProduct.unitsProduced ?? 0)) + goodQty;
        const newAvailable = (Number(existingProduct.availableQuantity ?? existingProduct.unitsAvailable ?? 0)) + goodQty;

        finItem = {
          ...existingProduct,
          totalProduced: newProduced,
          availableQuantity: newAvailable,
          unitsProduced: newProduced,
          unitsAvailable: newAvailable,
          unitPrice: targetUnitPrice > 0 ? targetUnitPrice : (existingProduct.unitPrice || 1200),
          warehouse: targetWarehouse || existingProduct.warehouse || (warehouses[0]?.name || ''),
          status: newAvailable > 0 ? (newAvailable < 20 ? 'Low Stock' : 'In Stock') : 'Sold Out',
          productionOrderId: existingProduct.productionOrderId && !existingProduct.productionOrderId.includes(data.id)
            ? `${existingProduct.productionOrderId}, ${data.id}`
            : existingProduct.productionOrderId || data.id,
          challanNumber: existingProduct.challanNumber && data.challanNumber && !existingProduct.challanNumber.includes(data.challanNumber)
            ? `${existingProduct.challanNumber}, ${data.challanNumber}`
            : existingProduct.challanNumber || data.challanNumber
        };

        setFinishedInventory(prev => prev.map(f => f.id === existingProduct.id ? finItem! : f));
      } else {
        const finId = `finv-${Date.now()}`;
        finItem = {
          id: finId,
          productionOrderId: data.id,
          challanNumber: data.challanNumber,
          productName: targetProductName,
          styleName: data.styleName || data.name || 'Standard Style',
          totalProduced: goodQty,
          availableQuantity: goodQty,
          unitsProduced: goodQty,
          unitsAvailable: goodQty,
          soldQuantity: 0,
          unitPrice: targetUnitPrice,
          warehouse: targetWarehouse,
          status: goodQty > 0 ? 'In Stock' : 'Sold Out',
          createdAt: new Date().toISOString()
        };

        setFinishedInventory(prev => [finItem!, ...prev.filter(f => f.id !== finId)]);
      }

      const baseChallan = (orderToSave.challanNumber || `CH-2026-${orderToSave.id.slice(-4)}`).replace(/-(CUT|STT|WSH|PKG|FG|STG\d+)$/i, '');
      const fgChallan = `${baseChallan}-FG`;

      const hist = [...(orderToSave.stageHistory || [])];
      if (!hist.some(s => s.stageName === 'Finished Goods')) {
        hist.push({
          stageName: 'Finished Goods',
          contractorId: 'GODOWN',
          contractorName: targetWarehouse || orderToSave.warehouse || 'Finished Goods Warehouse',
          contractorPhone: '',
          contractorLocation: targetWarehouse || orderToSave.warehouse || 'Central Godown',
          quantitySent: goodQty,
          quantityReceived: goodQty,
          quantityCompleted: goodQty,
          rejectedQuantity: 0,
          wastageQuantity: 0,
          assignedDate: new Date().toISOString().substring(0, 10),
          completedDate: new Date().toISOString().substring(0, 10),
          challanNumber: fgChallan,
          status: 'Completed',
          remarks: `Finished goods inwarded under Challan ${fgChallan}`
        });
      }

      orderToSave = {
        ...orderToSave,
        challanNumber: fgChallan,
        finishedInventoryCreated: true,
        inventoryTransferred: true,
        overallStatus: 'Completed',
        status: 'Completed',
        currentStage: 'Finished Goods',
        stage: 'Finished Goods',
        progress: 100,
        finalQuantity: goodQty,
        stageHistory: hist
      };

      setProductionOrders(prev => prev.map(o => o.id === data.id ? orderToSave : o));
    } else {
      setProductionOrders(prev => prev.map(o => o.id === data.id ? orderToSave : o));
    }

    if (isFirebaseConfigured && db) {
      if (finItem) {
        const batch = writeBatch(db);
        const poRef = doc(db, COLLECTIONS.PRODUCTION_ORDERS, data.id);
        batch.set(poRef, JSON.parse(JSON.stringify(orderToSave)), { merge: true });
        const finRef = doc(db, COLLECTIONS.FINISHED_INVENTORY, finItem.id);
        batch.set(finRef, JSON.parse(JSON.stringify(finItem)), { merge: true });
        batch.commit().catch(err => {
          console.error('Firebase error creating finished inventory on completion:', err);
          setFirebaseError(err?.message || 'Error creating finished goods');
        });
      } else {
        saveDocument(COLLECTIONS.PRODUCTION_ORDERS, orderToSave).catch(console.error);
      }
    }

    addAuditLog('Admin', 'PRODUCTION_UPDATE', 'Production Management', `Updated production order ${orderToSave.orderCode || orderToSave.poCode} (Challan: ${orderToSave.challanNumber}) stage to ${orderToSave.currentStage || orderToSave.stage}${finItem ? ` → Auto-transferred ${finItem.totalProduced} pcs to Finished Goods Inventory` : ''}`);
  };

  const deleteProductionOrder = (id: string) => {
    const target = productionOrders.find(o => o.id === id);
    setProductionOrders(prev => prev.filter(o => o.id !== id));

    let updatedRaw: RawInventoryItem | null = null;
    let metersToRestore = 0;

    let updatedFin: FinishedInventoryItem | null = null;
    let removeFinId: string | null = null;
    let goodQty = 0;

    if (target) {
      // 1. Restore Raw Fabric Inventory (allocated meters)
      metersToRestore = Number(target.metersAllocated || target.metersRequired || (target as any).meters || 0);

      if (metersToRestore > 0) {
        const existingRaw = rawInventory.find(r => r.id === target.rawInventoryId) ||
          (target.rawBatchId ? rawInventory.find(r => r.batchId === target.rawBatchId || r.invoiceNumber === target.rawBatchId || r.billNumber === target.rawBatchId) : undefined) ||
          (target.fabricName ? rawInventory.find(r => r.fabricName?.trim().toLowerCase() === target.fabricName?.trim().toLowerCase()) : undefined);

        if (existingRaw) {
          const curAvailable = Number(existingRaw.availableMeters || 0);
          const curAllocated = Number(existingRaw.allocatedMeters || 0);
          const newAvailable = curAvailable + metersToRestore;
          const newAllocated = Math.max(0, curAllocated - metersToRestore);
          const newStatus: RawInventoryItem['status'] = newAvailable <= 0 ? 'Depleted' : (newAvailable < 200 ? 'Low' : 'Available');

          updatedRaw = {
            ...existingRaw,
            availableMeters: newAvailable,
            allocatedMeters: newAllocated,
            status: newStatus
          };

          setRawInventory(prev => prev.map(r => r.id === existingRaw.id ? updatedRaw! : r));
        }
      }

      // 2. Rollback Finished Goods Inventory if order was completed/transferred
      const hasCompleted = target.finishedInventoryCreated || target.inventoryTransferred ||
        target.currentStage === 'Finished Goods' || target.stage === 'Finished Goods' ||
        target.status === 'Completed' || target.overallStatus === 'Completed';

      goodQty = Number(target.finalQuantity || target.completedQuantity || target.completed || target.plannedQuantity || target.quantity || target.total || 0);

      if (hasCompleted && goodQty > 0) {
        const targetProdName = (target.productName || target.producedItemName || target.styleName || target.name || '').trim().toLowerCase();

        const existingFin = finishedInventory.find(f => f.productionOrderId && f.productionOrderId.split(',').map(s => s.trim()).includes(target.id)) ||
          (target.challanNumber ? finishedInventory.find(f => f.challanNumber && f.challanNumber.split(',').map(s => s.trim()).includes(target.challanNumber)) : undefined) ||
          (targetProdName ? finishedInventory.find(f => (f.productName || f.itemName || '').trim().toLowerCase() === targetProdName) : undefined);

        if (existingFin) {
          const curProduced = Number(existingFin.totalProduced ?? existingFin.unitsProduced ?? 0);
          const curAvailable = Number(existingFin.availableQuantity ?? existingFin.unitsAvailable ?? 0);
          const curSold = Number(existingFin.soldQuantity ?? 0);

          const newProduced = Math.max(0, curProduced - goodQty);
          const newAvailable = Math.max(0, curAvailable - goodQty);

          const isSoleRecord = existingFin.productionOrderId === target.id || !existingFin.productionOrderId?.includes(',');

          if (isSoleRecord && newAvailable <= 0 && curSold === 0) {
            removeFinId = existingFin.id;
            setFinishedInventory(prev => prev.filter(f => f.id !== existingFin.id));
          } else {
            const updatedPoIds = (existingFin.productionOrderId || '')
              .split(',')
              .map(s => s.trim())
              .filter(s => s && s !== target.id)
              .join(', ');
            const updatedChallans = (existingFin.challanNumber || '')
              .split(',')
              .map(s => s.trim())
              .filter(s => s && s !== target.challanNumber)
              .join(', ');

            updatedFin = {
              ...existingFin,
              totalProduced: newProduced,
              availableQuantity: newAvailable,
              unitsProduced: newProduced,
              unitsAvailable: newAvailable,
              status: newAvailable > 0 ? (newAvailable < 20 ? 'Low Stock' : 'In Stock') : 'Sold Out',
              productionOrderId: updatedPoIds,
              challanNumber: updatedChallans
            };

            setFinishedInventory(prev => prev.map(f => f.id === existingFin.id ? updatedFin! : f));
          }
        }
      }
    }

    // 3. Sync persistence with Firebase Firestore
    if (isFirebaseConfigured && db) {
      const batch = writeBatch(db);
      const poRef = doc(db, COLLECTIONS.PRODUCTION_ORDERS, id);
      batch.delete(poRef);

      if (updatedRaw) {
        const rawRef = doc(db, COLLECTIONS.RAW_INVENTORY, updatedRaw.id);
        batch.update(rawRef, {
          availableMeters: updatedRaw.availableMeters,
          allocatedMeters: updatedRaw.allocatedMeters,
          status: updatedRaw.status
        });
      }

      if (removeFinId) {
        const finRef = doc(db, COLLECTIONS.FINISHED_INVENTORY, removeFinId);
        batch.delete(finRef);
      } else if (updatedFin) {
        const finRef = doc(db, COLLECTIONS.FINISHED_INVENTORY, updatedFin.id);
        batch.set(finRef, JSON.parse(JSON.stringify(updatedFin)), { merge: true });
      }

      batch.commit().catch(err => {
        console.error('Firebase error rolling back inventory on production order delete:', err);
      });
    } else if (isFirebaseConfigured) {
      removeDocument(COLLECTIONS.PRODUCTION_ORDERS, id).catch(console.error);
    }

    // 4. Audit Log
    if (target) {
      let rollbackMsg = '';
      if (updatedRaw) {
        rollbackMsg += ` | Restored ${metersToRestore}m back to Raw Fabric (${updatedRaw.fabricName || updatedRaw.batchId})`;
      }
      if (removeFinId) {
        rollbackMsg += ` | Cleaned up empty Finished Goods entry`;
      } else if (updatedFin) {
        rollbackMsg += ` | Deducted ${goodQty} pcs from Finished Goods (${updatedFin.productName})`;
      }
      addAuditLog(
        'Admin',
        'PRODUCTION_DELETE',
        'Production Management',
        `Deleted production order ${target.orderCode || target.poCode} (Challan: ${target.challanNumber || 'N/A'})${rollbackMsg}`
      );
    }
  };

  // =====================================================================
  // Raw Inventory & Finished Inventory Corrections
  // =====================================================================
  const updateRawInventoryItem = (item: RawInventoryItem) => {
    const oldItem = rawInventory.find(r => r.id === item.id);
    const newWh = item.warehouse?.trim();
    const oldWh = oldItem?.warehouse?.trim();
    const newFabric = item.fabricName?.trim();
    const oldFabric = oldItem?.fabricName?.trim();
    const isWhChanged = Boolean(newWh && oldWh && newWh.toLowerCase() !== oldWh.toLowerCase());
    const isFabricChanged = Boolean(newFabric && oldFabric && newFabric.toLowerCase() !== oldFabric.toLowerCase());

    setRawInventory(prev => prev.map(r => r.id === item.id ? item : r));

    // If warehouse or fabric name changed, cascade to linked purchases
    if (isWhChanged || isFabricChanged) {
      setPurchases(prev => prev.map(p => {
        const isLinked = (item.purchaseId && (p.id === item.purchaseId || p.billNumber === item.purchaseId || p.invoiceNumber === item.purchaseId)) ||
          item.id === `rinv-${p.id}` || item.id.startsWith(`rinv-${p.id}-`) ||
          (item.billNumber && (p.billNumber === item.billNumber || p.id === item.billNumber)) ||
          (item.batchId && (p.billNumber === item.batchId || p.invoiceNumber === item.batchId));

        if (isLinked) {
          const updatedP: Purchase = {
            ...p,
            warehouse: isWhChanged ? newWh! : (p.warehouse || newWh!),
            warehouseLocation: isWhChanged ? newWh! : (p.warehouseLocation || newWh!),
            fabricName: isFabricChanged ? newFabric! : (p.fabricName || newFabric!),
          };
          if (isFirebaseConfigured) saveDocument(COLLECTIONS.PURCHASES, updatedP, updatedP.id).catch(console.error);
          return updatedP;
        }
        return p;
      }));

      // Also cascade to production orders using this raw inventory item
      setProductionOrders(prev => prev.map(po => {
        const isLinked = po.rawInventoryId === item.id || (po as any).fabricSourceInventoryId === item.id ||
          (item.batchId && po.rawBatchId === item.batchId);
        if (isLinked) {
          const updatedPo = {
            ...po,
            warehouse: isWhChanged ? newWh! : po.warehouse,
            godown: isWhChanged ? newWh! : (po as any).godown,
            fabricName: isFabricChanged ? newFabric! : po.fabricName
          };
          if (isFirebaseConfigured) saveDocument(COLLECTIONS.PRODUCTION_ORDERS, updatedPo, updatedPo.id).catch(console.error);
          return updatedPo;
        }
        return po;
      }));
    }

    if (isFirebaseConfigured) saveDocument(COLLECTIONS.RAW_INVENTORY, item).catch(console.error);
    addAuditLog('Admin', 'RAW_INVENTORY_UPDATE', 'Inventory Management', `Corrected raw inventory ${item.batchId || item.fabricName} (Location: ${item.warehouse}, ${item.availableMeters}m available)`);
  };

  const updateFinishedInventoryItem = (item: FinishedInventoryItem) => {
    const oldItem = finishedInventory.find(f => f.id === item.id);
    const newWh = item.warehouse?.trim();
    const oldWh = oldItem?.warehouse?.trim();
    const newProduct = item.productName?.trim();
    const oldProduct = oldItem?.productName?.trim();
    const isWhChanged = Boolean(newWh && oldWh && newWh.toLowerCase() !== oldWh.toLowerCase());
    const isProductChanged = Boolean(newProduct && oldProduct && newProduct.toLowerCase() !== oldProduct.toLowerCase());

    setFinishedInventory(prev => prev.map(f => f.id === item.id ? item : f));

    // If warehouse or product name changed, cascade to linked production orders
    if (isWhChanged || isProductChanged) {
      setProductionOrders(prev => prev.map(po => {
        const isLinked = (item.productionOrderId && item.productionOrderId.split(',').map(s => s.trim()).includes(po.id)) ||
          (item.challanNumber && po.challanNumber && item.challanNumber.split(',').map(s => s.trim()).includes(po.challanNumber)) ||
          (oldProduct && (po.productName || (po as any).producedItemName)?.trim().toLowerCase() === oldProduct.toLowerCase());

        if (isLinked) {
          const updatedPo = {
            ...po,
            destinationWarehouse: isWhChanged ? newWh! : (po as any).destinationWarehouse,
            warehouse: isWhChanged ? newWh! : po.warehouse,
            productName: isProductChanged ? newProduct! : po.productName
          };
          if (isFirebaseConfigured) saveDocument(COLLECTIONS.PRODUCTION_ORDERS, updatedPo, updatedPo.id).catch(console.error);
          return updatedPo;
        }
        return po;
      }));
    }

    if (isFirebaseConfigured) saveDocument(COLLECTIONS.FINISHED_INVENTORY, item).catch(console.error);
    addAuditLog('Admin', 'FINISHED_INVENTORY_UPDATE', 'Inventory Management', `Corrected finished inventory ${item.productName} (Location: ${item.warehouse}, ${item.availableQuantity} pcs available)`);
  };

  // =====================================================================
  // 4. PIPELINE: Finished Inventory → Sales
  // 5. PIPELINE: Sales → Invoice (auto-generation)
  // =====================================================================
  const addSale = async (saleData: Omit<SaleOrder, 'id' | 'createdAt' | 'invoiceId'>): Promise<{ sale: SaleOrder; invoice: Invoice }> => {
    const saleId = `sale-${Date.now()}`;
    const invoiceId = `inv-${Date.now() + 1}`;
    const now = new Date().toISOString();

    const invoiceItems: InvoiceLineItem[] = saleData.items.map(item => ({
      finishedInventoryId: item.finishedInventoryId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total
    }));

    const invNumber = saleData.invoiceNumber?.trim() || getNextInvoiceNumber(invoices);
    const subtotal = saleData.subtotal ?? (saleData.items || []).reduce((sum, item) => sum + (item.total || (item.quantity * item.unitPrice)), 0);
    const gstRate = saleData.gstRate ?? 0;
    const gstAmount = saleData.gstAmount ?? Math.round((subtotal * (gstRate / 100)) * 100) / 100;
    const grandTotal = saleData.grandTotal ?? saleData.totalAmount ?? (subtotal + gstAmount);

    const customerObj = customers.find(c => c.id === saleData.customerId) ||
      customers.find(c => (c.name || c.companyName || '').toLowerCase() === (saleData.customerName || '').toLowerCase());
    const resolvedPhone = saleData.customerPhone || customerObj?.phone || '';

    const finalPaymentMethod = saleData.paymentMethod || saleData.paymentMode || 'Bank Transfer';
    const finalPaidAmount = saleData.paidAmount !== undefined
      ? Number(saleData.paidAmount)
      : (saleData.paymentStatus === 'Paid' ? grandTotal : 0);
    const finalOutstandingBalance = Math.max(0, grandTotal - finalPaidAmount);
    const finalPaymentStatus: 'Paid' | 'Partial' | 'Pending' | 'Unpaid' = 
      finalPaidAmount >= grandTotal
        ? 'Paid'
        : (finalPaidAmount > 0 ? 'Partial' : (saleData.paymentStatus || 'Pending'));
    const finalInvoiceStatus: InvoiceStatus = 
      finalPaidAmount >= grandTotal
        ? 'Paid'
        : (finalPaidAmount > 0 ? 'Partial' : 'Pending');

    const newSale: SaleOrder = {
      ...saleData,
      id: saleId,
      invoiceId: invoiceId,
      invoiceNumber: invNumber,
      customerPhone: resolvedPhone,
      subtotal,
      gstRate,
      gstAmount,
      grandTotal,
      totalAmount: grandTotal,
      paymentStatus: finalPaymentStatus,
      paymentMethod: finalPaymentMethod,
      paymentMode: finalPaymentMethod,
      paidAmount: finalPaidAmount,
      outstandingBalance: finalOutstandingBalance,
      createdAt: now
    };

    const newInvoice: Invoice = {
      id: invoiceId,
      client: saleData.customerName,
      customerName: saleData.customerName,
      customerId: saleData.customerId,
      customerPhone: resolvedPhone,
      customerAddress: saleData.shippingAddress || customerObj?.address,
      customerGstin: customerObj?.gstin,
      date: saleData.orderDate || saleData.saleDate || now.substring(0, 10),
      issueDate: saleData.orderDate || saleData.saleDate || now.substring(0, 10),
      invoiceCode: invNumber,
      invoiceNumber: invNumber,
      amount: grandTotal,
      subtotal: subtotal,
      taxRate: gstRate,
      taxAmount: gstAmount,
      totalAmount: grandTotal,
      paidAmount: finalPaidAmount,
      outstandingBalance: finalOutstandingBalance,
      status: finalInvoiceStatus,
      itemsCount: saleData.items.reduce((sum, item) => sum + item.quantity, 0),
      itemsSummary: saleData.items.map(item => `${item.quantity} × ${item.productName}`).join(', '),
      saleId: saleId,
      items: invoiceItems,
      lineItems: invoiceItems,
      paymentMethod: finalPaymentMethod,
      paymentMode: finalPaymentMethod
    };

    if (customerObj) {
      const newCustomerBalance = Math.max(0, (customerObj.outstandingBalance || 0) + finalOutstandingBalance);
      setCustomers(prev => prev.map(c => c.id === customerObj.id ? { ...c, outstandingBalance: newCustomerBalance } : c));
    }

    // Deduct finished inventory locally
    setFinishedInventory(prev => {
      const remainingToDeduct = new Map<string, number>();
      saleData.items.forEach(it => {
        const key = (it.productName || '').trim().toLowerCase();
        if (key) {
          remainingToDeduct.set(key, (remainingToDeduct.get(key) || 0) + it.quantity);
        }
      });

      return prev.map(f => {
        const byId = saleData.items.find(it => it.finishedInventoryId === f.id);
        const key = (f.productName || f.itemName || '').trim().toLowerCase();
        const qtyToDeduct = byId ? byId.quantity : (remainingToDeduct.get(key) || 0);

        if (qtyToDeduct > 0) {
          const avail = f.availableQuantity ?? f.unitsAvailable ?? 0;
          const deduct = Math.min(avail, qtyToDeduct);
          const newAvail = Math.max(0, avail - deduct);
          const newSold = (f.soldQuantity ?? f.unitsSold ?? 0) + deduct;
          if (!byId) {
            remainingToDeduct.set(key, Math.max(0, qtyToDeduct - deduct));
          }
          const newStatus = newAvail <= 0 ? 'Sold Out' : (newAvail < 20 ? 'Low Stock' : 'In Stock');
          return {
            ...f,
            availableQuantity: newAvail,
            unitsAvailable: newAvail,
            soldQuantity: newSold,
            unitsSold: newSold,
            status: newStatus as FinishedInventoryItem['status']
          };
        }
        return f;
      });
    });

    // Update sales and invoices locally
    setSales(prev => [newSale, ...prev]);
    setInvoices(prev => [newInvoice, ...prev]);

    // Commit to Firestore via batched write
    if (isFirebaseConfigured && db) {
      const batch = writeBatch(db);
      const saleRef = doc(db, COLLECTIONS.SALES, saleId);
      batch.set(saleRef, JSON.parse(JSON.stringify(newSale)));

      const invRef = doc(db, COLLECTIONS.INVOICES, invoiceId);
      batch.set(invRef, JSON.parse(JSON.stringify(newInvoice)));

      for (const lineItem of saleData.items) {
        const finItem = finishedInventory.find(f => f.id === lineItem.finishedInventoryId || ((f.productName || f.itemName || '').trim().toLowerCase() === (lineItem.productName || '').trim().toLowerCase()));
        if (finItem) {
          const newAvail = Math.max(0, (finItem.availableQuantity || 0) - lineItem.quantity);
          const newSold = (finItem.soldQuantity || 0) + lineItem.quantity;
          const newStatus = newAvail <= 0 ? 'Sold Out' : (newAvail < 20 ? 'Low Stock' : 'In Stock');
          const finRef = doc(db, COLLECTIONS.FINISHED_INVENTORY, finItem.id);
          batch.update(finRef, {
            availableQuantity: newAvail,
            soldQuantity: newSold,
            status: newStatus
          });
        }
      }

      await batch.commit().catch(err => {
        console.error('Firebase error in sale + invoice batch:', err);
        setFirebaseError(err?.message || 'Error processing sale batch');
      });
    }

    addAuditLog('Admin', 'SALE_CREATE', 'Sales & Billing', `Sold ${newInvoice.itemsCount} pcs to ${saleData.customerName} (₹${newSale.totalAmount}) → Invoice ${newInvoice.invoiceNumber} auto-generated, Finished Goods deducted.`);
    return { sale: newSale, invoice: newInvoice };
  };

  const updateSale = (data: SaleOrder) => {
    const total = data.grandTotal ?? data.totalAmount ?? 0;
    const paid = Number(data.paidAmount ?? (data.paymentStatus === 'Paid' ? total : 0));
    const outstanding = Math.max(0, total - paid);
    const updatedSale: SaleOrder = {
      ...data,
      paidAmount: paid,
      outstandingBalance: outstanding,
      paymentStatus: paid >= total ? 'Paid' : (paid > 0 ? 'Partial' : (data.paymentStatus || 'Pending'))
    };

    setSales(prev => prev.map(s => s.id === data.id ? updatedSale : s));

    // Also sync the linked invoice
    setInvoices(prev => prev.map(inv => {
      if (inv.saleId === data.id || inv.id === data.invoiceId || (data.invoiceNumber && (inv.invoiceNumber === data.invoiceNumber || inv.invoiceCode === data.invoiceNumber))) {
        return {
          ...inv,
          paidAmount: paid,
          outstandingBalance: outstanding,
          status: (paid >= total ? 'Paid' : (paid > 0 ? 'Partial' : 'Pending')) as InvoiceStatus
        };
      }
      return inv;
    }));

    if (isFirebaseConfigured) saveDocument(COLLECTIONS.SALES, updatedSale).catch(console.error);
    addAuditLog('Admin', 'SALE_UPDATE', 'Sales & Billing', `Updated sale invoice ${data.invoiceNumber || data.id}`);
  };

  const deleteSale = (id: string) => {
    const target = sales.find(s => s.id === id);
    if (!target) return;

    // Extract items that were sold in this order to restore their quantities back to inventory
    const itemsToRestore: Array<{ finishedInventoryId?: string; productName?: string; itemName?: string; quantity: number }> = [];
    if (Array.isArray(target.items) && target.items.length > 0) {
      target.items.forEach((it: any) => {
        itemsToRestore.push({
          finishedInventoryId: it.finishedInventoryId,
          productName: it.productName || it.itemName,
          itemName: it.itemName || it.productName,
          quantity: Number(it.quantity) || 0
        });
      });
    } else if (Array.isArray(target.lineItems) && target.lineItems.length > 0) {
      target.lineItems.forEach((it: any) => {
        itemsToRestore.push({
          finishedInventoryId: it.finishedInventoryId,
          productName: it.productName || it.itemName,
          itemName: it.itemName || it.productName,
          quantity: Number(it.quantity) || 0
        });
      });
    } else if ((target as any).productName || (target as any).quantity) {
      itemsToRestore.push({
        finishedInventoryId: (target as any).finishedInventoryId,
        productName: (target as any).productName || (target as any).itemName,
        itemName: (target as any).itemName || (target as any).productName,
        quantity: Number((target as any).quantity) || 0
      });
    }

    // 1. Restore finished inventory quantities in local state
    if (itemsToRestore.length > 0) {
      setFinishedInventory(prev => {
        const remainingToRestore = new Map<string, number>();
        itemsToRestore.forEach(it => {
          if (!it.finishedInventoryId) {
            const key = (it.productName || it.itemName || '').trim().toLowerCase();
            remainingToRestore.set(key, (remainingToRestore.get(key) || 0) + it.quantity);
          }
        });

        return prev.map(f => {
          const byId = itemsToRestore.find(it => it.finishedInventoryId && it.finishedInventoryId === f.id);
          const key = (f.productName || f.itemName || '').trim().toLowerCase();
          const qtyToRestore = byId ? byId.quantity : (remainingToRestore.get(key) || 0);

          if (qtyToRestore > 0) {
            const curAvail = f.availableQuantity ?? f.unitsAvailable ?? 0;
            const curSold = f.soldQuantity ?? f.unitsSold ?? 0;
            const newAvail = curAvail + qtyToRestore;
            const newSold = Math.max(0, curSold - qtyToRestore);
            if (!byId) {
              remainingToRestore.set(key, Math.max(0, (remainingToRestore.get(key) || 0) - qtyToRestore));
            }
            const newStatus = newAvail <= 0 ? 'Sold Out' : (newAvail < 20 ? 'Low Stock' : 'In Stock');
            return {
              ...f,
              availableQuantity: newAvail,
              unitsAvailable: newAvail,
              soldQuantity: newSold,
              unitsSold: newSold,
              status: newStatus as FinishedInventoryItem['status']
            };
          }
          return f;
        });
      });
    }

    // 2. Remove sale from local state
    setSales(prev => prev.filter(s => s.id !== id));

    // 3. Remove associated auto-generated invoice if present
    setInvoices(prev => prev.filter(inv => 
      inv.saleId !== id && 
      (!target.invoiceNumber || inv.invoiceNumber !== target.invoiceNumber) && 
      (!target.saleCode || inv.invoiceCode !== target.saleCode)
    ));

    // 4. Update Firebase / Firestore
    if (isFirebaseConfigured && db) {
      const batch = writeBatch(db);
      const saleRef = doc(db, COLLECTIONS.SALES, id);
      batch.delete(saleRef);

      const matchedInv = invoices.find(inv => 
        inv.saleId === id || 
        (target.invoiceNumber && inv.invoiceNumber === target.invoiceNumber) || 
        (target.saleCode && inv.invoiceCode === target.saleCode)
      );
      if (matchedInv) {
        const invRef = doc(db, COLLECTIONS.INVOICES, matchedInv.id);
        batch.delete(invRef);
      }

      for (const item of itemsToRestore) {
        if (item.quantity <= 0) continue;
        const finItem = finishedInventory.find(f => 
          (item.finishedInventoryId && f.id === item.finishedInventoryId) || 
          ((f.productName || f.itemName || '').trim().toLowerCase() === (item.productName || item.itemName || '').trim().toLowerCase())
        );
        if (finItem) {
          const curAvail = finItem.availableQuantity ?? finItem.unitsAvailable ?? 0;
          const curSold = finItem.soldQuantity ?? finItem.unitsSold ?? 0;
          const newAvail = curAvail + item.quantity;
          const newSold = Math.max(0, curSold - item.quantity);
          const newStatus = newAvail <= 0 ? 'Sold Out' : (newAvail < 20 ? 'Low Stock' : 'In Stock');
          const finRef = doc(db, COLLECTIONS.FINISHED_INVENTORY, finItem.id);
          batch.update(finRef, {
            availableQuantity: newAvail,
            unitsAvailable: newAvail,
            soldQuantity: newSold,
            unitsSold: newSold,
            status: newStatus
          });
        }
      }

      batch.commit().catch(err => {
        console.error('Firebase error deleting sale and restoring inventory:', err);
      });
    }

    const totalQtyRestored = itemsToRestore.reduce((sum, it) => sum + it.quantity, 0);
    addAuditLog('Admin', 'SALE_DELETE', 'Sales & Billing', `Deleted sale invoice ${target.invoiceNumber || target.id}. Restored ${totalQtyRestored} pcs back to Finished Goods inventory.`);
  };

  // Stock / Legacy Items Actions
  const addStockItem = (data: Omit<StockItem, 'id'>) => {
    const newStock: StockItem = { ...data, id: `s-${Date.now()}` };
    setStockItems(prev => [newStock, ...prev]);
    if (isFirebaseConfigured) saveDocument(COLLECTIONS.STOCK_ITEMS, newStock).catch(console.error);
    addAuditLog('Admin', 'STOCK_CREATE', 'Inventory Management', `Logged stock SKU ${newStock.name}`);
  };

  const updateStockItem = (data: StockItem) => {
    setStockItems(prev => prev.map(s => s.id === data.id ? data : s));
    if (isFirebaseConfigured) saveDocument(COLLECTIONS.STOCK_ITEMS, data).catch(console.error);
    addAuditLog('Admin', 'STOCK_UPDATE', 'Inventory Management', `Updated stock SKU ${data.name}`);
  };

  const deleteStockItem = (id: string) => {
    const target = stockItems.find(s => s.id === id);
    setStockItems(prev => prev.filter(s => s.id !== id));
    if (isFirebaseConfigured) removeDocument(COLLECTIONS.STOCK_ITEMS, id).catch(console.error);
    if (target) {
      addAuditLog('Admin', 'STOCK_DELETE', 'Inventory Management', `Removed stock SKU ${target.name}`);
    }
  };

  // Invoices Actions
  const addInvoice = (data: Omit<Invoice, 'id'>) => {
    const newInv: Invoice = { ...data, id: `inv-${Date.now()}` };
    setInvoices(prev => [newInv, ...prev]);
    if (isFirebaseConfigured) saveDocument(COLLECTIONS.INVOICES, newInv).catch(console.error);
    addAuditLog('Admin', 'INVOICE_CREATE', 'Sales & Billing', `Generated invoice ${newInv.invoiceCode || newInv.invoiceNumber} for ${newInv.client} (₹${newInv.amount})`);
  };

  const updateInvoice = (data: Invoice) => {
    const total = data.totalAmount ?? data.amount ?? 0;
    const paid = Number(data.paidAmount ?? (data.status === 'Paid' ? total : 0));
    const outstanding = Math.max(0, total - paid);
    const updatedInv: Invoice = {
      ...data,
      paidAmount: paid,
      outstandingBalance: outstanding,
      status: (paid >= total ? 'Paid' : (paid > 0 ? 'Partial' : data.status)) as InvoiceStatus
    };

    setInvoices(prev => prev.map(i => i.id === data.id ? updatedInv : i));

    // Also sync linked sale
    setSales(prev => prev.map(s => {
      if (s.invoiceId === data.id || (data.saleId && s.id === data.saleId) || (data.invoiceNumber && (s.invoiceNumber === data.invoiceNumber || s.saleCode === data.invoiceNumber))) {
        return {
          ...s,
          paidAmount: paid,
          outstandingBalance: outstanding,
          paymentStatus: paid >= total ? 'Paid' : (paid > 0 ? 'Partial' : 'Pending')
        };
      }
      return s;
    }));

    if (isFirebaseConfigured) saveDocument(COLLECTIONS.INVOICES, updatedInv).catch(console.error);
    addAuditLog('Admin', 'INVOICE_OVERRIDE', 'Sales & Billing', `Updated invoice ${data.invoiceCode || data.invoiceNumber} status to ${updatedInv.status}`);
  };

  const deleteInvoice = (id: string) => {
    const target = invoices.find(i => i.id === id);
    setInvoices(prev => prev.filter(i => i.id !== id));
    if (isFirebaseConfigured) removeDocument(COLLECTIONS.INVOICES, id).catch(console.error);
    if (target) {
      addAuditLog('Admin', 'INVOICE_DELETE', 'Sales & Billing', `Deleted invoice ${target.invoiceCode || target.invoiceNumber}`);
    }
  };

  // Settings Action
  const updateSettings = (newSettings: Partial<SystemSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    if (isFirebaseConfigured) saveDocument(COLLECTIONS.SETTINGS, updated, 'global').catch(console.error);
    addAuditLog('Admin', 'SETTINGS_UPDATE', 'System Settings', 'Updated system preferences');
  };

  // Reset to defaults
  const resetAllDataToDefaults = () => {
    setProductionOrders(INITIAL_PRODUCTION_ORDERS);
    setStockItems(INITIAL_STOCK_ITEMS);
    setInvoices(INITIAL_INVOICES);
    setNotifications(INITIAL_NOTIFICATIONS);
    setUsers(INITIAL_USERS);
    setWarehouses(INITIAL_WAREHOUSES);
    setContractors(INITIAL_CONTRACTORS);
    setSuppliers(INITIAL_SUPPLIERS);
    setCustomers(INITIAL_CUSTOMERS);
    setPurchases([]);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setSettings({
      companyName: '',
      gstin: '',
      currencySymbol: '₹',
      defaultTaxRate: 18,
      adminNotificationEmail: '',
      inventoryAlertThreshold: 0,
      firebaseConfigured: isFirebaseConfigured,
      ledgerTheme: ''
    });
    setRawInventory([]);
    setFinishedInventory([]);
    setSales([]);
    addAuditLog('Admin', 'SYSTEM_RESET', 'System Settings', 'Restored master ledger to initial factory defaults');
  };

  // Seed Firestore
  const seedFirestore = async () => {
    const result = await seedFirestoreDatabase();
    if (result.success) {
      addAuditLog('Admin', 'FIREBASE_SEED', 'System Settings', 'Populated Firestore database with initial Fabriq master dataset');
    }
    return result;
  };

  // Automatically enrich raw inventory and production orders with true Supplier Invoice Numbers from linked purchases
  const enrichedRawInventory = useMemo(() => {
    const list = rawInventory.map((r) => {
      const p = purchases.find(
        (item) => item.id === r.purchaseId || item.billNumber === r.purchaseId || item.invoiceNumber === r.purchaseId
      );
      const trueBill =
        p?.billNumber ||
        r.billNumber ||
        (r.invoiceNumber && !r.invoiceNumber.startsWith('DF-2026-') ? r.invoiceNumber : '') ||
        p?.invoiceNumber ||
        (r.batchId && !r.batchId.startsWith('DF-2026-') ? r.batchId : '');
      return {
        ...r,
        billNumber: trueBill || r.billNumber || p?.billNumber,
        invoiceNumber: trueBill || r.invoiceNumber || (p?.billNumber || r.batchId),
        batchId: trueBill || r.batchId
      };
    });
    return sortLatest(list);
  }, [rawInventory, purchases]);

  const enrichedProductionOrders = useMemo(() => {
    const list = productionOrders.map((po) => {
      const raw = rawInventory.find((r) => r.id === po.rawInventoryId);
      const p = purchases.find(
        (item) => item.id === raw?.purchaseId || item.invoiceNumber === po.rawBatchId || item.billNumber === po.rawBatchId
      );
      const trueBill =
        p?.billNumber ||
        raw?.billNumber ||
        (raw?.invoiceNumber && !raw?.invoiceNumber.startsWith('DF-2026-') ? raw?.invoiceNumber : '') ||
        p?.invoiceNumber ||
        (po.rawBatchId && !po.rawBatchId.startsWith('DF-2026-') ? po.rawBatchId : '');
      return {
        ...po,
        rawBatchId: trueBill || po.rawBatchId
      };
    });
    return sortLatest(list);
  }, [productionOrders, rawInventory, purchases]);

  const consolidatedFinishedInventory = useMemo(() => {
    const map = new Map<string, FinishedInventoryItem>();
    finishedInventory.forEach(item => {
      const key = (item.productName || item.itemName || 'Standard Apparel Item').trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, { ...item });
      } else {
        const existing = map.get(key)!;
        const addProduced = Number(item.totalProduced ?? item.unitsProduced ?? 0);
        const addAvailable = Number(item.availableQuantity ?? item.unitsAvailable ?? 0);
        const addSold = Number(item.soldQuantity ?? item.unitsSold ?? 0);

        const newProduced = (Number(existing.totalProduced ?? existing.unitsProduced ?? 0)) + addProduced;
        const newAvailable = (Number(existing.availableQuantity ?? existing.unitsAvailable ?? 0)) + addAvailable;
        const newSold = (Number(existing.soldQuantity ?? existing.unitsSold ?? 0)) + addSold;

        map.set(key, {
          ...existing,
          totalProduced: newProduced,
          availableQuantity: newAvailable,
          soldQuantity: newSold,
          unitsProduced: newProduced,
          unitsAvailable: newAvailable,
          unitsSold: newSold,
          status: newAvailable > 0 ? (newAvailable < 20 ? 'Low Stock' : 'In Stock') : 'Sold Out',
          productionOrderId: existing.productionOrderId && item.productionOrderId && !existing.productionOrderId.includes(item.productionOrderId)
            ? `${existing.productionOrderId}, ${item.productionOrderId}`
            : existing.productionOrderId || item.productionOrderId,
          challanNumber: existing.challanNumber && item.challanNumber && !existing.challanNumber.includes(item.challanNumber)
            ? `${existing.challanNumber}, ${item.challanNumber}`
            : existing.challanNumber || item.challanNumber
        });
      }
    });
    return sortLatest(Array.from(map.values()));
  }, [finishedInventory]);

  return (
    <FabriqDataContext.Provider
      value={{
        isFirebaseConnected: isFirebaseConfigured,
        firebaseError,
        seedFirestore,
        productionOrders: enrichedProductionOrders,
        stockItems,
        invoices,
        notifications,
        users,
        warehouses,
        contractors,
        suppliers,
        customers,
        purchases,
        auditLogs,
        settings,
        rawInventory: enrichedRawInventory,
        finishedInventory: consolidatedFinishedInventory,
        sales,
        addUser,
        updateUser,
        toggleUserStatus,
        deleteUser,
        addWarehouse,
        updateWarehouse,
        deleteWarehouse,
        addContractor,
        updateContractor,
        deleteContractor,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addPurchase,
        updatePurchase,
        deletePurchase,
        addProductionOrder,
        updateProductionOrder,
        deleteProductionOrder,
        addStockItem,
        updateStockItem,
        deleteStockItem,
        addInvoice,
        updateInvoice,
        deleteInvoice,
        updateRawInventoryItem,
        updateFinishedInventoryItem,
        addSale,
        updateSale,
        deleteSale,
        markNotificationRead,
        clearNotifications,
        addAuditLog,
        updateSettings,
        resetAllDataToDefaults
      }}
    >
      {children}
    </FabriqDataContext.Provider>
  );
};

export const useFabriqData = () => {
  const context = useContext(FabriqDataContext);
  if (!context) {
    throw new Error('useFabriqData must be used within a FabriqDataProvider');
  }
  return context;
};
