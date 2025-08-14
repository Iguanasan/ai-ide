// src/store/app.ts
import { create } from 'zustand';

type AppState = {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Cross-tool transient message bus (simple)
  event?: { type: string; payload?: unknown };
  emit: (type: string, payload?: unknown) => void;
  clearEvent: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  event: undefined,
  emit: (type, payload) => set({ event: { type, payload } }),
  clearEvent: () => set({ event: undefined }),
}));
