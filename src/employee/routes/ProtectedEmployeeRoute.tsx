import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAdminAuth } from '../../admin/context/AdminAuthContext';

export const ProtectedEmployeeRoute: React.FC = () => {
  const { isEmployeeAuthenticated } = useAdminAuth();

  if (!isEmployeeAuthenticated) {
    return <Navigate to="/app/login" replace />;
  }

  return <Outlet />;
};
