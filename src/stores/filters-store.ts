import { create } from "zustand";

type FiltersState = {
  institutionId: string;
  dateFrom: string;
  dateTo: string;
  search: string;
  setInstitutionId: (v: string) => void;
  setDateFrom: (v: string) => void;
  setDateTo: (v: string) => void;
  setSearch: (v: string) => void;
  resetFilters: () => void;
};

const today = new Date();
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
const todayStr = today.toISOString().split("T")[0];

export const useFiltersStore = create<FiltersState>((set) => ({
  institutionId: "",
  dateFrom: firstOfMonth,
  dateTo: todayStr,
  search: "",
  setInstitutionId: (v) => set({ institutionId: v }),
  setDateFrom: (v) => set({ dateFrom: v }),
  setDateTo: (v) => set({ dateTo: v }),
  setSearch: (v) => set({ search: v }),
  resetFilters: () => set({ institutionId: "", dateFrom: firstOfMonth, dateTo: todayStr, search: "" }),
}));
