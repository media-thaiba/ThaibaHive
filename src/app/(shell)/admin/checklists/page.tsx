"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Template = {
  id: string;
  name: string;
  type: "onboarding" | "offboarding";
  description: string | null;
  isActive: boolean;
  itemsCount: number;
  createdAt: string;
};

export default function ChecklistTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "onboarding",
    description: "",
  });

  useEffect(() => {
    fetch("/api/checklists")
      .then((r) => r.json())
      .then((d) => {
        setTemplates(Array.isArray(d.templates) ? d.templates : []);
        setLoading(false);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/checklists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm({ name: "", type: "onboarding", description: "" });
    const res = await fetch("/api/checklists");
    const d = await res.json();
    setTemplates(Array.isArray(d.templates) ? d.templates : []);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this template? This cannot be undone.")) return;
    await fetch(`/api/checklists/${id}`, { method: "DELETE" });
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  if (loading) return <div className="flex-1 p-6"><div className="h-8 w-48 animate-pulse rounded bg-muted" /></div>;

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Checklist Templates</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "New Template"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-5">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Template name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
                <Select
                  value={form.type}
                  onChange={(e) =>
                    setForm({ ...form, type: e.target.value as "onboarding" | "offboarding" })
                  }
                >
                  <option value="onboarding">Onboarding</option>
                  <option value="offboarding">Offboarding</option>
                </Select>
              </div>
              <Textarea
                placeholder="Description (optional)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
              <Button type="submit">Create</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Items</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr
                  key={t.id}
                  className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                  onClick={() => router.push(`/admin/checklists/${t.id}`)}
                >
                  <td className="px-4 py-3 font-medium">{t.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant={t.type === "onboarding" ? "default" : "warning"} className="text-[10px] capitalize">
                      {t.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{t.itemsCount}</td>
                  <td className="px-4 py-3">
                    <Badge variant={t.isActive ? "success" : "secondary"} className="text-[10px]">
                      {t.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(t.id);
                      }}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
              {templates.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No templates yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
