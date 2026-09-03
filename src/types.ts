export type UserRole = 'Admin' | 'Employee';

export type UserStatus = 'Active' | 'Inactive' | 'Suspended';

export interface AppUser {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  department?: string;
  status: UserStatus;
  assignedWarehouse?: string;
  password?: string;
  pin?: string;
  createdAt: string;
  lastLogin?: string;
}

export type ProductionStage = 
  | 'Cutting' 
  | 'Dyeing' 
  | 'Printing' 
  | 'Stitching' 
  | 'Quality Inspection' 
  | 'Ironing & Finishing' 
  | 'Packaging'
  | 'Completed'
  | 'Finished Goods'
  | string;

export interface StageHistoryEntry {
  stage?: ProductionStage;
  stageName?: string;
  timestamp?: string;
  assignedDate?: string;
  completedDate?: string;
  assignedWorker?: string;
  contractorId?: string;
  contractorName?: string;
  quantitySent?: number;
  quantityReceived?: number;
  quantityCompleted?: number;
  rejectedQuantity?: number;
  defectsFound?: number;
  wastageQuantity?: number;
  outputMeters?: number;
  challanNumber?: string;
  returnedFromJobWorker?: boolean;
  status?: string;
  remarks?: string;
  notes?: string;
}

export interface ProductionOrder {
  id: string;
  productionOrderId?: string;
  batchNumber?: string;
  poCode?: string;
  orderCode?: string;
  challanNumber?: string;
  productName?: string;
  styleName?: string;
  name?: string;
  category?: string;
  targetQuantity?: number;
  quantity?: number;
  plannedQuantity?: number;
  completedQuantity?: number;
  finalQuantity?: number;
  completed?: number;
  total?: number;
  progress?: number;
  totalRejectedQuantity?: number;
  currentStage?: ProductionStage;
  stage?: ProductionStage;
  overallStatus?: string;
  assignedContractorId?: string;
  contractorName?: string;
  assignedTo?: string;
  startDate?: string;
  estimatedCompletionDate?: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
  status?: 'Draft' | 'Active' | 'Paused' | 'Completed' | 'Cancelled' | 'In Progress' | string;
  assignedWorkers?: string[];
  notes?: string;
  stageHistory?: StageHistoryEntry[] | any[];
  inventoryTransferred?: boolean;
  rawInventoryId?: string;
  rawBatchId?: string;
  fabricName?: string;
  metersRequired?: number;
  metersAllocated?: number;
  producedItemName?: string;
  finishedInventoryCreated?: boolean;
  createdAt?: string;
  createdBy?: string;
}

export type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Available' | 'Sold Out';

export interface StockItem {
  id: string;
  name: string;
  itemName?: string;
  color?: string;
  size?: string;
  availableUnits: number;
  location: string;
  warehouse?: string;
  rackLocation?: string;
  status: StockStatus;
  imageUrl?: string;
  unitPrice?: number;
  costPrice?: number;
  sellingPrice?: number;
  category?: string;
  sku?: string;
  unit?: string;
  minThreshold?: number;
  lastUpdated?: string;
}

export interface RawInventoryItem {
  id: string;
  purchaseId: string;
  batchId: string;
  fabricName: string;
  color: string;
  width: string;
  gsmWeight: string;
  supplierName: string;
  totalMeters: number;
  availableMeters: number;
  allocatedMeters: number;
  warehouse: string;
  rackLocation: string;
  costPerMeter: number;
  status: 'Available' | 'Low' | 'Depleted';
  createdAt: string;
}

export interface FinishedInventoryItem {
  id: string;
  productionOrderId?: string;
  batchNumber?: string;
  challanNumber?: string;
  itemName?: string;
  productName?: string;
  styleName?: string;
  category?: string;
  color?: string;
  size?: string;
  unitsProduced?: number;
  totalProduced?: number;
  unitsAvailable?: number;
  availableQuantity?: number;
  unitsSold?: number;
  soldQuantity?: number;
  warehouse?: string;
  rackLocation?: string;
  costPerUnit?: number;
  unitPrice?: number;
  sellingPrice?: number;
  status: 'In Stock' | 'Low Stock' | 'Sold Out' | 'Available';
  createdAt: string;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  location: string;
  address: string;
  capacityUnits: number;
  currentUnits: number;
  managerName: string;
  phone: string;
  status: 'Active' | 'Maintenance' | 'Full';
}

export interface Contractor {
  id: string;
  code: string;
  name: string;
  specialty: 'Stitching' | 'Dyeing' | 'Fabric Cutting' | 'Quality Control' | 'Packaging' | 'Finishing';
  contactPerson: string;
  phone: string;
  email: string;
  location: string;
  rating: number;
  activeOrdersCount: number;
  status: 'Active' | 'Inactive';
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  category?: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address?: string;
  gstin?: string;
  accountNumber?: string;
  bankName?: string;
  ifscCode?: string;
  paymentTerms?: string;
  rating?: number;
  status: 'Active' | 'Blocked';
}

export interface Customer {
  id: string;
  code: string;
  companyName: string;
  name?: string;
  type?: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  gstin?: string;
  category: 'Wholesaler' | 'Retailer' | 'Distributor' | 'Boutique' | 'Online Channel' | string;
  creditLimit: number;
  outstandingBalance: number;
  paymentTerms: string;
  status: 'Active' | 'Inactive' | 'Blocked';
  ordersCount: number;
}

export type PurchaseStatus = 'Ordered' | 'In Transit' | 'Received' | 'Cancelled';
export type PurchasePaymentStatus = 'Paid' | 'Partial' | 'Pending';

export interface Purchase {
  id: string;
  billNumber: string;
  invoiceNumber: string;
  supplier: {
    name: string;
    phone?: string;
    address?: string;
    gstin?: string;
    accountNumber?: string;
    bankName?: string;
    ifscCode?: string;
  };
  purchaseDate: string;
  status: PurchaseStatus;
  paymentStatus: PurchasePaymentStatus;
  paymentMode?: 'Bank Transfer' | 'Cash' | 'UPI' | 'Credit';
  remarks?: string;
  fabricName: string;
  width?: string;
  meters: number;
  rate: number;
  subtotal: number;
  gstRate?: number;
  gstAmount?: number;
  totalAmount: number;
  warehouse: string;
  warehouseLocation?: string;
  createdAt: string;
  // Optional legacy attributes for reading older records
  color?: string;
  rollQuantity?: number;
  batchNumber?: string;
}

export type InvoiceStatus = 'Paid' | 'Pending' | 'Overdue' | 'Cancelled';

export interface InvoiceLineItem {
  finishedInventoryId?: string;
  itemName?: string;
  productName?: string;
  color?: string;
  size?: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceCode?: string;
  saleId?: string;
  client?: any;
  amount?: number;
  itemsCount?: number;
  itemsSummary?: string;
  customerId?: string;
  customerName?: string;
  customerGstin?: string;
  customerAddress?: string;
  date?: string;
  issueDate?: string;
  dueDate?: string;
  status: InvoiceStatus;
  lineItems?: InvoiceLineItem[];
  items?: any[];
  subtotal?: number;
  taxRate?: number;
  taxAmount?: number;
  discountAmount?: number;
  totalAmount?: number;
  paymentMethod?: string;
  paymentMode?: string;
  notes?: string;
  createdAt?: string;
}

export type SaleOrderStatus = 'Draft' | 'Confirmed' | 'Dispatched' | 'Delivered' | 'Cancelled';

export interface SaleLineItem {
  finishedInventoryId?: string;
  itemName?: string;
  color?: string;
  size?: string;
  quantity?: number;
  unitPrice?: number;
  lineTotal?: number;
  [key: string]: any;
}

export interface SaleOrder {
  id: string;
  orderNumber?: string;
  saleCode?: string;
  customerId: string;
  customerName: string;
  orderDate: string;
  dispatchDate?: string;
  status: SaleOrderStatus;
  paymentStatus: 'Paid' | 'Partial' | 'Unpaid';
  lineItems?: SaleLineItem[];
  items?: any[];
  subtotal: number;
  gstRate: number;
  gstAmount: number;
  grandTotal: number;
  totalAmount?: number;
  paidAmount: number;
  shippingAddress: string;
  invoiceId?: string;
  notes?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userName?: string;
  actor?: string;
  action: string;
  module: string;
  details: string;
  ipAddress?: string;
}

export interface SystemSettings {
  companyName: string;
  gstin: string;
  currencySymbol: string;
  defaultTaxRate: number;
  adminNotificationEmail: string;
  inventoryAlertThreshold: number;
  firebaseConfigured: boolean;
  ledgerTheme: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type?: 'info' | 'warning' | 'success' | 'alert';
}
