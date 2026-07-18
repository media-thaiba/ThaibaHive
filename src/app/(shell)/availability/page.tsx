"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PresenceDot } from "@/components/ui/presence-dot";
import { usePresence } from "@/hooks/usePresence";
import { Search, CircleDot } from "lucide-react";

type StaffMember = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: string;
  departmentName: string | null;
};

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "busy", label: "Busy" },
  { value: "meeting", label: "In a Meeting" },
  { value: "away", label: "Away" },
] as const;

export default function AvailabilityPage() {
  const { getPresence, loaded: presenceLoaded } = usePresence();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [staffLoaded, setStaffLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [myStatus, setMyStatus] = useState("active");
  const [myStatusText, setMyStatusText] = useState("");
  const [saving, setSaving] = useState(false);
  const [currentStaffId, setCurrentStaffId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/staff")
      .then((r) => r.json())
      .then((data) => {
        setStaff(Array.isArray(data) ? data : data.staff ?? []);
        setStaffLoaded(true);
      })
      .catch(() => setStaffLoaded(true));

    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => setCurrentStaffId(data?.staffId ?? null))
      .catch(() => {});
  }, []);

  const handleSaveStatus = useCallback(async () => {
    setSaving(true);
    try {
      await fetch("/api/presence/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: myStatus, statusText: myStatusText || undefined }),
      });
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }, [myStatus, myStatusText]);

  const filtered = staff
    .filter((s) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        (s.departmentName ?? "").toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const pa = getPresence(a.id);
      const pb = getPresence(b.id);
      const aOnline = pa?.online ?? false;
      const bOnline = pb?.online ?? false;
      if (aOnline !== bOnline) return aOnline ? -1 : 1;
      return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
    });

  const loading = !staffLoaded || !presenceLoaded;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Availability"
        description="See who's online and set your availability status."
      />

      <Card>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={myStatus} onChange={(e) => setMyStatus(e.target.value)}>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </Select>
            <Input
              placeholder="Status message (optional)"
              value={myStatusText}
              onChange={(e) => setMyStatusText(e.target.value)}
              maxLength={120}
            />
            <Button onClick={handleSaveStatus} disabled={saving}>
              {saving ? "Saving..." : "Update"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, department, or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CircleDot className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No team members found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => {
            const p = getPresence(s.id);
            const isMe = s.id === currentStaffId;
            return (
              <Card key={s.id}>
                <CardContent className="flex items-center gap-3 py-3">
                  <div className="relative">
                    <Avatar
                      src={s.avatarUrl}
                      fallback={`${s.firstName} ${s.lastName}`}
                      size="md"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5">
                      <PresenceDot
                        online={p?.online ?? false}
                        status={p?.status ?? "active"}
                      />
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {s.firstName} {s.lastName}
                      {isMe && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          You
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s.departmentName ?? s.role.replace("_", " ")}
                    </p>
                    {p?.statusText && (
                      <p className="text-xs text-muted-foreground italic mt-0.5">
                        {p.statusText}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {p?.online ? (
                      <Badge variant="success" className="text-xs">
                        {p.status === "active"
                          ? "Online"
                          : p.status === "busy"
                            ? "Busy"
                            : p.status === "meeting"
                              ? "In Meeting"
                              : "Away"}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Offline
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
