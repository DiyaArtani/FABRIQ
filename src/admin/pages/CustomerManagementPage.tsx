import React, { useState } from 'react';
import { Building2, Plus, Edit, Trash2, Phone, Mail, DollarSign, ShieldAlert } from 'lucide-react';
import { useFabriqData } from '../../context/FabriqDataContext';
import { Customer } from '../../types';
import { Badge, Modal, ConfirmDeleteModal } from '../components/AdminUIComponents';

export const CustomerManagementPage: React.FC = () => {
  const { customers, addCustomer, updateCustomer, deleteCustomer } = useFabriqData();
  const activeCustomers = customers || [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Customer | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Customer | null>(null);

  // Form Fields
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<Customer['type']>('Retailer');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState(50000);
  const [outstandingBalance, setOutstandingBalance] = useState(0);
  const [status, setStatus] = useState<Customer['status']>('Active');

  const openCreateModal = () => {
    setEditingItem(null);
    setCode(`CUST-00${customers.length + 1}`);
    setName('');
    setType('Retailer');
    setContactPerson('');
    setEmail('');
    setPhone('');
    setAddress('');
    setCreditLimit(0);
    setOutstandingBalance(0);
    setStatus('Active');
    setIsModalOpen(true);
  };

  const openEditModal = (item: Customer) => {
    setEditingItem(item);
    setCode(item.code);
    setName(item.name);
    setType(item.type);
    setContactPerson(item.contactPerson);
    setEmail(item.email);
    setPhone(item.phone);
    setAddress(item.address);
    setCreditLimit(item.creditLimit);
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
        creditLimit,
        outstandingBalance,
        status
      });
    } else {
      addCustomer({
        code,
        name,
        type,
        contactPerson,
        email,
        phone,
        address,
        creditLimit,
        outstandingBalance,
        status
      });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
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
          <p className="text-xs font-mono text-zinc-500 mt-0.5">
            Manage wholesale clients, credit limits, outstanding balances, and account statuses.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>ADD CLIENT ACCOUNT</span>
        </button>
      </div>

      {/* Customers Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs overflow-x-auto">
        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead>
            <tr className="bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
              <th className="p-3 font-bold">Code</th>
              <th className="p-3 font-bold">Client / Company</th>
              <th className="p-3 font-bold">Type</th>
              <th className="p-3 font-bold">Contact</th>
              <th className="p-3 font-bold">Credit Limit</th>
              <th className="p-3 font-bold">Outstanding</th>
              <th className="p-3 font-bold">Status</th>
              <th className="p-3 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {activeCustomers.map((cust, idx) => (
              <tr key={`${cust.id}-${idx}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100">
                  {cust.code}
                </td>
                <td className="p-3">
                  <div className="font-bold text-zinc-900 dark:text-zinc-100 font-hanken text-sm">
                    {cust.name}
                  </div>
                  <div className="text-[10px] text-zinc-500 truncate">{cust.address}</div>
                </td>
                <td className="p-3">
                  <span className="px-2 py-0.5 text-[11px] font-bold bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-400 border border-sky-300 dark:border-sky-800">
                    {cust.type}
                  </span>
                </td>
                <td className="p-3 text-zinc-700 dark:text-zinc-300">
                  <div>{cust.contactPerson}</div>
                  <div className="text-[10px] text-zinc-500">{cust.email} | {cust.phone}</div>
                </td>
                <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100">
                  ₹{cust.creditLimit.toLocaleString('en-IN')}
                </td>
                <td className="p-3 font-bold text-rose-600 dark:text-rose-400">
                  ₹{cust.outstandingBalance.toLocaleString('en-IN')}
                </td>
                <td className="p-3">
                  <Badge status={cust.status} />
                </td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => openEditModal(cust)}
                      className="p-1.5 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded"
                      title="Edit"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteCandidate(cust)}
                      className="p-1.5 border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 hover:bg-rose-100 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Form */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? `Edit Customer (${editingItem.code})` : 'Add Customer Account'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Customer Code</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="CUST-001"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
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
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="orders@westside.in"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Phone</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 22 6700 8000"
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
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Credit Limit (₹)</label>
              <input
                type="number"
                required
                value={creditLimit}
                onChange={(e) => setCreditLimit(Number(e.target.value))}
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

            <div className="space-y-1 sm:col-span-2">
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
              className="px-4 py-2 text-xs font-mono font-bold border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold uppercase tracking-wider"
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
          onConfirm={() => deleteCustomer(deleteCandidate.id)}
          itemName={deleteCandidate.name}
          itemType="Customer Account"
        />
      )}
    </div>
  );
};
