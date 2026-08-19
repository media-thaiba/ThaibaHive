/**
 * TanStack Query hooks for Tasks
 * Tasks P2-46, P2-47
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignedToId: string | null;
  dueDate: string | null;
  sortOrder: number;
  createdAt: string;
  assignee?: { firstName: string; lastName: string } | null;
};

export const taskKeys = {
  all: ["tasks"] as const,
  list: (scope: string) => [...taskKeys.all, "list", scope] as const,
};

/** Fetch tasks list by scope */
export function useTasks(scope: "all" | "my" | "department" = "all") {
  return useQuery({
    queryKey: taskKeys.list(scope),
    queryFn: async () => {
      const { data, ok } = await api.get<{ tasks: Task[] }>("/api/tasks", { params: { scope } });
      if (!ok) throw new Error("Failed to load tasks");
      return data.tasks ?? [];
    },
  });
}

/** Reorder and persist tasks */
export function useReorderTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: { id: string; status: string; sortOrder: number }[]) =>
      api.patch("/api/tasks/reorder", { tasks: updates }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}
