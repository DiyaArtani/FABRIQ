import React, { useState } from 'react';
import { HardHat, Plus, Edit, Trash2, Phone, Mail, MapPin, Star } from 'lucide-react';
import { useFabriqData } from '../../context/FabriqDataContext';
import { Contractor } from '../../types';
import { Badge, Modal, ConfirmDeleteModal } from '../components/AdminUIComponents';

export const ContractorManagementPage: React.FC = () => {
  const { contractors, addContractor, updateContractor, deleteContractor } = useFabriqData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Contractor | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Contractor | null>(null);

  // Form Fields
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState<Contractor['specialty']>('Stitching');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [rating, setRating] = useState(5.0);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');

  const openCreateModal = () => {
    setEditingItem(null);
    setCode(`CTR-00${contractors.length + 1}`);
    setName('');
    setSpecialty('Stitching');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setLocation('');
    setRating(5.0);
    setActiveOrdersCount(0);
    setStatus('Active');
    setIsModalOpen(true);
  };

  const openEditModal = (item: Contractor) => {
    setEditingItem(item);
    setCode(item.code);
    setName(item.name);
    setSpecialty(item.specialty);
    setContactPerson(item.contactPerson);
    setPhone(item.phone);
    setEmail(item.email);
    setLocation(item.location);
    setRating(item.rating);
    setActiveOrdersCount(item.activeOrdersCount);
    setStatus(item.status);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateContractor({
        ...editingItem,
        code,
        name,
        specialty,
        contactPerson,
        phone,
        email,
        location,
        rating,
        activeOrdersCount,
        status
      });
    } else {
      addContractor({
        code,
        name,
        specialty,
        contactPerson,
        phone,
        email,
        location,
        rating,
        activeOrdersCount,
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
            <HardHat className="w-4 h-4" />
            <span>CONTRACTOR & WORKSHOP MASTER</span>
          </div>
          <h1 className="font-hanken font-bold text-xl text-zinc-900 dark:text-zinc-100 tracking-tight">
            Contractor Directory
          </h1>
          <p className="text-xs font-mono text-zinc-500 mt-0.5">
            Manage outsourced stitching, dyeing, cutting, and quality control contractors.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>REGISTER CONTRACTOR</span>
        </button>
      </div>

      {/* Contractors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {contractors.map((ctr, idx) => (
          <div
            key={`${ctr.id}-${idx}`}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-2xs space-y-4 hover:border-emerald-500/50 transition-colors flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-xs">
                    {ctr.code}
                  </span>
                  <h3 className="font-hanken font-bold text-base text-zinc-900 dark:text-zinc-100 mt-1">
                    {ctr.name}
                  </h3>
                </div>
                <Badge status={ctr.status} />
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs font-mono font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                  {ctr.specialty}
                </span>
                <div className="flex items-center gap-1 text-amber-500 font-mono text-xs font-bold">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>{ctr.rating}</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs font-mono text-zinc-600 dark:text-zinc-400">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{ctr.contactPerson} ({ctr.phone})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="truncate">{ctr.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{ctr.location}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs font-mono text-zinc-500 flex justify-between">
                <span>Active Assigned Runs</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{ctr.activeOrdersCount} PO Runs</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={() => openEditModal(ctr)}
                className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-mono text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => setDeleteCandidate(ctr)}
                className="px-3 py-1.5 border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-xs font-mono flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Form */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? `Edit Contractor (${editingItem.code})` : 'Register Contractor'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Contractor Code</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="CTR-001"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Contractor / Workshop Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Modern Garments Ltd"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Specialty Line</label>
              <select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value as any)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              >
                <option value="Stitching">Stitching</option>
                <option value="Dyeing">Dyeing</option>
                <option value="Fabric Cutting">Fabric Cutting</option>
                <option value="Quality Control">Quality Control</option>
                <option value="Packaging">Packaging</option>
                <option value="Finishing">Finishing</option>
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
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Phone</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98250 99887"
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
                placeholder="info@moderngarments.com"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Location / Belt</label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Sector 4, Udyog Vihar"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Rating (1.0 - 5.0)</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="5"
                required
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
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
              className="px-4 py-2 text-xs font-mono font-bold border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold uppercase tracking-wider"
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
          onConfirm={() => deleteContractor(deleteCandidate.id)}
          itemName={deleteCandidate.name}
          itemType="Contractor Record"
        />
      )}
    </div>
  );
};
