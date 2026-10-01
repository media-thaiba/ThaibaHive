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
import { Landmark, Percent, Plus, Calculator, RefreshCw } from "lucide-react";
import { ensureArray, formatDate } from "@/lib/utils";
import { formatCurrency, formatRate, fromPercentInput, toPercentInput } from "@/lib/finance/format";

type TaxJurisdiction = {
  id: string;
  countryCode: string;
  regionCode: string;
  jurisdictionName: string;
  defaultTaxRate: number;
  taxCode: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
};

type TaxOverride = {
  id: string;
  institutionId: string;
  jurisdictionId: string;
  category: string;
  overrideRate: number;
  exemptionReason: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  createdAt: string;
};

type TaxCalculation = {
  baseAmount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  jurisdictionCode?: string;
  isOverrideApplied: boolean;
  overrideReason?: string;
};

const TAX_CATEGORIES = ["tuition", "hostel", "transport", "supplies", "services", "general"] as const;

export default function FinanceTaxPage() {
  const [jurisdictions, setJurisdictions] = useState<TaxJurisdiction[]>([]);
  const [overrides, setOverrides] = useState<TaxOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [jurDialogOpen, setJurDialogOpen] = useState(false);
  const [ovrDialogOpen, setOvrDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [jurForm, setJurForm] = useState({
    countryCode: "IN",
    regionCode: "",
    jurisdictionName: "",
    defaultTaxRate: "",
    taxCode: "",
    description: "",
  });

  const [ovrForm, setOvrForm] = useState({
    jurisdictionId: "",
    category: "tuition",
    overrideRate: "",
    exemptionReason: "",
    effectiveFrom: "",
    effectiveTo: "",
  });

  const [calcForm, setCalcForm] = useState({
    amount: "",
    category: "general",
    jurisdictionId: "",
    asOfDate: "",
  });
  const [calculation, setCalculation] = useState<TaxCalculation | null>(null);
  const [calculating, setCalculating] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [jurRes, ovrRes] = await Promise.all([
        fetch("/api/finance/tax-rates/jurisdictions"),
        fetch("/api/finance/tax-rates/overrides"),
      ]);
      if (!jurRes.ok) throw new Error("Failed to load tax jurisdictions");
      const jurData = await jurRes.json();
      setJurisdictions(ensureArray<TaxJurisdiction>(jurData.jurisdictions));

      if (ovrRes.ok) {
        const ovrData = await ovrRes.json();
        setOverrides(ensureArray<TaxOverride>(ovrData.overrides));
      } else {
        setOverrides([]);
      }
    } catch (err: any) {
      setError(err.message || "Could not load tax configuration");
      setJurisdictions([]);
      setOverrides([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData().catch(() => toast.error("Failed to load tax configuration"));
  }, [fetchData]);

  async function handleCreateJurisdiction(e: React.FormEvent) {
    e.preventDefault();
    if (!jurForm.regionCode || !jurForm.jurisdictionName || !jurForm.taxCode) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/finance/tax-rates/jurisdictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countryCode: jurForm.countryCode,
          regionCode: jurForm.regionCode,
          jurisdictionName: jurForm.jurisdictionName,
          defaultTaxRate: fromPercentInput(jurForm.defaultTaxRate || "0"),
          taxCode: jurForm.taxCode,
          description: jurForm.description || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create jurisdiction");
      toast.success("Tax jurisdiction created");
      setJurDialogOpen(false);
      setJurForm({ countryCode: "IN", regionCode: "", jurisdictionName: "", defaultTaxRate: "", taxCode: "", description: "" });
      fetchData().catch(() => toast.error("Failed to refresh tax configuration"));
    } catch (err: any) {
      toast.error(err.message || "Failed to create jurisdiction");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateOverride(e: React.FormEvent) {
    e.preventDefault();
    if (!ovrForm.jurisdictionId || !ovrForm.overrideRate || !ovrForm.effectiveFrom) {
      toast.error("Jurisdiction, override rate, and effective date are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/finance/tax-rates/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jurisdictionId: ovrForm.jurisdictionId,
          category: ovrForm.category,
          overrideRate: fromPercentInput(ovrForm.overrideRate),
          exemptionReason: ovrForm.exemptionReason || undefined,
          effectiveFrom: ovrForm.effectiveFrom,
          effectiveTo: ovrForm.effectiveTo || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create override");
      toast.success("Institution tax override created");
      setOvrDialogOpen(false);
      setOvrForm({ jurisdictionId: "", category: "tuition", overrideRate: "", exemptionReason: "", effectiveFrom: "", effectiveTo: "" });
      fetchData().catch(() => toast.error("Failed to refresh tax configuration"));
    } catch (err: any) {
      toast.error(err.message || "Failed to create override");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCalculate(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(calcForm.amount);
    if (Number.isNaN(amount) || amount < 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setCalculating(true);
    try {
      const res = await fetch("/api/finance/tax-rates/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          category: calcForm.category,
          jurisdictionId: calcForm.jurisdictionId || undefined,
          asOfDate: calcForm.asOfDate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Tax calculation failed");
      setCalculation(data.calculation as TaxCalculation);
    } catch (err: any) {
      toast.error(err.message || "Tax calculation failed");
      setCalculation(null);
    } finally {
      setCalculating(false);
    }
  }

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
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Tax Rate Management"
        description="Jurisdiction tax matrix, institution-specific rate overrides, and effective-date aware calculations."
        actions={
          <PermissionGate permission="finance:tax:manage" fallback={null}>
            <Button onClick={() => setJurDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> New Jurisdiction
            </Button>
          </PermissionGate>
        }
      />

      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Jurisdictions</div>
            <div className="mt-1 text-2xl font-bold">{jurisdictions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Active Overrides</div>
            <div className="mt-1 text-2xl font-bold">{overrides.filter((o) => o.isActive).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Categories Covered</div>
            <div className="mt-1 text-2xl font-bold">
              {new Set(overrides.map((o) => o.category)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="jurisdictions">
        <TabsList>
          <TabsTrigger value="jurisdictions">Jurisdictions</TabsTrigger>
          <TabsTrigger value="overrides">Institution Overrides</TabsTrigger>
          <TabsTrigger value="calculator">Tax Calculator</TabsTrigger>
        </TabsList>

        <TabsContent value="jurisdictions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Landmark className="h-4 w-4" /> Tax Jurisdictions
              </CardTitle>
              <CardDescription>Base statutory rates by country, region, and tax code.</CardDescription>
            </CardHeader>
            <CardContent>
              {jurisdictions.length === 0 ? (
                <EmptyState
                  icon={<Landmark className="h-12 w-12 text-muted-foreground" />}
                  title="No Tax Jurisdictions"
                  description="Define a jurisdiction to establish a default statutory tax rate for calculations."
                  action={{
                    label: "Add Jurisdiction",
                    onClick: () => setJurDialogOpen(true),
                  }}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Jurisdiction</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead>Tax Code</TableHead>
                      <TableHead>Default Rate</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jurisdictions.map((j) => (
                      <TableRow key={j.id}>
                        <TableCell className="font-medium">{j.jurisdictionName}</TableCell>
                        <TableCell>
                          {j.countryCode} / {j.regionCode}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{j.taxCode}</TableCell>
                        <TableCell>{formatRate(j.defaultTaxRate)}</TableCell>
                        <TableCell>
                          <Badge variant={j.isActive ? "success" : "secondary"}>
                            {j.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(j.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overrides">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-4 w-4" /> Institution Rate Overrides
              </CardTitle>
              <CardDescription>
                Institution-scoped exemptions and reduced rates that take precedence over jurisdiction defaults.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex justify-end">
                <PermissionGate permission="finance:tax:override" fallback={null}>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => setOvrDialogOpen(true)}>
                    <Plus className="h-4 w-4" /> New Override
                  </Button>
                </PermissionGate>
              </div>

              {overrides.length === 0 ? (
                <EmptyState
                  icon={<Percent className="h-12 w-12 text-muted-foreground" />}
                  title="No Rate Overrides"
                  description="Create an institution override to apply an exemption or reduced rate for a specific fee category."
                  action={{
                    label: "Add Override",
                    onClick: () => setOvrDialogOpen(true),
                  }}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Override Rate</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Effective From</TableHead>
                      <TableHead>Effective To</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overrides.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="capitalize font-medium">{o.category}</TableCell>
                        <TableCell>{formatRate(o.overrideRate)}</TableCell>
                        <TableCell className="text-muted-foreground max-w-[240px] truncate">
                          {o.exemptionReason || "—"}
                        </TableCell>
                        <TableCell>{formatDate(o.effectiveFrom)}</TableCell>
                        <TableCell>{o.effectiveTo ? formatDate(o.effectiveTo) : "Open-ended"}</TableCell>
                        <TableCell>
                          <Badge variant={o.isActive ? "success" : "secondary"}>
                            {o.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calculator">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-4 w-4" /> Effective Tax Calculator
              </CardTitle>
              <CardDescription>
                Resolves institution overrides first, then falls back to the jurisdiction default rate for the given date.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCalculate} className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-1.5">
                  <Label htmlFor="calc-amount">Base Amount *</Label>
                  <Input
                    id="calc-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="10000"
                    value={calcForm.amount}
                    onChange={(e) => setCalcForm({ ...calcForm, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="calc-category">Category</Label>
                  <Select
                    id="calc-category"
                    value={calcForm.category}
                    onChange={(e) => setCalcForm({ ...calcForm, category: e.target.value })}
                  >
                    {TAX_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="calc-jurisdiction">Jurisdiction</Label>
                  <Select
                    id="calc-jurisdiction"
                    value={calcForm.jurisdictionId}
                    onChange={(e) => setCalcForm({ ...calcForm, jurisdictionId: e.target.value })}
                  >
                    <SelectItem value="">Auto-resolve</SelectItem>
                    {jurisdictions.map((j) => (
                      <SelectItem key={j.id} value={j.id}>
                        {j.jurisdictionName}
                      </SelectItem>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="calc-date">As Of Date</Label>
                  <Input
                    id="calc-date"
                    type="date"
                    value={calcForm.asOfDate}
                    onChange={(e) => setCalcForm({ ...calcForm, asOfDate: e.target.value })}
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit" disabled={calculating} className="w-full gap-2">
                    <Calculator className="h-4 w-4" />
                    {calculating ? "Calculating..." : "Calculate"}
                  </Button>
                </div>
              </form>

              {calculation && (
                <div className="mt-6 grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-sm text-muted-foreground">Base Amount</div>
                      <div className="mt-1 text-xl font-semibold">{formatCurrency(calculation.baseAmount)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-sm text-muted-foreground">Applied Rate</div>
                      <div className="mt-1 text-xl font-semibold">{formatRate(calculation.taxRate)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-sm text-muted-foreground">Tax Amount</div>
                      <div className="mt-1 text-xl font-semibold">{formatCurrency(calculation.taxAmount)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-sm text-muted-foreground">Total Payable</div>
                      <div className="mt-1 text-xl font-semibold">{formatCurrency(calculation.totalAmount)}</div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {calculation && (
                <Alert variant={calculation.isOverrideApplied ? "warning" : "info"} className="mt-4">
                  {calculation.isOverrideApplied
                    ? `Institution override applied${calculation.overrideReason ? ` — ${calculation.overrideReason}` : ""}.`
                    : `Jurisdiction default rate applied${calculation.jurisdictionCode ? ` (${calculation.jurisdictionCode})` : ""}.`}
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Jurisdiction Dialog */}
      <Dialog open={jurDialogOpen} onOpenChange={setJurDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Tax Jurisdiction</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateJurisdiction} className="space-y-4 pt-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="jur-country">Country *</Label>
                <Input
                  id="jur-country"
                  maxLength={3}
                  value={jurForm.countryCode}
                  onChange={(e) => setJurForm({ ...jurForm, countryCode: e.target.value.toUpperCase() })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="jur-region">Region *</Label>
                <Input
                  id="jur-region"
                  placeholder="KL"
                  value={jurForm.regionCode}
                  onChange={(e) => setJurForm({ ...jurForm, regionCode: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="jur-rate">Rate % *</Label>
                <Input
                  id="jur-rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="18"
                  value={jurForm.defaultTaxRate}
                  onChange={(e) => setJurForm({ ...jurForm, defaultTaxRate: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="jur-name">Jurisdiction Name *</Label>
              <Input
                id="jur-name"
                placeholder="e.g. Kerala GST"
                value={jurForm.jurisdictionName}
                onChange={(e) => setJurForm({ ...jurForm, jurisdictionName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="jur-code">Tax Code *</Label>
              <Input
                id="jur-code"
                placeholder="e.g. GST_18"
                value={jurForm.taxCode}
                onChange={(e) => setJurForm({ ...jurForm, taxCode: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="jur-desc">Description</Label>
              <Textarea
                id="jur-desc"
                rows={2}
                value={jurForm.description}
                onChange={(e) => setJurForm({ ...jurForm, description: e.target.value })}
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setJurDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Create Jurisdiction"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Override Dialog */}
      <Dialog open={ovrDialogOpen} onOpenChange={setOvrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Institution Rate Override</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateOverride} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="ovr-jurisdiction">Jurisdiction *</Label>
              <Select
                id="ovr-jurisdiction"
                value={ovrForm.jurisdictionId}
                onChange={(e) => setOvrForm({ ...ovrForm, jurisdictionId: e.target.value })}
                required
              >
                <SelectItem value="">Select a jurisdiction</SelectItem>
                {jurisdictions.map((j) => (
                  <SelectItem key={j.id} value={j.id}>
                    {j.jurisdictionName} ({j.taxCode})
                  </SelectItem>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ovr-category">Category *</Label>
                <Select
                  id="ovr-category"
                  value={ovrForm.category}
                  onChange={(e) => setOvrForm({ ...ovrForm, category: e.target.value })}
                >
                  {TAX_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ovr-rate">Override Rate % *</Label>
                <Input
                  id="ovr-rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="0"
                  value={ovrForm.overrideRate}
                  onChange={(e) => setOvrForm({ ...ovrForm, overrideRate: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ovr-from">Effective From *</Label>
                <Input
                  id="ovr-from"
                  type="date"
                  value={ovrForm.effectiveFrom}
                  onChange={(e) => setOvrForm({ ...ovrForm, effectiveFrom: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ovr-to">Effective To</Label>
                <Input
                  id="ovr-to"
                  type="date"
                  value={ovrForm.effectiveTo}
                  onChange={(e) => setOvrForm({ ...ovrForm, effectiveTo: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ovr-reason">Exemption / Override Reason</Label>
              <Textarea
                id="ovr-reason"
                rows={2}
                placeholder="e.g. Educational Exemption Section 12AA"
                value={ovrForm.exemptionReason}
                onChange={(e) => setOvrForm({ ...ovrForm, exemptionReason: e.target.value })}
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setOvrDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Create Override"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
