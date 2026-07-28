"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { toast } from "sonner";

type Department = { id: string; name: string };
type Institution = { id: string; name: string };

type Props = {
  departments: Department[];
  institutions: Institution[];
  onCreated: () => void;
  onCancel: () => void;
};

export function EventFormCard({ departments, institutions, onCreated, onCancel }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", eventType: "institution",
    startDate: "", endDate: "", location: "",
    departmentId: "", institutionId: "", maxAttendees: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          maxAttendees: form.maxAttendees ? parseInt(form.maxAttendees) : undefined,
          departmentId: form.departmentId || undefined,
          institutionId: form.institutionId || undefined,
          endDate: form.endDate || undefined,
          description: form.description || undefined,
          location: form.location || undefined,
        }),
      });
      if (res.ok) {
        toast.success("Event created successfully");
        onCreated();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to create event");
      }
    } catch { toast.error("Failed to submit event request"); }
    finally { setSubmitting(false); }
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Create Event</CardTitle>
        <p className="text-sm text-muted-foreground">Fill out metadata to create and target this event.</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input placeholder="Event title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          <div className="grid grid-cols-2 gap-3">
            <Select value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })} required>
              <option value="institution">Institution</option>
              <option value="department">Department</option>
              <option value="meeting">Meeting</option>
              <option value="holiday">Holiday</option>
              <option value="other">Other</option>
            </Select>
            <Input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          {form.eventType === "department" && (
            <Select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} required>
              <option value="">Select target department...</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          )}
          {form.eventType === "institution" && (
            <Select value={form.institutionId} onChange={(e) => setForm({ ...form, institutionId: e.target.value })} required>
              <option value="">Select target institution...</option>
              {institutions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </Select>
          )}
          {form.eventType === "meeting" && (
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
                <option value="">All Departments</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
              <Select value={form.institutionId} onChange={(e) => setForm({ ...form, institutionId: e.target.value })}>
                <option value="">All Institutions</option>
                {institutions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Start Date</label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">End Date (Optional)</label>
              <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
          </div>
          <div className="w-1/2">
            <label className="text-xs text-muted-foreground">Max Attendees (Optional)</label>
            <Input type="number" placeholder="Unlimited" value={form.maxAttendees} onChange={(e) => setForm({ ...form, maxAttendees: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create Event"}</Button>
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
