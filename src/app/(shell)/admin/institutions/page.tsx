"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

type Institution = {
  id: string; name: string; code: string; type: string;
  address: string | null; phone: string | null; email: string | null; isActive: boolean;
};

export default function InstitutionsPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", type: "campus", address: "", phone: "", email: "" });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const res = await fetch("/api/admin/institutions");
    const data = await res.json();
    setInstitutions(Array.isArray(data.institutions) ? data.institutions : []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/institutions", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm({ name: "", code: "", type: "campus", address: "", phone: "", email: "" });
    fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this institution?")) return;
    await fetch(`/api/admin/institutions/${id}`, { method: "DELETE" });
    fetchData();
  }

  if (loading) return <div className="flex-1 p-6"><Skeleton className="h-8 w-48" /></div>;

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Institutions</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Add Institution"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>New Institution</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <Input placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
                <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="campus">Campus</option>
                  <option value="college">College</option>
                  <option value="school">School</option>
                </Select>
                <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <Input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
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
                <th className="px-4 py-3 text-left font-medium">Code</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {institutions.map((inst) => (
                <tr key={inst.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">{inst.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{inst.code}</td>
                  <td className="px-4 py-3 capitalize text-xs">{inst.type}</td>
                  <td className="px-4 py-3"><Badge variant={inst.isActive ? "default" : "secondary"} className="text-[10px]">{inst.isActive ? "Active" : "Inactive"}</Badge></td>
                  <td className="px-4 py-3 text-right"><Button variant="ghost" size="sm" onClick={() => handleDelete(inst.id)} className="text-destructive hover:text-destructive">Delete</Button></td>
                </tr>
              ))}
              {institutions.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No institutions yet</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
