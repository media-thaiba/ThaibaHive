import { create } from "zustand";
import type { Tab } from "@/app/(shell)/vehicles/_components/types";

interface VehicleState {
  tab: Tab;
  search: string;
  fuelFilter: string;
  instFilter: string;

  // Modals
  addVehicleOpen: boolean;
  addVehicleLoading: boolean;
  bookVehicleOpen: boolean;
  bookVehicleLoading: boolean;
  logTripOpen: boolean;
  logTripLoading: boolean;

  // Actions
  setTab: (tab: Tab) => void;
  setSearch: (search: string) => void;
  setFuelFilter: (fuelFilter: string) => void;
  setInstFilter: (instFilter: string) => void;
  setAddVehicleOpen: (open: boolean) => void;
  setAddVehicleLoading: (loading: boolean) => void;
  setBookVehicleOpen: (open: boolean) => void;
  setBookVehicleLoading: (loading: boolean) => void;
  setLogTripOpen: (open: boolean) => void;
  setLogTripLoading: (loading: boolean) => void;
  resetFilters: () => void;
}

export const useVehicleStore = create<VehicleState>((set) => ({
  tab: "fleet",
  search: "",
  fuelFilter: "",
  instFilter: "",

  addVehicleOpen: false,
  addVehicleLoading: false,
  bookVehicleOpen: false,
  bookVehicleLoading: false,
  logTripOpen: false,
  logTripLoading: false,

  setTab: (tab) => set({ tab }),
  setSearch: (search) => set({ search }),
  setFuelFilter: (fuelFilter) => set({ fuelFilter }),
  setInstFilter: (instFilter) => set({ instFilter }),
  setAddVehicleOpen: (addVehicleOpen) => set({ addVehicleOpen }),
  setAddVehicleLoading: (addVehicleLoading) => set({ addVehicleLoading }),
  setBookVehicleOpen: (bookVehicleOpen) => set({ bookVehicleOpen }),
  setBookVehicleLoading: (bookVehicleLoading) => set({ bookVehicleLoading }),
  setLogTripOpen: (logTripOpen) => set({ logTripOpen }),
  setLogTripLoading: (logTripLoading) => set({ logTripLoading }),
  resetFilters: () => set({ search: "", fuelFilter: "", instFilter: "" }),
}));
