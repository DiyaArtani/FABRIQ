import { Purchase, PurchaseTimelineEvent } from './types';

export const MOCK_PURCHASES: Purchase[] = [];

export const generateTimeline = (purchase: Purchase): PurchaseTimelineEvent[] => {
  if (!purchase) return [];
  return [
    {
      id: `evt-1-${purchase.id}`,
      status: 'Created',
      title: 'Purchase Entry Created',
      description: `Bill ${purchase.billNumber || 'N/A'} registered for ${purchase.supplier?.name || 'Supplier'}`,
      timestamp: purchase.createdAt || new Date().toISOString().substring(0, 10),
      actor: 'Admin'
    }
  ];
};
