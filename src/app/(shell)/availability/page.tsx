"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type StatusOption = {
  value: string;
  label: string;
  dot: string;
  color: string;
};

const statusOptions: StatusOption[] = [
  { value: "available", label: "Available", dot: "🟢", color: "bg-emerald-500" },
  { value: "busy", label: "Busy", dot: "🟡", color: "bg-amber-500" },
  { value: "meeting", label: "In Meeting", dot: "🔵", color: "bg-blue-500" },
  { value: "leave", label: "On Leave", dot: "🟣", color: "bg-purple-500" },
  { value: "off_campus", label: "Off Campus", dot: "🟠", color: "bg-orange-500" },
  { value: "travelling", label: "Travelling", dot: "🔴", color: "bg-red-500" },
];

type StaffAvailability = {
  staffId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  designation: string | null;
  status: string;
  updatedAt: string | null;
};

export default function AvailabilityPage() {
  const { staff: currentUser } = useAuth();
  const [myStatus, setMyStatus] = useState<string>("available");
  const [loaded, setLoaded] = useState(false);
  const [allAvailability, setAllAvailability] = useState<StaffAvailability[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/availability").then((r) => r.json()),
      fetch("/api/availability/all").then((r) => r.json()),
    ]).then(([myData, allData]) => {
      setMyStatus(myData.status);
      setAllAvailability(Array.isArray(allData.availability) ? allData.availability : []);
      setLoaded(true);
    });
  }, []);

  async function updateStatus(value: string) {
    if (value === myStatus) return;
    const res = await fetch("/api/availability", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: value }),
    });
    if (res.ok) {
      setMyStatus(value);
      setAllAvailability((prev) =>
        prev.map((a) =>
          a.staffId === currentUser?.id ? { ...a, status: value, updatedAt: new Date().toISOString() } : a
        )
      );
      const option = statusOptions.find((o) => o.value === value);
      toast.success(`Status set to ${option?.label ?? value}`);
    } else {
      toast.error("Failed to update status");
    }
  }

  const currentOption = statusOptions.find((o) => o.value === myStatus);
  const filtered = allAvailability.filter((a) => {
    const name = `${a.firstName} ${a.lastName}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Staff Availability</h1>
        <p className="text-sm text-muted-foreground mt-1">Set your current status and see who&apos;s available</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className={currentOption?.color ?? "bg-gray-400"} style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%" }} />
            Your Status: <span className="font-bold">{currentOption?.label ?? "Available"}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {statusOptions.map((opt) => {
              const isActive = myStatus === opt.value;
              return (
                <Button
                  key={opt.value}
                  onClick={() => updateStatus(opt.value)}
                  variant="outline"
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all h-auto w-full whitespace-normal font-normal ${
                    isActive
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "hover:border-primary/30 hover:bg-accent"
                  }`}
                >
                  <span className="text-2xl">{opt.dot}</span>
                  <span className="text-sm font-medium">{opt.label}</span>
                  {isActive && <span className="text-[10px] text-primary font-semibold">CURRENT</span>}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Staff</CardTitle>
            <Input
              type="text"
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-60"
            />
          </div>
        </CardHeader>
        <CardContent>
          {!loaded ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No staff found</p>
          ) : (
            <div className="divide-y">
              {filtered.map((a) => {
                const opt = statusOptions.find((o) => o.value === a.status);
                const isMe = a.staffId === currentUser?.id;
                return (
                  <div key={a.staffId} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{opt?.dot ?? "⚪"}</span>
                      <div>
                        <p className="text-sm font-medium">
                          {a.firstName} {a.lastName}
                          {isMe && <span className="ml-1.5 text-[10px] text-muted-foreground">(you)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">{a.designation ?? ""}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize">{opt?.label ?? a.status}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
