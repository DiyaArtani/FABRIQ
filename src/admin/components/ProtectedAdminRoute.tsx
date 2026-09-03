import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

export const ProtectedAdminRoute: React.FC = () => {
  const { isAdminAuthenticated } = useAdminAuth();

  if (!isAdminAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
};
