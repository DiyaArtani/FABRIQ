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
  loginAsEmployeeWithCredentials: (identifier: string, pass?: string) => Promise<{ success: boolean; message?: string }>;
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
            status: 'Active',
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

    if (!isFirebaseConfigured || !auth) {
      return { success: false, message: 'Firebase Authentication is not configured. Please check your Firebase environment keys.' };
    }

    try {
      // Authenticate STRICTLY through Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, formattedEmail, pass);
      const fbUser = userCredential.user;

      // Check role authorization in the database
      const matched = users.find(u => (u.email || '').toLowerCase() === formattedEmail);
      if (matched) {
        if (matched.role !== 'Admin') {
          await firebaseSignOut(auth);
          return {
            success: false,
            message: 'Access denied: This account has Employee role. Please sign in via the Employee Mobile terminal.'
          };
        }
        if (matched.status === 'Disabled') {
          await firebaseSignOut(auth);
          return { success: false, message: 'Your administrator account has been disabled.' };
        }
        setAdminUser(matched);
        addAuditLog(matched.name, 'ADMIN_FIREBASE_LOGIN', 'Authentication', 'Admin authenticated via Firebase Auth');
        return { success: true };
      }

      // If registered in Firebase Auth but profile pending in local cache
      const loggedUser: AppUser = {
        id: fbUser.uid,
        employeeId: 'EMP-ADM',
        name: fbUser.displayName || formattedEmail.split('@')[0],
        email: formattedEmail,
        phone: '',
        role: 'Admin',
        status: 'Active',
        createdAt: new Date().toISOString().substring(0, 10),
        lastLogin: new Date().toLocaleString()
      };
      setAdminUser(loggedUser);
      addAuditLog(loggedUser.name, 'ADMIN_FIREBASE_LOGIN', 'Authentication', 'Admin authenticated via Firebase Auth');
      return { success: true };
    } catch (err: any) {
      console.error('Firebase Auth Admin Login failed:', err);
      let message = 'Invalid Admin credentials in Firebase Authentication.';
      if (err?.code === 'auth/invalid-credential' || err?.code === 'auth/wrong-password' || err?.code === 'auth/user-not-found') {
        message = 'Invalid email or password in Firebase Authentication.';
      } else if (err?.code === 'auth/user-disabled') {
        message = 'This administrator account has been disabled in Firebase.';
      } else if (err?.code === 'auth/too-many-requests') {
        message = 'Too many failed login attempts. Access temporarily blocked by Firebase.';
      } else if (err?.message) {
        message = err.message;
      }
      return { success: false, message };
    }
  };

  const loginAsEmployee = (user: AppUser) => {
    setEmployeeUser(user);
    addAuditLog(user.name, 'EMPLOYEE_LOGIN', 'Authentication', `Signed into Employee Mobile App as ${user.role}`);
  };

  const loginAsEmployeeWithCredentials = async (
    identifier: string,
    pass?: string
  ): Promise<{ success: boolean; message?: string }> => {
    const formatted = identifier.trim().toLowerCase();
    if (!formatted) {
      return { success: false, message: 'Please enter an Employee ID, Email, or Name.' };
    }

    if (!isFirebaseConfigured || !auth) {
      return { success: false, message: 'Firebase Authentication is not configured.' };
    }

    const matched = users.find(
      u =>
        (u.email || '').toLowerCase() === formatted ||
        (u.employeeId || '').toLowerCase() === formatted ||
        (u.name || '').toLowerCase().includes(formatted)
    );

    if (!matched) {
      return { success: false, message: 'Employee user account not found in database.' };
    }

    if (matched.role === 'Admin') {
      return {
        success: false,
        message: 'This account has Administrator access. Please switch to the ADMIN PORTAL to sign in.'
      };
    }

    if (matched.status === 'Disabled') {
      return { success: false, message: 'Your employee profile is disabled. Contact Admin.' };
    }

    const enteredPin = (pass || '').trim();
    if (!enteredPin) {
      return { success: false, message: 'Please enter your security PIN.' };
    }

    // Determine the Firebase Auth password mapped to this employee
    const authPass = enteredPin.length >= 6 ? enteredPin : enteredPin.padEnd(6, '0');

    try {
      // Authenticate STRICTLY through Firebase Authentication
      await signInWithEmailAndPassword(auth, matched.email, authPass);
      loginAsEmployee(matched);
      return { success: true };
    } catch (err: any) {
      console.error('Firebase Auth Employee Login failed:', err);
      let message = 'Firebase Authentication failed: Invalid Security PIN.';
      if (err?.code === 'auth/invalid-credential' || err?.code === 'auth/wrong-password') {
        message = 'Invalid Security PIN in Firebase Authentication.';
      } else if (err?.code === 'auth/user-not-found') {
        message = 'Employee account not found in Firebase Authentication. Please register from Admin.';
      } else if (err?.code === 'auth/user-disabled') {
        message = 'This employee account is disabled in Firebase.';
      } else if (err?.message) {
        message = err.message;
      }
      return { success: false, message };
    }
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
