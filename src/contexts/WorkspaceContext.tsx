"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { workspaces, WorkspaceId, getWorkspaceById, getWorkspacesForRole, type WorkspaceConfig, type StaffRole } from "@/config/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface WorkspaceContextValue {
  currentWorkspace: WorkspaceConfig;
  availableWorkspaces: WorkspaceConfig[];
  allWorkspaces: WorkspaceConfig[];
  setWorkspace: (id: WorkspaceId) => void;
  isWorkspaceAvailable: (id: WorkspaceId) => boolean;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const WORKSPACE_STORAGE_KEY = "thaibahive_workspace";

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { staff } = useAuth();
  const userRole = staff?.role as StaffRole | undefined;

  const [availableWorkspaces, setAvailableWorkspaces] = useState<WorkspaceConfig[]>(workspaces);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<WorkspaceId>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(WORKSPACE_STORAGE_KEY) as WorkspaceId | null;
      if (stored && workspaces.some((w) => w.id === stored)) {
        return stored;
      }
    }
    return "my-work";
  });
  const [hydrated, setHydrated] = useState(false);

  // Update available workspaces based on user role
  useEffect(() => {
    if (userRole) {
      setAvailableWorkspaces(getWorkspacesForRole(userRole));
    } else {
      setAvailableWorkspaces(workspaces);
    }
  }, [userRole]);

  // Hydration effect
  useEffect(() => {
    setHydrated(true);
    const stored = localStorage.getItem(WORKSPACE_STORAGE_KEY) as WorkspaceId | null;
    if (stored && availableWorkspaces.some((w) => w.id === stored)) {
      setCurrentWorkspaceId(stored);
    } else if (!availableWorkspaces.some((w) => w.id === currentWorkspaceId)) {
      // Fallback to first available workspace
      setCurrentWorkspaceId(availableWorkspaces[0]?.id ?? "my-work");
    }
  }, [availableWorkspaces, currentWorkspaceId]);

  const currentWorkspace = getWorkspaceById(currentWorkspaceId) ?? workspaces[0];

  const setWorkspace = useCallback((id: WorkspaceId) => {
    if (availableWorkspaces.some((w) => w.id === id)) {
      setCurrentWorkspaceId(id);
      if (typeof window !== "undefined") {
        localStorage.setItem(WORKSPACE_STORAGE_KEY, id);
      }
    }
  }, [availableWorkspaces]);

  const isWorkspaceAvailable = useCallback((id: WorkspaceId) => {
    return availableWorkspaces.some((w) => w.id === id);
  }, [availableWorkspaces]);

  // Ctrl+Shift+1-4 workspace switching
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!event.ctrlKey || !event.shiftKey || event.altKey || event.metaKey) return;
      const index = ["1", "2", "3", "4"].indexOf(event.key);
      if (index === -1) return;
      const workspace = availableWorkspaces[index];
      if (!workspace) return;
      event.preventDefault();
      setCurrentWorkspaceId(workspace.id);
      if (typeof window !== "undefined") {
        localStorage.setItem(WORKSPACE_STORAGE_KEY, workspace.id);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [availableWorkspaces]);

  if (!hydrated) {
    return (
      <WorkspaceContext.Provider
        value={{
          currentWorkspace: workspaces[0],
          availableWorkspaces: workspaces,
          allWorkspaces: workspaces,
          setWorkspace: () => {},
          isWorkspaceAvailable: () => true,
        }}
      >
        {children}
      </WorkspaceContext.Provider>
    );
  }

  return (
    <WorkspaceContext.Provider
      value={{
        currentWorkspace,
        availableWorkspaces,
        allWorkspaces: workspaces, // Export all workspaces for shell-nav
        setWorkspace,
        isWorkspaceAvailable,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}

// Re-export types and constants for convenience
export type { WorkspaceConfig, WorkspaceId } from "@/config/navigation";