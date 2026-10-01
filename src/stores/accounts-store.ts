import { create } from "zustand";

const today = new Date();
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
const todayStr = today.toISOString().split("T")[0];

interface AccountsState {
  selectedInst: string;
  fromDate: string;
  toDate: string;

  showAddForm: boolean;
  showExportModal: boolean;
  taxRatePercent: string;
  taxCategoryOverrides: Record<string, number>;

  // Actions
  setSelectedInst: (inst: string) => void;
  setFromDate: (from: string) => void;
  setToDate: (to: string) => void;
  setShowAddForm: (show: boolean) => void;
  setShowExportModal: (show: boolean) => void;
  setTaxRatePercent: (rate: string) => void;
  setTaxCategoryOverrides: (
    overrides: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)
  ) => void;
  resetFilters: () => void;
}

export const useAccountsStore = create<AccountsState>((set) => ({
  selectedInst: "",
  fromDate: firstOfMonth,
  toDate: todayStr,

  showAddForm: false,
  showExportModal: false,
  taxRatePercent: "18",
  taxCategoryOverrides: {},

  setSelectedInst: (selectedInst) => set({ selectedInst }),
  setFromDate: (fromDate) => set({ fromDate }),
  setToDate: (toDate) => set({ toDate }),
  setShowAddForm: (showAddForm) => set({ showAddForm }),
  setShowExportModal: (showExportModal) => set({ showExportModal }),
  setTaxRatePercent: (taxRatePercent) => set({ taxRatePercent }),
  setTaxCategoryOverrides: (updater) =>
    set((state) => ({
      taxCategoryOverrides:
        typeof updater === "function" ? updater(state.taxCategoryOverrides) : updater,
    })),
  resetFilters: () =>
    set({
      selectedInst: "",
      fromDate: firstOfMonth,
      toDate: todayStr,
    }),
}));
