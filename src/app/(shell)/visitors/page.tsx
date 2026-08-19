"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { ExportButton } from "@/components/export-button";
import { useDebounce } from "@/hooks/use-debounce";
import { ensureArray } from "@/lib/utils";
import { api } from "@/lib/api/client";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  Search,
  QrCode,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Visitor, StaffMember, VisitorStats, FilterTab } from "./_components/types";
import { VisitorPassModal } from "./_components/visitor-pass-modal";
import { RegisterVisitorModal } from "./_components/register-modal";
import { VisitorTable } from "./_components/visitor-table";

function MetricCard({
  title,
  value,
  icon: Icon,
  color,
  trend,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  trend?: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight mt-1">{value}</p>
            {trend && <p className="text-xs text-success mt-1">{trend}</p>}
          </div>
          <div className={cn("p-3 rounded-xl", color)}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function VisitorsPage() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [stats, setStats] = useState<VisitorStats>({
    checkedIn: 0,
    checkedOut: 0,
    todayVisitors: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [passVisitor, setPassVisitor] = useState<Visitor | null>(null);

  const debouncedSearch = useDebounce(search, 150);

  const fetchVisitors = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (filter !== "all") params.status = filter;
      if (filter === "today") params.date = new Date().toISOString().split("T")[0];

      const res = await api.get<{ visitors: Visitor[] }>("/api/visitors", { params });
      if (res.ok && res.data) {
        setVisitors(ensureArray(res.data.visitors));
      }
    } catch (err) {
      console.error("Failed to fetch visitors:", err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get<VisitorStats>("/api/visitors/stats");
      if (res.ok && res.data) setStats(res.data);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  }, []);

  const fetchStaff = useCallback(async () => {
    try {
      const res = await api.get<{ staff: StaffMember[] }>("/api/staff");
      if (res.ok && res.data) setStaffList(ensureArray(res.data.staff));
    } catch (err) {
      console.error("Failed to fetch staff:", err);
    }
  }, []);

  useEffect(() => {
    fetchVisitors();
    fetchStats();
    fetchStaff();
  }, [fetchVisitors, fetchStats, fetchStaff]);

  useEffect(() => {
    if (debouncedSearch) {
      // Search is handled client-side for now
    }
  }, [debouncedSearch]);

  const filteredVisitors = visitors.filter((v) => {
    const matchesSearch =
      v.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (v.hostStaffName && v.hostStaffName.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
      (v.hostStaffLastName && v.hostStaffLastName.toLowerCase().includes(debouncedSearch.toLowerCase()));
    return matchesSearch;
  });

  const handleRegister = async (data: {
    name: string;
    contact: string;
    idType: string;
    idNumber: string;
    hostStaffId: string;
    purpose: string;
    notes: string;
  }) => {
    setRegisterLoading(true);
    try {
      const res = await api.post<{ visitor: Visitor }>("/api/visitors", {
        name: data.name,
        contact: data.contact || null,
        idType: data.idType || null,
        idNumber: data.idNumber || null,
        hostStaffId: data.hostStaffId || null,
        purpose: data.purpose,
        notes: data.notes || null,
      });

      if (res.ok && res.data) {
        toast.success("Visitor registered and checked in");
        setVisitors((prev) => [res.data!.visitor, ...prev]);
        setStats((prev) => ({
          ...prev,
          checkedIn: prev.checkedIn + 1,
          todayVisitors: prev.todayVisitors + 1,
        }));
      } else {
        toast.error((res.data as { error?: string })?.error || "Failed to register visitor");
      }
    } catch (err) {
      console.error("Register visitor error:", err);
      toast.error("Failed to register visitor");
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleCheckOut = async (id: string) => {
    try {
      const res = await api.patch<{ visitor: Visitor }>(`/api/visitors/${id}`, {
        checkOut: new Date().toISOString(),
        status: "checked_out",
      });

      if (res.ok && res.data) {
        toast.success("Visitor checked out");
        setVisitors((prev) =>
          prev.map((v) => (v.id === id ? res.data!.visitor : v))
        );
        setStats((prev) => ({
          ...prev,
          checkedIn: Math.max(0, prev.checkedIn - 1),
          checkedOut: prev.checkedOut + 1,
        }));
      } else {
        toast.error((res.data as { error?: string })?.error || "Failed to check out visitor");
      }
    } catch (err) {
      console.error("Check out error:", err);
      toast.error("Failed to check out visitor");
    }
  };

  const handleViewPass = (visitor: Visitor) => {
    setPassVisitor(visitor);
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      <PageHeader
        title="Visitor Management"
        description="Manage visitor check-ins, passes, and campus access"
        actions={
          <div className="flex items-center gap-2">
            <ExportButton type="staff" />
            <Button onClick={() => setRegisterOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Register Visitor
            </Button>
            <RegisterVisitorModal
              open={registerOpen}
              onClose={() => setRegisterOpen(false)}
              onSubmit={handleRegister}
              staffList={staffList}
              loading={registerLoading}
            />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Currently On Campus"
          value={stats.checkedIn}
          icon={Users}
          color="bg-primary"
          trend={`${stats.todayVisitors} today`}
        />
        <MetricCard
          title="Checked In Today"
          value={stats.todayVisitors}
          icon={UserPlus}
          color="bg-success"
        />
        <MetricCard
          title="Total Visitors"
          value={stats.checkedIn + stats.checkedOut}
          icon={QrCode}
          color="bg-info"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Visitor Records</CardTitle>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or host..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <div className="flex gap-1 bg-muted p-1 rounded-lg" role="tablist">
              {([
                { value: "all", label: "All" },
                { value: "checked_in", label: "On Campus" },
                { value: "checked_out", label: "Checked Out" },
                { value: "today", label: "Today" },
              ] as const).map((tab) => (
                <Button
                  key={tab.value}
                  variant={filter === tab.value ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilter(tab.value)}
                  role="tab"
                  aria-selected={filter === tab.value}
                  className="gap-1"
                >
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <VisitorTable
            visitors={filteredVisitors}
            onCheckOut={handleCheckOut}
            onViewPass={handleViewPass}
            loading={loading}
          />
        </CardContent>
      </Card>

      <VisitorPassModal visitor={passVisitor} onClose={() => setPassVisitor(null)} />
    </div>
  );
}