/**
 * TanStack Query hooks for Leaves
 * Tasks P2-46, P2-47
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

export type LeaveRequest = {
  id: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string | null;
  status: string;
  appliedAt: string;
};

export type LeaveType = {
  id: string;
  name: string;
  code: string;
  daysAllowed: number;
};

export type LeaveBalance = {
  id: string;
  leaveTypeId: string;
  totalDays: number;
  usedDays: number;
  leaveTypeName: string | null;
  leaveTypeCode: string | null;
};

export type CreateLeaveInput = {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason?: string;
};

export const leaveKeys = {
  all: ["leaves"] as const,
  list: (params?: { dateFrom?: string; dateTo?: string }) =>
    [...leaveKeys.all, "list", params] as const,
  types: () => [...leaveKeys.all, "types"] as const,
  balances: () => [...leaveKeys.all, "balances"] as const,
};

/** Fetch user leaves */
export function useLeaves(params?: { dateFrom?: string; dateTo?: string }) {
  return useQuery({
    queryKey: leaveKeys.list(params),
    queryFn: async () => {
      const { data, ok } = await api.get<{ leaves: LeaveRequest[] }>("/api/leaves", {
        params: { from: params?.dateFrom, to: params?.dateTo },
      });
      if (!ok) throw new Error("Failed to load leaves");
      return data.leaves ?? [];
    },
  });
}

/** Fetch available leave types */
export function useLeaveTypes() {
  return useQuery({
    queryKey: leaveKeys.types(),
    queryFn: async () => {
      const { data, ok } = await api.get<{ leaveTypes: LeaveType[] }>("/api/leaves/types");
      if (!ok) throw new Error("Failed to load leave types");
      return data.leaveTypes ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Fetch user leave balances */
export function useLeaveBalances() {
  return useQuery({
    queryKey: leaveKeys.balances(),
    queryFn: async () => {
      const { data, ok } = await api.get<{ balances: LeaveBalance[] }>("/api/leaves/balances");
      if (!ok) throw new Error("Failed to load leave balances");
      return data.balances ?? [];
    },
  });
}

/** Apply for leave */
export function useCreateLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLeaveInput) => api.post("/api/leaves", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.all });
    },
  });
}

/** Cancel a leave request */
export function useCancelLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/leaves/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.all });
    },
  });
}
