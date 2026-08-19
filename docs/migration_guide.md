# TanStack Query + Central API Client — Migration Guide

> **Location**: `docs/migration_guide.md`  
> **Status**: Pilot complete (`announcements/page.tsx`, `attendance/page.tsx`, `leaves/page.tsx`, `staff/page.tsx`, `tasks/page.tsx`) ✅

## Why Migrate?

| Before | After |
|--------|-------|
| `useState` + `useEffect` + `useCallback` (6–10 lines per fetch) | `useQuery` (2 lines) |
| Manual `loading/error` state per page | Shared loading/error state in hook |
| No caching — every navigation refetches | Auto-cached for `staleTime` (default 60s) |
| No deduplication — parallel mounts double-fetch | Automatically deduplicated |
| Manual optimistic updates required | Built-in optimistic rollback via `onMutate` |
| Raw `fetch()` — no 401 redirect, no error toast | `api.get/post` — handles all edge cases |

---

## Shared Hooks Ready to Use (`src/lib/hooks/use-shared.ts`)

```ts
import { useDepartments, useInstitutions, usePermissions } from "@/lib/hooks/use-shared";
```

---

## Step-by-Step Migration Pattern

### Step 1 — Create a hooks file `src/lib/hooks/use-<feature>.ts`

```ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

// 1. Define query keys namespace
export const featureKeys = {
  all: ["feature"] as const,
  list: (params?: object) => [...featureKeys.all, "list", params] as const,
};

// 2. Read hook (replaces fetchData + setLoading + setItems)
export function useFeatureItems(params?: { status?: string }) {
  return useQuery({
    queryKey: featureKeys.list(params),
    queryFn: async () => {
      const { data, ok } = await api.get<{ items: FeatureItem[] }>("/api/feature", { params });
      if (!ok) throw new Error("Failed to load feature items");
      return data.items ?? [];
    },
  });
}

// 3. Write hook (replaces handleSubmit + setSubmitting)
export function useCreateFeatureItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInput) =>
      api.post<FeatureItem>("/api/feature", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: featureKeys.all });
    },
  });
}
```

### Step 2 — Update the page component

```tsx
// BEFORE
const [items, setItems] = useState([]);
const [loading, setLoading] = useState(true);
useEffect(() => {
  fetch("/api/feature").then(r => r.json()).then(d => { setItems(d.items); setLoading(false); });
}, []);

// AFTER
const { data: items = [], isLoading } = useFeatureItems();
```

---

## Migration Inventory & Status

| Page | Feature Hooks File | Status |
|------|-------------------|--------|
| `announcements/page.tsx` | `src/lib/hooks/use-announcements.ts` | ✅ Complete |
| `attendance/page.tsx` | `src/lib/hooks/use-attendance.ts` | ✅ Complete |
| `leaves/page.tsx` | `src/lib/hooks/use-leaves.ts` | ✅ Complete |
| `staff/page.tsx` | `src/lib/hooks/use-staff.ts` | ✅ Complete |
| `tasks/page.tsx` | `src/lib/hooks/use-tasks.ts` | ✅ Complete |
| Remaining admin & feature pages | `src/lib/hooks/use-*.ts` | In Progress |
