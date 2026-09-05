import React, { useState, useEffect } from 'react';
import { EmployeeLayout } from './layouts/EmployeeLayout';
import HomeTab from './tabs/HomeTab';
import ProductionTab from './tabs/ProductionTab';
import InventoryTab from './tabs/InventoryTab';
import SalesTab from './tabs/SalesTab';
import PurchasesTab from './tabs/PurchasesTab';
import MoreTab from './tabs/MoreTab';
import FormsAndModals from './components/FormsAndModals';
import { useFabriqData } from '../context/FabriqDataContext';
import { StockItem, Invoice } from '../types';
import { AnimatePresence } from 'motion/react';

export const EmployeeApp: React.FC = () => {
  const {
    productionOrders,
    stockItems,
    invoices,
    addProductionOrder,
    updateProductionOrder,
    addStockItem,
    addInvoice,
    addPurchase,
    addCustomer,
    rawInventory
  } = useFabriqData();

  const [activeTab, setActiveTab] = useState('home');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return document.documentElement.classList.contains('dark');
  });

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFormType, setActiveFormType] = useState<'new_order' | 'add_stock' | 'invoice' | 'new_purchase' | 'add_customer' | null>(null);

  // Sync dark theme class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [isDarkMode]);

  // Handle Theme Toggle
  const handleToggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  // Open forms modals
  const handleOpenQuickActionForm = (type: 'new_order' | 'add_stock' | 'invoice' | 'new_purchase' | 'add_customer') => {
    setActiveFormType(type);
    setIsModalOpen(true);
  };

  // Add Production Order Callback
  const handleAddNewOrder = (newOrderData: any) => {
    addProductionOrder(newOrderData);
  };

  // Add/Adjust Stock Quantity Callback
  const handleAddStock = (newStockData: Omit<StockItem, 'id' | 'status'>) => {
    addStockItem({
      sku: `SKU-${Date.now()}`,
      itemName: newStockData.name,
      category: 'Raw Fabric',
      warehouse: newStockData.location || 'Godown A - Main Mill',
      rackLocation: 'Section B',
      availableUnits: newStockData.availableUnits,
      minThreshold: 100,
      costPrice: newStockData.unitPrice || 250,
      sellingPrice: (newStockData.unitPrice || 250) * 1.5,
      unit: newStockData.unit || 'Meters',
      status: newStockData.availableUnits > 100 ? 'In Stock' : 'Low Stock',
      lastUpdated: new Date().toISOString().substring(0, 10)
    });
  };

  // Add Invoice Callback
  const handleAddInvoice = (newInvoiceData: Omit<Invoice, 'id'>) => {
    addInvoice(newInvoiceData);
  };

  const lowStockCount = rawInventory.filter(r => r.status === 'Low' || r.status === 'Depleted').length;

  return (
    <EmployeeLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      isDarkMode={isDarkMode}
      onToggleTheme={handleToggleTheme}
      productionOrders={productionOrders}
      stockItems={stockItems}
      invoices={invoices}
    >
      <AnimatePresence mode="wait">
        {activeTab === 'home' && (
          <HomeTab
            key="home"
            productionOrders={productionOrders}
            onQuickAction={handleOpenQuickActionForm}
            onSelectOrder={() => {
              setActiveTab('production');
            }}
            onNavigateToTab={(tabId) => setActiveTab(tabId)}
            lowStockItemsCount={lowStockCount}
            isDarkMode={isDarkMode}
            onToggleTheme={handleToggleTheme}
          />
        )}

        {activeTab === 'production' && (
          <ProductionTab
            key="production"
            orders={productionOrders}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryTab
            key="inventory"
          />
        )}

        {activeTab === 'purchases' && (
          <PurchasesTab
            key="purchases"
          />
        )}

        {activeTab === 'sales' && (
          <SalesTab
            key="sales"
            onAddInvoiceClick={() => handleOpenQuickActionForm('invoice')}
          />
        )}

        {activeTab === 'more' && (
          <MoreTab
            key="more"
            isDarkMode={isDarkMode}
            onToggleTheme={handleToggleTheme}
            onResetData={() => {
              if (window.confirm('Reset application state?')) {
                localStorage.clear();
                window.location.reload();
              }
            }}
            userEmail="admin@fabriq.com"
          />
        )}
      </AnimatePresence>

      {/* Form Dialog overlays controller */}
      <FormsAndModals
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setActiveFormType(null);
        }}
        formType={activeFormType}
        onSubmitNewOrder={handleAddNewOrder}
        onSubmitAddStock={handleAddStock}
        onSubmitInvoice={handleAddInvoice}
        onSubmitPurchase={addPurchase}
        onSubmitCustomer={addCustomer}
        stockItemsList={stockItems}
      />
    </EmployeeLayout>
  );
};
