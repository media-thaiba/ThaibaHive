/**
 * TanStack Query hooks for Announcements
 * Task P2-46: Pilot adoption of useQuery/useMutation
 *
 * These hooks replace the manual fetch + useState + useCallback + useEffect
 * pattern with declarative, auto-cached, auto-deduped data fetching.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Announcement = {
  id: string;
  title: string;
  content: string;
  priority: string;
  isActive: boolean;
  targetRole?: string | null;
  targetDepartmentId?: string | null;
  targetInstitutionId?: string | null;
  pinnedUntil?: string | null;
  createdAt: string;
  createdByName: string;
  createdByLastName: string;
  readCount?: number;
  isRead?: boolean;
};

export type Department = { id: string; name: string };
export type Institution = { id: string; name: string };
export type Permissions = { role: string; permissions: string[] };

export type CreateAnnouncementInput = {
  title: string;
  content: string;
  priority: string;
  targetRole?: string;
  targetDepartmentId?: string;
  targetInstitutionId?: string;
  pinnedUntil?: string;
};

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const announcementKeys = {
  all: ["announcements"] as const,
  list: () => [...announcementKeys.all, "list"] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Fetch announcements list — auto-caches for 60s */
export function useAnnouncements() {
  return useQuery({
    queryKey: announcementKeys.list(),
    queryFn: async () => {
      const { data, ok } = await api.get<{ announcements: Announcement[] }>("/api/announcements");
      if (!ok) throw new Error("Failed to load announcements");
      return data.announcements ?? [];
    },
  });
}

export { useDepartments, useInstitutions, usePermissions } from "@/lib/hooks/use-shared";

/** Publish a new announcement — invalidates list on success */
export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAnnouncementInput) =>
      api.post<Announcement>("/api/announcements", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: announcementKeys.list() });
    },
  });
}

/** Mark announcement as read — optimistically updates cache */
export function useMarkAnnouncementRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post(`/api/announcements/${id}/read`, undefined, { toast: false }),
    onMutate: async (id: string) => {
      // Optimistic update: mark as read immediately without waiting for server
      await queryClient.cancelQueries({ queryKey: announcementKeys.list() });
      const previous = queryClient.getQueryData<Announcement[]>(announcementKeys.list());
      queryClient.setQueryData<Announcement[]>(
        announcementKeys.list(),
        (old) => old?.map((a) => (a.id === id ? { ...a, isRead: true } : a)) ?? []
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      // Rollback on failure
      if (context?.previous) {
        queryClient.setQueryData(announcementKeys.list(), context.previous);
      }
    },
  });
}
