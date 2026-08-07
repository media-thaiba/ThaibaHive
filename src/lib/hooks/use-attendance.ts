/**
 * TanStack Query hooks for Attendance
 * Tasks P2-46, P2-47
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

export type AttendanceLog = {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  lateMinutes: number | null;
  workedMinutes: number | null;
  method: string;
};

export type TeamLog = AttendanceLog & {
  staffId: string;
  staffName: string | null;
  staffLastName: string | null;
  employeeId: string | null;
};

export type AttendanceTodayResponse = {
  log: AttendanceLog | null;
};

export type MyAttendanceResponse = {
  logs: AttendanceLog[];
  pagination?: { total: number; limit: number; offset: number };
};

export type TeamAttendanceResponse = {
  logs: TeamLog[];
  pagination?: { total: number; limit: number; offset: number };
};

export const attendanceKeys = {
  all: ["attendance"] as const,
  today: () => [...attendanceKeys.all, "today"] as const,
  my: (params: { dateFrom: string; dateTo: string; page: number }) =>
    [...attendanceKeys.all, "my", params] as const,
  team: (params: {
    dateFrom: string;
    dateTo: string;
    page: number;
    search: string;
    departmentId: string;
    institutionId: string;
  }) => [...attendanceKeys.all, "team", params] as const,
};

/** Today's check-in status */
export function useTodayAttendance() {
  return useQuery({
    queryKey: attendanceKeys.today(),
    queryFn: async () => {
      const { data, ok } = await api.get<AttendanceTodayResponse>("/api/attendance/today");
      if (!ok) throw new Error("Failed to load today's attendance");
      return data.log;
    },
  });
}

/** Personal attendance history */
export function useMyAttendance(params: { dateFrom: string; dateTo: string; page: number }) {
  return useQuery({
    queryKey: attendanceKeys.my(params),
    queryFn: async () => {
      const offset = (params.page - 1) * 20;
      const { data, ok } = await api.get<MyAttendanceResponse>("/api/attendance/my", {
        params: { from: params.dateFrom, to: params.dateTo, limit: 20, offset },
      });
      if (!ok) throw new Error("Failed to load attendance logs");
      return data;
    },
  });
}

/** Team attendance logs */
export function useTeamAttendance(
  params: {
    dateFrom: string;
    dateTo: string;
    page: number;
    search: string;
    departmentId: string;
    institutionId: string;
  },
  enabled: boolean = true
) {
  return useQuery({
    queryKey: attendanceKeys.team(params),
    queryFn: async () => {
      const offset = (params.page - 1) * 20;
      const { data, ok } = await api.get<TeamAttendanceResponse>("/api/attendance/logs", {
        params: {
          from: params.dateFrom,
          to: params.dateTo,
          limit: 20,
          offset,
          search: params.search || undefined,
          departmentId: params.departmentId || undefined,
          institutionId: params.institutionId || undefined,
        },
      });
      if (!ok) throw new Error("Failed to load team attendance");
      return data;
    },
    enabled,
  });
}

/** Check-out mutation */
export function useCheckOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/api/attendance/check-out"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
    },
  });
}
