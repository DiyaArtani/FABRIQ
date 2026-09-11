import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  runTransaction,
  DocumentData,
  Unsubscribe,
  Transaction
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import {
  AppUser,
  Warehouse,
  Contractor,
  Supplier,
  Customer,
  ProductionOrder,
  StockItem,
  Invoice,
  AuditLog,
  SystemSettings,
  RawInventoryItem,
  FinishedInventoryItem,
  SaleOrder,
  Purchase
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_WAREHOUSES,
  INITIAL_CONTRACTORS,
  INITIAL_SUPPLIERS,
  INITIAL_CUSTOMERS,
  INITIAL_AUDIT_LOGS
} from '../data/initialMasterData';
import {
  INITIAL_PRODUCTION_ORDERS,
  INITIAL_STOCK_ITEMS,
  INITIAL_INVOICES,
  MOCK_PURCHASES
} from '../data';

// Firestore Collection Names
export const COLLECTIONS = {
  USERS: 'users',
  WAREHOUSES: 'warehouses',
  CONTRACTORS: 'contractors',
  SUPPLIERS: 'suppliers',
  CUSTOMERS: 'customers',
  PURCHASES: 'purchases',
  PRODUCTION_ORDERS: 'productionOrders',
  STOCK_ITEMS: 'stockItems',
  INVOICES: 'invoices',
  AUDIT_LOGS: 'auditLogs',
  SETTINGS: 'settings',
  RAW_INVENTORY: 'rawInventory',
  FINISHED_INVENTORY: 'finishedInventory',
  SALES: 'sales'
};

// Generic Collection Listener
export function subscribeCollection<T extends { id: string }>(
  collectionName: string,
  onUpdate: (items: T[]) => void,
  onError?: (error: Error) => void
): Unsubscribe | null {
  if (!isFirebaseConfigured || !db) return null;

  try {
    const colRef = collection(db, collectionName);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items: T[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        })) as T[];
        onUpdate(items);
      },
      (error) => {
        console.error(`Error listening to collection ${collectionName}:`, error);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.error(`Failed to subscribe to ${collectionName}:`, err);
    return null;
  }
}

// Single Document Listener (e.g. for Settings)
export function subscribeDocument<T>(
  collectionName: string,
  docId: string,
  onUpdate: (data: T | null) => void,
  onError?: (error: Error) => void
): Unsubscribe | null {
  if (!isFirebaseConfigured || !db) return null;

  try {
    const docRef = doc(db, collectionName, docId);
    return onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          onUpdate(docSnap.data() as T);
        } else {
          onUpdate(null);
        }
      },
      (error) => {
        console.error(`Error listening to document ${collectionName}/${docId}:`, error);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.error(`Failed to subscribe to document ${docId}:`, err);
    return null;
  }
}

// Generic Document Set / Add
export async function saveDocument<T extends { id?: string }>(
  collectionName: string,
  item: T,
  customId?: string
): Promise<string> {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured.');
  }

  const docId = customId || item.id || doc(collection(db, collectionName)).id;
  const rawItem = { ...item, id: docId };
  // Strip out undefined fields so Firestore setDoc does not throw invalid data error
  const itemToSave = JSON.parse(JSON.stringify(rawItem));
  const docRef = doc(db, collectionName, docId);

  await setDoc(docRef, itemToSave, { merge: true });
  return docId;
}

// Generic Document Update
export async function updateDocument(
  collectionName: string,
  docId: string,
  updates: Partial<DocumentData>
): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured.');
  }

  const cleanUpdates = JSON.parse(JSON.stringify(updates));
  const docRef = doc(db, collectionName, docId);
  await updateDoc(docRef, cleanUpdates);
}

// Generic Document Delete
export async function removeDocument(
  collectionName: string,
  docId: string
): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured.');
  }

  const docRef = doc(db, collectionName, docId);
  await deleteDoc(docRef);
}

// Atomic Transaction Helper for cross-module pipeline operations
export async function runBatchedTransaction(
  transactionFn: (transaction: Transaction, firestore: typeof db) => Promise<void>
): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured.');
  }
  await runTransaction(db, async (transaction) => {
    await transactionFn(transaction, db);
  });
}

// Helper to get a new document reference with auto-generated ID
export function getNewDocRef(collectionName: string): { ref: ReturnType<typeof doc>; id: string } {
  if (!db) throw new Error('Firebase is not configured.');
  const ref = doc(collection(db, collectionName));
  return { ref, id: ref.id };
}

// Helper to get existing document reference
export function getDocRef(collectionName: string, docId: string) {
  if (!db) throw new Error('Firebase is not configured.');
  return doc(db, collectionName, docId);
}

// Seed Firestore with Initial Data
export async function seedFirestoreDatabase(): Promise<{ success: boolean; message: string }> {
  if (!isFirebaseConfigured || !db) {
    return { success: false, message: 'Firebase configuration is missing or invalid in environment.' };
  }

  try {
    const batch = writeBatch(db);

    // Users
    INITIAL_USERS.forEach((u) => {
      const ref = doc(db!, COLLECTIONS.USERS, u.id);
      batch.set(ref, u, { merge: true });
    });

    // Warehouses
    INITIAL_WAREHOUSES.forEach((w) => {
      const ref = doc(db!, COLLECTIONS.WAREHOUSES, w.id);
      batch.set(ref, w, { merge: true });
    });

    // Contractors
    INITIAL_CONTRACTORS.forEach((c) => {
      const ref = doc(db!, COLLECTIONS.CONTRACTORS, c.id);
      batch.set(ref, c, { merge: true });
    });

    // Suppliers
    INITIAL_SUPPLIERS.forEach((s) => {
      const ref = doc(db!, COLLECTIONS.SUPPLIERS, s.id);
      batch.set(ref, s, { merge: true });
    });

    // Customers
    INITIAL_CUSTOMERS.forEach((cust) => {
      const ref = doc(db!, COLLECTIONS.CUSTOMERS, cust.id);
      batch.set(ref, cust, { merge: true });
    });

    // Purchases
    MOCK_PURCHASES.forEach((p) => {
      const ref = doc(db!, COLLECTIONS.PURCHASES, p.id);
      batch.set(ref, p, { merge: true });
    });

    // Production Orders
    INITIAL_PRODUCTION_ORDERS.forEach((po) => {
      const ref = doc(db!, COLLECTIONS.PRODUCTION_ORDERS, po.id);
      batch.set(ref, po, { merge: true });
    });

    // Stock Items
    INITIAL_STOCK_ITEMS.forEach((si) => {
      const ref = doc(db!, COLLECTIONS.STOCK_ITEMS, si.id);
      batch.set(ref, si, { merge: true });
    });

    // Invoices
    INITIAL_INVOICES.forEach((inv) => {
      const ref = doc(db!, COLLECTIONS.INVOICES, inv.id);
      batch.set(ref, inv, { merge: true });
    });

    // Audit Logs
    INITIAL_AUDIT_LOGS.forEach((log) => {
      const ref = doc(db!, COLLECTIONS.AUDIT_LOGS, log.id);
      batch.set(ref, log, { merge: true });
    });

    // System Settings
    const settingsRef = doc(db, COLLECTIONS.SETTINGS, 'global');
    batch.set(settingsRef, {
      companyName: 'Fabriq Textile & Apparel Ledger',
      gstin: '',
      currencySymbol: '₹',
      defaultTaxRate: 18,
      adminNotificationEmail: '',
      inventoryAlertThreshold: 0,
      firebaseConfigured: true,
      ledgerTheme: ''
    }, { merge: true });

    await batch.commit();
    return { success: true, message: 'Firestore successfully seeded with default Fabriq dataset!' };
  } catch (error: any) {
    console.error('Error seeding Firestore database:', error);
    return { success: false, message: error?.message || 'Failed to seed Firestore database.' };
  }
}
