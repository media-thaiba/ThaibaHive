import { create } from "zustand";

type PurchaseRequest = {
  id: string;
  requesterId: string;
  itemName: string;
  quantity: number;
  estimatedCost: number;
  justification: string | null;
  status: string;
  notes: string | null;
  approvedByHodId: string | null;
  approvedByAccountsId: string | null;
  approvedByPurchaseId: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  requesterName?: string;
};

interface PurchasesState {
  activeTab: "my" | "team";
  showForm: boolean;
  selectedRequest: PurchaseRequest | null;

  // Actions
  setActiveTab: (tab: "my" | "team") => void;
  setShowForm: (show: boolean) => void;
  setSelectedRequest: (request: PurchaseRequest | null) => void;
}

export const usePurchasesStore = create<PurchasesState>((set) => ({
  activeTab: "my",
  showForm: false,
  selectedRequest: null,

  setActiveTab: (activeTab) => set({ activeTab }),
  setShowForm: (showForm) => set({ showForm }),
  setSelectedRequest: (selectedRequest) => set({ selectedRequest }),
}));
