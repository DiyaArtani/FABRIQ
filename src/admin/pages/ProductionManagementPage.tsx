import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Factory,
  Plus,
  Search,
  Edit,
  Trash2,
  ArrowRight,
  PackageCheck,
  FileText,
  Layers,
  Scissors,
  Sparkles,
  Box,
  CheckCircle2,
  Printer,
  ChevronRight,
  TrendingUp,
  Clock,
  FileSpreadsheet,
  Eye,
  Phone,
  MapPin,
  User
} from 'lucide-react';
import { useFabriqData } from '../../context/FabriqDataContext';
import { ProductionOrder, ProductionStage, StageHistoryEntry } from '../../types';
import { Badge, Modal, ConfirmDeleteModal } from '../components/AdminUIComponents';
import { ProductionChallanModal } from '../components/ProductionChallanModal';
import { AdvanceStageModal } from '../components/AdvanceStageModal';
import { sortLatest } from '../../utils/sortUtils';

export const ProductionManagementPage: React.FC = () => {
  const {
    productionOrders,
    contractors,
    rawInventory,
    purchases,
    finishedInventory,
    warehouses,
    addProductionOrder,
    updateProductionOrder,
    deleteProductionOrder
  } = useFabriqData();

  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProductionOrder | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<ProductionOrder | null>(null);

  // Challan & Advance Stage Modals
  const [challanOrder, setChallanOrder] = useState<ProductionOrder | null>(null);
  const [advanceStageOrder, setAdvanceStageOrder] = useState<ProductionOrder | null>(null);

  // Form Fields for Create / Edit
  const [orderCode, setOrderCode] = useState('');
  const [challanNumber, setChallanNumber] = useState('');
  const [styleName, setStyleName] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [contractorName, setContractorName] = useState('');
  const [cuttingContractor, setCuttingContractor] = useState('');
  const [stitchingContractor, setStitchingContractor] = useState('');
  const [washingContractor, setWashingContractor] = useState('');
  const [packagingContractor, setPackagingContractor] = useState('');
  const [infoOrder, setInfoOrder] = useState<ProductionOrder | null>(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().substring(0, 10));
  const [estimatedCompletion, setEstimatedCompletion] = useState('');
  const [status, setStatus] = useState<ProductionOrder['status']>('In Progress');

  // Pipeline fields
  const [selectedRawInventoryId, setSelectedRawInventoryId] = useState('');
  const [metersRequired, setMetersRequired] = useState(0);
  const [producedItemName, setProducedItemName] = useState('');

  // Unified Edit & Stage Advancement state (Admin only)
  const [initialStage, setInitialStage] = useState<ProductionStage>('Cutting');
  const [advanceToNextStage, setAdvanceToNextStage] = useState(false);
  const [targetNextStage, setTargetNextStage] = useState<ProductionStage>('Stitching');
  const [nextContractorName, setNextContractorName] = useState('');
  const [stageCompletedQty, setStageCompletedQty] = useState(0);
  const [stageCompletedDate, setStageCompletedDate] = useState(new Date().toISOString().substring(0, 10));
  const [destinationGodown, setDestinationGodown] = useState('');
  const [finishedPricePerPiece, setFinishedPricePerPiece] = useState<number>(1200);

  // Helper to match contractor specialty with stage
  const isMatchSpecialty = (specialty?: string, stage?: string) => {
    if (!specialty || !stage) return false;
    const s = specialty.toLowerCase();
    const st = stage.toLowerCase();
    if (st.includes('cut')) return s.includes('cut');
    if (st.includes('stitch')) return s.includes('stitch');
    if (st.includes('wash')) return s.includes('wash');
    if (st.includes('pack')) return s.includes('pack');
    return false;
  };

  const getRecommendedContractorForStage = (stage: ProductionStage) => {
    const match = contractors.find(c => isMatchSpecialty(c.specialty, stage) && c.status !== 'Inactive');
    return match ? match.name : (contractors.find(c => isMatchSpecialty(c.specialty, stage))?.name || '');
  };

  // Filtered contractor lists strictly matching each stage specialty
  const cuttingContractors = useMemo(() => contractors.filter(c => isMatchSpecialty(c.specialty, 'Cutting') && c.status !== 'Inactive'), [contractors]);
  const stitchingContractors = useMemo(() => contractors.filter(c => isMatchSpecialty(c.specialty, 'Stitching') && c.status !== 'Inactive'), [contractors]);
  const washingContractors = useMemo(() => contractors.filter(c => isMatchSpecialty(c.specialty, 'Washing') && c.status !== 'Inactive'), [contractors]);
  const packagingContractors = useMemo(() => contractors.filter(c => isMatchSpecialty(c.specialty, 'Packaging') && c.status !== 'Inactive'), [contractors]);

  const getStageContractorName = (po: ProductionOrder, stageName: string) => {
    if (stageName === 'Cutting') return po.cuttingContractor || po.stageContractors?.cutting || (po.stageHistory || []).find(s => s.stageName === 'Cutting')?.contractorName || (po.currentStage === 'Cutting' ? (po.contractorName || po.assignedTo) : '') || '-';
    if (stageName === 'Stitching') return po.stitchingContractor || po.stageContractors?.stitching || (po.stageHistory || []).find(s => s.stageName === 'Stitching')?.contractorName || (po.currentStage === 'Stitching' ? (po.contractorName || po.assignedTo) : '') || '-';
    if (stageName === 'Washing') return po.washingContractor || po.stageContractors?.washing || (po.stageHistory || []).find(s => s.stageName === 'Washing')?.contractorName || (po.currentStage === 'Washing' ? (po.contractorName || po.assignedTo) : '') || '-';
    if (stageName === 'Packaging' || stageName === 'Packing') return po.packagingContractor || po.stageContractors?.packaging || (po.stageHistory || []).find(s => s.stageName === 'Packaging' || s.stageName === 'Packing')?.contractorName || (po.currentStage === 'Packaging' || po.currentStage === 'Packing' ? (po.contractorName || po.assignedTo) : '') || '-';
    return '-';
  };

  const getContractorDetails = (name: string) => {
    if (!name || name === '-') return null;
    return contractors.find(c => c.name.trim().toLowerCase() === name.trim().toLowerCase()) || null;
  };

  // Only show contractors specializing in the active stage
  const activeStageForContractor = editingItem ? (editingItem.currentStage || editingItem.stage || 'Cutting') : initialStage;
  const contractorsForActiveStage = useMemo(() => {
    return contractors.filter(c => isMatchSpecialty(c.specialty, activeStageForContractor) && c.status !== 'Inactive');
  }, [contractors, activeStageForContractor]);

  // Available raw materials for dropdown (excludes completely allocated fabric)
  const availableRawMaterials = useMemo(() => {
    return rawInventory.filter(
      r => r.availableMeters > 0 && r.status !== 'Depleted' && (r.totalMeters === 0 || r.allocatedMeters < r.totalMeters)
    );
  }, [rawInventory]);

  const selectedRawMaterial = useMemo(() => {
    return rawInventory.find(r => r.id === selectedRawInventoryId);
  }, [rawInventory, selectedRawInventoryId]);

  const getRawItemInvoiceNo = (r: any) => {
    if (!r) return 'N/A';
    const p = purchases.find(
      (item) => item.id === r.purchaseId || item.billNumber === r.purchaseId || item.invoiceNumber === r.purchaseId
    );
    return (
      p?.billNumber ||
      r.billNumber ||
      p?.invoiceNumber ||
      (r.invoiceNumber && !r.invoiceNumber.startsWith('DF-2026-') ? r.invoiceNumber : '') ||
      (r.batchId && !r.batchId.startsWith('DF-2026-') ? r.batchId : 'N/A')
    );
  };

  const getOrderInvoiceNo = (po: ProductionOrder) => {
    const raw = rawInventory.find((r) => r.id === po.rawInventoryId);
    const p = purchases.find(
      (item) => item.id === raw?.purchaseId || item.invoiceNumber === po.rawBatchId || item.billNumber === po.rawBatchId
    );
    return (
      p?.billNumber ||
      raw?.billNumber ||
      p?.invoiceNumber ||
      raw?.invoiceNumber ||
      (po.rawBatchId && !po.rawBatchId.startsWith('DF-2026-') ? po.rawBatchId : 'N/A')
    );
  };

  // Generate next unique Challan Number
  const getNextChallanNumber = () => {
    let maxNum = 0;
    productionOrders.forEach((po) => {
      if (po.challanNumber) {
        const match = po.challanNumber.match(/CH-(\d{4})-(\d+)/i) || po.challanNumber.match(/CH-(\d+)/i);
        if (match) {
          const num = parseInt(match[2] || match[1], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      }
    });
    const year = new Date().getFullYear();
    return `CH-${year}-${String(maxNum + 1).padStart(4, '0')}`;
  };

  const getNextOrderCode = () => {
    let maxNum = 0;
    productionOrders.forEach((po) => {
      const code = po.orderCode || po.poCode || '';
      const match = code.match(/PRD-(\d{4})-(\d+)/i) || code.match(/PRD-(\d+)/i);
      if (match) {
        const num = parseInt(match[2] || match[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    return `PRD-2026-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const handleInitialStageChange = (stage: ProductionStage) => {
    setInitialStage(stage);
    const matchContractor = contractors.find(c => isMatchSpecialty(c.specialty, stage) && c.status !== 'Inactive') || contractors.find(c => isMatchSpecialty(c.specialty, stage));
    setContractorName(matchContractor ? matchContractor.name : '');
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setOrderCode(getNextOrderCode());
    setChallanNumber(getNextChallanNumber());
    setStyleName('');
    setQuantity(0);
    setInitialStage('Cutting');

    const defCut = cuttingContractors[0]?.name || '';
    const defStitch = stitchingContractors[0]?.name || '';
    const defWash = washingContractors[0]?.name || '';
    const defPack = packagingContractors[0]?.name || '';

    setCuttingContractor(defCut);
    setStitchingContractor(defStitch);
    setWashingContractor(defWash);
    setPackagingContractor(defPack);
    setContractorName(defCut);

    setStartDate(new Date().toISOString().substring(0, 10));
    setEstimatedCompletion('');
    setStatus('In Progress');
    setSelectedRawInventoryId('');
    setMetersRequired(0);
    setProducedItemName('');
    setAdvanceToNextStage(false);
    setIsModalOpen(true);
  };

  const openEditModal = (po: ProductionOrder) => {
    setEditingItem(po);
    setOrderCode(po.orderCode || po.poCode || `PO-${Date.now().toString().slice(-6)}`);
    setChallanNumber(po.challanNumber || `CH-2026-${po.id.slice(-4)}`);
    setStyleName(po.styleName || po.name || '');
    setQuantity(po.plannedQuantity || po.quantity || po.total || 0);
    setContractorName(po.contractorName || po.assignedTo || '');

    const savedCut = po.cuttingContractor || po.stageContractors?.cutting || (po.stageHistory || []).find(s => s.stageName === 'Cutting')?.contractorName || '';
    const savedStitch = po.stitchingContractor || po.stageContractors?.stitching || (po.stageHistory || []).find(s => s.stageName === 'Stitching')?.contractorName || '';
    const savedWash = po.washingContractor || po.stageContractors?.washing || (po.stageHistory || []).find(s => s.stageName === 'Washing')?.contractorName || '';
    const savedPack = po.packagingContractor || po.stageContractors?.packaging || (po.stageHistory || []).find(s => s.stageName === 'Packaging' || s.stageName === 'Packing')?.contractorName || '';

    setCuttingContractor(savedCut);
    setStitchingContractor(savedStitch);
    setWashingContractor(savedWash);
    setPackagingContractor(savedPack);

    setStartDate(po.startDate || new Date().toISOString().substring(0, 10));
    setEstimatedCompletion(po.estimatedCompletion || po.dueDate || '');
    setStatus(po.status || po.overallStatus || 'In Progress');
    setSelectedRawInventoryId(po.rawInventoryId || '');
    setMetersRequired(po.metersRequired || po.metersAllocated || 0);
    setProducedItemName(po.producedItemName || po.productName || po.styleName || po.name || '');

    // Setup stage progression options
    const rawStg = (po.currentStage || po.stage || 'Cutting') as string;
    const curStage: ProductionStage = rawStg === 'Packing' ? 'Packaging' : (rawStg as ProductionStage);
    const stageSeq: ProductionStage[] = ['Cutting', 'Stitching', 'Washing', 'Packaging', 'Finished Goods'];
    const curIdx = stageSeq.indexOf(curStage);
    const defaultNext = curIdx >= 0 && curIdx < stageSeq.length - 1 ? stageSeq[curIdx + 1] : 'Finished Goods';

    // Setup godown & per piece price if moving to Finished Goods
    const existingFin = (finishedInventory || []).find(f => (f.productName || f.itemName || '').trim().toLowerCase() === (po.styleName || po.name || '').trim().toLowerCase());
    setFinishedPricePerPiece(po.unitPrice || po.pricePerPiece || existingFin?.unitPrice || 1200);
    const defaultGodown = po.warehouse || po.godown || existingFin?.warehouse || (warehouses && warehouses[0]?.name) || '';
    setDestinationGodown(defaultGodown);

    setTargetNextStage(defaultNext);
    setNextContractorName(getRecommendedContractorForStage(defaultNext));
    const goodQty = po.finalQuantity || po.completedQuantity || po.completed || po.plannedQuantity || po.quantity || 0;
    setStageCompletedQty(goodQty);
    setStageCompletedDate(new Date().toISOString().substring(0, 10));
    setAdvanceToNextStage(false);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate meters against available stock for new orders
    if (!editingItem && selectedRawInventoryId && selectedRawMaterial) {
      if (metersRequired > selectedRawMaterial.availableMeters) {
        alert(`Cannot allocate ${metersRequired}m — only ${selectedRawMaterial.availableMeters}m available in raw inventory.`);
        return;
      }
    }

    if (editingItem) {
      let updatedOrder: ProductionOrder = {
        ...editingItem,
        styleName,
        name: styleName,
        plannedQuantity: quantity,
        quantity,
        total: quantity,
        contractorName: advanceToNextStage ? (targetNextStage === 'Finished Goods' ? editingItem.contractorName : nextContractorName) : contractorName,
        assignedTo: advanceToNextStage ? (targetNextStage === 'Finished Goods' ? editingItem.assignedTo : nextContractorName) : contractorName,
        cuttingContractor,
        stitchingContractor,
        washingContractor,
        packagingContractor,
        stageContractors: {
          ...(editingItem.stageContractors || {}),
          cutting: cuttingContractor,
          stitching: stitchingContractor,
          washing: washingContractor,
          packaging: packagingContractor
        },
        startDate,
        estimatedCompletion,
        dueDate: estimatedCompletion || editingItem.dueDate,
        status: (advanceToNextStage && targetNextStage === 'Finished Goods') ? 'Completed' : status,
        overallStatus: (advanceToNextStage && targetNextStage === 'Finished Goods') ? 'Completed' : status,
        producedItemName: producedItemName || styleName,
        productName: producedItemName || styleName
      };

      // If advancing stage is checked, perform full stage history progression
      if (advanceToNextStage) {
        const rawStage = (editingItem.currentStage || editingItem.stage || 'Cutting') as string;
        const currentStage: ProductionStage = rawStage === 'Packing' ? 'Packaging' : (rawStage as ProductionStage);
        const existingHistory = [...(editingItem.stageHistory || [])];
        const existingIndex = existingHistory.findIndex(s => s.stageName === currentStage || (currentStage === 'Packaging' && s.stageName === 'Packing'));

        const stageCodeMap: Record<string, string> = {
          'Cutting': 'CUT',
          'Stitching': 'STT',
          'Washing': 'WSH',
          'Packaging': 'PKG',
          'Packing': 'PKG',
          'Finished Goods': 'FG'
        };
        const baseChallan = (editingItem.challanNumber || `CH-2026-${editingItem.id.slice(-4)}`).replace(/-(CUT|STT|WSH|PKG|FG|STG\d+)$/i, '');
        const currentCode = stageCodeMap[currentStage] || 'STG1';
        const nextCode = stageCodeMap[targetNextStage] || 'STG2';

        const currentStageChallan = existingHistory[existingIndex]?.challanNumber || `${baseChallan}-${currentCode}`;
        const nextStageChallan = `${baseChallan}-${nextCode}`;

        const completedContractorInfo = contractors.find(c => c.name === (contractorName || editingItem.contractorName));
        const completedStageEntry: StageHistoryEntry = {
          stageName: currentStage,
          contractorId: completedContractorInfo?.id || '',
          contractorName: contractorName || editingItem.contractorName || 'Assigned Contractor',
          contractorPhone: completedContractorInfo?.phone || '',
          contractorLocation: completedContractorInfo?.location || '',
          quantitySent: quantity,
          quantityReceived: quantity,
          quantityCompleted: stageCompletedQty,
          rejectedQuantity: 0,
          wastageQuantity: 0,
          assignedDate: editingItem.startDate || new Date().toISOString().substring(0, 10),
          completedDate: stageCompletedDate,
          challanNumber: currentStageChallan,
          status: 'Completed',
          remarks: `Completed ${currentStage} stage.`
        };

        if (existingIndex >= 0) {
          existingHistory[existingIndex] = completedStageEntry;
        } else {
          existingHistory.push(completedStageEntry);
        }

        const isMovingToFinished = targetNextStage === 'Finished Goods';
        if (!isMovingToFinished) {
          const nextIndex = existingHistory.findIndex(s => s.stageName === targetNextStage || (targetNextStage === 'Packaging' && s.stageName === 'Packing'));
          const nextContractorInfo = contractors.find(c => c.name === nextContractorName);
          const nextStageEntry: StageHistoryEntry = {
            stageName: targetNextStage,
            contractorId: nextContractorInfo?.id || '',
            contractorName: nextContractorName,
            contractorPhone: nextContractorInfo?.phone || '',
            contractorLocation: nextContractorInfo?.location || '',
            quantitySent: stageCompletedQty,
            quantityReceived: 0,
            quantityCompleted: 0,
            rejectedQuantity: 0,
            wastageQuantity: 0,
            assignedDate: stageCompletedDate,
            completedDate: '',
            challanNumber: nextStageChallan,
            status: 'In Progress',
            remarks: `Forwarded to ${targetNextStage} with stage Challan ${nextStageChallan}`
          };

          if (nextIndex >= 0) {
            existingHistory[nextIndex] = nextStageEntry;
          } else {
            existingHistory.push(nextStageEntry);
          }
        } else {
          // Moving to Finished Goods - record final FG inward stage entry
          const fgIndex = existingHistory.findIndex(s => s.stageName === 'Finished Goods');
          const fgStageEntry: StageHistoryEntry = {
            stageName: 'Finished Goods',
            contractorId: 'GODOWN',
            contractorName: editingItem.warehouse || editingItem.godown || 'Finished Goods Warehouse',
            contractorPhone: '',
            contractorLocation: editingItem.warehouse || editingItem.godown || 'Central Godown',
            quantitySent: stageCompletedQty,
            quantityReceived: stageCompletedQty,
            quantityCompleted: stageCompletedQty,
            rejectedQuantity: 0,
            wastageQuantity: 0,
            assignedDate: stageCompletedDate,
            completedDate: stageCompletedDate,
            challanNumber: `${baseChallan}-FG`,
            status: 'Completed',
            remarks: `Finished goods inwarded under Challan ${baseChallan}-FG`
          };

          if (fgIndex >= 0) {
            existingHistory[fgIndex] = fgStageEntry;
          } else {
            existingHistory.push(fgStageEntry);
          }
        }

        const stageProgressMap: Record<string, number> = {
          'Cutting': 25,
          'Stitching': 50,
          'Washing': 75,
          'Packaging': 90,
          'Packing': 90,
          'Finished Goods': 100
        };

        const updatedCutting = targetNextStage === 'Cutting' ? nextContractorName : (cuttingContractor || editingItem.cuttingContractor);
        const updatedStitching = targetNextStage === 'Stitching' ? nextContractorName : (stitchingContractor || editingItem.stitchingContractor);
        const updatedWashing = targetNextStage === 'Washing' ? nextContractorName : (washingContractor || editingItem.washingContractor);
        const updatedPackaging = (targetNextStage === 'Packaging' || targetNextStage === 'Packing') ? nextContractorName : (packagingContractor || editingItem.packagingContractor);

        updatedOrder = {
          ...updatedOrder,
          cuttingContractor: updatedCutting,
          stitchingContractor: updatedStitching,
          washingContractor: updatedWashing,
          packagingContractor: updatedPackaging,
          stageContractors: {
            ...(updatedOrder.stageContractors || {}),
            cutting: updatedCutting,
            stitching: updatedStitching,
            washing: updatedWashing,
            packaging: updatedPackaging
          },
          challanNumber: isMovingToFinished ? `${baseChallan}-FG` : nextStageChallan,
          currentStage: targetNextStage,
          stage: targetNextStage,
          contractorName: isMovingToFinished ? editingItem.contractorName : nextContractorName,
          assignedTo: isMovingToFinished ? editingItem.assignedTo : nextContractorName,
          completedQuantity: stageCompletedQty,
          finalQuantity: stageCompletedQty,
          completed: stageCompletedQty,
          progress: stageProgressMap[targetNextStage] || 100,
          stageHistory: existingHistory,
          status: isMovingToFinished ? 'Completed' : 'In Progress',
          overallStatus: isMovingToFinished ? 'Completed' : 'In Progress',
          warehouse: isMovingToFinished ? destinationGodown : (editingItem.warehouse || 'Finished Goods Godown'),
          godown: isMovingToFinished ? destinationGodown : (editingItem.godown || 'Finished Goods Godown'),
          unitPrice: isMovingToFinished ? finishedPricePerPiece : editingItem.unitPrice,
          pricePerPiece: isMovingToFinished ? finishedPricePerPiece : editingItem.pricePerPiece
        };
      }

      updateProductionOrder(updatedOrder);
    } else {
      const rawChallan = challanNumber || getNextChallanNumber();
      const baseChallan = rawChallan.replace(/-(CUT|STT|WSH|PKG|FG|STG\d+)$/i, '');
      const stageCodeMap: Record<string, string> = {
        'Cutting': 'CUT',
        'Stitching': 'STT',
        'Washing': 'WSH',
        'Packaging': 'PKG',
        'Packing': 'PKG',
        'Finished Goods': 'FG'
      };
      const initialCode = stageCodeMap[initialStage] || 'CUT';
      const initialStageChallan = `${baseChallan}-${initialCode}`;

      const activeContractorName = initialStage === 'Cutting' ? (cuttingContractor || contractorName) :
        initialStage === 'Stitching' ? (stitchingContractor || contractorName) :
          initialStage === 'Washing' ? (washingContractor || contractorName) :
            (packagingContractor || contractorName);

      const activeContractorObj = contractors.find(c => c.name === activeContractorName);

      const initialStageEntry: StageHistoryEntry = {
        stageName: initialStage,
        contractorId: activeContractorObj?.id || '',
        contractorName: activeContractorName || `${initialStage} Unit`,
        contractorPhone: activeContractorObj?.phone || '',
        contractorLocation: activeContractorObj?.location || '',
        quantitySent: quantity,
        quantityReceived: 0,
        quantityCompleted: 0,
        rejectedQuantity: 0,
        wastageQuantity: 0,
        assignedDate: startDate || new Date().toISOString().substring(0, 10),
        completedDate: '',
        challanNumber: initialStageChallan,
        status: 'In Progress',
        remarks: `Initial job order issued for ${initialStage.toLowerCase()}`
      };

      const stageProgressMap: Record<string, number> = {
        'Cutting': 25,
        'Stitching': 50,
        'Washing': 75,
        'Packaging': 90,
        'Packing': 90,
        'Finished Goods': 100
      };

      const finalOrderCode = orderCode || getNextOrderCode();

      addProductionOrder({
        poCode: finalOrderCode,
        orderCode: finalOrderCode,
        challanNumber: initialStageChallan,
        styleName,
        name: styleName,
        productName: producedItemName || styleName,
        plannedQuantity: quantity,
        quantity,
        total: quantity,
        completed: 0,
        completedQuantity: 0,
        defectiveQuantity: 0,
        totalRejectedQuantity: 0,
        currentStage: initialStage,
        stage: initialStage,
        progress: stageProgressMap[initialStage] || 25,
        assignedTo: activeContractorName,
        contractorName: activeContractorName,
        cuttingContractor,
        stitchingContractor,
        washingContractor,
        packagingContractor,
        stageContractors: {
          cutting: cuttingContractor,
          stitching: stitchingContractor,
          washing: washingContractor,
          packaging: packagingContractor
        },
        startDate,
        estimatedCompletion,
        dueDate: estimatedCompletion || startDate,
        status: 'In Progress',
        overallStatus: 'In Progress',
        createdAt: new Date().toISOString(),
        stageHistory: [initialStageEntry],
        // Pipeline linkage
        rawInventoryId: selectedRawInventoryId || undefined,
        rawBatchId: selectedRawMaterial ? getRawItemInvoiceNo(selectedRawMaterial) : undefined,
        fabricName: selectedRawMaterial?.fabricName || undefined,
        metersRequired: metersRequired || undefined,
        metersAllocated: metersRequired || undefined,
        producedItemName: producedItemName || styleName,
        inventoryTransferred: false
      } as any);
    }
    setIsModalOpen(false);
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    const list = productionOrders.filter((po) => {
      const code = po.orderCode || po.poCode || '';
      const ch = po.challanNumber || '';
      const style = po.styleName || po.name || '';
      const contractor = po.contractorName || po.assignedTo || '';
      const stageVal = po.currentStage || po.stage || '';

      const matchesSearch =
        code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ch.toLowerCase().includes(searchTerm.toLowerCase()) ||
        style.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contractor.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesStage = stageFilter === 'ALL';
      if (!matchesStage) {
        if (stageFilter === 'Packaging') {
          matchesStage = stageVal === 'Packaging' || stageVal === 'Packing';
        } else {
          matchesStage = stageVal === stageFilter;
        }
      }

      return matchesSearch && matchesStage;
    });
    return sortLatest(list);
  }, [productionOrders, searchTerm, stageFilter]);

  // Export Production Control Directory as Excel (.xlsx)
  const handleExportExcel = () => {
    const listToExport = filteredOrders.length > 0 ? filteredOrders : productionOrders;

    const headers = [
      'Challan Number',
      'Garment Style',
      'Raw Fabric',
      'Meters Allocated',
      'Target Qty (Pcs)',
      'Completed Pieces (Pcs)',
      'Current Stage',
      'Cutting Contractor',
      'Stitching Contractor',
      'Washing Contractor',
      'Packaging Contractor',
      'Start Date',
      'Complete Date'
    ];

    const rows = listToExport.map(po => {
      const goodOutput = po.finalQuantity || po.completedQuantity || po.completed || 0;
      const targetQty = po.plannedQuantity || po.quantity || po.total || 0;
      const currentStageName = po.currentStage || po.stage || 'Cutting';
      const isFinished = currentStageName === 'Finished Goods' || po.overallStatus === 'Completed' || po.status === 'Completed';

      const cutContractor = getStageContractorName(po, 'Cutting');
      const stitchContractor = getStageContractorName(po, 'Stitching');
      const washContractor = getStageContractorName(po, 'Washing');
      const packContractor = getStageContractorName(po, 'Packaging');

      // Determine completion date if order is completed
      let completionDate = '';
      if (isFinished) {
        if (po.completionDate) {
          completionDate = po.completionDate;
        } else if (po.completedDate) {
          completionDate = po.completedDate;
        } else if (Array.isArray(po.stageHistory) && po.stageHistory.length > 0) {
          const rev = [...po.stageHistory].reverse();
          const match = rev.find(s => s.completedDate || s.assignedDate);
          completionDate = match?.completedDate || match?.assignedDate || '';
        }
        if (!completionDate) {
          completionDate = po.estimatedCompletion || po.estimatedCompletionDate || po.dueDate || po.startDate || 'Completed';
        }
      } else {
        completionDate = po.estimatedCompletion || po.estimatedCompletionDate || po.dueDate || 'In Progress';
      }

      return [
        po.challanNumber || `CH-2026-${po.id.slice(-4)}`,
        po.styleName || po.name || 'Garment Style',
        po.fabricName || 'Raw Fabric',
        po.metersAllocated || po.metersRequired || 0,
        targetQty,
        goodOutput,
        currentStageName,
        cutContractor,
        stitchContractor,
        washContractor,
        packContractor,
        po.startDate || 'N/A',
        completionDate
      ];
    });

    const totalTargetQty = listToExport.reduce((acc, po) => acc + (po.plannedQuantity || po.quantity || po.total || 0), 0);
    const totalCompletedPcs = listToExport.reduce((acc, po) => acc + (po.finalQuantity || po.completedQuantity || po.completed || 0), 0);

    const summaryRow = [
      'TOTAL PRODUCTION',
      `${listToExport.length} Batch Runs`,
      '',
      'Totals:',
      totalTargetQty,
      totalCompletedPcs,
      '',
      '',
      '',
      '',
      '',
      '',
      ''
    ];

    const wsData = [
      ['FABRIQ APPAREL MANUFACTURING - PRODUCTION CONTROL & CHALLAN DIRECTORY'],
      [`Generated on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} | Active Orders: ${listToExport.length}`],
      [],
      headers,
      ...rows,
      [],
      summaryRow
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws['!cols'] = [
      { wch: 18 }, // Challan Number
      { wch: 30 }, // Garment Style
      { wch: 24 }, // Raw Fabric
      { wch: 18 }, // Meters Allocated
      { wch: 18 }, // Target Qty (Pcs)
      { wch: 24 }, // Completed Pieces (Pcs)
      { wch: 18 }, // Current Stage
      { wch: 24 }, // Cutting Contractor
      { wch: 24 }, // Stitching Contractor
      { wch: 24 }, // Washing Contractor
      { wch: 24 }, // Packaging Contractor
      { wch: 16 }, // Start Date
      { wch: 18 }  // Complete Date
    ];

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 12 } }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Production Control');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Fabriq_Production_Control_${new Date().toISOString().slice(0, 10)}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2500);
  };

  // KPI Metrics for the 4 stages
  const activeCutting = productionOrders.filter(o => (o.currentStage === 'Cutting' || o.stage === 'Cutting') && o.overallStatus !== 'Completed' && o.status !== 'Completed').length;
  const activeStitching = productionOrders.filter(o => (o.currentStage === 'Stitching' || o.stage === 'Stitching') && o.overallStatus !== 'Completed' && o.status !== 'Completed').length;
  const activeWashing = productionOrders.filter(o => (o.currentStage === 'Washing' || o.stage === 'Washing') && o.overallStatus !== 'Completed' && o.status !== 'Completed').length;
  const activePackaging = productionOrders.filter(o => (o.currentStage === 'Packaging' || o.currentStage === 'Packing' || o.stage === 'Packaging' || o.stage === 'Packing') && o.overallStatus !== 'Completed' && o.status !== 'Completed').length;
  const totalCompleted = productionOrders.filter(o => o.currentStage === 'Finished Goods' || o.overallStatus === 'Completed' || o.status === 'Completed').length;

  const getStageBadgeStyle = (stageName: string) => {
    switch (stageName) {
      case 'Cutting':
        return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800';
      case 'Stitching':
        return 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 border-sky-300 dark:border-sky-800';
      case 'Washing':
        return 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-800';
      case 'Packaging':
      case 'Packing':
        return 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border-indigo-300 dark:border-indigo-800';
      case 'Finished Goods':
        return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800';
      default:
        return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 mb-1">
            <Factory className="w-4 h-4" />
            <span>GARMENT PRODUCTION WORKFLOW</span>
          </div>
          <h1 className="font-hanken font-bold text-xl text-zinc-900 dark:text-zinc-100 tracking-tight">
            Production  Management
          </h1>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Download Excel Button */}
          <button
            type="button"
            onClick={handleExportExcel}
            className={`px-3.5 py-2 border font-mono font-bold text-xs flex items-center gap-2 shadow-2xs transition-all cursor-pointer ${downloadSuccess
              ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
              : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200'
              }`}
            title="Download production control directory as Excel spreadsheet"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{downloadSuccess ? 'EXCEL DOWNLOADED!' : 'DOWNLOAD EXCEL'}</span>
          </button>

          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>NEW PRODUCTION ORDER</span>
          </button>
        </div>
      </div>

      {/* KPI Cards across the 4 Stages */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
        <div className="p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-2xs">
          <span className="text-[10px] text-zinc-400 uppercase font-bold block">Total Orders</span>
          <span className="text-xl font-black text-zinc-900 dark:text-zinc-100 mt-1 block font-hanken">
            {productionOrders.length}
          </span>
          <span className="text-[10px] text-zinc-500 mt-1 block">Active pipeline</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-900/40 rounded-lg shadow-2xs">
          <span className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-bold flex items-center gap-1">
            <Scissors className="w-3 h-3" /> Cutting
          </span>
          <span className="text-xl font-black text-amber-700 dark:text-amber-400 mt-1 block font-hanken">
            {activeCutting}
          </span>
          <span className="text-[10px] text-zinc-500 mt-1 block">Cut batches</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-zinc-900 border border-sky-200 dark:border-sky-900/40 rounded-lg shadow-2xs">
          <span className="text-[10px] text-sky-600 dark:text-sky-400 uppercase font-bold flex items-center gap-1">
            <Factory className="w-3 h-3" /> Stitching
          </span>
          <span className="text-xl font-black text-sky-700 dark:text-sky-400 mt-1 block font-hanken">
            {activeStitching}
          </span>
          <span className="text-[10px] text-zinc-500 mt-1 block">Assembly runs</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-zinc-900 border border-purple-200 dark:border-purple-900/40 rounded-lg shadow-2xs">
          <span className="text-[10px] text-purple-600 dark:text-purple-400 uppercase font-bold flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Washing
          </span>
          <span className="text-xl font-black text-purple-700 dark:text-purple-400 mt-1 block font-hanken">
            {activeWashing}
          </span>
          <span className="text-[10px] text-zinc-500 mt-1 block">Industrial wash</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-900/40 rounded-lg shadow-2xs">
          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 uppercase font-bold flex items-center gap-1">
            <Box className="w-3 h-3" /> Packaging
          </span>
          <span className="text-xl font-black text-indigo-700 dark:text-indigo-400 mt-1 block font-hanken">
            {activePackaging}
          </span>
          <span className="text-[10px] text-zinc-500 mt-1 block">Iron, tag &amp; box</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-900/40 rounded-lg shadow-2xs">
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold flex items-center gap-1">
            <PackageCheck className="w-3 h-3" /> Completed
          </span>
          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block font-hanken">
            {totalCompleted}
          </span>
          <span className="text-[10px] text-zinc-500 mt-1 block">In godown</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search Challan #, garment style, contractor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-zinc-500">Stage Filter:</span>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Stages</option>
            <option value="Cutting">Cutting</option>
            <option value="Stitching">Stitching</option>
            <option value="Washing">Washing</option>
            <option value="Packaging">Packaging</option>
            <option value="Finished Goods">Finished Goods</option>
          </select>
        </div>
      </div>

      {/* Main Production Orders Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs overflow-x-auto">
        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead>
            <tr className="bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 uppercase tracking-wider text-[11px]">
              <th className="p-3 font-bold">Challan Number</th>
              <th className="p-3 font-bold">Order / Garment Style</th>
              <th className="p-3 font-bold">Raw Fabric Allocation</th>
              <th className="p-3 font-bold">Target Qty</th>
              <th className="p-3 font-bold">Current Stage</th>
              <th className="p-3 font-bold">Assigned Contractor</th>
              <th className="p-3 font-bold">Completed Pieces</th>
              <th className="p-3 font-bold text-right">Actions: Edit, Delete, Challan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-zinc-500">
                  <Factory className="w-8 h-8 mx-auto text-zinc-400 mb-2 opacity-50" />
                  <p className="font-bold">No production orders found.</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Click "NEW PRODUCTION ORDER" to launch a garment run with a persistent Challan Number.</p>
                </td>
              </tr>
            ) : (
              filteredOrders.map((po, idx) => {
                const currentStageName = (po.currentStage || po.stage || 'Cutting') as ProductionStage;
                const isFinished = currentStageName === 'Finished Goods' || po.overallStatus === 'Completed' || po.status === 'Completed';
                const goodOutput = po.finalQuantity || po.completedQuantity || po.completed || 0;

                return (
                  <tr key={`${po.id}-${idx}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    {/* Challan Number Badge */}
                    <td className="p-3">
                      <span className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold rounded text-[11px] block text-center">
                        {po.challanNumber || `CH-2026-${po.id.slice(-4)}`}
                      </span>
                    </td>

                    {/* Garment Style */}
                    <td className="p-3">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100 font-hanken text-sm">
                        {po.styleName || po.name}
                      </div>
                    </td>

                    {/* Raw Fabric */}
                    <td className="p-3">
                      {po.rawInventoryId ? (
                        <div>
                          <div className="text-zinc-800 dark:text-zinc-200 text-[11px] font-bold">{po.fabricName || 'Raw Fabric'}</div>
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">{po.metersAllocated || po.metersRequired}m allocated</div>
                          <div className="text-[9px] text-zinc-400">Bill No: {getOrderInvoiceNo(po)}</div>
                        </div>
                      ) : (
                        <span className="text-[10px] text-zinc-400">Direct In-House Stock</span>
                      )}
                    </td>

                    {/* Target Batch Qty */}
                    <td className="p-3 text-zinc-800 dark:text-zinc-200 font-bold">
                      {(po.plannedQuantity || po.quantity || po.total).toLocaleString()} Pcs
                    </td>

                    {/* Current Stage */}
                    <td className="p-3">
                      <span className={`px-2 py-0.5 text-[10px] font-bold border rounded ${getStageBadgeStyle(currentStageName)} flex items-center gap-1 w-fit`}>
                        {currentStageName === 'Cutting' && <Scissors className="w-3 h-3" />}
                        {currentStageName === 'Stitching' && <Factory className="w-3 h-3" />}
                        {currentStageName === 'Washing' && <Sparkles className="w-3 h-3" />}
                        {currentStageName === 'Packing' && <Box className="w-3 h-3" />}
                        {currentStageName === 'Finished Goods' && <PackageCheck className="w-3 h-3" />}
                        <span>{currentStageName}</span>
                      </span>
                    </td>

                    {/* Contractor */}
                    <td className="p-3 text-zinc-800 dark:text-zinc-200">
                      {isFinished ? (
                        <div className="font-bold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>Finished</span>
                        </div>
                      ) : (
                        <div className="font-bold flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span>{po.contractorName || po.assignedTo || 'Unassigned'}</span>
                        </div>
                      )}
                      <div className="text-[10px] text-zinc-400 mt-1 flex flex-wrap gap-1 font-mono">
                        {getStageContractorName(po, 'Cutting') !== '-' && (
                          <span className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 rounded text-[9px] font-bold">
                            Cut: {getStageContractorName(po, 'Cutting')}
                          </span>
                        )}
                        {getStageContractorName(po, 'Stitching') !== '-' && (
                          <span className="px-1.5 py-0.5 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/40 rounded text-[9px] font-bold">
                            Stt: {getStageContractorName(po, 'Stitching')}
                          </span>
                        )}
                        {getStageContractorName(po, 'Washing') !== '-' && (
                          <span className="px-1.5 py-0.5 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40 rounded text-[9px] font-bold">
                            Wash: {getStageContractorName(po, 'Washing')}
                          </span>
                        )}
                        {getStageContractorName(po, 'Packaging') !== '-' && (
                          <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40 rounded text-[9px] font-bold">
                            Pack: {getStageContractorName(po, 'Packaging')}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Completed Pieces (Only complete pieces, no defects) */}
                    <td className="p-3 text-zinc-800 dark:text-zinc-200 font-bold">
                      <span>{goodOutput.toLocaleString()} Pcs</span>
                    </td>

                    {/* Actions: Info, Challan, Edit, Delete */}
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {/* Info Button */}
                        <button
                          onClick={() => setInfoOrder(po)}
                          className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 rounded text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          title="View Complete Production Order Info & Stage Contractors"
                        >
                          <Eye className="w-3.5 h-3.5 text-zinc-500" />
                          <span>INFO</span>
                        </button>

                        {/* Challan Button */}
                        <button
                          onClick={() => setChallanOrder(po)}
                          className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          title="View / Print Official Production Challan"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>CHALLAN</span>
                        </button>

                        {/* Edit Button - ONLY IF LAST STAGE NOT REACHED */}
                        {!isFinished ? (
                          <button
                            onClick={() => openEditModal(po)}
                            className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            title="Edit Order Details & Advance Stage"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>EDIT</span>
                          </button>
                        ) : (
                          <span className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded text-xs font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>DONE</span>
                          </span>
                        )}

                        {/* Delete Button */}
                        <button
                          onClick={() => setDeleteCandidate(po)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 border border-rose-200 dark:border-rose-900/50 rounded hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors cursor-pointer"
                          title="Delete Production Order"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Form: Create / Edit Order */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? `Edit Production Order (${editingItem.challanNumber || 'Challan'})` : 'Create New Garment Production Order'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Auto Challan Number */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400">
                Persistent Challan Number
              </label>
              <input
                type="text"
                required
                readOnly={!!editingItem}
                value={challanNumber}
                onChange={(e) => setChallanNumber(e.target.value)}
                placeholder="CH-2026-0001"
                className="w-full px-3 py-2 bg-emerald-50/50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300 outline-none"
              />
              <div className="text-[10px] text-zinc-400">Retained throughout Cutting, Stitching, Washing, Packing &amp; Inventory</div>
            </div>

            {/* === ADVANCE STAGE CONTROLS (AVAILABLE UNDER EDIT IN ADMIN SIDE) === */}
            {editingItem && (
              <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-800 rounded-lg space-y-3 sm:col-span-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-emerald-200 dark:border-emerald-800/80">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold uppercase text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-emerald-600" />
                      STAGE PROGRESSION
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-800 rounded font-bold text-emerald-700 dark:text-emerald-400">
                      Current Stage: {editingItem.currentStage || editingItem.stage || 'Cutting'}
                    </span>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300">
                    <input
                      type="checkbox"
                      checked={advanceToNextStage}
                      onChange={(e) => setAdvanceToNextStage(e.target.checked)}
                      className="w-4 h-4 accent-emerald-600 cursor-pointer"
                    />
                    <span>ADVANCE STAGE ON SAVE</span>
                  </label>
                </div>

                {advanceToNextStage && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono font-bold uppercase text-zinc-600 dark:text-zinc-300">Target Next Stage</label>
                      <select
                        value={targetNextStage}
                        onChange={(e) => {
                          const stg = e.target.value as ProductionStage;
                          setTargetNextStage(stg);
                          setNextContractorName(getRecommendedContractorForStage(stg));
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-800 text-xs font-mono font-bold outline-none"
                      >
                        <option value="Cutting">Cutting</option>
                        <option value="Stitching">Stitching</option>
                        <option value="Washing">Washing</option>
                        <option value="Packaging">Packaging</option>
                        <option value="Finished Goods">Finished Goods (Godown)</option>
                      </select>
                    </div>

                    {targetNextStage !== 'Finished Goods' ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-mono font-bold uppercase text-zinc-600 dark:text-zinc-300">
                            {targetNextStage} Contractor
                          </label>
                          {contractors.filter(c => isMatchSpecialty(c.specialty, targetNextStage) && c.status !== 'Inactive').length > 0 && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                              {contractors.filter(c => isMatchSpecialty(c.specialty, targetNextStage) && c.status !== 'Inactive').length} {targetNextStage} specialist{contractors.filter(c => isMatchSpecialty(c.specialty, targetNextStage) && c.status !== 'Inactive').length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <select
                          value={nextContractorName}
                          onChange={(e) => setNextContractorName(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-800 text-xs font-mono outline-none font-bold"
                          required
                        >
                          <option value="">-- Select {targetNextStage} Contractor --</option>
                          {contractors
                            .filter(c => isMatchSpecialty(c.specialty, targetNextStage) && c.status !== 'Inactive')
                            .map((c, idx) => (
                              <option key={`rec-${c.id}-${idx}`} value={c.name}>
                                {c.name} ({c.specialty})
                              </option>
                            ))}
                        </select>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-1">
                          <label className="text-[11px] font-mono font-bold uppercase text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
                            <span>Destination Godown / Warehouse</span>
                            <span className="text-[10px] text-zinc-400 font-normal">Storage location</span>
                          </label>
                          <select
                            value={destinationGodown}
                            onChange={(e) => setDestinationGodown(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-emerald-400 dark:border-emerald-700 text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-emerald-500 rounded"
                            required
                          >
                            <option value="">-- Select Destination Godown --</option>
                            {(warehouses || []).map((w, idx) => (
                              <option key={`wh-${w.id}-${idx}`} value={w.name}>
                                {w.name} {w.location ? `(${w.location})` : ''}
                              </option>
                            ))}
                          </select>
                          {(!warehouses || warehouses.length === 0) && (
                            <div className="text-[10px] text-amber-500 font-mono">
                              No godowns found in database. Please register a warehouse first.
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-mono font-bold uppercase text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
                            <span>Per Piece Price (₹)</span>
                            <span className="text-[10px] text-zinc-400 font-normal">Selling / Unit rate</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-400 font-bold">₹</span>
                            <input
                              type="number"
                              required
                              min={1}
                              step="any"
                              value={finishedPricePerPiece}
                              onChange={(e) => setFinishedPricePerPiece(Number(e.target.value))}
                              placeholder="1200"
                              className="w-full pl-7 pr-3 py-2 bg-white dark:bg-zinc-900 border border-emerald-400 dark:border-emerald-700 text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-emerald-500 rounded"
                            />
                          </div>
                          <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                            Total Valuation: ₹{((stageCompletedQty || 0) * (finishedPricePerPiece || 0)).toLocaleString()}
                          </div>
                        </div>
                      </>
                    )}

                    <div className="space-y-1">
                      <label className="text-[11px] font-mono font-bold uppercase text-zinc-600 dark:text-zinc-300">Output Completed Pieces</label>
                      <input
                        type="number"
                        min={1}
                        value={stageCompletedQty}
                        onChange={(e) => setStageCompletedQty(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-800 text-xs font-mono outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-mono font-bold uppercase text-zinc-600 dark:text-zinc-300">Stage Completion Date</label>
                      <input
                        type="date"
                        value={stageCompletedDate}
                        onChange={(e) => setStageCompletedDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-800 text-xs font-mono outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Garment Style Name */}
            <div className="space-y-1 sm:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold uppercase text-zinc-500">Garment Style / Product Name</label>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">Same product name combines inventory</span>
              </div>
              <input
                type="text"
                required
                value={styleName}
                onChange={(e) => setStyleName(e.target.value)}
                placeholder="e.g. Slim Fit Indigo Denim Jeans"
                list="existing-product-styles"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              />
              <datalist id="existing-product-styles">
                {Array.from(new Set([
                  ...finishedInventory.map(f => f.productName || f.itemName || f.styleName).filter(Boolean),
                  ...productionOrders.map(p => p.productName || p.styleName || p.name).filter(Boolean)
                ])).map((name, idx) => (
                  <option key={idx} value={name as string} />
                ))}
              </datalist>
            </div>

            {/* === PIPELINE: Raw Material Selection === */}
            {!editingItem && (
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <ArrowRight className="w-3 h-3" />
                  RAW FABRIC ALLOCATION (INVENTORY PIPELINE)
                </label>
                <select
                  value={selectedRawInventoryId}
                  onChange={(e) => setSelectedRawInventoryId(e.target.value)}
                  className="w-full px-3 py-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs font-mono outline-none focus:border-emerald-500"
                >
                  <option value="">— Select raw denim from inventory —</option>
                  {availableRawMaterials.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.fabricName} — {r.availableMeters}m available — Bill No: {getRawItemInvoiceNo(r)} — {r.warehouse}
                    </option>
                  ))}
                </select>
                {availableRawMaterials.length === 0 && (
                  <div className="text-[10px] font-mono text-amber-600 dark:text-amber-400 mt-1">
                    ⚠ No raw materials in inventory. Create a "Received" purchase first.
                  </div>
                )}
              </div>
            )}

            {!editingItem && selectedRawMaterial && (
              <div className="space-y-1 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold uppercase text-zinc-500">
                    Meters to Allocate (Available: {selectedRawMaterial.availableMeters}m)
                  </label>
                  <span className="text-[10px] font-mono text-emerald-600">
                    Cost: ₹{selectedRawMaterial.costPerMeter}/m | Bill No: {getRawItemInvoiceNo(selectedRawMaterial)}
                  </span>
                </div>
                <input
                  type="number"
                  required
                  min={1}
                  max={selectedRawMaterial.availableMeters}
                  value={metersRequired}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val <= selectedRawMaterial.availableMeters) {
                      setMetersRequired(val);
                    }
                  }}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
                />
                {metersRequired > 0 && (
                  <div className="flex items-center gap-1.5 mt-1 px-2 py-1.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded text-[10px] font-mono text-emerald-700 dark:text-emerald-400">
                    <ArrowRight className="w-3 h-3" />
                    <span className="font-bold">PIPELINE:</span> {metersRequired}m will be deducted from Raw Stock ({selectedRawMaterial.availableMeters - metersRequired}m remaining).
                  </div>
                )}
              </div>
            )}

            {/* Target Production Quantity */}
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Target Production Quantity (Pcs)</label>
              <input
                type="number"
                required
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              />
            </div>

            {/* Initial Stage Selector (When creating order) */}
            {!editingItem && (
              <div className="space-y-1">
                <label className="text-xs font-mono font-bold uppercase text-zinc-500">
                  Production Stage
                </label>
                <select
                  value={initialStage}
                  onChange={(e) => handleInitialStageChange(e.target.value as ProductionStage)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500 font-bold"
                >
                  <option value="Cutting">Cutting</option>
                  <option value="Stitching">Stitching</option>
                  <option value="Washing">Washing</option>
                  <option value="Packaging">Packaging</option>
                </select>
              </div>
            )}

            {/* Stage Contractors Configuration (Saved for Each Stage) */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3 sm:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                <span className="text-xs font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  Stage Contractor Assignments (Saved for each stage)
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  Filtered exclusively by stage specialty
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Cutting Contractor */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono font-bold uppercase text-zinc-600 dark:text-zinc-300 flex items-center gap-1">
                    <Scissors className="w-3 h-3 text-amber-500" />
                    <span>Cutting Contractor</span>
                  </label>
                  <select
                    value={cuttingContractor}
                    onChange={(e) => {
                      setCuttingContractor(e.target.value);
                      if (initialStage === 'Cutting') setContractorName(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500 font-bold"
                  >
                    <option value="">-- Select Cutting Contractor --</option>
                    {cuttingContractors.map((c, idx) => (
                      <option key={`cut-${c.id}-${idx}`} value={c.name}>
                        {c.name} ({c.specialty})
                      </option>
                    ))}
                    {cuttingContractors.length === 0 && (
                      <option value="" disabled>-- No Cutting Contractors Configured --</option>
                    )}
                  </select>
                </div>

                {/* 2. Stitching Contractor */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono font-bold uppercase text-zinc-600 dark:text-zinc-300 flex items-center gap-1">
                    <Factory className="w-3 h-3 text-sky-500" />
                    <span>Stitching Contractor</span>
                  </label>
                  <select
                    value={stitchingContractor}
                    onChange={(e) => {
                      setStitchingContractor(e.target.value);
                      if (initialStage === 'Stitching') setContractorName(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500 font-bold"
                  >
                    <option value="">-- Select Stitching Contractor --</option>
                    {stitchingContractors.map((c, idx) => (
                      <option key={`stt-${c.id}-${idx}`} value={c.name}>
                        {c.name} ({c.specialty})
                      </option>
                    ))}
                    {stitchingContractors.length === 0 && (
                      <option value="" disabled>-- No Stitching Contractors Configured --</option>
                    )}
                  </select>
                </div>

                {/* 3. Washing Contractor */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono font-bold uppercase text-zinc-600 dark:text-zinc-300 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-purple-500" />
                    <span>Washing Contractor</span>
                  </label>
                  <select
                    value={washingContractor}
                    onChange={(e) => {
                      setWashingContractor(e.target.value);
                      if (initialStage === 'Washing') setContractorName(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500 font-bold"
                  >
                    <option value="">-- Select Washing Contractor --</option>
                    {washingContractors.map((c, idx) => (
                      <option key={`wsh-${c.id}-${idx}`} value={c.name}>
                        {c.name} ({c.specialty})
                      </option>
                    ))}
                    {washingContractors.length === 0 && (
                      <option value="" disabled>-- No Washing Contractors Configured --</option>
                    )}
                  </select>
                </div>

                {/* 4. Packaging Contractor */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono font-bold uppercase text-zinc-600 dark:text-zinc-300 flex items-center gap-1">
                    <Box className="w-3 h-3 text-indigo-500" />
                    <span>Packaging Contractor</span>
                  </label>
                  <select
                    value={packagingContractor}
                    onChange={(e) => {
                      setPackagingContractor(e.target.value);
                      if (initialStage === 'Packaging') setContractorName(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500 font-bold"
                  >
                    <option value="">-- Select Packaging Contractor --</option>
                    {packagingContractors.map((c, idx) => (
                      <option key={`pkg-${c.id}-${idx}`} value={c.name}>
                        {c.name} ({c.specialty})
                      </option>
                    ))}
                    {packagingContractors.length === 0 && (
                      <option value="" disabled>-- No Packaging Contractors Configured --</option>
                    )}
                  </select>
                </div>
              </div>
            </div>

            {/* Estimated Completion Date */}
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-zinc-500">Estimated Delivery Date</label>
              <input
                type="date"
                value={estimatedCompletion}
                onChange={(e) => setEstimatedCompletion(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono outline-none focus:border-emerald-500"
              />
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
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold uppercase tracking-wider"
            >
              {editingItem ? 'SAVE CHANGES' : 'CREATE ORDER & GENERATE CHALLAN'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Production Challan / Receipt Printable Modal */}
      <ProductionChallanModal
        isOpen={!!challanOrder}
        onClose={() => setChallanOrder(null)}
        order={challanOrder}
      />

      {/* Advance Stage Modal */}
      <AdvanceStageModal
        isOpen={!!advanceStageOrder}
        onClose={() => setAdvanceStageOrder(null)}
        order={advanceStageOrder}
        onAdvance={(updatedOrder) => {
          updateProductionOrder(updatedOrder);
          setAdvanceStageOrder(null);
        }}
      />

      {/* Production Order Info / Inspection Modal */}
      {infoOrder && (
        <Modal
          isOpen={!!infoOrder}
          onClose={() => setInfoOrder(null)}
          title={`Production Order Info: ${infoOrder.challanNumber || infoOrder.id}`}
        >
          <div className="space-y-4 font-mono text-zinc-900 dark:text-zinc-100 max-h-[75vh] overflow-y-auto pr-1">
            {/* Header Particulars */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block">
                    Garment Run Particulars
                  </span>
                  <h3 className="font-hanken font-bold text-lg text-zinc-900 dark:text-zinc-100">
                    {infoOrder.styleName || infoOrder.name}
                  </h3>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    Order Code: <strong className="text-zinc-700 dark:text-zinc-300">{infoOrder.orderCode || infoOrder.poCode || 'N/A'}</strong> • Challan: <strong className="text-emerald-600">{infoOrder.challanNumber}</strong>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`px-2.5 py-1 text-xs font-bold border rounded-lg ${getStageBadgeStyle(infoOrder.currentStage || infoOrder.stage || 'Cutting')}`}>
                    Stage: {infoOrder.currentStage || infoOrder.stage || 'Cutting'}
                  </span>
                  <div className="text-[11px] text-zinc-400 mt-1 font-bold">
                    Target: {(infoOrder.plannedQuantity || infoOrder.quantity || 0).toLocaleString()} pcs
                  </div>
                </div>
              </div>
            </div>

            {/* STAGE CONTRACTORS PIPELINE (All 4 stages) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-hanken font-bold text-xs uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Stage Contractor Directory &amp; Contacts</span>
                </h4>
                <span className="text-[10px] text-zinc-400">Saved per stage</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* 1. Cutting */}
                {(() => {
                  const name = getStageContractorName(infoOrder, 'Cutting');
                  const details = getContractorDetails(name);
                  const isCur = (infoOrder.currentStage || infoOrder.stage) === 'Cutting';
                  const isDone = ['Stitching', 'Washing', 'Packaging', 'Packing', 'Finished Goods'].includes(infoOrder.currentStage || infoOrder.stage || '');
                  return (
                    <div className={`p-3 rounded-xl border ${isCur ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800' : 'bg-zinc-50 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                          <Scissors className="w-3.5 h-3.5" />
                          <span>1. Cutting Stage</span>
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          {isDone ? 'Completed' : (isCur ? 'Active' : 'Assigned')}
                        </span>
                      </div>
                      <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{name}</div>
                      {details && (
                        <div className="text-[10px] text-zinc-500 space-y-0.5 mt-1 font-mono">
                          {details.phone && <div>📞 {details.phone}</div>}
                          {details.location && <div>📍 {details.location}</div>}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 2. Stitching */}
                {(() => {
                  const name = getStageContractorName(infoOrder, 'Stitching');
                  const details = getContractorDetails(name);
                  const isCur = (infoOrder.currentStage || infoOrder.stage) === 'Stitching';
                  const isDone = ['Washing', 'Packaging', 'Packing', 'Finished Goods'].includes(infoOrder.currentStage || infoOrder.stage || '');
                  return (
                    <div className={`p-3 rounded-xl border ${isCur ? 'bg-sky-50/50 dark:bg-sky-950/20 border-sky-300 dark:border-sky-800' : 'bg-zinc-50 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-sky-700 dark:text-sky-400 flex items-center gap-1">
                          <Factory className="w-3.5 h-3.5" />
                          <span>2. Stitching Stage</span>
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          {isDone ? 'Completed' : (isCur ? 'Active' : 'Assigned')}
                        </span>
                      </div>
                      <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{name}</div>
                      {details && (
                        <div className="text-[10px] text-zinc-500 space-y-0.5 mt-1 font-mono">
                          {details.phone && <div>📞 {details.phone}</div>}
                          {details.location && <div>📍 {details.location}</div>}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 3. Washing */}
                {(() => {
                  const name = getStageContractorName(infoOrder, 'Washing');
                  const details = getContractorDetails(name);
                  const isCur = (infoOrder.currentStage || infoOrder.stage) === 'Washing';
                  const isDone = ['Packaging', 'Packing', 'Finished Goods'].includes(infoOrder.currentStage || infoOrder.stage || '');
                  return (
                    <div className={`p-3 rounded-xl border ${isCur ? 'bg-purple-50/50 dark:bg-purple-950/20 border-purple-300 dark:border-purple-800' : 'bg-zinc-50 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>3. Washing Stage</span>
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          {isDone ? 'Completed' : (isCur ? 'Active' : 'Assigned')}
                        </span>
                      </div>
                      <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{name}</div>
                      {details && (
                        <div className="text-[10px] text-zinc-500 space-y-0.5 mt-1 font-mono">
                          {details.phone && <div>📞 {details.phone}</div>}
                          {details.location && <div>📍 {details.location}</div>}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 4. Packaging */}
                {(() => {
                  const name = getStageContractorName(infoOrder, 'Packaging');
                  const details = getContractorDetails(name);
                  const isCur = (infoOrder.currentStage || infoOrder.stage) === 'Packaging' || (infoOrder.currentStage || infoOrder.stage) === 'Packing';
                  const isDone = (infoOrder.currentStage || infoOrder.stage) === 'Finished Goods' || infoOrder.overallStatus === 'Completed';
                  return (
                    <div className={`p-3 rounded-xl border ${isCur ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-800' : 'bg-zinc-50 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                          <Box className="w-3.5 h-3.5" />
                          <span>4. Packaging Stage</span>
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          {isDone ? 'Completed' : (isCur ? 'Active' : 'Assigned')}
                        </span>
                      </div>
                      <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{name}</div>
                      {details && (
                        <div className="text-[10px] text-zinc-500 space-y-0.5 mt-1 font-mono">
                          {details.phone && <div>📞 {details.phone}</div>}
                          {details.location && <div>📍 {details.location}</div>}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Raw Material Allocation Card */}
            {infoOrder.rawInventoryId && (
              <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs space-y-1">
                <span className="text-[10px] text-zinc-400 font-bold uppercase block">Raw Fabric Linked</span>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{infoOrder.fabricName || 'Raw Material Roll'}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{infoOrder.metersAllocated || infoOrder.metersRequired}m allocated</span>
                </div>
                <div className="text-[10px] text-zinc-500">
                  Bill / Invoice No: {getOrderInvoiceNo(infoOrder)}
                </div>
              </div>
            )}

            {/* Stage Audit History Table */}
            {infoOrder.stageHistory && infoOrder.stageHistory.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                  Stage Audit Trail
                </span>
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-500 uppercase font-bold">
                        <th className="p-2.5">Stage</th>
                        <th className="p-2.5">Contractor</th>
                        <th className="p-2.5 text-right">Qty Sent</th>
                        <th className="p-2.5 text-right">Qty OK</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-[11px]">
                      {infoOrder.stageHistory.map((s, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                          <td className="p-2.5 font-bold text-zinc-900 dark:text-zinc-100">{s.stageName}</td>
                          <td className="p-2.5 text-emerald-600 dark:text-emerald-400 font-bold">
                            {s.contractorName || 'N/A'}
                            {s.contractorPhone && <span className="text-[10px] text-zinc-400 ml-1 font-normal">({s.contractorPhone})</span>}
                          </td>
                          <td className="p-2.5 text-right">{s.quantitySent || 0}</td>
                          <td className="p-2.5 text-right font-bold text-zinc-900 dark:text-zinc-100">{s.quantityCompleted || s.quantityReceived || 0}</td>
                          <td className="p-2.5 font-bold text-[10px]">{s.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  const target = infoOrder;
                  setInfoOrder(null);
                  setChallanOrder(target);
                }}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>View Challan</span>
              </button>
              <button
                type="button"
                onClick={() => setInfoOrder(null)}
                className="px-4 py-1.5 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold rounded cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <ConfirmDeleteModal
          isOpen={!!deleteCandidate}
          onClose={() => setDeleteCandidate(null)}
          onConfirm={() => {
            deleteProductionOrder(deleteCandidate.id);
            setDeleteCandidate(null);
          }}
          itemName={`Challan: ${deleteCandidate.challanNumber || deleteCandidate.id} (${deleteCandidate.styleName || deleteCandidate.name || 'Garment Run'})${(deleteCandidate.metersAllocated || deleteCandidate.metersRequired || 0) > 0 ? ` — ${(deleteCandidate.metersAllocated || deleteCandidate.metersRequired)}m allocated fabric will be restored to Raw Inventory.` : ''}`}
          itemType="Production Run"
        />
      )}
    </div>
  );
};
