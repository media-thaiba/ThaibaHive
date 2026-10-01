import { create } from "zustand";
import { CircularFormData } from "@/components/circulars/circular-publish-form";
import { Circular } from "@/components/circulars/circular-feed-grid";

const initialFormState: CircularFormData = {
  title: "",
  description: "",
  fileUrl: "",
  fileType: "pdf",
  fileSize: 0,
  category: "general",
  targetRole: "",
  targetDepartmentId: "",
  targetInstitutionId: "",
};

interface CircularState {
  search: string;
  categoryFilter: string;
  showForm: boolean;
  form: CircularFormData;
  uploading: boolean;
  submitting: boolean;

  // Compliance Drawer
  selectedComplianceCircular: Circular | null;
  isComplianceOpen: boolean;

  // Actions
  setSearch: (search: string) => void;
  setCategoryFilter: (categoryFilter: string) => void;
  setShowForm: (showForm: boolean) => void;
  setForm: (form: CircularFormData | ((prev: CircularFormData) => CircularFormData)) => void;
  resetForm: () => void;
  setUploading: (uploading: boolean) => void;
  setSubmitting: (submitting: boolean) => void;
  setSelectedComplianceCircular: (circular: Circular | null) => void;
  setIsComplianceOpen: (open: boolean) => void;
}

export const useCircularStore = create<CircularState>((set) => ({
  search: "",
  categoryFilter: "",
  showForm: false,
  form: initialFormState,
  uploading: false,
  submitting: false,

  selectedComplianceCircular: null,
  isComplianceOpen: false,

  setSearch: (search) => set({ search }),
  setCategoryFilter: (categoryFilter) => set({ categoryFilter }),
  setShowForm: (showForm) => set({ showForm }),
  setForm: (updater) =>
    set((state) => ({
      form: typeof updater === "function" ? updater(state.form) : updater,
    })),
  resetForm: () => set({ form: initialFormState }),
  setUploading: (uploading) => set({ uploading }),
  setSubmitting: (submitting) => set({ submitting }),
  setSelectedComplianceCircular: (selectedComplianceCircular) =>
    set({ selectedComplianceCircular }),
  setIsComplianceOpen: (isComplianceOpen) => set({ isComplianceOpen }),
}));
