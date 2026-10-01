import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

export const ProtectedAdminRoute: React.FC = () => {
  const { isAdminAuthenticated, adminUser } = useAdminAuth();

  if (!isAdminAuthenticated || !adminUser || (adminUser.role !== 'Admin' && (adminUser.role as string)?.toLowerCase() !== 'admin')) {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
};
