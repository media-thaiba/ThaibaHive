"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface CanteenNotification {
  id: string;
  staffId: string;
  staffName: string;
  staffLastName: string;
  mealType: string;
  status: string;
  guestCount?: number;
  notes?: string;
}

interface MealSummary {
  skip?: number;
  guests?: number;
}

interface CanteenForm {
  mealType: string;
  status: string;
  guestCount: number;
  notes: string;
}

export default function CanteenPage() {
  const [notifications, setNotifications] = useState<CanteenNotification[]>([]);
  const [summary, setSummary] = useState<Record<string, MealSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [form, setForm] = useState<CanteenForm>({
    mealType: "lunch",
    status: "skip",
    guestCount: 0,
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const data = await fetch(`/api/canteen?date=${date}`).then((r) => r.json());
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
      setSummary(data.summary);
      setLoading(false);
    } catch (error) {
      console.error("Failed to load canteen data:", error);
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await fetch("/api/canteen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, ...form }),
      });
      setForm({ mealType: "lunch", status: "skip", guestCount: 0, notes: "" });
      loadData();
    } catch (error) {
      console.error("Failed to submit canteen form:", error);
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/canteen/${id}`, { method: "DELETE" });
      loadData();
    } catch (error) {
      console.error("Failed to delete canteen notification:", error);
    }
  }

  if (loading)
    return (
      <div className="flex-1 p-6">
        <Skeleton className="h-8 w-48" />
      </div>
    );

  const mealTypes = ["breakfast", "lunch", "dinner"];

  return (
    <div className="flex-1 space-y-6 p-6">
      <h1 className="text-2xl font-bold">Canteen & Meal Management</h1>

      <div className="flex items-center gap-3">
        <label className="text-sm text-muted-foreground">Date:</label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-auto"
        />
        <Button onClick={loadData} variant="outline">
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {mealTypes.map((meal) => {
          const s = summary?.[meal];
          return (
            <Card key={meal}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm capitalize">{meal}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Skipping:</span>
                  <span className="font-medium">{s?.skip || 0}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Guest count:</span>
                  <span className="font-medium text-primary">+{s?.guests || 0}</span>
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notify Your Meal Status</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
            <Select
              value={form.mealType}
              onChange={(e) => setForm({ ...form, mealType: e.target.value })}
            >
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
            </Select>
            <Select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="skip">I will skip this meal</option>
              <option value="bring_guest">I will bring guest(s)</option>
            </Select>
            {form.status === "bring_guest" && (
              <Input
                type="number"
                placeholder="Guest count"
                value={form.guestCount}
                onChange={(e) => setForm({ ...form, guestCount: Number(e.target.value) })}
                className="w-24"
              />
            )}
            <Input
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <Button type="submit">Submit</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Notifications ({notifications.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {notifications.map((n) => (
            <div key={n.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">
                  {n.staffName} {n.staffLastName} — <span className="capitalize">{n.mealType}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {n.status === "skip"
                    ? "❌ Skipping"
                    : `👥 Bringing ${n.guestCount || 0} guest(s)`}
                  {n.notes && ` — ${n.notes}`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(n.id)}
                className="text-destructive"
              >
                Remove
              </Button>
            </div>
          ))}
          {notifications.length === 0 && (
            <p className="text-sm text-muted-foreground">No notifications for today</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
