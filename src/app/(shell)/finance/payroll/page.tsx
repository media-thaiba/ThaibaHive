"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import { PermissionGate } from "@/components/ui/permission-gate";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Wallet, Users, FileDown, Plus, PlayCircle, CheckCircle2, Ban } from "lucide-react";
import { ensureArray, formatDate } from "@/lib/utils";
import { formatCurrency, fromPercentInput } from "@/lib/finance/format";
import { useStaffList } from "@/lib/hooks/use-staff";

type SalaryStructure = {
  id: string;
  institutionId: string;
  staffId: string;
  baseSalary: number;
  hraAllowance: number;
  daAllowance: number;
  specialAllowance: number;
  pfDeductionRate: number;
  taxBracketCode: string;
  currency: string;
  effectiveDate: string;
  updatedAt: string;
};

type PayrollRecord = {
  id: string;
  institutionId: string;
  staffId: string;
  payPeriodMonth: number;
  payPeriodYear: number;
  grossEarnings: number;
  totalDeductions: number;
  taxDeduction: number;
  netPayable: number;
  status: string;
  paymentReference: string | null;
  disbursedAt: string | null;
  auditHash: string;
  createdAt: string;
};

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }> = {
  draft: { label: "Draft", variant: "secondary" },
  approved: { label: "Approved", variant: "info" },
  disbursed: { label: "Disbursed", variant: "success" },
  voided: { label: "Voided", variant: "destructive" },
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function FinancePayrollPage() {
  const { data: staffList = [], isLoading: staffLoading } = useStaffList();

  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const [period, setPeriod] = useState({
    month: String(now.getMonth() + 1),
    year: String(now.getFullYear()),
  });

  const [structDialogOpen, setStructDialogOpen] = useState(false);
  const [structSubmitting, setStructSubmitting] = useState(false);
  const [structForm, setStructForm] = useState({
    staffId: "",
    baseSalary: "",
    hraAllowance: "",
    daAllowance: "",
    specialAllowance: "",
    pfDeductionRate: "12",
    taxBracketCode: "STANDARD",
    effectiveDate: now.toISOString().slice(0, 10),
  });

  const [generateSubmitting, setGenerateSubmitting] = useState(false);
  const [statusSubmitting, setStatusSubmitting] = useState<string | null>(null);
  const [disburseTarget, setDisburseTarget] = useState<PayrollRecord | null>(null);
  const [disburseRef, setDisburseRef] = useState("");

  const staffNameMap = useMemo(() => {
    const map = new Map<string, string>();
    staffList.forEach((s) => map.set(s.id, `${s.firstName} ${s.lastName}`));
    return map;
  }, [staffList]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = `year=${period.year}&month=${period.month}`;
      const [structRes, recRes] = await Promise.all([
        fetch("/api/finance/payroll/structures"),
        fetch(`/api/finance/payroll/records?${qs}`),
      ]);
      if (structRes.ok) {
        const d = await structRes.json();
        setStructures(ensureArray<SalaryStructure>(d.structures));
      } else {
        throw new Error("Failed to load salary structures");
      }
      if (recRes.ok) {
        const d = await recRes.json();
        setRecords(ensureArray<PayrollRecord>(d.records));
      } else {
        throw new Error("Failed to load payroll records");
      }
    } catch (err: any) {
      setError(err.message || "Could not load payroll data");
      setStructures([]);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [period.month, period.year]);

  useEffect(() => {
    fetchData().catch(() => toast.error("Failed to load payroll data"));
  }, [fetchData]);

  async function handleCreateStructure(e: React.FormEvent) {
    e.preventDefault();
    if (!structForm.staffId || !structForm.baseSalary || !structForm.effectiveDate) {
      toast.error("Staff member, base salary, and effective date are required");
      return;
    }
    setStructSubmitting(true);
    try {
      const res = await fetch("/api/finance/payroll/structures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: structForm.staffId,
          baseSalary: parseFloat(structForm.baseSalary),
          hraAllowance: parseFloat(structForm.hraAllowance || "0"),
          daAllowance: parseFloat(structForm.daAllowance || "0"),
          specialAllowance: parseFloat(structForm.specialAllowance || "0"),
          pfDeductionRate: fromPercentInput(structForm.pfDeductionRate || "12"),
          taxBracketCode: structForm.taxBracketCode,
          effectiveDate: structForm.effectiveDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save salary structure");
      toast.success("Salary structure saved");
      setStructDialogOpen(false);
      setStructForm({
        staffId: "",
        baseSalary: "",
        hraAllowance: "",
        daAllowance: "",
        specialAllowance: "",
        pfDeductionRate: "12",
        taxBracketCode: "STANDARD",
        effectiveDate: now.toISOString().slice(0, 10),
      });
      fetchData().catch(() => toast.error("Failed to refresh payroll data"));
    } catch (err: any) {
      toast.error(err.message || "Failed to save salary structure");
    } finally {
      setStructSubmitting(false);
    }
  }

  async function handleGenerate() {
    setGenerateSubmitting(true);
    try {
      const res = await fetch("/api/finance/payroll/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payPeriodMonth: parseInt(period.month, 10),
          payPeriodYear: parseInt(period.year, 10),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payroll generation failed");
      toast.success(`Generated ${data.count ?? 0} payroll record(s)`, {
        description: `${MONTH_NAMES[parseInt(period.month, 10) - 1]} ${period.year}`,
      });
      fetchData().catch(() => toast.error("Failed to refresh payroll data"));
    } catch (err: any) {
      toast.error(err.message || "Payroll generation failed");
    } finally {
      setGenerateSubmitting(false);
    }
  }

  async function updateStatus(record: PayrollRecord, status: string, paymentReference?: string) {
    setStatusSubmitting(record.id);
    try {
      const res = await fetch(`/api/finance/payroll/records?id=${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, paymentReference }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Status update failed");
      toast.success(`Record marked ${status}`);
      setDisburseTarget(null);
      setDisburseRef("");
      fetchData().catch(() => toast.error("Failed to refresh payroll data"));
    } catch (err: any) {
      toast.error(err.message || "Status update failed");
    } finally {
      setStatusSubmitting(null);
    }
  }

  function handleExport() {
    if (records.length === 0) {
      toast.error("No payroll records to export");
      return;
    }
    const headers = [
      "Record ID", "Staff ID", "Staff Name", "Period", "Gross Earnings",
      "Total Deductions", "Tax Deduction", "Net Payable", "Status", "Payment Reference",
    ];
    const rows = records.map((r) => [
      r.id,
      r.staffId,
      staffNameMap.get(r.staffId) || r.staffId,
      `${MONTH_NAMES[r.payPeriodMonth - 1]} ${r.payPeriodYear}`,
      r.grossEarnings.toFixed(2),
      r.totalDeductions.toFixed(2),
      r.taxDeduction.toFixed(2),
      r.netPayable.toFixed(2),
      r.status,
      r.paymentReference || "",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payroll-${period.year}-${String(period.month).padStart(2, "0")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Payroll CSV exported");
  }

  const totals = useMemo(
    () =>
      records.reduce(
        (acc, r) => ({
          gross: acc.gross + (r.grossEarnings || 0),
          deductions: acc.deductions + (r.totalDeductions || 0),
          net: acc.net + (r.netPayable || 0),
        }),
        { gross: 0, deductions: 0, net: 0 }
      ),
    [records]
  );

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

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Payroll Processing"
        description="Salary structures, statutory deduction computation, period generation, and disbursement tracking."
        actions={
          <PermissionGate permission="finance:payroll:export" fallback={null}>
            <Button variant="outline" onClick={handleExport} className="gap-2" disabled={records.length === 0}>
              <FileDown className="h-4 w-4" /> Export CSV
            </Button>
          </PermissionGate>
        }
      />

      {error && <Alert variant="error">{error}</Alert>}

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pay-month">Pay Period Month</Label>
              <Select id="pay-month" className="w-40" value={period.month} onChange={(e) => setPeriod({ ...period, month: e.target.value })}>
                {MONTH_NAMES.map((m, i) => (
                  <SelectItem key={m} value={String(i + 1)}>
                    {m}
                  </SelectItem>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-year">Year</Label>
              <Input
                id="pay-year"
                type="number"
                className="w-28"
                min="2020"
                max="2100"
                value={period.year}
                onChange={(e) => setPeriod({ ...period, year: e.target.value })}
              />
            </div>
            <PermissionGate permission="finance:payroll:manage" fallback={null}>
              <Button onClick={handleGenerate} disabled={generateSubmitting} className="gap-2">
                <PlayCircle className="h-4 w-4" />
                {generateSubmitting ? "Generating..." : "Generate Payroll"}
              </Button>
            </PermissionGate>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Gross Earnings</div>
            <div className="mt-1 text-2xl font-bold">{formatCurrency(totals.gross)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Deductions</div>
            <div className="mt-1 text-2xl font-bold text-destructive">{formatCurrency(totals.deductions)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Net Payable</div>
            <div className="mt-1 text-2xl font-bold text-success">{formatCurrency(totals.net)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="records">
        <TabsList>
          <TabsTrigger value="records">Payroll Records</TabsTrigger>
          <TabsTrigger value="structures">Salary Structures</TabsTrigger>
        </TabsList>

        <TabsContent value="records">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                {MONTH_NAMES[parseInt(period.month, 10) - 1]} {period.year} Payroll
              </CardTitle>
              <CardDescription>Approve draft records, then disburse with a payment reference.</CardDescription>
            </CardHeader>
            <CardContent>
              {records.length === 0 ? (
                <EmptyState
                  icon={<Wallet className="h-12 w-12 text-muted-foreground" />}
                  title="No Payroll Records"
                  description="Configure salary structures, then generate payroll for this pay period."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>Gross</TableHead>
                      <TableHead>Deductions</TableHead>
                      <TableHead>Tax</TableHead>
                      <TableHead>Net Payable</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((r) => {
                      const badge = STATUS_BADGES[r.status] || { label: r.status, variant: "secondary" as const };
                      const busy = statusSubmitting === r.id;
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">
                            {staffNameMap.get(r.staffId) || r.staffId}
                            <div className="text-xs text-muted-foreground font-mono">{r.staffId.slice(0, 12)}</div>
                          </TableCell>
                          <TableCell>{formatCurrency(r.grossEarnings)}</TableCell>
                          <TableCell>{formatCurrency(r.totalDeductions)}</TableCell>
                          <TableCell>{formatCurrency(r.taxDeduction)}</TableCell>
                          <TableCell className="font-semibold">{formatCurrency(r.netPayable)}</TableCell>
                          <TableCell>
                            <Badge variant={badge.variant}>{badge.label}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <PermissionGate permission="finance:payroll:manage" fallback={null}>
                              <div className="flex justify-end gap-2">
                                {r.status === "draft" && (
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    className="gap-1"
                                    disabled={busy}
                                    onClick={() => updateStatus(r, "approved")}
                                  >
                                    <CheckCircle2 className="h-3 w-3" /> Approve
                                  </Button>
                                )}
                                {r.status === "approved" && (
                                  <Button
                                    size="xs"
                                    className="gap-1"
                                    disabled={busy}
                                    onClick={() => setDisburseTarget(r)}
                                  >
                                    Disburse
                                  </Button>
                                )}
                                {r.status !== "voided" && r.status !== "disbursed" && (
                                  <Button
                                    size="xs"
                                    variant="destructive"
                                    className="gap-1"
                                    disabled={busy}
                                    onClick={() => updateStatus(r, "voided")}
                                  >
                                    <Ban className="h-3 w-3" /> Void
                                  </Button>
                                )}
                              </div>
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

        <TabsContent value="structures">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-4 w-4" /> Salary Structures
                  </CardTitle>
                  <CardDescription>Base pay, allowances, and statutory deduction rates per employee.</CardDescription>
                </div>
                <PermissionGate permission="finance:payroll:manage" fallback={null}>
                  <Button size="sm" className="gap-2" onClick={() => setStructDialogOpen(true)}>
                    <Plus className="h-4 w-4" /> New Structure
                  </Button>
                </PermissionGate>
              </div>
            </CardHeader>
            <CardContent>
              {structures.length === 0 ? (
                <EmptyState
                  icon={<Users className="h-12 w-12 text-muted-foreground" />}
                  title="No Salary Structures"
                  description="Define a salary structure for each employee to enable payroll generation."
                  action={{ label: "Add Structure", onClick: () => setStructDialogOpen(true) }}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>Base Salary</TableHead>
                      <TableHead>HRA</TableHead>
                      <TableHead>DA</TableHead>
                      <TableHead>Special</TableHead>
                      <TableHead>PF Rate</TableHead>
                      <TableHead>Tax Bracket</TableHead>
                      <TableHead>Effective</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {structures.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">
                          {staffNameMap.get(s.staffId) || s.staffId}
                        </TableCell>
                        <TableCell>{formatCurrency(s.baseSalary, s.currency)}</TableCell>
                        <TableCell>{formatCurrency(s.hraAllowance, s.currency)}</TableCell>
                        <TableCell>{formatCurrency(s.daAllowance, s.currency)}</TableCell>
                        <TableCell>{formatCurrency(s.specialAllowance, s.currency)}</TableCell>
                        <TableCell>{(s.pfDeductionRate * 100).toFixed(1)}%</TableCell>
                        <TableCell className="font-mono text-xs">{s.taxBracketCode}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(s.effectiveDate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Salary Structure Dialog */}
      <Dialog open={structDialogOpen} onOpenChange={setStructDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Salary Structure</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateStructure} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="struct-staff">Staff Member *</Label>
              <Select
                id="struct-staff"
                value={structForm.staffId}
                onChange={(e) => setStructForm({ ...structForm, staffId: e.target.value })}
                disabled={staffLoading}
                required
              >
                <SelectItem value="">Select staff</SelectItem>
                {staffList.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.firstName} {s.lastName} ({s.employeeId})
                  </SelectItem>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="struct-base">Base Salary *</Label>
                <Input
                  id="struct-base"
                  type="number"
                  min="0"
                  step="0.01"
                  value={structForm.baseSalary}
                  onChange={(e) => setStructForm({ ...structForm, baseSalary: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="struct-pf">PF Rate %</Label>
                <Input
                  id="struct-pf"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={structForm.pfDeductionRate}
                  onChange={(e) => setStructForm({ ...structForm, pfDeductionRate: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="struct-hra">HRA</Label>
                <Input
                  id="struct-hra"
                  type="number"
                  min="0"
                  value={structForm.hraAllowance}
                  onChange={(e) => setStructForm({ ...structForm, hraAllowance: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="struct-da">DA</Label>
                <Input
                  id="struct-da"
                  type="number"
                  min="0"
                  value={structForm.daAllowance}
                  onChange={(e) => setStructForm({ ...structForm, daAllowance: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="struct-special">Special</Label>
                <Input
                  id="struct-special"
                  type="number"
                  min="0"
                  value={structForm.specialAllowance}
                  onChange={(e) => setStructForm({ ...structForm, specialAllowance: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="struct-bracket">Tax Bracket</Label>
                <Select
                  id="struct-bracket"
                  value={structForm.taxBracketCode}
                  onChange={(e) => setStructForm({ ...structForm, taxBracketCode: e.target.value })}
                >
                  {["STANDARD", "SENIOR_CITIZEN", "SUPER_SENIOR", "BUSINESS"].map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="struct-effective">Effective Date *</Label>
                <Input
                  id="struct-effective"
                  type="date"
                  value={structForm.effectiveDate}
                  onChange={(e) => setStructForm({ ...structForm, effectiveDate: e.target.value })}
                  required
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setStructDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={structSubmitting}>
                {structSubmitting ? "Saving..." : "Save Structure"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Disburse Dialog */}
      <Dialog open={!!disburseTarget} onOpenChange={(open) => !open && setDisburseTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Disburse Payroll</DialogTitle>
          </DialogHeader>
          {disburseTarget && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!disburseRef.trim()) {
                  toast.error("Payment reference is required");
                  return;
                }
                updateStatus(disburseTarget, "disbursed", disburseRef.trim());
              }}
              className="space-y-4 pt-2"
            >
              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                <div className="font-medium">{staffNameMap.get(disburseTarget.staffId) || disburseTarget.staffId}</div>
                <div className="text-muted-foreground">
                  Net payable {formatCurrency(disburseTarget.netPayable)}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="disburse-ref">Payment Reference *</Label>
                <Input
                  id="disburse-ref"
                  placeholder="e.g. NEFT-TX-20261001-9988"
                  value={disburseRef}
                  onChange={(e) => setDisburseRef(e.target.value)}
                  required
                />
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setDisburseTarget(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={statusSubmitting === disburseTarget.id}>
                  {statusSubmitting === disburseTarget.id ? "Processing..." : "Confirm Disbursement"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
