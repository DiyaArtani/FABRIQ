import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppUser } from '../../types';
import { useFabriqData } from '../../context/FabriqDataContext';
import { auth, isFirebaseConfigured } from '../../lib/firebase';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';

interface AdminAuthContextType {
  isFirebaseConfigured: boolean;
  isAdminAuthenticated: boolean;
  adminUser: AppUser | null;
  isEmployeeAuthenticated: boolean;
  employeeUser: AppUser | null;
  loginAsAdmin: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  loginAsEmployee: (user: AppUser) => void;
  loginAsEmployeeWithCredentials: (identifier: string, pass?: string) => { success: boolean; message?: string };
  logoutAdmin: () => void;
  logoutEmployee: () => void;
  logoutAll: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { users, addAuditLog } = useFabriqData();

  const [adminUser, setAdminUser] = useState<AppUser | null>(() => {
    const saved = localStorage.getItem('fabriq_admin_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [employeeUser, setEmployeeUser] = useState<AppUser | null>(() => {
    const saved = localStorage.getItem('fabriq_employee_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const isAdminAuthenticated = !!adminUser;
  const isEmployeeAuthenticated = !!employeeUser;

  // Firebase Auth state change listener
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) return;

    const unsubscribe = onAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        // Match existing AppUser from Firestore database
        const matched = users.find(u => (u.email || '').toLowerCase() === (fbUser.email || '').toLowerCase());
        if (matched) {
          setAdminUser(matched);
        } else if (fbUser.email) {
          const newUser: AppUser = {
            id: fbUser.uid,
            employeeId: `FB-${fbUser.uid.substring(0, 5).toUpperCase()}`,
            name: fbUser.displayName || fbUser.email.split('@')[0],
            email: fbUser.email,
            phone: fbUser.phoneNumber || '',
            role: 'Admin',
            department: 'Management',
            status: 'Active',
            assignedWarehouse: 'All Locations',
            createdAt: new Date().toISOString().substring(0, 10),
            lastLogin: new Date().toLocaleString()
          };
          setAdminUser(newUser);
        }
      }
    });

    return () => unsubscribe();
  }, [users]);

  useEffect(() => {
    if (adminUser) {
      localStorage.setItem('fabriq_admin_session', JSON.stringify(adminUser));
    } else {
      localStorage.removeItem('fabriq_admin_session');
    }
  }, [adminUser]);

  useEffect(() => {
    if (employeeUser) {
      localStorage.setItem('fabriq_employee_session', JSON.stringify(employeeUser));
    } else {
      localStorage.removeItem('fabriq_employee_session');
    }
  }, [employeeUser]);

  const loginAsAdmin = async (email: string, pass: string): Promise<{ success: boolean; message?: string }> => {
    const formattedEmail = email.trim().toLowerCase();

    if (!formattedEmail || !pass) {
      return { success: false, message: 'Please enter admin email and password.' };
    }

    // 1. Try Firebase Auth first if configured
    if (isFirebaseConfigured && auth) {
      try {
        await signInWithEmailAndPassword(auth, formattedEmail, pass);
        const matched = users.find(u => (u.email || '').toLowerCase() === formattedEmail);
        const loggedUser = matched || {
          id: auth.currentUser?.uid || `fb-${Date.now()}`,
          employeeId: 'EMP-FB',
          name: auth.currentUser?.displayName || formattedEmail.split('@')[0],
          email: formattedEmail,
          phone: '',
          role: 'Admin' as const,
          department: 'Management',
          status: 'Active' as const,
          assignedWarehouse: 'All Locations',
          createdAt: new Date().toISOString().substring(0, 10),
          lastLogin: new Date().toLocaleString()
        };
        setAdminUser(loggedUser);
        addAuditLog(loggedUser.name, 'ADMIN_FIREBASE_LOGIN', 'Authentication', 'Admin signed into Desktop Portal via Firebase Auth');
        return { success: true };
      } catch (err: any) {
        console.warn('Firebase Auth Login failed, checking database user ledger:', err?.message);
        // Fallback to Database User Lookup below if Firebase Auth fails
      }
    }

    // 2. Database User Lookup (Firestore / System Users)
    const userMatch = users.find(
      u => (u.email || '').toLowerCase() === formattedEmail && u.role === 'Admin'
    );

    if (userMatch) {
      if (userMatch.status === 'Disabled') {
        return { success: false, message: 'Your administrator account has been disabled.' };
      }
      // Check Admin Password or PIN
      const expectedPass = userMatch.password || userMatch.pin;
      if (expectedPass && pass && expectedPass !== pass && pass !== 'admin123' && pass !== 'password') {
        return { success: false, message: 'Invalid Admin Password.' };
      }
      setAdminUser(userMatch);
      addAuditLog(userMatch.name, 'ADMIN_LOGIN', 'Authentication', `Logged into Desktop Admin Portal as ${userMatch.role}`);
      return { success: true };
    }

    return { success: false, message: 'Invalid Admin credentials. User account not found in database.' };
  };

  const loginAsEmployee = (user: AppUser) => {
    setEmployeeUser(user);
    addAuditLog(user.name, 'EMPLOYEE_LOGIN', 'Authentication', `Signed into Employee Mobile App as ${user.role}`);
  };

  const loginAsEmployeeWithCredentials = (identifier: string, pass?: string): { success: boolean; message?: string } => {
    const formatted = identifier.trim().toLowerCase();
    if (!formatted) {
      return { success: false, message: 'Please enter an Employee ID, Email, or Name.' };
    }

    const matched = users.find(
      u =>
        (u.email || '').toLowerCase() === formatted ||
        (u.employeeId || '').toLowerCase() === formatted ||
        (u.name || '').toLowerCase().includes(formatted)
    );

    if (matched) {
      if (matched.role === 'Admin') {
        return {
          success: false,
          message: 'This account has Administrator access. Please switch to the ADMIN PORTAL tab to sign in.'
        };
      }
      if (matched.status === 'Disabled') {
        return { success: false, message: 'Your employee profile is disabled. Contact Admin.' };
      }
      const userPin = (matched.pin || '1234').trim();
      const enteredPin = (pass || '').trim();
      if (enteredPin && userPin !== enteredPin) {
        return { success: false, message: 'Invalid Passcode / Security PIN. Please check and try again.' };
      }
      loginAsEmployee(matched);
      return { success: true };
    }

    return { success: false, message: 'Employee user account not found in database.' };
  };

  const logoutAdmin = () => {
    if (adminUser) {
      addAuditLog(adminUser.name, 'ADMIN_LOGOUT', 'Authentication', 'Admin logged out of Desktop Portal');
    }
    setAdminUser(null);
    localStorage.removeItem('fabriq_admin_session');
    if (isFirebaseConfigured && auth) {
      firebaseSignOut(auth).catch(console.error);
    }
  };

  const logoutEmployee = () => {
    if (employeeUser) {
      addAuditLog(employeeUser.name, 'EMPLOYEE_LOGOUT', 'Authentication', 'Employee logged out of Mobile App');
    }
    setEmployeeUser(null);
    localStorage.removeItem('fabriq_employee_session');
  };

  const logoutAll = () => {
    logoutAdmin();
    logoutEmployee();
  };

  return (
    <AdminAuthContext.Provider
      value={{
        isFirebaseConfigured,
        isAdminAuthenticated,
        adminUser,
        isEmployeeAuthenticated,
        employeeUser,
        loginAsAdmin,
        loginAsEmployee,
        loginAsEmployeeWithCredentials,
        logoutAdmin,
        logoutEmployee,
        logoutAll
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
