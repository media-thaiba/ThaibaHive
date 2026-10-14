"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectItem } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Share2,
  Plus,
  RefreshCw,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  CalendarCheck,
  Search,
  ExternalLink,
} from "lucide-react";

interface ResourcePool {
  id: string;
  regionalGroupId: string;
  resourceType: "lab" | "hall" | "bus" | "exam_venue" | "equipment";
  name: string;
  capacity: number;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

interface CrossCampusBooking {
  id: string;
  poolId: string;
  institutionId: string;
  hostInstitutionId: string;
  requestedBy: string;
  title: string;
  startsAt: string;
  endsAt: string;
  status: "requested" | "approved" | "declined" | "expired" | "cancelled";
  decisionBy: string | null;
  decisionAt: string | null;
  decisionReason: string | null;
  expiresAt: string | null;
  createdAt: string;
}

type CrossCampusTab = "pools" | "requests";

export default function CrossCampusFederationPage() {
  const [activeTab, setActiveTab] = useState<CrossCampusTab>("pools");
  const [loading, setLoading] = useState(true);
  const [featureDisabled, setFeatureDisabled] = useState(false);
  const [pools, setPools] = useState<ResourcePool[]>([]);
  const [requests, setRequests] = useState<CrossCampusBooking[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");

  // Create pool state
  const [isCreatePoolOpen, setIsCreatePoolOpen] = useState(false);
  const [newPoolName, setNewPoolName] = useState("");
  const [newPoolType, setNewPoolType] = useState<"lab" | "hall" | "bus" | "exam_venue" | "equipment">("lab");
  const [newPoolCapacity, setNewPoolCapacity] = useState(30);
  const [newPoolRegionalGroup, setNewPoolRegionalGroup] = useState("rg_default");
  const [newPoolDesc, setNewPoolDesc] = useState("");

  // Create booking request state
  const [isCreateBookingOpen, setIsCreateBookingOpen] = useState(false);
  const [selectedPoolId, setSelectedPoolId] = useState("");
  const [bookingHostInst, setBookingHostInst] = useState("inst_alpha");
  const [bookingTitle, setBookingTitle] = useState("");
  const [bookingStart, setBookingStart] = useState("");
  const [bookingEnd, setBookingEnd] = useState("");

  // Check availability widget state
  const [isCheckAvailOpen, setIsCheckAvailOpen] = useState(false);
  const [checkPoolId, setCheckPoolId] = useState("");
  const [checkStart, setCheckStart] = useState("");
  const [checkEnd, setCheckEnd] = useState("");
  const [availResult, setAvailResult] = useState<{ available: boolean; conflictingBookings?: number } | null>(null);
  const [checkingAvail, setCheckingAvail] = useState(false);

  // Decision state
  const [declineBooking, setDeclineBooking] = useState<CrossCampusBooking | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [decisionPendingId, setDecisionPendingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setFeatureDisabled(false);
    try {
      const [poolsRes, reqRes] = await Promise.all([
        fetch("/api/cross-campus/pools"),
        fetch("/api/cross-campus/requests"),
      ]);

      if (poolsRes.status === 403 || reqRes.status === 403) {
        setFeatureDisabled(true);
        setLoading(false);
        return;
      }

      if (poolsRes.ok) {
        const data = await poolsRes.json();
        setPools(Array.isArray(data.pools) ? data.pools : []);
      }
      if (reqRes.ok) {
        const data = await reqRes.json();
        setRequests(Array.isArray(data.requests) ? data.requests : []);
      }
    } catch {
      toast.error("Failed to load cross-campus federation data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData().catch(() => {});
  }, [loadData]);

  const handleCreatePool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPoolName.trim()) {
      toast.error("Resource pool name is required");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/cross-campus/pools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPoolName.trim(),
          resourceType: newPoolType,
          capacity: Number(newPoolCapacity) || 1,
          regionalGroupId: newPoolRegionalGroup.trim(),
          description: newPoolDesc.trim() || null,
          isActive: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to create resource pool");
        return;
      }
      toast.success(`Resource pool "${newPoolName}" created`);
      setIsCreatePoolOpen(false);
      setNewPoolName("");
      setNewPoolDesc("");
      await loadData();
    } catch {
      toast.error("Network error creating resource pool");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateBookingRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoolId || !bookingTitle.trim() || !bookingStart || !bookingEnd) {
      toast.error("All booking request fields are required");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/cross-campus/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poolId: selectedPoolId,
          hostInstitutionId: bookingHostInst,
          title: bookingTitle.trim(),
          startsAt: new Date(bookingStart).toISOString(),
          endsAt: new Date(bookingEnd).toISOString(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to submit booking request");
        return;
      }
      toast.success(`Booking request "${bookingTitle}" submitted`);
      setIsCreateBookingOpen(false);
      setBookingTitle("");
      await loadData();
    } catch {
      toast.error("Network error submitting booking request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (booking: CrossCampusBooking) => {
    setDecisionPendingId(booking.id);
    try {
      const res = await fetch(`/api/cross-campus/requests/${booking.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        toast.error("Allocation Conflict (409): Another approved booking overlaps this time window.");
        return;
      }
      if (!res.ok) {
        toast.error(data.error || "Failed to approve booking");
        return;
      }
      toast.success(`Booking "${booking.title}" confirmed & allocated`);
      await loadData();
    } catch {
      toast.error("Network error approving booking");
    } finally {
      setDecisionPendingId(null);
    }
  };

  const handleDeclineConfirm = async () => {
    if (!declineBooking) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/cross-campus/requests/${declineBooking.id}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decisionReason: declineReason.trim() || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to decline booking");
        return;
      }
      toast.success(`Booking "${declineBooking.title}" declined`);
      setDeclineBooking(null);
      setDeclineReason("");
      await loadData();
    } catch {
      toast.error("Network error declining booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckAvailability = async () => {
    if (!checkPoolId || !checkStart || !checkEnd) {
      toast.error("Select pool and time range");
      return;
    }
    setCheckingAvail(true);
    setAvailResult(null);
    try {
      const s = encodeURIComponent(new Date(checkStart).toISOString());
      const e = encodeURIComponent(new Date(checkEnd).toISOString());
      const res = await fetch(`/api/cross-campus/availability?poolId=${checkPoolId}&startsAt=${s}&endsAt=${e}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to check availability");
        return;
      }
      setAvailResult({
        available: Boolean(data.available),
        conflictingBookings: data.conflicts?.length || 0,
      });
    } catch {
      toast.error("Network error checking availability");
    } finally {
      setCheckingAvail(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (statusFilter === "all") return true;
    return r.status === statusFilter;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Cross-Campus Resource Federation"
        description="Shared regional facilities, specialized laboratories, exam venues & transit fleet scheduling with atomic double-booking protection"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadData().catch(() => {});
              }}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (pools.length > 0 && !checkPoolId) setCheckPoolId(pools[0].id);
                setIsCheckAvailOpen(true);
              }}
              disabled={featureDisabled}
            >
              <Search className="h-4 w-4 mr-1.5" />
              Check Availability
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (pools.length > 0 && !selectedPoolId) setSelectedPoolId(pools[0].id);
                setIsCreateBookingOpen(true);
              }}
              disabled={featureDisabled}
            >
              <CalendarCheck className="h-4 w-4 mr-1.5" />
              Request Booking
            </Button>
            <Button
              size="sm"
              onClick={() => setIsCreatePoolOpen(true)}
              disabled={featureDisabled}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              New Resource Pool
            </Button>
          </div>
        }
      />

      {/* Regional Scope Cross-Link Banner (Risk 9 Mitigation) */}
      <div className="flex items-center justify-between rounded-xl border border-muted bg-muted/30 p-4 text-sm text-muted-foreground">
        <div>
          <span className="font-semibold text-foreground">Regional Operations:</span> Cross-Campus Federation manages shared physical resources, scheduling queues, and allocation conflicts.
        </div>
        <Link
          href="/admin/regional-analytics"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline ml-4 shrink-0"
        >
          View Executive Regional Analytics
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {featureDisabled && (
        <Alert variant="warning">
          <strong>SIS & Cross-Campus Feature Disabled:</strong> The <code>sis_sync</code> feature flag is currently turned off for this tenant. Cross-campus requests and pool management are restricted.
        </Alert>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Shared Resource Pools</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center justify-between">
              {pools.length}
              <Share2 className="h-5 w-5 text-primary opacity-80" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {pools.filter((p) => p.isActive).length} active across regional cluster
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Pending Requests</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center justify-between">
              {requests.filter((r) => r.status === "requested").length}
              <Clock className="h-5 w-5 text-amber-500 opacity-80" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Awaiting host institution approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Confirmed Allocations</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center justify-between">
              {requests.filter((r) => r.status === "approved").length}
              <CheckCircle2 className="h-5 w-5 text-success opacity-80" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Guaranteed by exclusion constraint
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Regional Clusters</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center justify-between">
              {Array.from(new Set(pools.map((p) => p.regionalGroupId))).length || 1}
              <Building2 className="h-5 w-5 text-violet-500 opacity-80" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Federated tenant boundaries intact
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border space-x-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab("pools")}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "pools"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Share2 className="h-4 w-4" />
          Resource Pools ({pools.length})
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "requests"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Calendar className="h-4 w-4" />
          Booking Requests ({requests.length})
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : activeTab === "pools" ? (
        <div>
          {pools.length === 0 ? (
            <EmptyState
              title="No Shared Resource Pools"
              description="Create a federated resource pool (e.g. Robotics Lab, Central Auditorium, Shuttle Bus) to allow cross-campus scheduling."
              action={
                featureDisabled
                  ? undefined
                  : {
                      label: "Create Resource Pool",
                      onClick: () => setIsCreatePoolOpen(true),
                    }
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pools.map((p) => (
                <Card key={p.id} className="relative flex flex-col justify-between">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base font-semibold">{p.name}</CardTitle>
                        <CardDescription className="text-xs">
                          Cluster: <span className="font-mono">{p.regionalGroupId}</span>
                        </CardDescription>
                      </div>
                      <Badge
                        variant={
                          p.resourceType === "lab"
                            ? "default"
                            : p.resourceType === "hall"
                            ? "info"
                            : p.resourceType === "exam_venue"
                            ? "warning"
                            : "secondary"
                        }
                      >
                        {p.resourceType.replace("_", " ").toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <p className="text-muted-foreground line-clamp-2">
                      {p.description || "Shared cross-institution facility available for booking requests."}
                    </p>
                    <div className="flex items-center justify-between text-muted-foreground pt-2 border-t border-border">
                      <span>Max Capacity:</span>
                      <span className="font-semibold text-foreground">{p.capacity} units</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Status:</span>
                      <Badge variant={p.isActive ? "success" : "secondary"}>
                        {p.isActive ? "Active" : "Archived"}
                      </Badge>
                    </div>
                  </CardContent>
                  <div className="p-4 pt-0 border-t border-border flex items-center justify-between gap-2 mt-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs flex-1"
                      onClick={() => {
                        setCheckPoolId(p.id);
                        setIsCheckAvailOpen(true);
                      }}
                    >
                      <Search className="h-3.5 w-3.5 mr-1" />
                      Check Slot
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs flex-1"
                      onClick={() => {
                        setSelectedPoolId(p.id);
                        setIsCreateBookingOpen(true);
                      }}
                      disabled={featureDisabled}
                    >
                      <CalendarCheck className="h-3.5 w-3.5 mr-1" />
                      Book
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Cross-Campus Booking Inbox</CardTitle>
              <CardDescription className="text-xs">
                Review and approve cross-institutional resource reservations with atomic interval guarantees
              </CardDescription>
            </div>
            <div className="w-48">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="requested">Pending (Requested)</SelectItem>
                <SelectItem value="approved">Approved & Confirmed</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredRequests.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No booking requests found matching filter.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking Title</TableHead>
                    <TableHead>Resource Pool</TableHead>
                    <TableHead>Host Campus</TableHead>
                    <TableHead>Time Interval</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((req) => {
                    const pool = pools.find((p) => p.id === req.poolId);
                    const isPending = req.status === "requested";
                    return (
                      <TableRow key={req.id}>
                        <TableCell>
                          <div className="font-medium text-xs text-foreground">{req.title}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            By: {req.requestedBy.substring(0, 12)}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {pool ? pool.name : req.poolId}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {req.hostInstitutionId}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div>{new Date(req.startsAt).toLocaleDateString()}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {new Date(req.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} &ndash;{" "}
                            {new Date(req.endsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              req.status === "approved"
                                ? "success"
                                : req.status === "requested"
                                ? "warning"
                                : req.status === "declined"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {req.status}
                          </Badge>
                          {req.decisionReason && (
                            <div className="text-[11px] text-muted-foreground mt-0.5 max-w-xs truncate" title={req.decisionReason}>
                              {req.decisionReason}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isPending ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs text-success border-success/30 hover:bg-success/10"
                                onClick={() => handleApprove(req)}
                                disabled={decisionPendingId === req.id || featureDisabled}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                                onClick={() => setDeclineBooking(req)}
                                disabled={decisionPendingId === req.id || featureDisabled}
                              >
                                <XCircle className="h-3.5 w-3.5 mr-1" />
                                Decline
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">&mdash;</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Resource Pool Dialog */}
      <Dialog open={isCreatePoolOpen} onOpenChange={setIsCreatePoolOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Federated Resource Pool</DialogTitle>
            <DialogDescription>
              Add a physical asset or facility to the regional pool for cross-campus sharing.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePool} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="poolName">Resource Pool Name</Label>
              <Input
                id="poolName"
                placeholder="e.g. Central Science Complex - BioLab A"
                value={newPoolName}
                onChange={(e) => setNewPoolName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="poolType">Resource Type</Label>
                <Select
                  id="poolType"
                  value={newPoolType}
                  onChange={(e) => setNewPoolType(e.target.value as any)}
                >
                  <SelectItem value="lab">Research Lab</SelectItem>
                  <SelectItem value="hall">Auditorium / Hall</SelectItem>
                  <SelectItem value="exam_venue">Examination Venue</SelectItem>
                  <SelectItem value="bus">Fleet / Bus Transit</SelectItem>
                  <SelectItem value="equipment">Specialized Equipment</SelectItem>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="poolCapacity">Capacity</Label>
                <Input
                  id="poolCapacity"
                  type="number"
                  min="1"
                  max="10000"
                  value={newPoolCapacity}
                  onChange={(e) => setNewPoolCapacity(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="poolGroup">Regional Group ID</Label>
              <Input
                id="poolGroup"
                placeholder="rg_default"
                value={newPoolRegionalGroup}
                onChange={(e) => setNewPoolRegionalGroup(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="poolDesc">Description / Access Notes (Optional)</Label>
              <Input
                id="poolDesc"
                placeholder="Keycard access, projector available, supervisor required."
                value={newPoolDesc}
                onChange={(e) => setNewPoolDesc(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreatePoolOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Pool"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Booking Request Dialog */}
      <Dialog open={isCreateBookingOpen} onOpenChange={setIsCreateBookingOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Cross-Campus Booking</DialogTitle>
            <DialogDescription>
              Submit an allocation reservation for a shared resource pool.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateBookingRequest} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="bookingPool">Target Resource Pool</Label>
              <Select
                id="bookingPool"
                value={selectedPoolId}
                onChange={(e) => setSelectedPoolId(e.target.value)}
                required
              >
                {pools.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.resourceType})
                  </SelectItem>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bookingTitle">Booking Purpose / Event Title</Label>
              <Input
                id="bookingTitle"
                placeholder="e.g. Regional Robotics Workshop Session 1"
                value={bookingTitle}
                onChange={(e) => setBookingTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bookingHost">Host Institution ID</Label>
              <Input
                id="bookingHost"
                placeholder="inst_alpha"
                value={bookingHostInst}
                onChange={(e) => setBookingHostInst(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="bookingStart">Start Date & Time</Label>
                <Input
                  id="bookingStart"
                  type="datetime-local"
                  value={bookingStart}
                  onChange={(e) => setBookingStart(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bookingEnd">End Date & Time</Label>
                <Input
                  id="bookingEnd"
                  type="datetime-local"
                  value={bookingEnd}
                  onChange={(e) => setBookingEnd(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateBookingOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Check Availability Dialog */}
      <Dialog open={isCheckAvailOpen} onOpenChange={setIsCheckAvailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Check Resource Pool Availability</DialogTitle>
            <DialogDescription>
              Verify whether a shared resource slot is free before placing a request.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Target Pool</Label>
              <Select
                value={checkPoolId}
                onChange={(e) => setCheckPoolId(e.target.value)}
              >
                {pools.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.resourceType})
                  </SelectItem>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Slot</Label>
                <Input
                  type="datetime-local"
                  value={checkStart}
                  onChange={(e) => setCheckStart(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>End Slot</Label>
                <Input
                  type="datetime-local"
                  value={checkEnd}
                  onChange={(e) => setCheckEnd(e.target.value)}
                />
              </div>
            </div>

            <Button
              className="w-full"
              variant="outline"
              onClick={handleCheckAvailability}
              disabled={checkingAvail}
            >
              {checkingAvail ? "Checking slot..." : "Query Slot Availability"}
            </Button>

            {availResult !== null && (
              <div className="pt-2">
                {availResult.available ? (
                  <Alert variant="success">
                    <strong>Slot Free:</strong> No conflicting bookings exist for this interval.
                  </Alert>
                ) : (
                  <Alert variant="error">
                    <strong>Slot Conflict:</strong> This pool has {availResult.conflictingBookings} overlapping confirmed booking(s).
                  </Alert>
                )}
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setIsCheckAvailOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Decline Dialog */}
      {declineBooking && (
        <Dialog open={Boolean(declineBooking)} onOpenChange={() => setDeclineBooking(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Decline Booking Request</DialogTitle>
              <DialogDescription>
                Provide an optional reason for declining &ldquo;{declineBooking.title}&rdquo;.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="declineReason">Reason (Optional)</Label>
                <Input
                  id="declineReason"
                  placeholder="e.g. Scheduled maintenance during this window."
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                />
              </div>

              <DialogFooter className="pt-4">
                <Button
                  variant="outline"
                  onClick={() => setDeclineBooking(null)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeclineConfirm}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Declining..." : "Confirm Decline"}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
