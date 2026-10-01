"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import { PermissionGate } from "@/components/ui/permission-gate";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Inbox, Layers, ShieldCheck, Plus, Check, X, RefreshCw } from "lucide-react";
import { ensureArray, formatDate, formatDateTime } from "@/lib/utils";
import { formatCurrency } from "@/lib/finance/format";

type PurchaseRequest = {
  id: string;
  requesterId: string;
  itemName: string;
  quantity: number;
  estimatedCost: number;
  justification: string | null;
  status: string;
  notes: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ApprovalTier = {
  id: string;
  institutionId: string;
  tierLevel: number;
  name: string;
  minAmount: number;
  maxAmount: number | null;
  requiredRole: string;
  requiresSequentialApproval: boolean;
  autoEscalateHours: number;
};

type ApprovalLog = {
  id: string;
  purchaseRequestId: string;
  tierLevel: number;
  approverId: string;
  action: string;
  comments: string | null;
  merkleAuditHash: string;
  prevAuditHash: string | null;
  actionTimestamp: string;
};

type Verification = {
  isValid: boolean;
  tamperedAt?: string;
  totalLogs: number;
};

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }> = {
  pending_hod: { label: "Pending HOD", variant: "warning" },
  pending_accounts: { label: "Pending Accounts", variant: "warning" },
  pending_purchase: { label: "Pending Purchase", variant: "info" },
  pending_approval: { label: "Pending Approval", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "destructive" },
  ordered: { label: "Ordered", variant: "info" },
  received: { label: "Received", variant: "success" },
};

const PENDING_STATUSES = ["pending_hod", "pending_accounts", "pending_purchase", "pending_approval"];

export default function FinancePurchasesPage() {
  const [purchases, setPurchases] = useState<PurchaseRequest[]>([]);
  const [tiers, setTiers] = useState<ApprovalTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("pending");

  const [actionTarget, setActionTarget] = useState<PurchaseRequest | null>(null);
  const [actionForm, setActionForm] = useState({ action: "approved", comments: "", tierLevel: "1" });
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [tierSubmitting, setTierSubmitting] = useState(false);
  const [tierForm, setTierForm] = useState({
    tierLevel: "1",
    name: "",
    minAmount: "",
    maxAmount: "",
    requiredRole: "hod",
    autoEscalateHours: "48",
  });

  const [verifyId, setVerifyId] = useState("");
  const [verification, setVerification] = useState<{ verification: Verification; logs: ApprovalLog[] } | null>(null);
  const [verifying, setVerifying] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [purRes, tierRes] = await Promise.all([
        fetch("/api/purchases?viewAll=true&limit=200"),
        fetch("/api/finance/purchases/tiers"),
      ]);
      if (purRes.ok) {
        const purData = await purRes.json();
        setPurchases(ensureArray<PurchaseRequest>(purData.purchases));
      } else {
        throw new Error("Failed to load purchase requests");
      }
      if (tierRes.ok) {
        const tierData = await tierRes.json();
        setTiers(ensureArray<ApprovalTier>(tierData.tiers));
      } else {
        setTiers([]);
      }
    } catch (err: any) {
      setError(err.message || "Could not load procurement workflow data");
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData().catch(() => toast.error("Failed to load purchase approvals"));
  }, [fetchData]);

  const filteredPurchases = purchases.filter((p) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "pending") return PENDING_STATUSES.includes(p.status) || p.status.startsWith("pending_");
    return p.status === statusFilter;
  });

  async function handleApprovalAction(e: React.FormEvent) {
    e.preventDefault();
    if (!actionTarget) return;
    setActionSubmitting(true);
    try {
      const res = await fetch("/api/finance/purchases/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseRequestId: actionTarget.id,
          action: actionForm.action,
          comments: actionForm.comments || undefined,
          tierLevel: parseInt(actionForm.tierLevel, 10) || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Approval action failed");

      toast.success(`Request ${actionForm.action} — Merkle audit hash recorded`, {
        description: data.approval?.merkleAuditHash?.slice(0, 16),
      });
      setActionTarget(null);
      setActionForm({ action: "approved", comments: "", tierLevel: "1" });
      fetchData().catch(() => toast.error("Failed to refresh approval inbox"));
    } catch (err: any) {
      toast.error(err.message || "Approval action failed");
    } finally {
      setActionSubmitting(false);
    }
  }

  async function handleCreateTier(e: React.FormEvent) {
    e.preventDefault();
    if (!tierForm.name) {
      toast.error("Tier name is required");
      return;
    }
    setTierSubmitting(true);
    try {
      const res = await fetch("/api/finance/purchases/tiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tierLevel: parseInt(tierForm.tierLevel, 10),
          name: tierForm.name,
          minAmount: parseFloat(tierForm.minAmount || "0"),
          maxAmount: tierForm.maxAmount ? parseFloat(tierForm.maxAmount) : undefined,
          requiredRole: tierForm.requiredRole,
          autoEscalateHours: parseInt(tierForm.autoEscalateHours, 10) || 48,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create approval tier");
      toast.success("Approval tier created");
      setTierDialogOpen(false);
      setTierForm({ tierLevel: "1", name: "", minAmount: "", maxAmount: "", requiredRole: "hod", autoEscalateHours: "48" });
      fetchData().catch(() => toast.error("Failed to refresh tiers"));
    } catch (err: any) {
      toast.error(err.message || "Failed to create approval tier");
    } finally {
      setTierSubmitting(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!verifyId) {
      toast.error("Enter a purchase request ID");
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch(`/api/finance/purchases/approvals/${verifyId}/verify`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      setVerification(data);
    } catch (err: any) {
      toast.error(err.message || "Verification failed");
      setVerification(null);
    } finally {
      setVerifying(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6 lg:p-8">
        <Skeleton className="h-9 w-80" />
        <Skeleton className="h-4 w-96" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  const pendingCount = purchases.filter((p) => PENDING_STATUSES.includes(p.status) || p.status.startsWith("pending_")).length;
  const approvedCount = purchases.filter((p) => p.status === "approved").length;
  const rejectedCount = purchases.filter((p) => p.status === "rejected").length;

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Multi-Stage Purchase Approvals"
        description="Role-tiered approval inbox, dynamic workflow tiers, and cryptographic Merkle audit verification."
        actions={
          <Button variant="outline" onClick={() => fetchData()} className="gap-2" disabled={loading}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        }
      />

      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Awaiting Approval</div>
            <div className="mt-1 text-2xl font-bold text-warning">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Approved</div>
            <div className="mt-1 text-2xl font-bold text-success">{approvedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Rejected</div>
            <div className="mt-1 text-2xl font-bold text-destructive">{rejectedCount}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="inbox">
        <TabsList>
          <TabsTrigger value="inbox">Approval Inbox</TabsTrigger>
          <TabsTrigger value="tiers">Workflow Tiers</TabsTrigger>
          <TabsTrigger value="audit">Audit Verification</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Inbox className="h-4 w-4" /> Approval Inbox
              </CardTitle>
              <CardDescription>Review requests routed to your approval tier.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <Label htmlFor="status-filter" className="text-muted-foreground">
                  Status
                </Label>
                <Select
                  id="status-filter"
                  className="w-48"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <SelectItem value="pending">All Pending</SelectItem>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending_hod">Pending HOD</SelectItem>
                  <SelectItem value="pending_accounts">Pending Accounts</SelectItem>
                  <SelectItem value="pending_purchase">Pending Purchase</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </Select>
              </div>

              {filteredPurchases.length === 0 ? (
                <EmptyState
                  icon={<Inbox className="h-12 w-12 text-muted-foreground" />}
                  title="Inbox Clear"
                  description="No purchase requests match the current status filter."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Est. Cost</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPurchases.map((p) => {
                      const badge = STATUS_BADGES[p.status] || { label: p.status, variant: "secondary" as const };
                      const canAct =
                        PENDING_STATUSES.includes(p.status) || p.status.startsWith("pending_") || p.status.startsWith("escalated_");
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">
                            {p.itemName}
                            <div className="text-xs text-muted-foreground font-mono">{p.id.slice(0, 12)}</div>
                          </TableCell>
                          <TableCell>{p.quantity}</TableCell>
                          <TableCell>{formatCurrency(p.estimatedCost)}</TableCell>
                          <TableCell>
                            <Badge variant={badge.variant}>{badge.label}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(p.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <PermissionGate anyOf={["finance:purchases:approve:tier1", "finance:purchases:approve:tier2", "finance:purchases:approve:final"]} fallback={null}>
                              {canAct && (
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    className="gap-1 text-success"
                                    onClick={() => {
                                      setActionTarget(p);
                                      setActionForm({ action: "approved", comments: "", tierLevel: "1" });
                                    }}
                                  >
                                    <Check className="h-3 w-3" /> Approve
                                  </Button>
                                  <Button
                                    size="xs"
                                    variant="destructive"
                                    className="gap-1"
                                    onClick={() => {
                                      setActionTarget(p);
                                      setActionForm({ action: "rejected", comments: "", tierLevel: "1" });
                                    }}
                                  >
                                    <X className="h-3 w-3" /> Reject
                                  </Button>
                                </div>
                              )}
                            </PermissionGate>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tiers">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-4 w-4" /> Approval Tiers
                  </CardTitle>
                  <CardDescription>
                    Sequential, amount-bounded approval stages with automatic escalation timers.
                  </CardDescription>
                </div>
                <PermissionGate permission="finance:purchases:approve:final" fallback={null}>
                  <Button size="sm" className="gap-2" onClick={() => setTierDialogOpen(true)}>
                    <Plus className="h-4 w-4" /> New Tier
                  </Button>
                </PermissionGate>
              </div>
            </CardHeader>
            <CardContent>
              {tiers.length === 0 ? (
                <EmptyState
                  icon={<Layers className="h-12 w-12 text-muted-foreground" />}
                  title="No Approval Tiers"
                  description="Configure amount-based tiers so purchase requests route to the correct approver automatically."
                  action={{ label: "Create First Tier", onClick: () => setTierDialogOpen(true) }}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tier</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Amount Range</TableHead>
                      <TableHead>Required Role</TableHead>
                      <TableHead>Sequential</TableHead>
                      <TableHead>Auto Escalate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tiers.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">Tier {t.tierLevel}</TableCell>
                        <TableCell>{t.name}</TableCell>
                        <TableCell>
                          {formatCurrency(t.minAmount)} — {t.maxAmount == null ? "∞" : formatCurrency(t.maxAmount)}
                        </TableCell>
                        <TableCell className="capitalize">{t.requiredRole}</TableCell>
                        <TableCell>
                          <Badge variant={t.requiresSequentialApproval ? "info" : "secondary"}>
                            {t.requiresSequentialApproval ? "Sequential" : "Parallel"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{t.autoEscalateHours}h</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> Merkle Audit Verification
              </CardTitle>
              <CardDescription>
                Recomputes the SHA-256 hash chain across every recorded approval decision for a request.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerify} className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[280px] space-y-1.5">
                  <Label htmlFor="verify-id">Purchase Request ID</Label>
                  <Input
                    id="verify-id"
                    placeholder="Paste a purchase request ID"
                    value={verifyId}
                    onChange={(e) => setVerifyId(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={verifying} className="gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  {verifying ? "Verifying..." : "Verify Chain"}
                </Button>
              </form>

              {verification && (
                <div className="mt-6 space-y-4">
                  <Alert variant={verification.verification.isValid ? "success" : "error"}>
                    {verification.verification.isValid
                      ? `Chain intact — ${verification.verification.totalLogs} audit log(s) verified, no tampering detected.`
                      : `Tampering detected at log ${verification.verification.tamperedAt}.`}
                  </Alert>

                  {verification.logs.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tier</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Approver</TableHead>
                          <TableHead>Comments</TableHead>
                          <TableHead>Timestamp</TableHead>
                          <TableHead>Merkle Hash</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {verification.logs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>Tier {log.tierLevel}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  log.action === "approved"
                                    ? "success"
                                    : log.action === "rejected"
                                    ? "destructive"
                                    : "info"
                                }
                              >
                                {log.action}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{log.approverId.slice(0, 12)}</TableCell>
                            <TableCell className="text-muted-foreground max-w-[200px] truncate">
                              {log.comments || "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{formatDateTime(log.actionTimestamp)}</TableCell>
                            <TableCell className="font-mono text-xs">{log.merkleAuditHash.slice(0, 16)}…</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Approval Action Dialog */}
      <Dialog open={!!actionTarget} onOpenChange={(open) => !open && setActionTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionForm.action === "rejected" ? "Reject" : "Approve"} Purchase Request
            </DialogTitle>
          </DialogHeader>
          {actionTarget && (
            <form onSubmit={handleApprovalAction} className="space-y-4 pt-2">
              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                <div className="font-medium">{actionTarget.itemName}</div>
                <div className="text-muted-foreground">
                  {actionTarget.quantity} unit(s) · {formatCurrency(actionTarget.estimatedCost)}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="action-tier">Approval Tier *</Label>
                <Select
                  id="action-tier"
                  value={actionForm.tierLevel}
                  onChange={(e) => setActionForm({ ...actionForm, tierLevel: e.target.value })}
                >
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <SelectItem key={lvl} value={String(lvl)}>
                      Tier {lvl}
                    </SelectItem>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="action-comments">
                  Comments {actionForm.action === "rejected" ? "*" : "(optional)"}
                </Label>
                <Textarea
                  id="action-comments"
                  rows={3}
                  placeholder={
                    actionForm.action === "rejected"
                      ? "Reason for rejection (required)"
                      : "Approval notes"
                  }
                  value={actionForm.comments}
                  onChange={(e) => setActionForm({ ...actionForm, comments: e.target.value })}
                  required={actionForm.action === "rejected"}
                />
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setActionTarget(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant={actionForm.action === "rejected" ? "destructive" : "default"}
                  disabled={actionSubmitting}
                >
                  {actionSubmitting
                    ? "Recording..."
                    : actionForm.action === "rejected"
                    ? "Reject Request"
                    : "Approve Request"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Tier Dialog */}
      <Dialog open={tierDialogOpen} onOpenChange={setTierDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Approval Tier</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTier} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tier-level">Tier Level *</Label>
                <Input
                  id="tier-level"
                  type="number"
                  min="1"
                  max="10"
                  value={tierForm.tierLevel}
                  onChange={(e) => setTierForm({ ...tierForm, tierLevel: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tier-role">Required Role *</Label>
                <Select
                  id="tier-role"
                  value={tierForm.requiredRole}
                  onChange={(e) => setTierForm({ ...tierForm, requiredRole: e.target.value })}
                >
                  {["hod", "principal", "admin", "super_admin", "accounts", "purchase"].map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tier-name">Tier Name *</Label>
              <Input
                id="tier-name"
                placeholder="e.g. Principal Approval"
                value={tierForm.name}
                onChange={(e) => setTierForm({ ...tierForm, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tier-min">Min Amount</Label>
                <Input
                  id="tier-min"
                  type="number"
                  min="0"
                  value={tierForm.minAmount}
                  onChange={(e) => setTierForm({ ...tierForm, minAmount: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tier-max">Max Amount</Label>
                <Input
                  id="tier-max"
                  type="number"
                  min="0"
                  placeholder="∞"
                  value={tierForm.maxAmount}
                  onChange={(e) => setTierForm({ ...tierForm, maxAmount: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tier-escalate">Escalate (h)</Label>
                <Input
                  id="tier-escalate"
                  type="number"
                  min="1"
                  value={tierForm.autoEscalateHours}
                  onChange={(e) => setTierForm({ ...tierForm, autoEscalateHours: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setTierDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={tierSubmitting}>
                {tierSubmitting ? "Saving..." : "Create Tier"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
