import { create } from "zustand";
import { FilterTab, Grievance } from "@/components/grievances/grievance-list";
import { GrievanceSubmitForm } from "@/components/grievances/grievance-submit-dialog";

const initialSubmitForm: GrievanceSubmitForm = {
  isAnonymous: true,
  category: "general",
  subject: "",
  description: "",
};

const initialResponseForm = {
  status: "in_review",
  response: "",
};

interface GrievanceState {
  activeTab: FilterTab;

  // Submit modal
  submitOpen: boolean;
  submitting: boolean;
  form: GrievanceSubmitForm;

  // Detail / response modal
  selected: Grievance | null;
  detailOpen: boolean;
  responding: boolean;
  responseForm: { status: string; response: string };

  // Actions
  setActiveTab: (activeTab: FilterTab) => void;
  setSubmitOpen: (submitOpen: boolean) => void;
  setSubmitting: (submitting: boolean) => void;
  setForm: (form: GrievanceSubmitForm | ((prev: GrievanceSubmitForm) => GrievanceSubmitForm)) => void;
  resetForm: () => void;
  setSelected: (selected: Grievance | null) => void;
  setDetailOpen: (detailOpen: boolean) => void;
  setResponding: (responding: boolean) => void;
  setResponseForm: (
    updater:
      | { status: string; response: string }
      | ((prev: { status: string; response: string }) => { status: string; response: string })
  ) => void;
  resetResponseForm: () => void;
}

export const useGrievanceStore = create<GrievanceState>((set) => ({
  activeTab: "all",

  submitOpen: false,
  submitting: false,
  form: initialSubmitForm,

  selected: null,
  detailOpen: false,
  responding: false,
  responseForm: initialResponseForm,

  setActiveTab: (activeTab) => set({ activeTab }),
  setSubmitOpen: (submitOpen) => set({ submitOpen }),
  setSubmitting: (submitting) => set({ submitting }),
  setForm: (updater) =>
    set((state) => ({
      form: typeof updater === "function" ? updater(state.form) : updater,
    })),
  resetForm: () => set({ form: initialSubmitForm }),
  setSelected: (selected) => set({ selected }),
  setDetailOpen: (detailOpen) => set({ detailOpen }),
  setResponding: (responding) => set({ responding }),
  setResponseForm: (updater) =>
    set((state) => ({
      responseForm:
        typeof updater === "function" ? updater(state.responseForm) : updater,
    })),
  resetResponseForm: () => set({ responseForm: initialResponseForm }),
}));
