"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

type Visitor = {
  id: string;
  name: string;
  contact: string | null;
  idType: string | null;
  idNumber: string | null;
  hostStaffId: string | null;
  hostStaffName: string | null;
  hostStaffLastName: string | null;
  purpose: string;
  checkIn: string;
  checkOut: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
};

type StaffMember = {
  id: string;
  firstName: string;
  lastName: string;
};

type Stats = {
  checkedIn: number;
  checkedOut: number;
  todayVisitors: number;
};

const STATUS_BADGE: Record<string, "success" | "secondary"> = {
  checked_in: "success",
  checked_out: "secondary",
};

const ID_TYPES = ["Aadhaar", "PAN", "Driving License", "Passport", "Other"];
const PURPOSES = ["meeting", "delivery", "interview", "maintenance", "visitor", "other"];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function VisitorsPage() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [stats, setStats] = useState<Stats>({ checkedIn: 0, checkedOut: 0, todayVisitors: 0 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"checked_in" | "all">("checked_in");
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [form, setForm] = useState({
    name: "", contact: "", idType: "", idNumber: "",
    hostStaffId: "", purpose: "", customPurpose: "", notes: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/visitors?status=checked_in").then(r => r.json()),
      fetch("/api/visitors/stats").then(r => r.json()),
    ]).then(([vData, sData]) => {
      setVisitors(Array.isArray(vData.visitors) ? vData.visitors : []);
      setStats(sData);
      setLoading(false);
    }).catch(() => {
      toast.error("Failed to load visitors");
      setLoading(false);
    });
  }, []);

  async function loadVisitors(status?: string) {
    try {
      const url = status === "checked_in" ? "/api/visitors?status=checked_in" : "/api/visitors";
      const [vData, sData] = await Promise.all([
        fetch(url).then(r => r.json()),
        fetch("/api/visitors/stats").then(r => r.json()),
      ]);
      setVisitors(vData.visitors || []);
      setStats(sData);
    } catch {
      toast.error("Failed to load visitors");
    }
  }

  async function switchTab(newTab: "checked_in" | "all") {
    setTab(newTab);
    setLoading(true);
    await loadVisitors(newTab === "checked_in" ? "checked_in" : undefined);
    setLoading(false);
  }

  async function openCheckIn() {
    const res = await fetch("/api/staff").then(r => r.json());
    setStaffList(res.staff || []);
    setShowCheckIn(true);
  }

  async function handleCheckIn(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.purpose) {
      toast.error("Name and purpose are required");
      return;
    }
    const payload = {
      name: form.name,
      contact: form.contact || null,
      idType: form.idType || null,
      idNumber: form.idNumber || null,
      hostStaffId: form.hostStaffId || null,
      purpose: form.purpose === "other" ? form.customPurpose : form.purpose,
      notes: form.notes || null,
    };
    const res = await fetch("/api/visitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) { toast.error("Failed to check in"); return; }
    toast.success("Visitor checked in");
    setShowCheckIn(false);
    setForm({ name: "", contact: "", idType: "", idNumber: "", hostStaffId: "", purpose: "", customPurpose: "", notes: "" });
    await loadVisitors(tab === "checked_in" ? "checked_in" : undefined);
  }

  async function handleCheckOut(id: string) {
    const res = await fetch(`/api/visitors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkOut: new Date().toISOString(), status: "checked_out" }),
    });
    if (!res.ok) { toast.error("Failed to check out"); return; }
    toast.success("Visitor checked out");
    await loadVisitors(tab === "checked_in" ? "checked_in" : undefined);
  }

  if (loading && visitors.length === 0) {
    return (
      <div className="flex-1 p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const displayVisitors = tab === "checked_in" ? visitors.filter(v => v.status === "checked_in") : visitors;

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Visitor Management</h1>
        <Button onClick={openCheckIn}>
          Check In Visitor
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Checked In Now</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-600">{stats.checkedIn}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Checked Out Today</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-muted-foreground">{stats.checkedOut}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Today</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{stats.todayVisitors}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 border-b pb-2">
        <Button variant={tab === "checked_in" ? "default" : "ghost"} onClick={() => switchTab("checked_in")}>
          Checked In
        </Button>
        <Button variant={tab === "all" ? "default" : "ghost"} onClick={() => switchTab("all")}>
          All Visitors
        </Button>
      </div>

      <div className="space-y-2">
        {displayVisitors.map((v) => (
          <Card key={v.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{v.name}</span>
                  <Badge variant={STATUS_BADGE[v.status] || "default"}>
                    {v.status.replace("_", " ")}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {v.contact && <span>{v.contact} &middot; </span>}
                  {v.purpose}
                  {v.hostStaffName && <> &middot; Host: {v.hostStaffName} {v.hostStaffLastName}</>}
                </p>
                <p className="text-xs text-muted-foreground">
                  Checked in {timeAgo(v.checkIn)}
                  {v.checkOut && <> &middot; Checked out {timeAgo(v.checkOut)}</>}
                </p>
              </div>
              {v.status === "checked_in" && (
                <Button variant="outline" size="sm" onClick={() => handleCheckOut(v.id)}>
                  Check Out
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        {displayVisitors.length === 0 && (
          <p className="text-sm text-muted-foreground">No visitors found.</p>
        )}
      </div>

      {showCheckIn && (
        <Dialog open={showCheckIn} onOpenChange={setShowCheckIn}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Check In Visitor</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCheckIn} className="space-y-3">
              <Input placeholder="Full Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Input placeholder="Contact Number" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Select value={form.idType} onChange={(e) => setForm({ ...form, idType: e.target.value })}>
                  <option value="">ID Type</option>
                  {ID_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </Select>
                <Input placeholder="ID Number" value={form.idNumber} onChange={(e) => setForm({ ...form, idNumber: e.target.value })} />
              </div>
              <Select value={form.hostStaffId} onChange={(e) => setForm({ ...form, hostStaffId: e.target.value })}>
                <option value="">Select Host Staff</option>
                {staffList.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
              </Select>
              <Select value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })}>
                <option value="">Purpose *</option>
                {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
              </Select>
              {form.purpose === "other" && (
                <Input placeholder="Specify purpose" value={form.customPurpose} onChange={(e) => setForm({ ...form, customPurpose: e.target.value })} required />
              )}
              <Textarea placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCheckIn(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Check In
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
