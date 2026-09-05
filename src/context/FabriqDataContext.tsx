import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  ProductionOrder,
  StockItem,
  Invoice,
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
  addSale: (sale: Omit<SaleOrder, 'id' | 'createdAt' | 'invoiceId'>) => Promise<void>;
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
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>(INITIAL_PRODUCTION_ORDERS);
  const [stockItems, setStockItems] = useState<StockItem[]>(INITIAL_STOCK_ITEMS);
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const [users, setUsers] = useState<AppUser[]>(INITIAL_USERS);
  const [warehouses, setWarehouses] = useState<Warehouse[]>(INITIAL_WAREHOUSES);
  const [contractors, setContractors] = useState<Contractor[]>(INITIAL_CONTRACTORS);
  const [suppliers, setSuppliers] = useState<Supplier[]>(INITIAL_SUPPLIERS);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
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
          setUsers(items);
          setFirebaseError(null);
        },
        (err) => setFirebaseError(err?.message || 'Firebase permission error on users collection')
      ),
      subscribeCollection<Warehouse>(COLLECTIONS.WAREHOUSES, (items) => { setWarehouses(items); }, (err) => setFirebaseError(err?.message)),
      subscribeCollection<Contractor>(COLLECTIONS.CONTRACTORS, (items) => { setContractors(items); }, (err) => setFirebaseError(err?.message)),
      subscribeCollection<Supplier>(COLLECTIONS.SUPPLIERS, (items) => { setSuppliers(items); }, (err) => setFirebaseError(err?.message)),
      subscribeCollection<Customer>(COLLECTIONS.CUSTOMERS, (items) => { setCustomers(items); }, (err) => setFirebaseError(err?.message)),
      subscribeCollection<Purchase>(COLLECTIONS.PURCHASES, (items) => { setPurchases(items); }, (err) => setFirebaseError(err?.message)),
      subscribeCollection<ProductionOrder>(COLLECTIONS.PRODUCTION_ORDERS, (items) => { setProductionOrders(items); }, (err) => setFirebaseError(err?.message)),
      subscribeCollection<StockItem>(COLLECTIONS.STOCK_ITEMS, (items) => { setStockItems(items); }, (err) => setFirebaseError(err?.message)),
      subscribeCollection<Invoice>(COLLECTIONS.INVOICES, (items) => { setInvoices(items); }, (err) => setFirebaseError(err?.message)),
      subscribeCollection<AuditLog>(COLLECTIONS.AUDIT_LOGS, (items) => { setAuditLogs(items); }, (err) => setFirebaseError(err?.message)),
      subscribeDocument<SystemSettings>(COLLECTIONS.SETTINGS, 'global', (data) => {
        if (data) setSettings(prev => ({ ...prev, ...data, firebaseConfigured: true }));
      }),
      // Connected Pipeline collections
      subscribeCollection<RawInventoryItem>(COLLECTIONS.RAW_INVENTORY, (items) => { setRawInventory(items); }, (err) => setFirebaseError(err?.message)),
      subscribeCollection<FinishedInventoryItem>(COLLECTIONS.FINISHED_INVENTORY, (items) => { setFinishedInventory(items); }, (err) => setFirebaseError(err?.message)),
      subscribeCollection<SaleOrder>(COLLECTIONS.SALES, (items) => { setSales(items); }, (err) => setFirebaseError(err?.message)),
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
      pin: userData.pin || '1234'
    };

    setUsers(prev => [newU, ...prev.filter(u => u.id !== newU.id)]);
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
  const addWarehouse = (data: Omit<Warehouse, 'id'>) => {
    const newW: Warehouse = { ...data, id: `w-${Date.now()}` };
    setWarehouses(prev => [newW, ...prev]);
    if (isFirebaseConfigured) saveDocument(COLLECTIONS.WAREHOUSES, newW).catch(console.error);
    addAuditLog('Admin', 'WAREHOUSE_CREATE', 'Master Data', `Added new warehouse facility ${newW.name} (${newW.code})`);
  };

  const updateWarehouse = (data: Warehouse) => {
    setWarehouses(prev => prev.map(w => w.id === data.id ? data : w));
    if (isFirebaseConfigured) saveDocument(COLLECTIONS.WAREHOUSES, data).catch(console.error);
    addAuditLog('Admin', 'WAREHOUSE_UPDATE', 'Master Data', `Updated facility details for ${data.name}`);
  };

  const deleteWarehouse = (id: string) => {
    const target = warehouses.find(w => w.id === id);
    setWarehouses(prev => prev.filter(w => w.id !== id));
    if (isFirebaseConfigured) removeDocument(COLLECTIONS.WAREHOUSES, id).catch(console.error);
    if (target) {
      addAuditLog('Admin', 'WAREHOUSE_DELETE', 'Master Data', `Deleted warehouse ${target.name}`);
    }
  };

  // Contractor Actions
  const addContractor = (data: Omit<Contractor, 'id'>) => {
    const newC: Contractor = { ...data, id: `c-${Date.now()}` };
    setContractors(prev => [newC, ...prev]);
    if (isFirebaseConfigured) saveDocument(COLLECTIONS.CONTRACTORS, newC).catch(console.error);
    addAuditLog('Admin', 'CONTRACTOR_CREATE', 'Master Data', `Registered new contractor ${newC.name} (${newC.specialty})`);
  };

  const updateContractor = (data: Contractor) => {
    setContractors(prev => prev.map(c => c.id === data.id ? data : c));
    if (isFirebaseConfigured) saveDocument(COLLECTIONS.CONTRACTORS, data).catch(console.error);
    addAuditLog('Admin', 'CONTRACTOR_UPDATE', 'Master Data', `Updated contractor ${data.name}`);
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
  const addSupplier = (data: Omit<Supplier, 'id'>) => {
    const newS: Supplier = { ...data, id: `sup-${Date.now()}` };
    setSuppliers(prev => [newS, ...prev]);
    if (isFirebaseConfigured) saveDocument(COLLECTIONS.SUPPLIERS, newS).catch(console.error);
    addAuditLog('Admin', 'SUPPLIER_CREATE', 'Master Data', `Onboarded new supplier ${newS.name}`);
  };

  const updateSupplier = (data: Supplier) => {
    setSuppliers(prev => prev.map(s => s.id === data.id ? data : s));
    if (isFirebaseConfigured) saveDocument(COLLECTIONS.SUPPLIERS, data).catch(console.error);
    addAuditLog('Admin', 'SUPPLIER_UPDATE', 'Master Data', `Updated supplier ${data.name}`);
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
  const addCustomer = (data: Omit<Customer, 'id'>) => {
    const newCust: Customer = { ...data, id: `cust-${Date.now()}` };
    setCustomers(prev => [newCust, ...prev]);
    if (isFirebaseConfigured) saveDocument(COLLECTIONS.CUSTOMERS, newCust).catch(console.error);
    addAuditLog('Admin', 'CUSTOMER_CREATE', 'Master Data', `Added customer account ${newCust.name} (${newCust.type})`);
  };

  const updateCustomer = (data: Customer) => {
    setCustomers(prev => prev.map(c => c.id === data.id ? data : c));
    if (isFirebaseConfigured) saveDocument(COLLECTIONS.CUSTOMERS, data).catch(console.error);
    addAuditLog('Admin', 'CUSTOMER_UPDATE', 'Master Data', `Updated customer account ${data.name}`);
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
  const addPurchase = (data: Omit<Purchase, 'id' | 'createdAt'> | Purchase) => {
    const purchaseId = (data as Purchase).id || `p-${Date.now()}`;
    const newP: Purchase = {
      ...data,
      id: purchaseId,
      createdAt: (data as Purchase).createdAt || new Date().toISOString()
    };

    setPurchases(prev => [newP, ...prev.filter(p => p.id !== purchaseId)]);

    const isReceived = newP.status === 'Received' || !newP.status;
    let rawInvItem: RawInventoryItem | null = null;

    if (isReceived) {
      const rawInvId = `rinv-${Date.now()}`;
      const rawInvStatus = newP.meters > 200 ? 'Available' : (newP.meters > 0 ? 'Low' : 'Depleted');
      const invoiceNo = newP.invoiceNumber || newP.billNumber || `INV-${Date.now().toString().slice(-4)}`;
      rawInvItem = {
        id: rawInvId,
        purchaseId: purchaseId,
        batchId: invoiceNo,
        invoiceNumber: invoiceNo,
        fabricName: newP.fabricName || 'Raw Fabric',
        color: 'Standard',
        width: newP.width || '58"',
        gsmWeight: 'Standard',
        supplierName: newP.supplier?.name || 'Supplier',
        totalMeters: Number(newP.meters) || 0,
        availableMeters: Number(newP.meters) || 0,
        allocatedMeters: 0,
        warehouse: newP.warehouse || newP.warehouseLocation || 'Main Godown',
        rackLocation: 'General Storage',
        costPerMeter: Number(newP.rate) || 0,
        status: rawInvStatus as RawInventoryItem['status'],
        createdAt: new Date().toISOString()
      };

      // Always update local React state immediately
      setRawInventory(prev => [rawInvItem!, ...prev.filter(r => r.id !== rawInvId)]);
    }

    if (isFirebaseConfigured && db) {
      if (rawInvItem) {
        const batch = writeBatch(db);
        const purchaseRef = doc(db, COLLECTIONS.PURCHASES, purchaseId);
        batch.set(purchaseRef, JSON.parse(JSON.stringify(newP)), { merge: true });
        const rawRef = doc(db, COLLECTIONS.RAW_INVENTORY, rawInvItem.id);
        batch.set(rawRef, JSON.parse(JSON.stringify(rawInvItem)), { merge: true });
        batch.commit().catch(err => {
          console.error('Firebase error saving purchase + raw inventory:', err);
          setFirebaseError(err?.message || 'Error saving purchase');
        });
      } else {
        saveDocument(COLLECTIONS.PURCHASES, newP).catch(console.error);
      }
    }

    addAuditLog('Admin', 'PURCHASE_CREATE', 'Purchase Management', `Created purchase bill ${newP.billNumber} for ${newP.supplier?.name || 'Supplier'} (${newP.meters}m ${newP.fabricName}) → Auto-added to Raw Inventory`);
  };

  const updatePurchase = (data: Purchase) => {
    setPurchases(prev => prev.map(p => p.id === data.id ? data : p));

    // When marked as Received, ensure stock is created/synced in Raw Inventory
    if (data.status === 'Received') {
      setRawInventory(prev => {
        const existing = prev.find(r => r.purchaseId === data.id);
        if (!existing) {
          const rawInvId = `rinv-${Date.now()}`;
          const rawInvStatus = data.meters > 200 ? 'Available' : (data.meters > 0 ? 'Low' : 'Depleted');
          const invoiceNo = data.invoiceNumber || data.billNumber || `INV-${Date.now().toString().slice(-4)}`;
          const newRaw: RawInventoryItem = {
            id: rawInvId,
            purchaseId: data.id,
            batchId: invoiceNo,
            invoiceNumber: invoiceNo,
            fabricName: data.fabricName || 'Raw Fabric',
            color: 'Standard',
            width: data.width || '58"',
            gsmWeight: 'Standard',
            supplierName: data.supplier?.name || 'Supplier',
            totalMeters: Number(data.meters) || 0,
            availableMeters: Number(data.meters) || 0,
            allocatedMeters: 0,
            warehouse: data.warehouse || data.warehouseLocation || 'Main Godown',
            rackLocation: 'General Storage',
            costPerMeter: Number(data.rate) || 0,
            status: rawInvStatus as RawInventoryItem['status'],
            createdAt: new Date().toISOString()
          };
          if (isFirebaseConfigured && db) {
            saveDocument(COLLECTIONS.RAW_INVENTORY, newRaw).catch(console.error);
          }
          return [newRaw, ...prev];
        } else {
          const invoiceNo = data.invoiceNumber || data.billNumber || existing.invoiceNumber || existing.batchId;
          const updatedRaw: RawInventoryItem = {
            ...existing,
            batchId: invoiceNo,
            invoiceNumber: invoiceNo,
            fabricName: data.fabricName || existing.fabricName,
            warehouse: data.warehouse || data.warehouseLocation || existing.warehouse,
            totalMeters: Number(data.meters) || existing.totalMeters,
            availableMeters: Math.max(0, (Number(data.meters) || existing.totalMeters) - existing.allocatedMeters),
            costPerMeter: Number(data.rate) || existing.costPerMeter
          };
          if (isFirebaseConfigured && db) {
            saveDocument(COLLECTIONS.RAW_INVENTORY, updatedRaw).catch(console.error);
          }
          return prev.map(r => r.id === existing.id ? updatedRaw : r);
        }
      });
    }

    if (isFirebaseConfigured) saveDocument(COLLECTIONS.PURCHASES, data).catch(console.error);
    addAuditLog('Admin', 'PURCHASE_OVERRIDE', 'Purchase Management', `Updated purchase bill ${data.billNumber} (Status: ${data.status})`);
  };

  const deletePurchase = (id: string) => {
    const target = purchases.find(p => p.id === id);
    setPurchases(prev => prev.filter(p => p.id !== id));
    if (isFirebaseConfigured) removeDocument(COLLECTIONS.PURCHASES, id).catch(console.error);
    if (target) {
      addAuditLog('Admin', 'PURCHASE_DELETE', 'Purchase Management', `Permanently deleted purchase bill ${target.billNumber}`);
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

    if (isFirebaseConfigured && db) {
      if (rawItemToUpdate) {
        const batch = writeBatch(db);
        const poRef = doc(db, COLLECTIONS.PRODUCTION_ORDERS, poId);
        batch.set(poRef, JSON.parse(JSON.stringify(newO)));
        const rawRef = doc(db, COLLECTIONS.RAW_INVENTORY, rawItemToUpdate.id);
        batch.update(rawRef, {
          availableMeters: rawItemToUpdate.availableMeters,
          allocatedMeters: rawItemToUpdate.allocatedMeters,
          status: rawItemToUpdate.status
        });
        batch.commit().catch(err => {
          console.error('Firebase error creating production order + deducting raw inventory:', err);
          setFirebaseError(err?.message || 'Error deducting raw stock');
        });
      } else {
        saveDocument(COLLECTIONS.PRODUCTION_ORDERS, newO).catch(console.error);
      }
    }

    addAuditLog('Admin', 'PRODUCTION_CREATE', 'Production Management', `Created production order ${newO.orderCode || newO.poCode} (Challan: ${newO.challanNumber}, Style: ${newO.styleName || newO.name})${data.rawInventoryId ? ` — deducted ${data.metersAllocated}m from Raw Stock` : ''}`);
  };

  const updateProductionOrder = (data: ProductionOrder) => {
    const prevOrder = productionOrders.find(o => o.id === data.id);
    const wasNotCompleted = prevOrder && prevOrder.status !== 'Completed' && prevOrder.currentStage !== 'Finished Goods';
    const isNowCompleted = data.status === 'Completed' || data.overallStatus === 'Completed' || data.currentStage === 'Finished Goods';
    const shouldCreateFinished = isNowCompleted && (!data.finishedInventoryCreated || wasNotCompleted);

    let finItem: FinishedInventoryItem | null = null;
    let orderToSave: ProductionOrder = {
      ...data,
      stage: data.currentStage || data.stage
    };

    if (shouldCreateFinished) {
      const finId = `finv-${Date.now()}`;
      const goodQty = data.finalQuantity || data.completedQuantity || data.completed || data.quantity || data.total || data.plannedQuantity || 0;
      finItem = {
        id: finId,
        productionOrderId: data.id,
        challanNumber: data.challanNumber,
        productName: data.productName || data.producedItemName || data.styleName || data.name || 'Finished Denim Jeans',
        styleName: data.styleName || data.name || 'Standard Style',
        totalProduced: goodQty,
        availableQuantity: goodQty,
        soldQuantity: 0,
        unitPrice: 1200, // Standard unit price
        warehouse: 'Finished Goods Godown',
        status: goodQty > 0 ? 'Available' : 'Sold Out',
        createdAt: new Date().toISOString()
      };

      orderToSave = {
        ...orderToSave,
        finishedInventoryCreated: true,
        inventoryTransferred: true,
        overallStatus: 'Completed',
        status: 'Completed',
        currentStage: 'Finished Goods',
        stage: 'Finished Goods',
        progress: 100,
        finalQuantity: goodQty
      };

      // Update local state immediately
      setFinishedInventory(prev => [finItem!, ...prev.filter(f => f.productionOrderId !== data.id)]);
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
    if (isFirebaseConfigured) removeDocument(COLLECTIONS.PRODUCTION_ORDERS, id).catch(console.error);
    if (target) {
      addAuditLog('Admin', 'PRODUCTION_DELETE', 'Production Management', `Deleted production order ${target.orderCode || target.poCode} (Challan: ${target.challanNumber || 'N/A'})`);
    }
  };

  // =====================================================================
  // Raw Inventory & Finished Inventory Corrections
  // =====================================================================
  const updateRawInventoryItem = (item: RawInventoryItem) => {
    setRawInventory(prev => prev.map(r => r.id === item.id ? item : r));
    if (isFirebaseConfigured) saveDocument(COLLECTIONS.RAW_INVENTORY, item).catch(console.error);
    addAuditLog('Admin', 'RAW_INVENTORY_UPDATE', 'Inventory Management', `Corrected raw inventory ${item.batchId} (${item.availableMeters}m available)`);
  };

  const updateFinishedInventoryItem = (item: FinishedInventoryItem) => {
    setFinishedInventory(prev => prev.map(f => f.id === item.id ? item : f));
    if (isFirebaseConfigured) saveDocument(COLLECTIONS.FINISHED_INVENTORY, item).catch(console.error);
    addAuditLog('Admin', 'FINISHED_INVENTORY_UPDATE', 'Inventory Management', `Corrected finished inventory ${item.productName} (${item.availableQuantity} pcs available)`);
  };

  // =====================================================================
  // 4. PIPELINE: Finished Inventory → Sales
  // 5. PIPELINE: Sales → Invoice (auto-generation)
  // =====================================================================
  const addSale = async (saleData: Omit<SaleOrder, 'id' | 'createdAt' | 'invoiceId'>) => {
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

    const newSale: SaleOrder = {
      ...saleData,
      id: saleId,
      invoiceId: invoiceId,
      createdAt: now
    };

    const newInvoice: Invoice = {
      id: invoiceId,
      client: saleData.customerName,
      customerName: saleData.customerName,
      customerId: saleData.customerId,
      date: now.substring(0, 10),
      invoiceCode: `INV-${Date.now().toString().slice(-4)}`,
      invoiceNumber: `INV-${Date.now().toString().slice(-4)}`,
      amount: saleData.totalAmount,
      status: 'Pending',
      itemsCount: saleData.items.reduce((sum, item) => sum + item.quantity, 0),
      itemsSummary: saleData.items.map(item => `${item.quantity} × ${item.productName}`).join(', '),
      saleId: saleId,
      items: invoiceItems,
      paymentMode: 'Bank Transfer'
    };

    // Deduct finished inventory locally
    setFinishedInventory(prev => prev.map(f => {
      const match = saleData.items.find(item => item.finishedInventoryId === f.id);
      if (match) {
        const newAvail = Math.max(0, f.availableQuantity - match.quantity);
        const newSold = f.soldQuantity + match.quantity;
        const newStatus = newAvail <= 0 ? 'Sold Out' : (newAvail < 20 ? 'Low' : 'Available');
        return {
          ...f,
          availableQuantity: newAvail,
          soldQuantity: newSold,
          status: newStatus as FinishedInventoryItem['status']
        };
      }
      return f;
    }));

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
        const finItem = finishedInventory.find(f => f.id === lineItem.finishedInventoryId);
        if (finItem) {
          const newAvail = Math.max(0, finItem.availableQuantity - lineItem.quantity);
          const newSold = finItem.soldQuantity + lineItem.quantity;
          const newStatus = newAvail <= 0 ? 'Sold Out' : (newAvail < 20 ? 'Low' : 'Available');
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

    addAuditLog('Admin', 'SALE_CREATE', 'Sales & Billing', `Sold ${newInvoice.itemsCount} pcs to ${saleData.customerName} (₹${saleData.totalAmount}) → Invoice ${newInvoice.invoiceNumber} auto-generated, Finished Goods deducted.`);
  };

  const updateSale = (data: SaleOrder) => {
    setSales(prev => prev.map(s => s.id === data.id ? data : s));
    if (isFirebaseConfigured) saveDocument(COLLECTIONS.SALES, data).catch(console.error);
    addAuditLog('Admin', 'SALE_UPDATE', 'Sales & Billing', `Updated sale ${data.saleCode}`);
  };

  const deleteSale = (id: string) => {
    const target = sales.find(s => s.id === id);
    setSales(prev => prev.filter(s => s.id !== id));
    if (isFirebaseConfigured) removeDocument(COLLECTIONS.SALES, id).catch(console.error);
    if (target) {
      addAuditLog('Admin', 'SALE_DELETE', 'Sales & Billing', `Deleted sale order ${target.saleCode}`);
    }
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
    setInvoices(prev => prev.map(i => i.id === data.id ? data : i));
    if (isFirebaseConfigured) saveDocument(COLLECTIONS.INVOICES, data).catch(console.error);
    addAuditLog('Admin', 'INVOICE_OVERRIDE', 'Sales & Billing', `Updated invoice ${data.invoiceCode || data.invoiceNumber} status to ${data.status}`);
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
    return rawInventory.map((r) => {
      const p = purchases.find(
        (item) => item.id === r.purchaseId || item.billNumber === r.purchaseId || item.invoiceNumber === r.purchaseId
      );
      const trueInvoice =
        p?.invoiceNumber ||
        p?.billNumber ||
        (r.invoiceNumber && !r.invoiceNumber.startsWith('DF-2026-') ? r.invoiceNumber : '') ||
        (r.batchId && !r.batchId.startsWith('DF-2026-') ? r.batchId : '');
      return {
        ...r,
        invoiceNumber: trueInvoice || r.invoiceNumber || (p?.billNumber || r.batchId),
        batchId: trueInvoice || r.batchId
      };
    });
  }, [rawInventory, purchases]);

  const enrichedProductionOrders = useMemo(() => {
    return productionOrders.map((po) => {
      const raw = rawInventory.find((r) => r.id === po.rawInventoryId);
      const p = purchases.find(
        (item) => item.id === raw?.purchaseId || item.invoiceNumber === po.rawBatchId || item.billNumber === po.rawBatchId
      );
      const trueInvoice =
        p?.invoiceNumber ||
        p?.billNumber ||
        raw?.invoiceNumber ||
        (po.rawBatchId && !po.rawBatchId.startsWith('DF-2026-') ? po.rawBatchId : '');
      return {
        ...po,
        rawBatchId: trueInvoice || po.rawBatchId
      };
    });
  }, [productionOrders, rawInventory, purchases]);

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
        finishedInventory,
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
