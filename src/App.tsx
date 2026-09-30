import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { FabriqDataProvider } from './context/FabriqDataContext';
import { AdminAuthProvider } from './admin/context/AdminAuthContext';

// Admin Components & Pages
import { ProtectedAdminRoute } from './admin/components/ProtectedAdminRoute';
import { AdminLayout } from './admin/layouts/AdminLayout';
import { DashboardPage } from './admin/pages/DashboardPage';
import { UserManagementPage } from './admin/pages/UserManagementPage';
import { WarehouseManagementPage } from './admin/pages/WarehouseManagementPage';
import { ContractorManagementPage } from './admin/pages/ContractorManagementPage';
import { SupplierManagementPage } from './admin/pages/SupplierManagementPage';
import { CustomerManagementPage } from './admin/pages/CustomerManagementPage';
import { PurchaseManagementPage } from './admin/pages/PurchaseManagementPage';
import { ProductionManagementPage } from './admin/pages/ProductionManagementPage';
import { InventoryManagementPage } from './admin/pages/InventoryManagementPage';
import { SalesManagementPage } from './admin/pages/SalesManagementPage';
import { SettingsPage } from './admin/pages/SettingsPage';
import { AdminLoginPage } from './admin/pages/AdminLoginPage';

// Unified Dual-Role Login Page & Employee Application
import { UnifiedLoginPage } from './pages/UnifiedLoginPage';
import { EmployeeLoginPage } from './employee/pages/EmployeeLoginPage';
import { EmployeeApp } from './employee/EmployeeApp';
import { ProtectedEmployeeRoute } from './employee/routes/ProtectedEmployeeRoute';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary fallbackTitle="Fabriq ERP Error">
      <FabriqDataProvider>
        <AdminAuthProvider>
          <BrowserRouter>
            <Routes>
            {/* Default App Entry - Employee Login Only */}
            <Route path="/" element={<EmployeeLoginPage />} />
            <Route path="/login" element={<EmployeeLoginPage />} />
            <Route path="/auth" element={<EmployeeLoginPage />} />
            <Route path="/app/login" element={<EmployeeLoginPage />} />

            {/* Admin Login Route - typed as /admin or /admin/login in URL */}
            <Route path="/admin/login" element={<AdminLoginPage />} />

            {/* Admin Portal Protected Routes */}
            <Route path="/admin" element={<ProtectedAdminRoute />}>
              <Route element={<AdminLayout />}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="users" element={<UserManagementPage />} />
                <Route path="warehouses" element={<WarehouseManagementPage />} />
                <Route path="contractors" element={<ContractorManagementPage />} />
                <Route path="suppliers" element={<SupplierManagementPage />} />
                <Route path="customers" element={<CustomerManagementPage />} />
                <Route path="purchases" element={<PurchaseManagementPage />} />
                <Route path="production" element={<ProductionManagementPage />} />
                <Route path="inventory" element={<InventoryManagementPage />} />
                <Route path="sales" element={<SalesManagementPage />} />
                <Route path="reports" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>

            {/* Protected Employee Workspace Route */}
            <Route element={<ProtectedEmployeeRoute />}>
              <Route path="/app" element={<EmployeeApp />} />
              <Route path="/mobile" element={<EmployeeApp />} />
            </Route>

            {/* Catch-all Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AdminAuthProvider>
    </FabriqDataProvider>
  </ErrorBoundary>
  );
}
