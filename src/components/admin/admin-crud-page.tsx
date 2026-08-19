"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, PencilIcon, Trash2Icon, SearchIcon } from "lucide-react";


export type CrudColumn<T> = {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
};

export type AdminCrudPageProps<T extends { id: string }> = {
  /** Page title shown in PageHeader */
  title: string;
  /** Optional description shown in PageHeader */
  description?: string;
  /** API endpoint base, e.g. '/api/admin/departments' */
  apiEndpoint: string;
  /** The JSON key to extract the list from the API response */
  listKey: string;
  /** Column definitions for the table */
  columns: CrudColumn<T>[];
  /** Form fields to show in the Create/Edit dialog */
  formFields: React.ReactNode;
  /** Current form state value */
  formState: Record<string, string>;
  /** Setter for form state */
  setFormState: (state: Record<string, string>) => void;
  /** Default empty form */
  emptyForm: Record<string, string>;
  /** Label for the create button */
  createLabel?: string;
  /** Whether this page allows deletion */
  allowDelete?: boolean;
  /** Optional search filter function */
  searchFilter?: (item: T, query: string) => boolean;
};

export function AdminCrudPage<T extends { id: string }>({
  title,
  description,
  apiEndpoint,
  listKey,
  columns,
  formFields,
  formState,
  setFormState,
  emptyForm,
  createLabel = "New",
  allowDelete = true,
  searchFilter,
}: AdminCrudPageProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<T | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch(apiEndpoint)
      .then((r) => r.json())
      .then((data) => {
        setItems(Array.isArray(data[listKey]) ? data[listKey] : []);
      })
      .catch(() => toast.error(`Failed to load ${title.toLowerCase()}`))
      .finally(() => setLoading(false));
  }, [apiEndpoint, listKey, title]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredItems = searchFilter && searchQuery
    ? items.filter((item) => searchFilter(item, searchQuery.toLowerCase()))
    : items;

  async function handleCreate() {
    setSaving(true);
    try {
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error || "Failed to create");
        return;
      }
      toast.success("Created successfully");
      setShowCreate(false);
      setFormState(emptyForm);
      fetchData();
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate() {
    if (!editTarget) return;
    setSaving(true);
    try {
      const res = await fetch(`${apiEndpoint}/${editTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error || "Failed to update");
        return;
      }
      toast.success("Updated successfully");
      setEditTarget(null);
      setFormState(emptyForm);
      fetchData();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`${apiEndpoint}/${deleteTarget.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to delete");
      return;
    }
    toast.success("Deleted successfully");
    setDeleteTarget(null);
    fetchData();
  }

  function openEdit(item: T) {
    setEditTarget(item);
    // Populate formState with item values
    const initial: Record<string, string> = {};
    Object.keys(emptyForm).forEach((key) => {
      initial[key] = String((item as Record<string, unknown>)[key] ?? "");
    });
    setFormState(initial);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button onClick={() => { setFormState(emptyForm); setShowCreate(true); }} className="gap-1.5">
            <Plus className="h-4 w-4" />
            {createLabel}
          </Button>
        }
      />

      {/* Search */}
      {searchFilter && (
        <div className="relative max-w-xs">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${title.toLowerCase()}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                {columns.map((col) => (
                  <th key={String(col.key)} className="px-4 py-3 text-left font-medium text-muted-foreground">
                    {col.header}
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {columns.map((col) => (
                      <td key={String(col.key)} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                    <td className="px-4 py-3"><Skeleton className="h-8 w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="text-center text-muted-foreground py-12">
                    {searchQuery ? `No results for "${searchQuery}"` : `No ${title.toLowerCase()} yet.`}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    {columns.map((col) => (
                      <td key={String(col.key)} className="px-4 py-3">
                        {col.render
                          ? col.render(item)
                          : String((item as Record<string, unknown>)[col.key as string] ?? "—")}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Edit ${title.slice(0, -1)}`}
                          onClick={() => openEdit(item)}
                        >
                          <PencilIcon className="h-3.5 w-3.5" />
                        </Button>
                        {allowDelete && (
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Delete ${title.slice(0, -1)}`}
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(item)}
                          >
                            <Trash2Icon className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create {title.slice(0, -1)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">{formFields}</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(v) => { if (!v) { setEditTarget(null); setFormState(emptyForm); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {title.slice(0, -1)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">{formFields}</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditTarget(null); setFormState(emptyForm); }}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title="Confirm Delete"
        description={`Are you sure you want to delete this ${title.slice(0, -1).toLowerCase()}? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
