"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ensureArray } from "@/lib/utils";

type TemplateItem = {
  id: string;
  templateId: string;
  title: string;
  description: string | null;
  order: number;
};

type Template = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  isActive: boolean;
};

export default function TemplateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [template, setTemplate] = useState<Template | null>(null);
  const [items, setItems] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemDesc, setNewItemDesc] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/checklists/${id}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load template");
      }
      const d = await res.json();
      if (d?.template) {
        setTemplate(d.template);
        setName(d.template.name || "");
        setDescription(d.template.description || "");
      }
      setItems(ensureArray(d?.items));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load template");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSave() {
    try {
      const res = await fetch(`/api/checklists/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save template");
      }
      toast.success("Template updated");
      setEditing(false);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save template");
    }
  }

  async function handleAddItem() {
    if (!newItemTitle.trim()) return;
    try {
      const res = await fetch(`/api/checklists/templates/${id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newItemTitle,
          description: newItemDesc,
          order: items.length,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to add item");
      }
      toast.success("Item added");
      setNewItemTitle("");
      setNewItemDesc("");
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add item");
    }
  }

  async function handleDeleteItem(itemId: string) {
    if (!confirm("Delete this item?")) return;
    try {
      const res = await fetch(`/api/checklists/templates/${id}/items`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete item");
      }
      toast.success("Item removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete item");
    } finally {
      fetchData();
    }
  }

  async function handleMoveItem(itemId: string, direction: "up" | "down") {
    const idx = items.findIndex((i) => i.id === itemId);
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === items.length - 1) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    const newOrder = items[targetIdx].order;

    try {
      const first = await fetch(`/api/checklists/templates/${id}/items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId, order: newOrder }),
      });
      if (!first.ok) {
        const data = await first.json().catch(() => ({}));
        throw new Error(data.error || "Failed to reorder items");
      }
      const second = await fetch(`/api/checklists/templates/${id}/items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: items[targetIdx].id, order: items[idx].order }),
      });
      if (!second.ok) {
        const data = await second.json().catch(() => ({}));
        throw new Error(data.error || "Failed to reorder items");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reorder items");
    } finally {
      fetchData();
    }
  }

  if (loading) return <div className="flex-1 p-6"><Skeleton className="h-8 w-48" /></div>;
  if (loadError) return <div className="flex-1 p-6 text-destructive">{loadError}</div>;
  if (!template) return <div className="flex-1 p-6 text-muted-foreground">Template not found</div>;

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          {editing ? (
            <div className="space-y-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-lg font-bold"
              />
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{template.name}</h1>
                <Badge variant={template.type === "onboarding" ? "default" : "warning"} className="capitalize">
                  {template.type}
                </Badge>
              </div>
              {template.description && (
                <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
              )}
              <Button size="sm" variant="ghost" className="mt-1" onClick={() => setEditing(true)}>
                Edit
              </Button>
            </div>
          )}
        </div>
        <Button variant="outline" onClick={() => router.push("/admin/checklists")}>
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Template Items ({items.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Item title"
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Description (optional)"
              value={newItemDesc}
              onChange={(e) => setNewItemDesc(e.target.value)}
              className="flex-1"
            />
            <Button size="sm" onClick={handleAddItem}>Add</Button>
          </div>
          {items.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No items yet</p>
          ) : (
            items.map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <div className="flex flex-col gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleMoveItem(item.id, "up")}
                    disabled={idx === 0}
                    className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    ▲
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleMoveItem(item.id, "down")}
                    disabled={idx === items.length - 1}
                    className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    ▼
                  </Button>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.title}</p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  )}
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteItem(item.id)}
                >
                  Remove
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
