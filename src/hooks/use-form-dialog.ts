import { useState, useCallback } from "react";

/**
 * Reusable hook for form dialog open/close state.
 * Replaces the repeated `const [showForm, setShowForm] = useState(false)` pattern.
 */
export function useFormDialog() {
  const [open, setOpen] = useState(false);

  const openDialog = useCallback(() => setOpen(true), []);
  const closeDialog = useCallback(() => setOpen(false), []);
  const toggleDialog = useCallback(() => setOpen((v) => !v), []);

  return { open, openDialog, closeDialog, toggleDialog, setOpen } as const;
}
