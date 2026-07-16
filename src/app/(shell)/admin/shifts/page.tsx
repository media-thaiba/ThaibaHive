"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type Shift = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  description: string | null;
  isActive: boolean;
};

type StaffShift = {
  id: string;
  staffId: string;
  shiftId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  staffName: string | null;
  staffLastName: string | null;
  employeeId: string | null;
  designation: string | null;
  shiftName: string | null;
  shiftStartTime: string | null;
  shiftEndTime: string | null;
};

type Staff = {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  designation: string | null;
};

type Tab = "manage" | "staff-shifts";

export default function ShiftsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("manage");
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [assignments, setAssignments] = useState<StaffShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", startTime: "", endTime: "", description: "" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({
    staffId: "",
    shiftId: "",
    effectiveFrom: "",
    effectiveTo: "",
  });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const [shiftsRes, assignmentsRes, staffRes] = await Promise.all([
      fetch("/api/admin/shifts"),
      fetch("/api/admin/staff-shifts"),
      fetch("/api/admin/staff"),
    ]);
    const shiftsData = await shiftsRes.json();
    const assignmentsData = await assignmentsRes.json();
    const staffData = await staffRes.json();
    setShifts(Array.isArray(shiftsData.shifts) ? shiftsData.shifts : []);
    setAssignments(Array.isArray(assignmentsData.assignments) ? assignmentsData.assignments : []);
    setStaffList(Array.isArray(staffData.staff) ? staffData.staff : []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm({ name: "", startTime: "", endTime: "", description: "" });
    fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this shift?")) return;
    await fetch(`/api/admin/shifts/${id}`, { method: "DELETE" });
    fetchData();
  }

  async function handleAssignShift(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/staff-shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(assignForm),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success("Shift assigned successfully");
      setDialogOpen(false);
      setAssignForm({ staffId: "", shiftId: "", effectiveFrom: "", effectiveTo: "" });
      fetchData();
    } else {
      toast.error(data.error || "Failed to assign shift");
    }
  }

  async function handleDeleteAssignment(id: string) {
    if (!confirm("Remove this shift assignment?")) return;
    const res = await fetch(`/api/admin/staff-shifts?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Assignment removed");
      fetchData();
    }
  }

  if (loading) {
    return (
      <div className="flex-1 p-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "manage", label: "Manage Shifts", count: shifts.length },
    { key: "staff-shifts", label: "Staff Shifts", count: assignments.length },
  ];

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Shifts</h1>
        {activeTab === "manage" && (
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "Add Shift"}
          </Button>
        )}
        {activeTab === "staff-shifts" && (
          <Button onClick={() => setDialogOpen(true)}>Assign Shift</Button>
        )}
      </div>

      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            variant="ghost"
            onClick={() => setActiveTab(tab.key)}
            className={`h-auto rounded-none px-4 py-2 text-sm font-medium transition-colors -mb-px ${
              activeTab === tab.key
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">
              {tab.count}
            </span>
          </Button>
        ))}
      </div>

      {activeTab === "manage" && (
        <>
          {showForm && (
            <Card>
              <CardHeader>
                <CardTitle>New Shift</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                    <Input
                      type="time"
                      value={form.startTime}
                      onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                      required
                    />
                    <Input
                      type="time"
                      value={form.endTime}
                      onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                      required
                    />
                  </div>
                  <Textarea
                    placeholder="Description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                  <Button type="submit">
                    Create
                  </Button>
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
                    <th className="px-4 py-3 text-left font-medium">Start</th>
                    <th className="px-4 py-3 text-left font-medium">End</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shifts.map((s) => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">{s.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.startTime}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.endTime}</td>
                      <td className="px-4 py-3">
                        <Badge variant={s.isActive ? "default" : "secondary"} className="text-[10px]">
                          {s.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="link"
                          className="h-auto p-0 text-xs text-destructive hover:underline"
                          onClick={() => handleDelete(s.id)}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {shifts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No shifts yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === "staff-shifts" && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Employee ID</th>
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Designation</th>
                  <th className="px-4 py-3 text-left font-medium">Shift</th>
                  <th className="px-4 py-3 text-left font-medium">Hours</th>
                  <th className="px-4 py-3 text-left font-medium">Effective From</th>
                  <th className="px-4 py-3 text-left font-medium">Effective To</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground">{a.employeeId || "\u2014"}</td>
                    <td className="px-4 py-3">{[a.staffName, a.staffLastName].filter(Boolean).join(" ") || "\u2014"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.designation || "\u2014"}</td>
                    <td className="px-4 py-3">{a.shiftName || "\u2014"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {a.shiftStartTime && a.shiftEndTime
                        ? `${a.shiftStartTime} \u2013 ${a.shiftEndTime}`
                        : "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{a.effectiveFrom}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.effectiveTo || "Ongoing"}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="link"
                        className="h-auto p-0 text-xs text-destructive hover:underline"
                        onClick={() => handleDeleteAssignment(a.id)}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
                {assignments.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No staff shift assignments yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Shift</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAssignShift} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Staff Member</label>
              <Select
                value={assignForm.staffId}
                onChange={(e) => setAssignForm({ ...assignForm, staffId: e.target.value })}
                required
              >
                <option value="">Select staff...</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName} ({s.employeeId})
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Shift</label>
              <Select
                value={assignForm.shiftId}
                onChange={(e) => setAssignForm({ ...assignForm, shiftId: e.target.value })}
                required
              >
                <option value="">Select shift...</option>
                {shifts.filter((s) => s.isActive).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.startTime} \u2013 {s.endTime})
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Effective From</label>
                <Input
                  type="date"
                  value={assignForm.effectiveFrom}
                  onChange={(e) => setAssignForm({ ...assignForm, effectiveFrom: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Effective To</label>
                <Input
                  type="date"
                  value={assignForm.effectiveTo}
                  onChange={(e) => setAssignForm({ ...assignForm, effectiveTo: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Assign</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
