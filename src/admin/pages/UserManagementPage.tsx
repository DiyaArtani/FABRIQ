import React, { useState } from 'react';
import {
  Plus,
  Search,
  UserCheck,
  UserX,
  Edit,
  Trash2,
  Shield,
  Key,
  Lock,
  Eye,
  EyeOff,
  Filter,
  Building,
  AlertCircle
} from 'lucide-react';
import { useFabriqData } from '../../context/FabriqDataContext';
import { AppUser, UserRole, UserStatus } from '../../types';
import { Badge, Modal, ConfirmDeleteModal } from '../components/AdminUIComponents';
import { createFirebaseAuthUser } from '../../lib/firebase';

export const UserManagementPage: React.FC = () => {
  const { users, addUser, updateUser, toggleUserStatus, deleteUser, firebaseError } = useFabriqData();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<AppUser | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('Employee');
  const [formPassword, setFormPassword] = useState('');
  const [formPin, setFormPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const getNextEmployeeId = () => {
    let maxId = 0;
    users.forEach((u) => {
      if (u.employeeId) {
        const match = u.employeeId.match(/EMP-?(\d+)/i) || u.employeeId.match(/(\d+)/);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxId) {
            maxId = num;
          }
        }
      }
    });
    const nextNum = maxId + 1;
    return `EMP-${String(nextNum).padStart(3, '0')}`;
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormName('');
    setFormEmployeeId(getNextEmployeeId());
    setFormEmail('');
    setFormPhone('');
    setFormRole('Employee');
    setFormPassword('');
    setFormPin('');
    setShowPassword(false);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (u: AppUser) => {
    setEditingUser(u);
    setFormName(u.name);
    setFormEmployeeId(u.employeeId);
    setFormEmail(u.email);
    setFormPhone(u.phone);
    const role = u.role === 'Admin' ? 'Admin' : 'Employee';
    setFormRole(role);
    setFormPassword(u.password || (u.role === 'Admin' ? u.pin || '' : ''));
    setFormPin(u.pin || '1234');
    setShowPassword(false);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSaving(true);

    try {
      const isAdmin = formRole === 'Admin';
      
      // Determine password for Firebase Auth (min 6 characters required by Firebase)
      const authPassword = isAdmin
        ? formPassword
        : (formPin.length >= 6 ? formPin : formPin.padEnd(6, '0'));

      if (isAdmin && formPassword.length < 6) {
        setFormError('Admin password must be at least 6 characters for Firebase Authentication.');
        setIsSaving(false);
        return;
      }
      if (!isAdmin && formPin.length < 4) {
        setFormError('Employee PIN must be at least 4 digits.');
        setIsSaving(false);
        return;
      }

      let firebaseUid: string | undefined = undefined;

      // When creating a new user, register the account in Firebase Authentication
      if (!editingUser) {
        try {
          const authRes = await createFirebaseAuthUser(formEmail, authPassword, formName);
          if (authRes?.uid) {
            firebaseUid = authRes.uid;
          }
        } catch (authErr: any) {
          console.warn('Firebase Auth user registration info:', authErr);
          if (authErr?.code === 'auth/email-already-in-use') {
            setFormError('This email is already registered in Firebase Authentication.');
            setIsSaving(false);
            return;
          } else if (authErr?.code === 'auth/invalid-email') {
            setFormError('Invalid email address format for Firebase Authentication.');
            setIsSaving(false);
            return;
          } else if (authErr?.code === 'auth/weak-password') {
            setFormError('Password/PIN is too weak. Firebase requires at least 6 characters.');
            setIsSaving(false);
            return;
          } else if (authErr?.code === 'auth/operation-not-allowed') {
            setFormError('Email/Password provider is not enabled in Firebase Console. Please go to Firebase Console -> Authentication -> Sign-in method -> Enable Email/Password.');
            setIsSaving(false);
            return;
          } else {
            console.warn('Firebase Auth non-blocking warning:', authErr?.message);
          }
        }
      }

      const userPayload: AppUser = {
        id: editingUser ? editingUser.id : (firebaseUid || `user-${Date.now()}`),
        employeeId: formEmployeeId,
        name: formName,
        email: formEmail,
        phone: formPhone,
        role: formRole,
        status: editingUser ? editingUser.status : 'Active',
        createdAt: editingUser ? editingUser.createdAt : new Date().toISOString(),
        ...(isAdmin
          ? { password: formPassword, pin: formPassword }
          : { pin: formPin, password: '' }
        )
      };

      if (editingUser) {
        updateUser({
          ...editingUser,
          ...userPayload
        });
      } else {
        addUser(userPayload);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save user account.');
    } finally {
      setIsSaving(false);
    }
  };

  // Filtering
  const filteredUsers = users.filter((u) => {
    const name = u.name || '';
    const email = u.email || '';
    const empId = u.employeeId || '';

    const matchesSearch =
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      empId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {firebaseError && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/90 border-l-4 border-amber-500 text-amber-900 dark:text-amber-200 text-xs font-mono rounded shadow-2xs space-y-2">
          <div className="flex items-center gap-2 font-bold uppercase text-amber-800 dark:text-amber-300">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>FIREBASE FIRESTORE RULES WARNING</span>
          </div>
          <p>{firebaseError}</p>
          <p className="text-[11px] text-amber-700 dark:text-amber-400">
            <strong>Action Required on Firebase Console:</strong> Open your <a href="https://console.firebase.google.com/project/fabriq-49198/firestore/rules" target="_blank" rel="noreferrer" className="underline font-bold">Firebase Console &rarr; Firestore Database &rarr; Rules</a> tab and change rules to: <code className="bg-amber-100 dark:bg-amber-900 px-1.5 py-0.5 rounded font-bold">allow read, write: if true;</code>
          </p>
        </div>
      )}

      {/* Header & Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-2xs">
        <div>
          <h1 className="font-hanken font-bold text-xl text-zinc-900 dark:text-zinc-100 tracking-tight">
            User Management
          </h1>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition-colors shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>ADD USER</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by name, email, EMP ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
          />
        </div>

        {/* Role & Status Dropdowns */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Role:</span>
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="ALL">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="Employee">Employee</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Disabled">Disabled</option>
          </select>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs overflow-x-auto">
        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead>
            <tr className="bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
              <th className="p-3 font-bold">EMP ID</th>
              <th className="p-3 font-bold">User / Employee</th>
              <th className="p-3 font-bold">Role</th>
              <th className="p-3 font-bold">Credentials</th>
              <th className="p-3 font-bold">Status</th>
              <th className="p-3 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-zinc-500 font-mono">
                  No matching user accounts found.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u, idx) => (
                <tr key={`${u.id}-${idx}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100">
                    {u.employeeId}
                  </td>
                  <td className="p-3">
                    <div className="font-bold text-zinc-900 dark:text-zinc-100 font-hanken text-sm">
                      {u.name}
                    </div>
                    <div className="text-[11px] text-zinc-500">{u.email}</div>
                    <div className="text-[10px] text-zinc-400">{u.phone}</div>
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold font-mono ${
                      u.role === 'Admin'
                        ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/40'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-[11px]">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {u.role === 'Admin' ? (
                        <span className="px-2 py-0.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40 font-mono font-bold text-purple-700 dark:text-purple-300 rounded inline-flex items-center gap-1.5">
                          <Lock className="w-3 h-3 text-purple-500" />
                          <span>Password Protected</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono font-bold text-emerald-600 dark:text-emerald-400 rounded inline-flex items-center gap-1.5">
                          <Key className="w-3 h-3 text-emerald-500" />
                          <span>PIN: {u.pin || '1234'}</span>
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge status={u.status} />
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Toggle Active / Disabled */}
                      <button
                        onClick={() => toggleUserStatus(u.id)}
                        className={`p-1.5 border text-xs rounded font-bold transition-colors ${u.status === 'Active'
                            ? 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                            : 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                          }`}
                        title={u.status === 'Active' ? 'Disable Account' : 'Activate Account'}
                      >
                        {u.status === 'Active' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => openEditModal(u)}
                        className="p-1.5 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded"
                        title="Edit Details"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => setDeleteCandidate(u)}
                        className="p-1.5 border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 hover:bg-rose-100 rounded"
                        title="Delete User"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Form for Create / Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? `Edit User (${editingUser.employeeId})` : 'Add User'}
        subtitle="Manage user account details, credentials and role permissions."
      >
        <form onSubmit={handleSaveUser} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-mono rounded flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Authentication Warning:</p>
                <p className="text-[11px] mt-0.5">{formError}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Employee Name</label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Diya Artani"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Employee ID</label>
              <input
                type="text"
                required
                value={formEmployeeId}
                onChange={(e) => setFormEmployeeId(e.target.value)}
                placeholder="EMP-101"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Email Address</label>
              <input
                type="email"
                required
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="employee@fabriq.com"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Phone Number</label>
              <input
                type="text"
                required
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">System Role</label>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="Admin">Admin (Desktop &amp; Full Portal Access)</option>
                <option value="Employee">Employee (Mobile App &amp; Staff Access)</option>
              </select>
            </div>

            {/* Admin: Password Field */}
            {formRole === 'Admin' && (
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-mono font-bold uppercase text-zinc-500 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    Admin Login Password
                  </span>
                  <span className="text-[10px] text-purple-600 dark:text-purple-400 font-normal">
                    Password required for Admin Portal login
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Enter admin password..."
                    className="w-full pl-3 pr-10 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-purple-500 font-bold tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Employee: Security PIN Field */}
            {formRole === 'Employee' && (
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-mono font-bold uppercase text-zinc-500 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Employee Security PIN (4-6 digits)
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                    Passcode given to employee for app login
                  </span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={formPin}
                  onChange={(e) => setFormPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 1234"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500 font-bold tracking-widest text-emerald-600 dark:text-emerald-400"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-mono font-bold border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={`px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                isSaving ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              {isSaving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>SAVING...</span>
                </>
              ) : (
                editingUser ? 'SAVE CHANGES' : 'CREATE ACCOUNT'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      {deleteCandidate && (
        <ConfirmDeleteModal
          isOpen={!!deleteCandidate}
          onClose={() => setDeleteCandidate(null)}
          onConfirm={() => deleteUser(deleteCandidate.id)}
          itemName={`${deleteCandidate.name} (${deleteCandidate.employeeId})`}
          itemType="User Account"
        />
      )}
    </div>
  );
};
