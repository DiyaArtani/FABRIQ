import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  Phone,
  Mail,
  DollarSign,
  FileSpreadsheet,
  Search,
  Users,
  AlertCircle,
  UserCheck,
  ArrowLeft,
  ShoppingBag,
  Receipt,
  Package,
  Calendar,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  CheckCircle2,
  Truck,
  FileText,
  Printer
} from 'lucide-react';
import { useFabriqData } from '../../context/FabriqDataContext';
import { Customer, SaleOrder, Invoice } from '../../types';
import { Badge, Modal, ConfirmDeleteModal } from '../components/AdminUIComponents';
import { TaxInvoiceModal } from '../components/TaxInvoiceModal';
import { WhatsAppShareModal, WhatsAppIcon } from '../../components/WhatsAppShareModal';
import { resolveInvoiceForSale } from '../../lib/invoiceUtils';
import { sortLatest } from '../../utils/sortUtils';

// Helper to generate next sequential Customer ID
const generateNextCustomerId = (list: Customer[]) => {
  let maxNum = 0;
  list.forEach(c => {
    const val = c.code || c.id || '';
    const match = val.match(/(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  });
  return `CUST-${String(maxNum + 1).padStart(3, '0')}`;
};

export const CustomerManagementPage: React.FC = () => {
  const { 
    customers, 
    addCustomer, 
    updateCustomer, 
    deleteCustomer, 
    sales = [], 
    invoices = [] 
  } = useFabriqData();

  // Screen selection state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [salesSearchTerm, setSalesSearchTerm] = useState('');
  const [salesStatusFilter, setSalesStatusFilter] = useState<'ALL' | 'Delivered' | 'Dispatched' | 'Confirmed' | 'Draft' | 'Cancelled' | 'Invoices'>('ALL');
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [salesDownloadSuccess, setSalesDownloadSuccess] = useState(false);
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState<Invoice | null>(null);
  const [whatsAppData, setWhatsAppData] = useState<{ invoice: Invoice; customer: Customer | null } | null>(null);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Customer | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Customer | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'ALL' | 'Wholesale' | 'Retailer' | 'Boutique' | 'Export'>('ALL');

  // Form Fields
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<Customer['type']>('Retailer');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [outstandingBalance, setOutstandingBalance] = useState(0);
  const [status, setStatus] = useState<Customer['status']>('Active');

  // Keep active customer in sync with data context if updated
  const activeCustomer = useMemo(() => {
    if (!selectedCustomer) return null;
    return (customers || []).find(c => c.id === selectedCustomer.id) || selectedCustomer;
  }, [customers, selectedCustomer]);

  // Filtered customer list for the main directory
  const filteredCustomers = useMemo(() => {
    const list = (customers || []).filter(c => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        (c.name || '').toLowerCase().includes(term) ||
        (c.code || c.id || '').toLowerCase().includes(term) ||
        (c.contactPerson || '').toLowerCase().includes(term) ||
        (c.phone || '').toLowerCase().includes(term) ||
        (c.email || '').toLowerCase().includes(term) ||
        (c.address || '').toLowerCase().includes(term);

      if (!matchesSearch) return false;
      if (selectedType === 'ALL') return true;
      return (c.type || '').toLowerCase() === selectedType.toLowerCase();
    });

    return sortLatest(list);
  }, [customers, searchTerm, selectedType]);

  // Aggregate Metrics for directory
  const activeCount = useMemo(() => {
    return (customers || []).filter(c => c.status === 'Active').length;
  }, [customers]);

  const totalOutstanding = useMemo(() => {
    return (customers || []).reduce((sum, c) => sum + Number(c.outstandingBalance || 0), 0);
  }, [customers]);

  const clientsWithDuesCount = useMemo(() => {
    return (customers || []).filter(c => Number(c.outstandingBalance || 0) > 0).length;
  }, [customers]);

  // Helper: check if a sale belongs to a customer
  const isCustomerSale = (sale: SaleOrder, cust: Customer) => {
    if (!sale || !cust) return false;
    const sCustId = (sale.customerId || '').trim().toLowerCase();
    const cId = (cust.id || '').trim().toLowerCase();
    const cCode = (cust.code || '').trim().toLowerCase();

    if (sCustId && (sCustId === cId || (cCode && sCustId === cCode))) {
      return true;
    }

    const sCustName = (sale.customerName || '').trim().toLowerCase();
    const cName = (cust.name || '').trim().toLowerCase();
    if (sCustName && cName && sCustName === cName) {
      return true;
    }

    if (sale.customerPhone && cust.phone && sale.customerPhone.trim() === cust.phone.trim()) {
      return true;
    }

    return false;
  };

  // Helper: check if an invoice belongs to a customer
  const isCustomerInvoice = (inv: Invoice, cust: Customer) => {
    if (!inv || !cust) return false;
    const iCustId = (inv.customerId || '').trim().toLowerCase();
    const cId = (cust.id || '').trim().toLowerCase();
    const cCode = (cust.code || '').trim().toLowerCase();

    if (iCustId && (iCustId === cId || (cCode && iCustId === cCode))) {
      return true;
    }

    const clientStr = (typeof inv.client === 'string' ? inv.client : (inv.customerName || '')).trim().toLowerCase();
    const cName = (cust.name || '').trim().toLowerCase();
    if (clientStr && cName && clientStr === cName) {
      return true;
    }

    if (inv.customerPhone && cust.phone && inv.customerPhone.trim() === cust.phone.trim()) {
      return true;
    }

    return false;
  };

  // Get count of sales for any customer row in directory table
  const getSalesCountForCustomer = (cust: Customer) => {
    return (sales || []).filter(s => isCustomerSale(s, cust)).length;
  };

  // Active customer's sales orders
  const customerSales = useMemo(() => {
    if (!activeCustomer) return [];
    const list = (sales || []).filter(s => isCustomerSale(s, activeCustomer));
    return sortLatest(list);
  }, [sales, activeCustomer]);

  // Active customer's invoices
  const customerInvoices = useMemo(() => {
    if (!activeCustomer) return [];
    const list = (invoices || []).filter(inv => isCustomerInvoice(inv, activeCustomer));
    return sortLatest(list);
  }, [invoices, activeCustomer]);

  // Filtered sales for the selected customer screen
  const filteredCustomerSales = useMemo(() => {
    return customerSales.filter(s => {
      // Status filter
      if (salesStatusFilter !== 'ALL' && salesStatusFilter !== 'Invoices') {
        if ((s.status || '').toLowerCase() !== salesStatusFilter.toLowerCase()) {
          return false;
        }
      }

      // Search term
      if (salesSearchTerm.trim()) {
        const term = salesSearchTerm.toLowerCase();
        const matchesInvoice = (s.invoiceNumber || s.invoiceId || '').toLowerCase().includes(term);
        const matchesItems = Array.isArray(s.lineItems || s.items) &&
          (s.lineItems || s.items).some((it: any) =>
            (it.itemName || it.productName || '').toLowerCase().includes(term)
          );
        if (!matchesInvoice && !matchesItems) return false;
      }

      return true;
    });
  }, [customerSales, salesStatusFilter, salesSearchTerm]);

  // Metrics for active customer
  const customerMetrics = useMemo(() => {
    if (!activeCustomer) {
      return { totalSalesCount: 0, totalRevenue: 0, totalPaid: 0, balanceDue: 0, deliveredCount: 0 };
    }

    const totalSalesCount = customerSales.length;
    const totalRevenue = customerSales.reduce((acc, s) => acc + Number(s.grandTotal ?? s.totalAmount ?? 0), 0);
    const totalPaid = customerSales.reduce((acc, s) => acc + Number(s.paidAmount ?? (s.paymentStatus === 'Paid' ? (s.grandTotal ?? s.totalAmount ?? 0) : 0)), 0);
    const balanceDue = Number(activeCustomer.outstandingBalance || 0);
    const deliveredCount = customerSales.filter(s => s.status === 'Delivered').length;

    return { totalSalesCount, totalRevenue, totalPaid, balanceDue, deliveredCount };
  }, [activeCustomer, customerSales]);

  // Export Customer Directory as genuine Excel (.xlsx)
  const handleExportExcel = () => {
    const listToExport = filteredCustomers.length > 0 ? filteredCustomers : customers;

    const headers = [
      'Customer ID',
      'Client / Company Name',
      'Business Type',
      'Contact Person',
      'Mobile Phone',
      'Email Address',
      'Billing / Shipping Address',
      'Outstanding Balance (INR)',
      'Account Status'
    ];

    const rows = listToExport.map(c => [
      c.code || c.id,
      c.name,
      c.type,
      c.contactPerson,
      c.phone,
      c.email,
      c.address,
      c.outstandingBalance,
      c.status
    ]);

    const totalOutstandingAll = listToExport.reduce((acc, c) => acc + Number(c.outstandingBalance || 0), 0);

    const summaryRow = [
      'TOTAL ACCOUNTS',
      `${listToExport.length} Clients`,
      '',
      '',
      '',
      '',
      'Total Outstanding:',
      totalOutstandingAll,
      ''
    ];

    const wsData = [
      ['FABRIQ APPAREL MANUFACTURING - CUSTOMER MASTER DIRECTORY'],
      [`Generated on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} | Active Clients: ${activeCount}`],
      [],
      headers,
      ...rows,
      [],
      summaryRow
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws['!cols'] = [
      { wch: 16 },
      { wch: 32 },
      { wch: 18 },
      { wch: 22 },
      { wch: 18 },
      { wch: 28 },
      { wch: 40 },
      { wch: 26 },
      { wch: 16 }
    ];

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customer Directory');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Fabriq_Customers_${new Date().toISOString().slice(0, 10)}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2500);
  };

  // Export Specific Customer Sales Records as Excel (.xlsx)
  const handleExportCustomerSalesExcel = () => {
    if (!activeCustomer) return;

    const headers = [
      'Invoice #',
      'Sale Date',
      'Items Ordered & Breakdown',
      'Total Items Qty',
      'Subtotal (INR)',
      'GST Amount (INR)',
      'Total Amount (INR)',
      'Paid Amount (INR)',
      'Payment Status',
      'Order Status',
      'Shipping Address'
    ];

    const rows = customerSales.map(s => {
      const itemsList = (s.lineItems || s.items || []);
      const itemsText = itemsList.map((item: any) =>
        `${item.productName || item.itemName || 'Item'} (${item.quantity || 1} pcs @ ₹${item.unitPrice || 0})`
      ).join('; ');

      const totalQty = itemsList.reduce((sum: number, it: any) => sum + Number(it.quantity || 1), 0);
      const paidAmt = Number(s.paidAmount ?? (s.paymentStatus === 'Paid' ? (s.grandTotal ?? s.totalAmount ?? 0) : 0));
      const grandTot = Number(s.grandTotal ?? s.totalAmount ?? 0);
      const inv = resolveInvoiceForSale(s, invoices, activeCustomer.phone);

      return [
        inv.invoiceNumber || inv.invoiceCode || s.invoiceNumber || 'N/A',
        s.saleDate || s.orderDate || (s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN') : 'N/A'),
        itemsText || 'General Apparel',
        totalQty,
        s.subtotal ?? (grandTot - (s.gstAmount || 0)),
        s.gstAmount ?? 0,
        grandTot,
        paidAmt,
        s.paymentStatus || 'Unpaid',
        s.status || 'Confirmed',
        s.shippingAddress || activeCustomer.address || 'N/A'
      ];
    });

    const totalRevenue = customerSales.reduce((acc, s) => acc + Number(s.grandTotal ?? s.totalAmount ?? 0), 0);
    const totalPaid = customerSales.reduce((acc, s) => acc + Number(s.paidAmount ?? (s.paymentStatus === 'Paid' ? (s.grandTotal ?? s.totalAmount ?? 0) : 0)), 0);

    const summaryRow = [
      'TOTAL SALES',
      `${customerSales.length} Orders`,
      '',
      '',
      '',
      '',
      'Total Revenue / Paid:',
      totalRevenue,
      totalPaid,
      `Balance: ₹${activeCustomer.outstandingBalance || 0}`,
      '',
      ''
    ];

    const wsData = [
      [`FABRIQ ERP - SALES RECORDS LEDGER FOR ${activeCustomer.name.toUpperCase()}`],
      [`Customer ID: ${activeCustomer.code || activeCustomer.id} | Contact: ${activeCustomer.contactPerson || 'N/A'} | Phone: ${activeCustomer.phone || 'N/A'} | Export Date: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`],
      [],
      headers,
      ...rows,
      [],
      summaryRow
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws['!cols'] = [
      { wch: 20 },
      { wch: 14 },
      { wch: 18 },
      { wch: 45 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      { wch: 18 },
      { wch: 16 },
      { wch: 16 },
      { wch: 35 }
    ];

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales History');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeCustName = (activeCustomer.name || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
    link.setAttribute('download', `Fabriq_Sales_${safeCustName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setSalesDownloadSuccess(true);
    setTimeout(() => setSalesDownloadSuccess(false), 2500);
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setCode(generateNextCustomerId(customers));
    setName('');
    setType('Retailer');
    setContactPerson('');
    setEmail('');
    setPhone('');
    setAddress('');
    setOutstandingBalance(0);
    setStatus('Active');
    setIsModalOpen(true);
  };

  const openEditModal = (item: Customer) => {
    setEditingItem(item);
    setCode(item.code || item.id);
    setName(item.name);
    setType(item.type);
    setContactPerson(item.contactPerson);
    setEmail(item.email);
    setPhone(item.phone);
    setAddress(item.address);
    setOutstandingBalance(item.outstandingBalance);
    setStatus(item.status);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateCustomer({
        ...editingItem,
        code,
        name,
        type,
        contactPerson,
        email,
        phone,
        address,
        outstandingBalance,
        status
      });
      if (selectedCustomer && selectedCustomer.id === editingItem.id) {
        setSelectedCustomer({
          ...selectedCustomer,
          code,
          name,
          type,
          contactPerson,
          email,
          phone,
          address,
          outstandingBalance,
          status
        });
      }
    } else {
      addCustomer({
        code,
        name,
        type,
        contactPerson,
        email,
        phone,
        address,
        outstandingBalance,
        status
      });
    }
    setIsModalOpen(false);
  };

  // Status badge styling helper
  const getSaleStatusBadge = (sStatus?: string) => {
    switch (sStatus) {
      case 'Delivered':
        return 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      case 'Dispatched':
        return 'bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800';
      case 'Confirmed':
        return 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800';
      case 'Draft':
        return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700';
      case 'Cancelled':
        return 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800';
      default:
        return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700';
    }
  };

  // Payment badge helper
  const getPaymentBadge = (payStatus?: string) => {
    switch (payStatus) {
      case 'Paid':
        return 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      case 'Partial':
        return 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800';
      case 'Unpaid':
        return 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800';
      default:
        return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700';
    }
  };

  // =========================================================================
  // VIEW 1: CUSTOMER SALES RECORDS SCREEN (WHEN CUSTOMER IS CLICKED)
  // =========================================================================
  if (activeCustomer) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Navigation & Header Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-2xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-mono text-xs font-bold flex items-center gap-1.5 border border-zinc-300 dark:border-zinc-700 transition-colors cursor-pointer rounded"
                title="Return to Customer Master Directory"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>BACK TO DIRECTORY</span>
              </button>
              <span className="text-zinc-400 dark:text-zinc-600 text-xs font-mono">/</span>
              <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold uppercase">
                SALES RECORDS & ORDERS
              </span>
            </div>
            <h1 className="font-hanken font-bold text-2xl text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-3">
              <span>{activeCustomer.name}</span>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded">
                {activeCustomer.code || activeCustomer.id}
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Download Sales Excel */}
            <button
              type="button"
              onClick={handleExportCustomerSalesExcel}
              className={`px-3.5 py-2 border font-mono font-bold text-xs flex items-center gap-2 shadow-2xs transition-all cursor-pointer rounded ${salesDownloadSuccess
                  ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                  : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200'
                }`}
              title="Download all sales records of this customer as Excel spreadsheet"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{salesDownloadSuccess ? 'SALES EXCEL DOWNLOADED!' : 'DOWNLOAD SALES EXCEL'}</span>
            </button>

            {/* Edit Profile */}
            <button
              type="button"
              onClick={() => openEditModal(activeCustomer)}
              className="px-3.5 py-2 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 rounded cursor-pointer transition-colors"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>EDIT PROFILE</span>
            </button>
          </div>
        </div>

        {/* Customer Profile Banner & Contact Info */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold uppercase text-zinc-500">Business Type:</span>
              <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-400 border border-sky-300 dark:border-sky-800 rounded">
                {activeCustomer.type}
              </span>
              <span className="text-zinc-300 dark:text-zinc-700">|</span>
              <span className="text-xs font-mono font-bold uppercase text-zinc-500">Account Status:</span>
              <Badge status={activeCustomer.status} />
            </div>

            <div className="text-xs font-mono text-zinc-500">
              Showing complete sales & billing history for this client
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 rounded space-y-1">
              <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">Contact Person</span>
              <div className="flex items-center gap-2 text-xs font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                <Users className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="truncate">{activeCustomer.contactPerson || 'N/A'}</span>
              </div>
            </div>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 rounded space-y-1">
              <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">Phone Number</span>
              <div className="flex items-center gap-2 text-xs font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                {activeCustomer.phone ? (
                  <a href={`tel:${activeCustomer.phone}`} className="hover:text-emerald-600 underline">
                    {activeCustomer.phone}
                  </a>
                ) : (
                  <span>N/A</span>
                )}
              </div>
            </div>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 rounded space-y-1">
              <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">Email Address</span>
              <div className="flex items-center gap-2 text-xs font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                <Mail className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                {activeCustomer.email ? (
                  <a href={`mailto:${activeCustomer.email}`} className="hover:text-emerald-600 underline truncate">
                    {activeCustomer.email}
                  </a>
                ) : (
                  <span>N/A</span>
                )}
              </div>
            </div>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 rounded space-y-1">
              <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">Billing & Shipping Address</span>
              <div className="flex items-center gap-2 text-xs font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="truncate">{activeCustomer.address || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Financial & Sales KPIs for this Customer */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-zinc-500 font-mono text-xs uppercase font-bold">Total Orders</span>
              <ShoppingBag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-hanken text-zinc-900 dark:text-zinc-100">
              {customerMetrics.totalSalesCount}
            </div>
            <div className="text-[11px] font-mono text-zinc-400 mt-1">
              {customerMetrics.deliveredCount} delivered / completed
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-zinc-500 font-mono text-xs uppercase font-bold">Gross Sales Value</span>
              <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-hanken text-emerald-600 dark:text-emerald-400">
              ₹{customerMetrics.totalRevenue.toLocaleString()}
            </div>
            <div className="text-[11px] font-mono text-zinc-400 mt-1">
              Lifetime sales gross total
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-zinc-500 font-mono text-xs uppercase font-bold">Total Paid</span>
              <CheckCircle2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            </div>
            <div className="text-2xl font-bold font-hanken text-sky-600 dark:text-sky-400">
              ₹{customerMetrics.totalPaid.toLocaleString()}
            </div>
            <div className="text-[11px] font-mono text-zinc-400 mt-1">
              Collected customer payments
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-zinc-500 font-mono text-xs uppercase font-bold">Outstanding Balance</span>
              <AlertCircle className="w-4 h-4 text-amber-500" />
            </div>
            <div className={`text-2xl font-bold font-hanken ${customerMetrics.balanceDue > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              ₹{customerMetrics.balanceDue.toLocaleString()}
            </div>
            <div className="text-[11px] font-mono text-zinc-400 mt-1">
              {customerMetrics.balanceDue > 0 ? 'Pending client settlement' : 'Account in good standing'}
            </div>
          </div>
        </div>

        {/* Sub-Tabs & Search Toolbar */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs w-full md:w-auto">
            <button
              type="button"
              onClick={() => setSalesStatusFilter('ALL')}
              className={`px-3 py-1.5 border font-bold transition-colors cursor-pointer rounded ${salesStatusFilter === 'ALL'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white'
                  : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400'
                }`}
            >
              All Sales ({customerSales.length})
            </button>
            <button
              type="button"
              onClick={() => setSalesStatusFilter('Delivered')}
              className={`px-3 py-1.5 border font-bold transition-colors cursor-pointer rounded ${salesStatusFilter === 'Delivered'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50 hover:border-emerald-400'
                }`}
            >
              Delivered ({customerSales.filter(s => s.status === 'Delivered').length})
            </button>
            <button
              type="button"
              onClick={() => setSalesStatusFilter('Dispatched')}
              className={`px-3 py-1.5 border font-bold transition-colors cursor-pointer rounded ${salesStatusFilter === 'Dispatched'
                  ? 'bg-sky-600 text-white border-sky-600'
                  : 'bg-white dark:bg-zinc-900 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-900/50 hover:border-sky-400'
                }`}
            >
              Dispatched ({customerSales.filter(s => s.status === 'Dispatched').length})
            </button>
            <button
              type="button"
              onClick={() => setSalesStatusFilter('Confirmed')}
              className={`px-3 py-1.5 border font-bold transition-colors cursor-pointer rounded ${salesStatusFilter === 'Confirmed'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-zinc-900 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/50 hover:border-blue-400'
                }`}
            >
              Confirmed ({customerSales.filter(s => s.status === 'Confirmed').length})
            </button>
            <button
              type="button"
              onClick={() => setSalesStatusFilter('Invoices')}
              className={`px-3 py-1.5 border font-bold transition-colors cursor-pointer rounded ${salesStatusFilter === 'Invoices'
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white dark:bg-zinc-900 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900/50 hover:border-purple-400'
                }`}
            >
              Invoices & Billing ({customerInvoices.length})
            </button>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search sale #, invoice, item..."
              value={salesSearchTerm}
              onChange={(e) => setSalesSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500 rounded"
            />
          </div>
        </div>

        {/* Content View: Invoices Tab OR Sales Orders Table */}
        {salesStatusFilter === 'Invoices' ? (
          /* INVOICES SECTION */
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs overflow-x-auto">
            {customerInvoices.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Receipt className="w-8 h-8 text-zinc-400 mx-auto" />
                <p className="font-mono text-sm text-zinc-500">No invoices generated for {activeCustomer.name} yet.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                    <th className="p-3 font-bold">Invoice Number</th>
                    <th className="p-3 font-bold">Issue / Due Date</th>
                    <th className="p-3 font-bold">Items Summary</th>
                    <th className="p-3 font-bold text-right">Invoice Amount</th>
                    <th className="p-3 font-bold text-center">Status</th>
                    <th className="p-3 font-bold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                  {customerInvoices.map((inv, idx) => (
                    <tr key={`${inv.id}-${idx}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="font-mono text-emerald-600 dark:text-emerald-400">{inv.invoiceNumber || inv.invoiceCode || inv.id}</span>
                        </div>
                      </td>
                      <td className="p-3 text-zinc-600 dark:text-zinc-400">
                        <div>Issue: {inv.issueDate || inv.date || 'N/A'}</div>
                        {inv.dueDate && <div className="text-[10px] text-zinc-500">Due: {inv.dueDate}</div>}
                      </td>
                      <td className="p-3 text-zinc-700 dark:text-zinc-300">
                        {inv.itemsSummary || (inv.lineItems && inv.lineItems.length > 0 ? `${inv.lineItems.length} line items` : 'Apparel Products')}
                      </td>
                      <td className="p-3 font-bold text-right text-emerald-600 dark:text-emerald-400">
                        ₹{(inv.totalAmount ?? inv.amount ?? 0).toLocaleString()}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 text-[11px] font-bold border rounded ${inv.status === 'Paid'
                            ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                            : inv.status === 'Overdue'
                              ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                              : 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                          }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedInvoiceForModal(inv)}
                            className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                            title="View & Print Invoice"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Invoice</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setWhatsAppData({ invoice: inv, customer: activeCustomer })}
                            className="p-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] dark:text-[#25D366] border border-[#25D366]/30 rounded transition-colors cursor-pointer"
                            title="Send Invoice on WhatsApp"
                          >
                            <WhatsAppIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          /* SALES ORDERS SECTION */
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs overflow-x-auto">
            {filteredCustomerSales.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <ShoppingBag className="w-8 h-8 text-zinc-400 mx-auto" />
                <p className="font-mono text-sm text-zinc-500">
                  {customerSales.length === 0
                    ? `No sales orders found for ${activeCustomer.name} yet.`
                    : 'No sales match the applied filter.'}
                </p>
                <div className="text-xs font-mono text-zinc-400">
                  Sales created in the Sales & Billing module for this client will appear here automatically.
                </div>
              </div>
            ) : (
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                    <th className="p-3 font-bold w-10"></th>
                    <th className="p-3 font-bold">Invoice #</th>
                    <th className="p-3 font-bold">Date</th>
                    <th className="p-3 font-bold">Products / Items</th>
                    <th className="p-3 font-bold text-right">Total Amount</th>
                    <th className="p-3 font-bold text-center">Payment</th>
                    <th className="p-3 font-bold text-center">Order Status</th>
                    <th className="p-3 font-bold text-center">Invoice Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                  {filteredCustomerSales.map((sale, idx) => {
                    const isExpanded = expandedSaleId === sale.id;
                    const itemsList = sale.lineItems || sale.items || [];
                    const itemsCount = itemsList.reduce((sum: number, it: any) => sum + Number(it.quantity || 1), 0);
                    const grandTotal = Number(sale.grandTotal ?? sale.totalAmount ?? 0);
                    const inv = resolveInvoiceForSale(sale, invoices, activeCustomer?.phone);

                    return (
                      <React.Fragment key={`${sale.id}-${idx}`}>
                        <tr
                          onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                          className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer ${isExpanded ? 'bg-zinc-50 dark:bg-zinc-800/40' : ''}`}
                        >
                          <td className="p-3 text-center text-zinc-400">
                            {isExpanded ? <ChevronUp className="w-4 h-4 mx-auto" /> : <ChevronDown className="w-4 h-4 mx-auto" />}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                                {inv.invoiceNumber || inv.invoiceCode}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                              <span>{sale.saleDate || sale.orderDate || (sale.createdAt ? new Date(sale.createdAt).toLocaleDateString('en-IN') : 'N/A')}</span>
                            </div>
                          </td>
                          <td className="p-3 text-zinc-700 dark:text-zinc-300">
                            <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                              <Package className="w-3.5 h-3.5 text-emerald-500" />
                              <span>{itemsCount} pcs ({itemsList.length} item lines)</span>
                            </div>
                            <div className="text-[10px] text-zinc-500 truncate max-w-xs">
                              {itemsList.map((it: any) => it.productName || it.itemName || 'Item').join(', ')}
                            </div>
                          </td>
                          <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            ₹{grandTotal.toLocaleString()}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 text-[11px] font-bold border rounded ${getPaymentBadge(sale.paymentStatus)}`}>
                              {sale.paymentStatus || 'Unpaid'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2.5 py-0.5 text-[11px] font-bold border rounded ${getSaleStatusBadge(sale.status)}`}>
                              {sale.status || 'Confirmed'}
                            </span>
                          </td>
                          <td className="p-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedInvoiceForModal(inv)}
                                className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                                title="View & Print Invoice"
                              >
                                <Printer className="w-3 h-3" />
                                <span>Invoice</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setWhatsAppData({ invoice: inv, customer: activeCustomer })}
                                className="p-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] dark:text-[#25D366] border border-[#25D366]/30 rounded transition-colors cursor-pointer"
                                title="Send Invoice on WhatsApp"
                              >
                                <WhatsAppIcon className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expandable Order Details Row */}
                        {isExpanded && (
                          <tr className="bg-zinc-50/80 dark:bg-zinc-950/60 border-b border-zinc-200 dark:border-zinc-800">
                            <td colSpan={8} className="p-4 sm:p-5">
                              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-3">
                                <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800 flex-wrap gap-2">
                                  <div className="font-bold text-xs uppercase text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                                    <ShoppingBag className="w-4 h-4 text-emerald-600" />
                                    <span>ORDER BREAKDOWN &amp; LINE ITEMS</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono text-zinc-500">
                                      Invoice: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{inv.invoiceNumber || inv.invoiceCode}</strong>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedInvoiceForModal(inv)}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                    >
                                      <Printer className="w-3 h-3" />
                                      <span>Print Invoice</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setWhatsAppData({ invoice: inv, customer: activeCustomer })}
                                      className="px-2 py-1 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                    >
                                      <WhatsAppIcon className="w-3 h-3" />
                                      <span>WhatsApp</span>
                                    </button>
                                  </div>
                                </div>

                                {itemsList.length > 0 ? (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs font-mono">
                                      <thead>
                                        <tr className="text-zinc-400 border-b border-zinc-100 dark:border-zinc-800 uppercase text-[10px]">
                                          <th className="py-1.5 font-bold">Item Description</th>
                                          <th className="py-1.5 font-bold">Color / Size</th>
                                          <th className="py-1.5 font-bold text-right">Quantity</th>
                                          <th className="py-1.5 font-bold text-right">Unit Price</th>
                                          <th className="py-1.5 font-bold text-right">Line Total</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                                        {itemsList.map((item: any, iIdx: number) => (
                                          <tr key={iIdx}>
                                            <td className="py-2 font-semibold text-zinc-800 dark:text-zinc-200">
                                              {item.productName || item.itemName || 'Finished Garment'}
                                            </td>
                                            <td className="py-2 text-zinc-500">
                                              {[item.color, item.size].filter(Boolean).join(' / ') || 'Standard'}
                                            </td>
                                            <td className="py-2 text-right font-bold text-zinc-800 dark:text-zinc-200">
                                              {item.quantity || 1} pcs
                                            </td>
                                            <td className="py-2 text-right text-zinc-600 dark:text-zinc-400">
                                              ₹{(item.unitPrice || 0).toLocaleString()}
                                            </td>
                                            <td className="py-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                              ₹{(item.lineTotal ?? ((item.quantity || 1) * (item.unitPrice || 0))).toLocaleString()}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="text-xs text-zinc-400 italic">No line item details attached.</div>
                                )}

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs font-mono">
                                  <div className="text-zinc-500">
                                    <span className="font-bold">Shipping Address: </span>
                                    <span>{sale.shippingAddress || activeCustomer.address || 'Standard Registered Address'}</span>
                                    {sale.notes && (
                                      <span className="block mt-0.5 text-[11px] text-zinc-400 italic">
                                        Note: {sale.notes}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-4 text-right">
                                    {sale.gstAmount ? (
                                      <div>
                                        <span className="text-zinc-400 text-[10px] block">GST ({sale.gstRate || 5}%)</span>
                                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">₹{sale.gstAmount.toLocaleString()}</span>
                                      </div>
                                    ) : null}
                                    <div>
                                      <span className="text-zinc-400 text-[10px] block">Grand Total</span>
                                      <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                                        ₹{grandTotal.toLocaleString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Modal Form for Editing Active Customer */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingItem ? `Edit Customer (${editingItem.code || editingItem.id})` : 'Add Customer Account'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-mono font-bold uppercase text-zinc-500">
                  Customer ID
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. CUST-001"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500 uppercase font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono font-bold uppercase text-zinc-500">Customer Name / Company</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Westside Retail Ltd"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono font-bold uppercase text-zinc-500">Business Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
                >
                  <option value="Wholesale">Wholesale</option>
                  <option value="Retailer">Retailer</option>
                  <option value="Boutique">Boutique</option>
                  <option value="Export">Export</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono font-bold uppercase text-zinc-500">Contact Person</label>
                <input
                  type="text"
                  required
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="Manish Malhotra"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold uppercase text-zinc-500">Email Address</label>
                  <span className="text-[10px] font-mono text-zinc-400">Optional</span>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="orders@westside.in (optional)"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold uppercase text-zinc-500">Phone</label>
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
                  placeholder="9820012345"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-mono font-bold uppercase text-zinc-500">Billing Address</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Trent House, BKC, Mumbai 400051"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono font-bold uppercase text-zinc-500">Outstanding Balance (₹)</label>
                <input
                  type="number"
                  required
                  value={outstandingBalance}
                  onChange={(e) => setOutstandingBalance(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono font-bold uppercase text-zinc-500">Account Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
                >
                  <option value="Active">Active</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Blacklisted">Blacklisted</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-mono font-bold border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold uppercase tracking-wider cursor-pointer"
              >
                {editingItem ? 'SAVE CHANGES' : 'CREATE ACCOUNT'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: CUSTOMER MASTER DIRECTORY SCREEN
  // =========================================================================
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 mb-1">
            <Building2 className="w-4 h-4" />
            <span>WHOLESALE & RETAIL CLIENTS</span>
          </div>
          <h1 className="font-hanken font-bold text-xl text-zinc-900 dark:text-zinc-100 tracking-tight">
            Customer Master Directory
          </h1>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Download Excel Button */}
          <button
            type="button"
            onClick={handleExportExcel}
            className={`px-3.5 py-2 border font-mono font-bold text-xs flex items-center gap-2 shadow-2xs transition-all cursor-pointer ${downloadSuccess
                ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200'
              }`}
            title="Download customer directory as Excel spreadsheet"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{downloadSuccess ? 'EXCEL DOWNLOADED!' : 'DOWNLOAD EXCEL'}</span>
          </button>

          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>REGISTER CUSTOMER ACCOUNT</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-500 font-mono text-xs uppercase font-bold">Total Registered</span>
            <Users className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-bold font-hanken text-zinc-900 dark:text-zinc-100">
            {customers.length}
          </div>
          <div className="text-[11px] font-mono text-zinc-400 mt-1">
            Accounts on record
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-500 font-mono text-xs uppercase font-bold">Active Accounts</span>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-hanken text-emerald-600 dark:text-emerald-400">
            {activeCount}
          </div>
          <div className="text-[11px] font-mono text-zinc-400 mt-1">
            Ready for invoicing
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-500 font-mono text-xs uppercase font-bold">Clients with Dues</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-hanken text-amber-600 dark:text-amber-400">
            {clientsWithDuesCount}
          </div>
          <div className="text-[11px] font-mono text-zinc-400 mt-1">
            Pending payments
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-500 font-mono text-xs uppercase font-bold">Total Outstanding</span>
            <DollarSign className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold font-hanken text-rose-600 dark:text-rose-400">
            ₹{totalOutstanding.toLocaleString()}
          </div>
          <div className="text-[11px] font-mono text-zinc-400 mt-1">
            Cumulative ledger dues
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs w-full sm:w-auto">
          {(['ALL', 'Wholesale', 'Retailer', 'Boutique', 'Export'] as const).map(t => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-3 py-1.5 text-xs font-mono font-bold border transition-colors cursor-pointer ${selectedType === t
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white'
                  : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400'
                }`}
            >
              {t === 'ALL' ? 'All Types' : t}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search client, phone, city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500 rounded"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs overflow-x-auto">
        {filteredCustomers.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Building2 className="w-8 h-8 text-zinc-400 mx-auto" />
            <p className="font-mono text-sm text-zinc-500">No customers found matching this criteria.</p>
            <button
              onClick={openCreateModal}
              className="mt-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 underline font-bold cursor-pointer"
            >
              + Add a new client account
            </button>
          </div>
        ) : (
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                <th className="p-3 font-bold w-36 min-w-[130px] whitespace-nowrap">Customer ID</th>
                <th className="p-3 font-bold">Client / Company</th>
                <th className="p-3 font-bold">Type</th>
                <th className="p-3 font-bold">Contact</th>
                <th className="p-3 font-bold text-center">Sales Records</th>
                <th className="p-3 font-bold text-right">Outstanding</th>
                <th className="p-3 font-bold text-center">Status</th>
                <th className="p-3 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {filteredCustomers.map((cust, idx) => {
                const salesCount = getSalesCountForCustomer(cust);
                return (
                  <tr
                    key={`${cust.id}-${idx}`}
                    onClick={() => setSelectedCustomer(cust)}
                    className="hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors cursor-pointer group"
                    title="Click to open sales records screen for this customer"
                  >
                    <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100 font-mono w-36 min-w-[130px] whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>{cust.code || cust.id}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100 font-hanken text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                        <span>{cust.name}</span>
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          (View Sales →)
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-500 truncate max-w-xs">{cust.address}</div>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 text-[11px] font-bold bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-400 border border-sky-300 dark:border-sky-800">
                        {cust.type}
                      </span>
                    </td>
                    <td className="p-3 text-zinc-700 dark:text-zinc-300">
                      <div>{cust.contactPerson}</div>
                      <div className="text-[10px] text-zinc-500">{cust.phone}</div>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCustomer(cust);
                        }}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded font-bold text-[11px] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Open sales records screen"
                      >
                        <ShoppingBag className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>{salesCount} Orders</span>
                      </button>
                    </td>
                    <td className="p-3 text-right">
                      <span className={`font-bold ${cust.outstandingBalance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        ₹{cust.outstandingBalance.toLocaleString()}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <Badge status={cust.status} />
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedCustomer(cust)}
                          className="p-1.5 border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 rounded cursor-pointer"
                          title="View Sales Records"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(cust)}
                          className="p-1.5 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded cursor-pointer"
                          title="Edit Customer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteCandidate(cust)}
                          className="p-1.5 border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 hover:bg-rose-100 rounded cursor-pointer"
                          title="Delete Customer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Form */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? `Edit Customer (${editingItem.code || editingItem.id})` : 'Add Customer Account'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">
                Customer ID
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. CUST-001"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500 uppercase font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Customer Name / Company</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Westside Retail Ltd"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Business Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              >
                <option value="Wholesale">Wholesale</option>
                <option value="Retailer">Retailer</option>
                <option value="Boutique">Boutique</option>
                <option value="Export">Export</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Contact Person</label>
              <input
                type="text"
                required
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="Manish Malhotra"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold uppercase text-zinc-500">Email Address</label>
                <span className="text-[10px] font-mono text-zinc-400">Optional</span>
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="orders@westside.in (optional)"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold uppercase text-zinc-500">Phone</label>
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
                placeholder="9820012345"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Billing Address</label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Trent House, BKC, Mumbai 400051"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Outstanding Balance (₹)</label>
              <input
                type="number"
                required
                value={outstandingBalance}
                onChange={(e) => setOutstandingBalance(Number(e.target.value))}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Account Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              >
                <option value="Active">Active</option>
                <option value="On Hold">On Hold</option>
                <option value="Blacklisted">Blacklisted</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-mono font-bold border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold uppercase tracking-wider cursor-pointer"
            >
              {editingItem ? 'SAVE CHANGES' : 'CREATE ACCOUNT'}
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
            if (selectedCustomer?.id === deleteCandidate.id) {
              setSelectedCustomer(null);
            }
            deleteCustomer(deleteCandidate.id);
            setDeleteCandidate(null);
          }}
          itemName={deleteCandidate.name}
          itemType="Customer Account"
        />
      )}

      {/* Printable Invoice Modal */}
      {selectedInvoiceForModal && (
        <TaxInvoiceModal
          isOpen={!!selectedInvoiceForModal}
          onClose={() => setSelectedInvoiceForModal(null)}
          invoice={selectedInvoiceForModal}
          customer={activeCustomer || customers.find(c => c.id === selectedInvoiceForModal.customerId) || null}
        />
      )}

      {/* WhatsApp Invoice Share Modal */}
      {whatsAppData && (
        <WhatsAppShareModal
          isOpen={!!whatsAppData}
          onClose={() => setWhatsAppData(null)}
          invoice={whatsAppData.invoice}
          customer={whatsAppData.customer || activeCustomer}
          onViewInvoice={() => {
            setSelectedInvoiceForModal(whatsAppData.invoice);
            setWhatsAppData(null);
          }}
        />
      )}
    </div>
  );
};
