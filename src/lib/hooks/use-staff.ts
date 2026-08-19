/**
 * TanStack Query hooks for Staff
 * Tasks P2-46, P2-47
 */
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

export type StaffMember = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string;
  designation: string | null;
  role: string;
  phone: string | null;
  isActive: boolean;
};

export const staffKeys = {
  all: ["staff"] as const,
  list: () => [...staffKeys.all, "list"] as const,
  detail: (id: string) => [...staffKeys.all, "detail", id] as const,
};

/** Fetch staff directory */
export function useStaffList() {
  return useQuery({
    queryKey: staffKeys.list(),
    queryFn: async () => {
      const { data, ok } = await api.get<{ staff: StaffMember[] }>("/api/staff");
      if (!ok) throw new Error("Failed to load staff list");
      return data.staff ?? [];
    },
  });
}

/** Fetch single staff details */
export function useStaffDetail(id: string) {
  return useQuery({
    queryKey: staffKeys.detail(id),
    queryFn: async () => {
      const { data, ok } = await api.get<{ staff: StaffMember }>(`/api/staff/${id}`);
      if (!ok) throw new Error("Failed to load staff details");
      return data.staff;
    },
    enabled: !!id,
  });
}
