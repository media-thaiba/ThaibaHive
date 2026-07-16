"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select } from "@/components/ui/select";

type Recognition = {
  id: string; type: string; reason: string;
  recognizedByName: string; recognizedByLastName: string;
  recipientName: string; recipientLastName: string;
  createdAt: string;
};

type StaffMember = {
  id: string; firstName: string; lastName: string; email: string;
};

export default function RecognitionPage() {
  const [recognitions, setRecognitions] = useState<Recognition[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ staffId: "", type: "kudos", reason: "" });

  useEffect(() => {
    Promise.all([
      fetch("/api/recognition").then(r => r.json()),
      fetch("/api/staff").then(r => r.json()),
    ]).then(([recData, staffData]) => {
      setRecognitions(Array.isArray(recData.recognitions) ? recData.recognitions : []);
      setStaffList(staffData.staff || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/recognition", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm({ staffId: "", type: "kudos", reason: "" });
    const data = await fetch("/api/recognition").then(r => r.json());
    setRecognitions(Array.isArray(data.recognitions) ? data.recognitions : []);
  }

  if (loading) {
    return (
      <div className="flex-1 p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      </div>
    );
  }

  const birthdayItems = recognitions.filter(r => r.type === "birthday");
  const anniversaryItems = recognitions.filter(r => r.type === "anniversary");
  const kudosItems = recognitions.filter(r => r.type === "kudos");

  return (
    <div className="flex-1 p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Employee Recognition</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Recognize"}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-lg border p-4 space-y-3">
          <Select value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })} required>
            <option value="">Select staff member...</option>
            {staffList.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
          </Select>
          <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="kudos">Kudos / Thank You</option>
            <option value="star">Star of the Month</option>
            <option value="achievement">Achievement</option>
            <option value="birthday">Birthday Wish</option>
            <option value="anniversary">Work Anniversary</option>
          </Select>
          <Textarea placeholder="Reason / message..." value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={3} required />
          <Button type="submit">Send</Button>
        </form>
      )}

      {kudosItems.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-lg font-semibold">Kudos & Appreciation</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {kudosItems.map((r) => (
              <div key={r.id} className="rounded-lg border p-4 space-y-2">
                <p className="text-sm">{r.reason}</p>
                <p className="text-xs text-muted-foreground">
                  {r.recognizedByName} &rarr; {r.recipientName} &middot; {r.createdAt?.split("T")[0]}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {birthdayItems.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-lg font-semibold">Birthdays</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {birthdayItems.map((r) => (
              <div key={r.id} className="rounded-lg border border-pink-200 bg-pink-50 p-4">
                <p className="text-sm font-medium">🎂 Happy Birthday {r.recipientName}!</p>
                <p className="text-xs text-muted-foreground mt-1">{r.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {anniversaryItems.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-lg font-semibold">Work Anniversaries</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {anniversaryItems.map((r) => (
              <div key={r.id} className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                <p className="text-sm font-medium">🎉 {r.recipientName} — Work Anniversary!</p>
                <p className="text-xs text-muted-foreground mt-1">{r.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {recognitions.length === 0 && <p className="text-sm text-muted-foreground">No recognitions yet.</p>}
    </div>
  );
}
