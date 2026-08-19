/**
 * Shared TanStack Query hooks for common resources (Departments, Institutions, Permissions)
 */
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

export type Department = { id: string; name: string; code?: string };
export type Institution = { id: string; name: string; code?: string };
export type Permissions = { role: string; permissions: string[] };

/** Fetch departments — cached for 5 mins */
export function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, ok } = await api.get<{ departments: Department[] }>("/api/departments");
      if (!ok) throw new Error("Failed to load departments");
      return data.departments ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Fetch institutions — cached for 5 mins */
export function useInstitutions() {
  return useQuery({
    queryKey: ["institutions"],
    queryFn: async () => {
      const { data, ok } = await api.get<{ institutions: Institution[] }>("/api/institutions");
      if (!ok) throw new Error("Failed to load institutions");
      return data.institutions ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Fetch current user permissions — cached for 2 mins */
export function usePermissions() {
  return useQuery({
    queryKey: ["auth", "permissions"],
    queryFn: async () => {
      const { data, ok } = await api.get<Permissions>("/api/auth/permissions", { toast: false });
      if (!ok) return { role: "", permissions: [] } as Permissions;
      return data;
    },
    staleTime: 2 * 60 * 1000,
  });
}
