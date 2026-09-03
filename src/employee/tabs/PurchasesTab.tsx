import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Purchase } from '../features/purchases/types';
import { useFabriqData } from '../../context/FabriqDataContext';
import PurchaseListScreen from '../features/purchases/screens/PurchaseListScreen';
import PurchaseDetailsScreen from '../features/purchases/screens/PurchaseDetailsScreen';
import CreatePurchaseScreen from '../features/purchases/screens/CreatePurchaseScreen';
import PurchasePDFPreviewScreen from '../features/purchases/screens/PurchasePDFPreviewScreen';

export default function PurchasesTab() {
  const [view, setView] = useState<'list' | 'details' | 'create' | 'edit'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);

  const { purchases, addPurchase, updatePurchase } = useFabriqData();

  // 1. Select a Purchase for Detail view
  const handleSelectPurchase = (id: string) => {
    setSelectedId(id);
    setView('details');
  };

  // 2. Edit purchase (e.g. for In Transit shipments)
  const handleEditPurchase = (p: Purchase) => {
    setEditingPurchase(p);
    setView('edit');
  };

  // 3. Create or update save callback
  const handleSave = (compiledPurchase: Purchase) => {
    if (editingPurchase) {
      updatePurchase(compiledPurchase);
      setEditingPurchase(null);
    } else {
      addPurchase(compiledPurchase);
    }
    setView('list');
  };

  const activePurchase = purchases.find(p => p.id === selectedId) || null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="pb-24 select-none text-gray-900 dark:text-neutral-100 min-h-[500px]"
    >
      <AnimatePresence mode="wait">
        {view === 'list' && (
          <motion.div
            key="list-screen"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
          >
            <PurchaseListScreen
              purchases={purchases}
              onSelectPurchase={handleSelectPurchase}
              onAddNewClick={() => {
                setSelectedId(null);
                setEditingPurchase(null);
                setView('create');
              }}
            />
          </motion.div>
        )}

        {view === 'details' && activePurchase && (
          <motion.div
            key="details-screen"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            <PurchaseDetailsScreen
              purchase={activePurchase}
              onBack={() => {
                setView('list');
                setSelectedId(null);
              }}
              onUpdatePaymentStatus={(newStatus) => {
                updatePurchase({
                  ...activePurchase,
                  paymentStatus: newStatus
                });
              }}
            />
          </motion.div>
        )}

        {(view === 'create' || view === 'edit') && (
          <motion.div
            key={view === 'edit' ? 'edit-form-screen' : 'create-form-screen'}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <CreatePurchaseScreen
              purchaseToEdit={editingPurchase}
              onBack={() => {
                setView('list');
                setEditingPurchase(null);
              }}
              onSave={handleSave}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
