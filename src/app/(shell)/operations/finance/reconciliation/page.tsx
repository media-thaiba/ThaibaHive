"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import { PermissionGate } from "@/components/ui/permission-gate";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Scale, Plus, RefreshCcw, ArrowLeft, CheckCircle2, AlertTriangle } from "lucide-react";
import { ensureArray, formatDate } from "@/lib/utils";
import { formatCurrency } from "@/lib/finance/format";

type ReconSession = {
  id: string;
  institutionId: string;
  periodStart: string;
  periodEnd: string;
  totalFeeLedgerAmount: number;
  totalExpenseLedgerAmount: number;
  totalBankStatementAmount: number;
  unreconciledVariance: number;
  matchedItemCount: number | null;
  unmatchedItemCount: number | null;
  status: string;
  reconciledById: string | null;
  auditHash: string;
  notes: string | null;
  createdAt: string;
};

type ReconItem = {
  id: string;
  reconciliationId: string;
  sourceType: string;
  sourceReferenceId: string;
  transactionDate: string;
  amount: number;
  matchStatus: string;
  matchedWithId: string | null;
  varianceAmount: number;
  resolutionNotes: string | null;
};

const SESSION_BADGES: Record<string, { label: string; variant: "success" | "destructive" | "secondary" | "info" | "warning" }> = {
  reconciled: { label: "Reconciled", variant: "success" },
  flagged_variance: { label: "Flagged Variance", variant: "destructive" },
  in_progress: { label: "In Progress", variant: "warning" },
  draft: { label: "Draft", variant: "secondary" },
};

const ITEM_BADGES: Record<string, { label: string; variant: "success" | "destructive" | "secondary" | "info" | "warning" }> = {
  matched: { label: "Matched", variant: "success" },
  unmatched: { label: "Unmatched", variant: "warning" },
  manual_override: { label: "Manual Override", variant: "info" },
  variance: { label: "Variance", variant: "destructive" },
};

const SOURCE_LABELS: Record<string, string> = {
  fee_transaction: "Fee Ledger",
  expense_claim: "Expense Ledger",
  bank_statement: "Bank Statement",
};

export default function FinanceReconciliationPage() {
  const [sessions, setSessions] = useState<ReconSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    periodStart: "",
    periodEnd: "",
    notes: "",
    bankEntries: "",
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ session: ReconSession; items: ReconItem[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [matchTarget, setMatchTarget] = useState<ReconItem | null>(null);
  const [matchForm, setMatchForm] = useState({
    matchStatus: "manual_override",
    matchedWithId: "",
    varianceAmount: "0",
    resolutionNotes: "",
  });
  const [matchSubmitting, setMatchSubmitting] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/finance/reconciliation");
      if (!res.ok) throw new Error("Failed to load reconciliation sessions");
      const data = await res.json();
      setSessions(ensureArray<ReconSession>(data.reconciliations));
    } catch (err: any) {
      setError(err.message || "Could not load reconciliation sessions");
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions().catch(() => toast.error("Failed to load reconciliation sessions"));
  }, [fetchSessions]);

  const openDetail = useCallback(async (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);
    try {
      const res = await fetch(`/api/finance/reconciliation/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load reconciliation session");
      setDetail({ session: data.session, items: ensureArray<ReconItem>(data.items) });
    } catch (err: any) {
      setDetailError(err.message || "Could not load reconciliation session");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedId(null);
    setDetail(null);
    setDetailError(null);
  }, []);

  function parseBankEntries(raw: string) {
    const entries: { referenceId: string; transactionDate: string; amount: number; description?: string }[] = [];
    const lines = raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    for (const line of lines) {
      const parts = line.split(",").map((p) => p.trim());
      if (parts.length < 3) {
        throw new Error(`Invalid bank entry "${line}" — use: referenceId, date, amount[, description]`);
      }
      const amount = parseFloat(parts[2]);
      if (Number.isNaN(amount)) {
        throw new Error(`Invalid amount in bank entry "${line}"`);
      }
      entries.push({
        referenceId: parts[0],
        transactionDate: parts[1],
        amount,
        description: parts[3],
      });
    }
    return entries;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.periodStart || !createForm.periodEnd) {
      toast.error("Period start and end are required");
      return;
    }
    setCreating(true);
    try {
      const bankStatementEntries = parseBankEntries(createForm.bankEntries);
      const res = await fetch("/api/finance/reconciliation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodStart: createForm.periodStart,
          periodEnd: createForm.periodEnd,
          bankStatementEntries,
          notes: createForm.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reconciliation failed");
      toast.success(
        data.session?.status === "reconciled" ? "Reconciliation matched cleanly" : "Reconciliation flagged with variance",
        { description: `Variance: ${formatCurrency(data.session?.unreconciledVariance || 0)}` }
      );
      setCreateOpen(false);
      setCreateForm({ periodStart: "", periodEnd: "", notes: "", bankEntries: "" });
      await fetchSessions();
      if (data.session?.id) openDetail(data.session.id);
    } catch (err: any) {
      toast.error(err.message || "Reconciliation failed");
    } finally {
      setCreating(false);
    }
  }

  async function handleMatch(e: React.FormEvent) {
    e.preventDefault();
    if (!matchTarget) return;
    setMatchSubmitting(true);
    try {
      const res = await fetch(`/api/finance/reconciliation/${matchTarget.id}/match`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchStatus: matchForm.matchStatus,
          matchedWithId: matchForm.matchedWithId || undefined,
          varianceAmount: parseFloat(matchForm.varianceAmount || "0"),
          resolutionNotes: matchForm.resolutionNotes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update match");
      toast.success("Item match updated");
      setMatchTarget(null);
      if (selectedId) openDetail(selectedId);
    } catch (err: any) {
      toast.error(err.message || "Failed to update match");
    } finally {
      setMatchSubmitting(false);
    }
  }

  const summary = useMemo(() => {
    if (!detail) return null;
    const s = detail.session;
    const matched = detail.items.filter((i) => i.matchStatus === "matched").length;
    const unmatched = detail.items.filter((i) => i.matchStatus === "unmatched").length;
    const variance = detail.items.filter((i) => i.matchStatus === "variance").length;
    const overrides = detail.items.filter((i) => i.matchStatus === "manual_override").length;
    return {
      fee: s.totalFeeLedgerAmount,
      expense: s.totalExpenseLedgerAmount,
      bank: s.totalBankStatementAmount,
      variance: s.unreconciledVariance,
      matched,
      unmatched,
      varianceCount: variance,
      overrides,
      hasVariance: Math.abs(s.unreconciledVariance || 0) >= 0.01,
    };
  }, [detail]);

  if (loading) {
    return (
      <div className="space-y-6 p-6 lg:p-8">
        <Skeleton className="h-9 w-72" />
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

  if (selectedId) {
    return (
      <div className="space-y-6 p-6 lg:p-8">
        <PageHeader
          title="Reconciliation Report"
          description={
            detail
              ? `${formatDate(detail.session.periodStart)} → ${formatDate(detail.session.periodEnd)}`
              : "3-way reconciliation detail"
          }
          actions={
            <Button variant="outline" onClick={closeDetail} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Sessions
            </Button>
          }
        />

        {detailError && <Alert variant="error">{detailError}</Alert>}
        {detailLoading && <Skeleton className="h-64 w-full rounded-xl" />}

        {detail && summary && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={(SESSION_BADGES[detail.session.status] || { variant: "secondary" as const }).variant}>
                {(SESSION_BADGES[detail.session.status] || { label: detail.session.status }).label}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">Audit: {detail.session.auditHash.slice(0, 16)}…</span>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Fee Ledger</div>
                  <div className="mt-1 text-xl font-bold">{formatCurrency(summary.fee)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Expense Ledger</div>
                  <div className="mt-1 text-xl font-bold">{formatCurrency(summary.expense)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Bank Statement</div>
                  <div className="mt-1 text-xl font-bold">{formatCurrency(summary.bank)}</div>
                </CardContent>
              </Card>
              <Card className={summary.hasVariance ? "border-destructive" : ""}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    {summary.hasVariance ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    )}
                    Unreconciled Variance
                  </div>
                  <div className={`mt-1 text-xl font-bold ${summary.hasVariance ? "text-destructive" : "text-success"}`}>
                    {formatCurrency(summary.variance)}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Match Summary</CardTitle>
                <CardDescription>
                  {summary.matched} matched · {summary.unmatched} unmatched · {summary.varianceCount} variance · {summary.overrides} manual override
                </CardDescription>
              </CardHeader>
              <CardContent>
                {detail.items.length === 0 ? (
                  <EmptyState
                    icon={<Scale className="h-12 w-12 text-muted-foreground" />}
                    title="No Line Items"
                    description="This period contains no ledger or bank statement transactions."
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Matched With</TableHead>
                        <TableHead>Variance</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.items.map((item) => {
                        const badge = ITEM_BADGES[item.matchStatus] || { label: item.matchStatus, variant: "secondary" as const };
                        const negative = item.amount < 0;
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="text-muted-foreground">
                              {SOURCE_LABELS[item.sourceType] || item.sourceType}
                            </TableCell>
                            <TableCell className="font-mono text-xs">{item.sourceReferenceId.slice(0, 16)}</TableCell>
                            <TableCell className="text-muted-foreground">{formatDate(item.transactionDate)}</TableCell>
                            <TableCell className={negative ? "text-destructive" : ""}>{formatCurrency(item.amount)}</TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {item.matchedWithId ? item.matchedWithId.slice(0, 16) : "—"}
                            </TableCell>
                            <TableCell
                              className={
                                item.varianceAmount ? "font-semibold text-destructive" : "text-muted-foreground"
                              }
                            >
                              {formatCurrency(item.varianceAmount || 0)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={badge.variant}>{badge.label}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <PermissionGate permission="finance:reconciliation:execute" fallback={null}>
                                <Button
                                  size="xs"
                                  variant="outline"
                                  onClick={() => {
                                    setMatchTarget(item);
                                    setMatchForm({
                                      matchStatus: item.matchStatus === "matched" ? "manual_override" : "manual_override",
                                      matchedWithId: item.matchedWithId || "",
                                      varianceAmount: String(item.varianceAmount || 0),
                                      resolutionNotes: item.resolutionNotes || "",
                                    });
                                  }}
                                >
                                  Match
                                </Button>
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
          </>
        )}

        <Dialog open={!!matchTarget} onOpenChange={(open) => !open && setMatchTarget(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Manual Match</DialogTitle>
            </DialogHeader>
            {matchTarget && (
              <form onSubmit={handleMatch} className="space-y-4 pt-2">
                <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                  <div className="font-mono text-xs">{matchTarget.sourceReferenceId.slice(0, 24)}</div>
                  <div className="text-muted-foreground">{formatCurrency(matchTarget.amount)}</div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="match-status">Match Status *</Label>
                  <select
                    id="match-status"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    value={matchForm.matchStatus}
                    onChange={(e) => setMatchForm({ ...matchForm, matchStatus: e.target.value })}
                  >
                    <option value="manual_override">Manual Override</option>
                    <option value="matched">Matched</option>
                    <option value="variance">Variance</option>
                    <option value="unmatched">Unmatched</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="match-with">Matched With</Label>
                    <Input
                      id="match-with"
                      placeholder="Bank ref"
                      value={matchForm.matchedWithId}
                      onChange={(e) => setMatchForm({ ...matchForm, matchedWithId: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="match-variance">Variance</Label>
                    <Input
                      id="match-variance"
                      type="number"
                      step="0.01"
                      value={matchForm.varianceAmount}
                      onChange={(e) => setMatchForm({ ...matchForm, varianceAmount: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="match-notes">Resolution Notes</Label>
                  <Textarea
                    id="match-notes"
                    rows={2}
                    value={matchForm.resolutionNotes}
                    onChange={(e) => setMatchForm({ ...matchForm, resolutionNotes: e.target.value })}
                  />
                </div>
                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setMatchTarget(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={matchSubmitting}>
                    {matchSubmitting ? "Saving..." : "Save Match"}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Bank Reconciliation"
        description="3-way reconciliation between the fee ledger, expense ledger, and bank statements with variance flagging."
        actions={
          <PermissionGate permission="finance:reconciliation:execute" fallback={null}>
            <Button className="gap-2" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Run Reconciliation
            </Button>
          </PermissionGate>
        }
      />

      {error && <Alert variant="error">{error}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-4 w-4" /> Reconciliation Sessions
          </CardTitle>
          <CardDescription>Click a session to inspect its line items and resolve unmatched entries.</CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <EmptyState
              icon={<Scale className="h-12 w-12 text-muted-foreground" />}
              title="No Reconciliations Yet"
              description="Run a reconciliation for an accounting period to compare ledgers against a bank statement."
              action={{ label: "Run Reconciliation", onClick: () => setCreateOpen(true) }}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Fee Ledger</TableHead>
                  <TableHead>Expense Ledger</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Variance</TableHead>
                  <TableHead>Matched / Unmatched</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => {
                  const badge = SESSION_BADGES[s.status] || { label: s.status, variant: "secondary" as const };
                  const hasVariance = Math.abs(s.unreconciledVariance || 0) >= 0.01;
                  return (
                    <TableRow
                      key={s.id}
                      className="cursor-pointer"
                      onClick={() => openDetail(s.id).catch(() => toast.error("Failed to load session"))}
                    >
                      <TableCell className="font-medium">
                        {formatDate(s.periodStart)} → {formatDate(s.periodEnd)}
                      </TableCell>
                      <TableCell>{formatCurrency(s.totalFeeLedgerAmount)}</TableCell>
                      <TableCell>{formatCurrency(s.totalExpenseLedgerAmount)}</TableCell>
                      <TableCell>{formatCurrency(s.totalBankStatementAmount)}</TableCell>
                      <TableCell className={hasVariance ? "font-semibold text-destructive" : "text-success"}>
                        {formatCurrency(s.unreconciledVariance)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {s.matchedItemCount ?? 0} / {s.unmatchedItemCount ?? 0}
                      </TableCell>
                      <TableCell>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(s.createdAt)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Run Reconciliation</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="recon-start">Period Start *</Label>
                <Input
                  id="recon-start"
                  type="date"
                  value={createForm.periodStart}
                  onChange={(e) => setCreateForm({ ...createForm, periodStart: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="recon-end">Period End *</Label>
                <Input
                  id="recon-end"
                  type="date"
                  value={createForm.periodEnd}
                  onChange={(e) => setCreateForm({ ...createForm, periodEnd: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="recon-bank">Bank Statement Entries</Label>
              <Textarea
                id="recon-bank"
                rows={6}
                placeholder={"NEFT-001, 2026-10-01, 25000, Fee collection\nUPI-992, 2026-10-05, 8000, Lab fee"}
                value={createForm.bankEntries}
                onChange={(e) => setCreateForm({ ...createForm, bankEntries: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                One entry per line: <code>referenceId, transactionDate, amount[, description]</code>. Leave empty to
                reconcile ledgers only.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="recon-notes">Notes</Label>
              <Textarea
                id="recon-notes"
                rows={2}
                value={createForm.notes}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating} className="gap-2">
                <RefreshCcw className="h-4 w-4" />
                {creating ? "Reconciling..." : "Reconcile"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
