"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const ASSET_TYPES = ["laptop", "camera", "projector", "furniture", "vehicle", "equipment", "other"];

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info";

const STATUS_STYLES: Record<string, BadgeVariant> = {
  available: "success",
  assigned: "default",
  maintenance: "warning",
  retired: "destructive",
};

interface ServiceRecord {
  id: string;
  serviceDate: string;
  description: string;
  cost: number | null;
  servicedBy: string | null;
  notes: string | null;
}

interface Asset {
  id: string;
  name: string;
  type: string;
  model: string | null;
  serialNumber: string | null;
  institutionId: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  location: string | null;
  purchaseDate: string | null;
  purchaseCost: number | null;
  warrantyEnd: string | null;
  status: string;
  notes: string | null;
  serviceHistory?: ServiceRecord[];
}

interface Institution {
  id: string;
  name: string;
}

interface Staff {
  id: string;
  firstName: string;
  lastName: string;
}

interface AssetStats {
  byStatus: { status: string; count: number }[];
  byType: { type: string; count: number }[];
}

interface AssetForm {
  name: string;
  type: string;
  model: string;
  serialNumber: string;
  institutionId: string;
  assignedToId: string;
  location: string;
  purchaseDate: string;
  purchaseCost: string;
  warrantyEnd: string;
  status: string;
  notes: string;
}

interface ServiceForm {
  serviceDate: string;
  description: string;
  cost: string;
  servicedBy: string;
  notes: string;
}

interface AssetFilters {
  type: string;
  status: string;
  institutionId: string;
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [stats, setStats] = useState<AssetStats>({ byStatus: [], byType: [] });
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [filters, setFilters] = useState<AssetFilters>({ type: "", status: "", institutionId: "" });

  const [form, setForm] = useState<AssetForm>({
    name: "", type: "laptop", model: "", serialNumber: "",
    institutionId: "", assignedToId: "", location: "",
    purchaseDate: "", purchaseCost: "", warrantyEnd: "", status: "available", notes: "",
  });

  const [sForm, setSForm] = useState<ServiceForm>({ serviceDate: new Date().toISOString().split("T")[0], description: "", cost: "", servicedBy: "", notes: "" });

  async function loadData() {
    const params = new URLSearchParams();
    if (filters.type) params.set("type", filters.type);
    if (filters.status) params.set("status", filters.status);
    if (filters.institutionId) params.set("institutionId", filters.institutionId);

    const [aRes, sRes, iRes, stRes] = await Promise.all([
      fetch(`/api/assets?${params}`).then(r => r.json()),
      fetch("/api/staff").then(r => r.json()),
      fetch("/api/admin/institutions").then(r => r.json()),
      fetch("/api/assets/stats").then(r => r.json()),
    ]);
    setAssets(Array.isArray(aRes.assets) ? aRes.assets : []);
    setStaffList(sRes.staff || []);
    setInstitutions(iRes.institutions || []);
    setStats(stRes);
  }

  async function loadStatsOnly() {
    const stRes = await fetch("/api/assets/stats").then(r => r.json());
    setStats(stRes);
  }

  useEffect(() => {
    setLoading(true);
    loadData()
      .catch(() => toast.error("Failed to load assets"))
      .finally(() => setLoading(false));
  }, [filters.type, filters.status, filters.institutionId]);

  useEffect(() => {
    if (!showForm && !selectedAsset) loadStatsOnly().catch(() => {});
  }, [showForm, selectedAsset]);

  async function openDetail(asset: Asset) {
    setDetailLoading(true);
    setSelectedAsset(asset);
    const res = await fetch(`/api/assets/${asset.id}`).then(r => r.json());
    setSelectedAsset(res.asset);
    setDetailLoading(false);
  }

  function closeDetail() {
    setSelectedAsset(null);
    loadData();
  }

  function openAddForm() {
    setEditing(null);
    setForm({ name: "", type: "laptop", model: "", serialNumber: "", institutionId: "", assignedToId: "", location: "", purchaseDate: "", purchaseCost: "", warrantyEnd: "", status: "available", notes: "" });
    setShowForm(true);
    setSelectedAsset(null);
  }

  function openEditForm() {
    if (!selectedAsset) return;
    setEditing(selectedAsset);
    setForm({
      name: selectedAsset.name || "",
      type: selectedAsset.type || "laptop",
      model: selectedAsset.model || "",
      serialNumber: selectedAsset.serialNumber || "",
      institutionId: selectedAsset.institutionId || "",
      assignedToId: selectedAsset.assignedToId || "",
      location: selectedAsset.location || "",
      purchaseDate: selectedAsset.purchaseDate || "",
      purchaseCost: selectedAsset.purchaseCost?.toString() || "",
      warrantyEnd: selectedAsset.warrantyEnd || "",
      status: selectedAsset.status || "available",
      notes: selectedAsset.notes || "",
    });
    setShowForm(true);
    setSelectedAsset(null);
  }

  function cancelForm() {
    setShowForm(false);
    setEditing(null);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (editing) {
      await fetch(`/api/assets/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      toast.success("Asset updated");
    } else {
      await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      toast.success("Asset created");
    }
    cancelForm();
    loadData();
  }

  async function deleteAsset() {
    if (!selectedAsset) return;
    await fetch(`/api/assets/${selectedAsset.id}`, { method: "DELETE" });
    toast.success("Asset deleted");
    setSelectedAsset(null);
    loadData();
  }

  async function addServiceRecord(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAsset) return;
    await fetch(`/api/assets/${selectedAsset.id}/service`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sForm),
    });
    toast.success("Service record added");
    setSForm({ serviceDate: new Date().toISOString().split("T")[0], description: "", cost: "", servicedBy: "", notes: "" });
    const res = await fetch(`/api/assets/${selectedAsset.id}`).then(r => r.json());
    setSelectedAsset(res.asset);
  }

  function statusCount(status: string) {
    const s = stats.byStatus.find((s) => s.status === status);
    return s?.count || 0;
  }

  if (loading && assets.length === 0) {
    return <div className="flex-1 p-6"><div className="h-8 w-48 animate-pulse rounded bg-muted" /></div>;
  }

  const statsCards = [
    { label: "Available", count: statusCount("available"), color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" },
    { label: "Assigned", count: statusCount("assigned"), color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30" },
    { label: "Maintenance", count: statusCount("maintenance"), color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30" },
    { label: "Retired", count: statusCount("retired"), color: "text-red-600 bg-red-50 dark:bg-red-950/30" },
  ];

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Assets</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{assets.length} total</p>
        </div>
        <Button onClick={openAddForm}>
          Add Asset
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statsCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.color}`}>
                <span className="text-lg font-bold">{s.count}</span>
              </div>
              <p className="text-sm font-medium text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
          <option value="">All Types</option>
          {ASSET_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
        </Select>
        <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All Status</option>
          <option value="available">Available</option>
          <option value="assigned">Assigned</option>
          <option value="maintenance">Maintenance</option>
          <option value="retired">Retired</option>
        </Select>
        <Select value={filters.institutionId} onChange={(e) => setFilters({ ...filters, institutionId: e.target.value })}>
          <option value="">All Institutions</option>
          {institutions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </Select>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editing ? "Edit Asset" : "Add Asset"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitForm} className="grid grid-cols-2 gap-3">
              <Input placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} required>
                {ASSET_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
              </Select>
              <Input placeholder="Model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
              <Input placeholder="Serial Number" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} />
              <Select value={form.institutionId} onChange={(e) => setForm({ ...form, institutionId: e.target.value })}>
                <option value="">No institution</option>
                {institutions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </Select>
              <Select value={form.assignedToId} onChange={(e) => setForm({ ...form, assignedToId: e.target.value })}>
                <option value="">Not assigned</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                ))}
              </Select>
              <Input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              <Input type="date" placeholder="Purchase Date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
              <Input type="number" step="0.01" placeholder="Purchase Cost (₹)" value={form.purchaseCost} onChange={(e) => setForm({ ...form, purchaseCost: e.target.value })} />
              <Input type="date" placeholder="Warranty End" value={form.warrantyEnd} onChange={(e) => setForm({ ...form, warrantyEnd: e.target.value })} />
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="available">Available</option>
                <option value="assigned">Assigned</option>
                <option value="maintenance">Maintenance</option>
                <option value="retired">Retired</option>
              </Select>
              <div className="col-span-2">
                <Textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
              </div>
              <div className="col-span-2 flex gap-2">
                <Button type="submit">
                  {editing ? "Update" : "Create"}
                </Button>
                <Button type="button" variant="outline" onClick={cancelForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {selectedAsset ? (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-lg">{selectedAsset.name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5 capitalize">{selectedAsset.type}{selectedAsset.model ? ` · ${selectedAsset.model}` : ""}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={openEditForm}>
                Edit
              </Button>
              <Button variant="destructive" size="sm" onClick={deleteAsset}>
                Delete
              </Button>
              <Button variant="outline" size="sm" onClick={closeDetail}>
                Back
              </Button>
            </div>
          </CardHeader>
          {detailLoading ? (
            <CardContent><Skeleton className="h-20" /></CardContent>
          ) : (
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
                <div>
                  <p className="text-muted-foreground text-xs">Status</p>
                  <Badge variant={STATUS_STYLES[selectedAsset.status] || "default"} className="mt-1 capitalize">
                    {selectedAsset.status}
                  </Badge>
                </div>
                {selectedAsset.serialNumber && (
                  <div>
                    <p className="text-muted-foreground text-xs">Serial Number</p>
                    <p className="mt-0.5 font-mono text-xs">{selectedAsset.serialNumber}</p>
                  </div>
                )}
                {selectedAsset.assignedToName && (
                  <div>
                    <p className="text-muted-foreground text-xs">Assigned To</p>
                    <p className="mt-0.5">{selectedAsset.assignedToName}</p>
                  </div>
                )}
                {selectedAsset.location && (
                  <div>
                    <p className="text-muted-foreground text-xs">Location</p>
                    <p className="mt-0.5">{selectedAsset.location}</p>
                  </div>
                )}
                {selectedAsset.purchaseDate && (
                  <div>
                    <p className="text-muted-foreground text-xs">Purchase Date</p>
                    <p className="mt-0.5">{selectedAsset.purchaseDate}</p>
                  </div>
                )}
                {selectedAsset.purchaseCost != null && (
                  <div>
                    <p className="text-muted-foreground text-xs">Purchase Cost</p>
                    <p className="mt-0.5">₹{Number(selectedAsset.purchaseCost).toLocaleString()}</p>
                  </div>
                )}
                {selectedAsset.warrantyEnd && (
                  <div>
                    <p className="text-muted-foreground text-xs">Warranty End</p>
                    <p className="mt-0.5">{selectedAsset.warrantyEnd}</p>
                  </div>
                )}
                {selectedAsset.notes && (
                  <div className="col-span-full">
                    <p className="text-muted-foreground text-xs">Notes</p>
                    <p className="mt-0.5 whitespace-pre-wrap">{selectedAsset.notes}</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Service History</h3>
                  <details className="text-sm">
                    <summary className="cursor-pointer text-primary hover:underline text-xs font-medium">Add Service Record</summary>
                    <form onSubmit={addServiceRecord} className="mt-3 grid grid-cols-2 gap-3 border rounded-lg p-3 bg-muted/30">
                      <Input type="date" value={sForm.serviceDate} onChange={(e) => setSForm({ ...sForm, serviceDate: e.target.value })} required />
                      <Input placeholder="Description *" value={sForm.description} onChange={(e) => setSForm({ ...sForm, description: e.target.value })} required />
                      <Input type="number" step="0.01" placeholder="Cost (₹)" value={sForm.cost} onChange={(e) => setSForm({ ...sForm, cost: e.target.value })} />
                      <Input placeholder="Serviced By" value={sForm.servicedBy} onChange={(e) => setSForm({ ...sForm, servicedBy: e.target.value })} />
                      <div className="col-span-2">
                        <Textarea placeholder="Notes" value={sForm.notes} onChange={(e) => setSForm({ ...sForm, notes: e.target.value })} rows={2} />
                      </div>
                      <Button type="submit" className="col-span-2">
                        Add Record
                      </Button>
                    </form>
                  </details>
                </div>
                {selectedAsset.serviceHistory && selectedAsset.serviceHistory.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2 text-left font-medium">Date</th>
                        <th className="px-3 py-2 text-left font-medium">Description</th>
                        <th className="px-3 py-2 text-right font-medium">Cost</th>
                        <th className="px-3 py-2 text-left font-medium">Serviced By</th>
                        <th className="px-3 py-2 text-left font-medium">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedAsset.serviceHistory.map((sh) => (
                        <tr key={sh.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-3 py-2">{sh.serviceDate}</td>
                          <td className="px-3 py-2">{sh.description}</td>
                          <td className="px-3 py-2 text-right">{sh.cost != null ? `₹${Number(sh.cost).toLocaleString()}` : "—"}</td>
                          <td className="px-3 py-2">{sh.servicedBy || "—"}</td>
                          <td className="px-3 py-2 text-muted-foreground">{sh.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-6 text-center">
                    <p className="text-sm font-medium text-foreground">No service records yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Log maintenance and repairs here as they happen to keep your asset history complete.</p>
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-left font-medium">Model</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Assigned To</th>
                  <th className="px-4 py-3 text-left font-medium">Location</th>
                  <th className="px-4 py-3 text-left font-medium">Warranty</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((a) => (
                  <tr key={a.id} onClick={() => openDetail(a)}
                    className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-medium">{a.name}</td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{a.type}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.model || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_STYLES[a.status] || "default"} className="capitalize">{a.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{a.assignedToName || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.location || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.warrantyEnd || "—"}</td>
                  </tr>
                ))}
                {assets.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center">
                    <p className="text-base font-medium text-foreground">No assets yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">Start tracking your equipment and inventory by adding your first asset.</p>
                  </td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
