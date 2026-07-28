import { create } from "zustand";

type UIState = {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;

  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (v: boolean) => void;
};

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

  commandPaletteOpen: false,
  setCommandPaletteOpen: (v) => set({ commandPaletteOpen: v }),
}));
