"use client";

import { useCallback, useEffect, useState } from "react";
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
  Network,
  Plus,
  Play,
  CheckCircle2,
  RefreshCw,
  Activity,
  Layers,
  Key,
  Database,
  Eye,
} from "lucide-react";

interface SisConnector {
  id: string;
  institutionId: string;
  name: string;
  standard: "edfi" | "oneroster" | "csv";
  baseUrl: string;
  credentialRefMasked: string;
  hasCredential: boolean;
  authMode: string;
  enabled: boolean;
  scheduleCron: string | null;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SisSyncRun {
  id: string;
  institutionId: string;
  connectorId: string;
  standard: string;
  dryRun: boolean;
  status: "pending" | "running" | "completed" | "failed";
  recordsProcessed: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsSkipped: number;
  recordsFailed: number;
  merkleRootHash: string | null;
  errorSummary: string | null;
  startedAt: string;
  completedAt: string | null;
}

interface SisMappingQueueItem {
  id: string;
  institutionId: string;
  connectorId: string;
  standard: string;
  entityType: string;
  externalId: string;
  status: "pending" | "mapped" | "ignored";
  proposedPayloadJson: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

type SisTab = "connectors" | "runs" | "mappings";

export default function SisLmsPage() {
  const [activeTab, setActiveTab] = useState<SisTab>("connectors");
  const [loading, setLoading] = useState(true);
  const [featureDisabled, setFeatureDisabled] = useState(false);
  const [connectors, setConnectors] = useState<SisConnector[]>([]);
  const [runs, setRuns] = useState<SisSyncRun[]>([]);
  const [mappings, setMappings] = useState<SisMappingQueueItem[]>([]);

  // Action states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [resolvingItem, setResolvingItem] = useState<SisMappingQueueItem | null>(null);
  const [resolveAction, setResolveAction] = useState<"map" | "ignore" | "create">("map");
  const [localTable, setLocalTable] = useState("students");
  const [localId, setLocalId] = useState("");

  // New connector form
  const [newName, setNewName] = useState("");
  const [newStandard, setNewStandard] = useState<"edfi" | "oneroster" | "csv">("edfi");
  const [newBaseUrl, setNewBaseUrl] = useState("https://api.ed-fi.org/v5.3/api");
  const [newCredentialRef, setNewCredentialRef] = useState("VAULT_EDFI_DEFAULT");
  const [newAuthMode, setNewAuthMode] = useState("oauth2");
  const [newCron, setNewCron] = useState("0 2 * * *");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setFeatureDisabled(false);
    try {
      const [connRes, runsRes, mapRes] = await Promise.all([
        fetch("/api/sis/connectors"),
        fetch("/api/sis/runs"),
        fetch("/api/sis/mappings?status=pending"),
      ]);

      if (connRes.status === 403 || runsRes.status === 403) {
        setFeatureDisabled(true);
        setLoading(false);
        return;
      }

      if (connRes.ok) {
        const data = await connRes.json();
        setConnectors(Array.isArray(data.connectors) ? data.connectors : []);
      }
      if (runsRes.ok) {
        const data = await runsRes.json();
        setRuns(Array.isArray(data.runs) ? data.runs : []);
      }
      if (mapRes.ok) {
        const data = await mapRes.json();
        setMappings(Array.isArray(data.items) ? data.items : []);
      }
    } catch {
      toast.error("Failed to load SIS data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData().catch(() => {});
  }, [loadData]);

  const handleTestConnectivity = async (connector: SisConnector) => {
    setTestingId(connector.id);
    try {
      const res = await fetch(`/api/sis/connectors/${connector.id}/test`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Connectivity test failed");
        return;
      }
      toast.success(data.message || `Connector ${connector.name} responded OK`);
    } catch {
      toast.error("Network error during test");
    } finally {
      setTestingId(null);
    }
  };

  const handleTriggerSync = async (connector: SisConnector, dryRun = false) => {
    setSyncingId(connector.id);
    try {
      const res = await fetch(`/api/sis/connectors/${connector.id}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: dryRun ? "dry_run" : "full" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        toast.error("Another sync run is currently in progress for this connector (409 Conflict)");
        return;
      }
      if (!res.ok) {
        toast.error(data.error || "Failed to trigger sync run");
        return;
      }
      toast.success(
        dryRun
          ? `Dry run started for ${connector.name}`
          : `Full sync triggered for ${connector.name}`
      );
      await loadData();
    } catch {
      toast.error("Network error triggering sync");
    } finally {
      setSyncingId(null);
    }
  };

  const handleCreateConnector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newBaseUrl.trim() || !newCredentialRef.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/sis/connectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          standard: newStandard,
          baseUrl: newBaseUrl.trim(),
          credentialRef: newCredentialRef.trim(),
          authMode: newAuthMode,
          scheduleCron: newCron.trim() || null,
          enabled: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to create connector");
        return;
      }
      toast.success(`Connector "${newName}" registered`);
      setIsCreateOpen(false);
      setNewName("");
      await loadData();
    } catch {
      toast.error("Network error creating connector");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveMapping = async () => {
    if (!resolvingItem) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/sis/mappings/${resolvingItem.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: resolveAction,
          localTable: resolveAction === "map" ? localTable : undefined,
          localId: resolveAction === "map" ? localId : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to resolve mapping");
        return;
      }
      toast.success(`Mapping ${resolvingItem.externalId} marked as ${resolveAction}`);
      setResolvingItem(null);
      setLocalId("");
      await loadData();
    } catch {
      toast.error("Network error resolving mapping");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="SIS & LMS Standards Federation"
        description="Unified Ed-Fi Alliance, 1EdTech OneRoster 1.2 & CSV roster synchronization with cryptographic Merkle audits"
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
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              disabled={featureDisabled}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              New Connector
            </Button>
          </div>
        }
      />

      {featureDisabled && (
        <Alert variant="warning">
          <strong>SIS Sync Disabled:</strong> The <code>sis_sync</code> feature flag is currently turned off for this tenant. Sync operations and connector registration are restricted.
        </Alert>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Configured Connectors</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center justify-between">
              {connectors.length}
              <Network className="h-5 w-5 text-primary opacity-80" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {connectors.filter((c) => c.enabled).length} active &bull; {connectors.filter((c) => !c.enabled).length} paused
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Completed Runs</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center justify-between">
              {runs.filter((r) => r.status === "completed").length}
              <CheckCircle2 className="h-5 w-5 text-success opacity-80" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {runs.reduce((acc, r) => acc + (r.recordsProcessed || 0), 0)} records processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Mapping Queue</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center justify-between">
              {mappings.length}
              <Layers className="h-5 w-5 text-amber-500 opacity-80" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {mappings.length > 0 ? "Pending human triage" : "All records resolved"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Standards Engine</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center justify-between">
              Ed-Fi &bull; OneRoster
              <Database className="h-5 w-5 text-violet-500 opacity-80" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              OAuth2 refresh &bull; SSRF-shielded
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border space-x-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab("connectors")}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "connectors"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Network className="h-4 w-4" />
          Connectors ({connectors.length})
        </button>
        <button
          onClick={() => setActiveTab("runs")}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "runs"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Activity className="h-4 w-4" />
          Sync Runs ({runs.length})
        </button>
        <button
          onClick={() => setActiveTab("mappings")}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "mappings"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="h-4 w-4" />
          Mapping Queue ({mappings.length})
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : activeTab === "connectors" ? (
        <div>
          {connectors.length === 0 ? (
            <EmptyState
              title="No SIS/LMS Connectors Found"
              description="Register an Ed-Fi Alliance, 1EdTech OneRoster 1.2, or CSV source to begin automated roster sync."
              action={
                featureDisabled
                  ? undefined
                  : {
                      label: "Register Connector",
                      onClick: () => setIsCreateOpen(true),
                    }
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {connectors.map((c) => (
                <Card key={c.id} className="relative flex flex-col justify-between">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base font-semibold">{c.name}</CardTitle>
                        <CardDescription className="text-xs truncate max-w-[200px]" title={c.baseUrl}>
                          {c.baseUrl}
                        </CardDescription>
                      </div>
                      <Badge
                        variant={
                          c.standard === "edfi"
                            ? "default"
                            : c.standard === "oneroster"
                            ? "info"
                            : "secondary"
                        }
                      >
                        {c.standard.toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Key className="h-3.5 w-3.5 text-muted-foreground" />
                        Credential:
                      </span>
                      <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono">
                        {c.credentialRefMasked}
                      </code>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Auth Mode:</span>
                      <span className="capitalize">{c.authMode}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Schedule:</span>
                      <span>{c.scheduleCron || "Manual trigger"}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Last Sync:</span>
                      <span>{c.lastSyncAt ? new Date(c.lastSyncAt).toLocaleString() : "Never"}</span>
                    </div>
                  </CardContent>
                  <div className="p-4 pt-0 border-t border-border flex items-center justify-between gap-2 mt-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs flex-1"
                      onClick={() => handleTestConnectivity(c)}
                      disabled={testingId === c.id || featureDisabled}
                    >
                      <Activity className={`h-3.5 w-3.5 mr-1 ${testingId === c.id ? "animate-spin" : ""}`} />
                      Test
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs flex-1"
                      onClick={() => handleTriggerSync(c, true)}
                      disabled={syncingId === c.id || featureDisabled}
                      title="Preview changes without committing to database"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Dry Run
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs flex-1"
                      onClick={() => handleTriggerSync(c, false)}
                      disabled={syncingId === c.id || featureDisabled}
                    >
                      <Play className={`h-3.5 w-3.5 mr-1 ${syncingId === c.id ? "animate-spin" : ""}`} />
                      Sync
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === "runs" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sync Run Audit History</CardTitle>
            <CardDescription className="text-xs">
              Cryptographically verified execution runs with record-level breakdown and Merkle ledger roots
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {runs.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No sync runs have been executed yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Run ID / Connector</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Processed / Diff</TableHead>
                    <TableHead>Merkle Root</TableHead>
                    <TableHead>Started</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium text-xs font-mono">{r.id.substring(0, 8)}...</div>
                        <div className="text-[11px] text-muted-foreground capitalize">{r.standard}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.dryRun ? "outline" : "default"}>
                          {r.dryRun ? "Dry Run" : "Live Commit"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            r.status === "completed"
                              ? "success"
                              : r.status === "running"
                              ? "info"
                              : r.status === "failed"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {r.status}
                        </Badge>
                        {r.errorSummary && (
                          <div className="text-[11px] text-destructive mt-1 max-w-xs truncate" title={r.errorSummary}>
                            {r.errorSummary}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div>Total: {r.recordsProcessed}</div>
                        <div className="text-[11px] text-muted-foreground">
                          +{r.recordsInserted} / ~{r.recordsUpdated} / -{r.recordsSkipped}
                        </div>
                      </TableCell>
                      <TableCell>
                        {r.merkleRootHash ? (
                          <code className="text-[11px] font-mono bg-muted px-1.5 py-0.5 rounded" title={r.merkleRootHash}>
                            {r.merkleRootHash.substring(0, 12)}...
                          </code>
                        ) : (
                          <span className="text-xs text-muted-foreground">&mdash;</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(r.startedAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Unmatched Record Review Queue</CardTitle>
            <CardDescription className="text-xs">
              External records that could not be deterministically mapped to local roster entries require manual triage
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {mappings.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center">
                <CheckCircle2 className="h-8 w-8 text-success mb-2" />
                <p>Mapping queue is clean &mdash; all external SIS records are synchronized.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>External ID</TableHead>
                    <TableHead>Entity Type</TableHead>
                    <TableHead>Standard</TableHead>
                    <TableHead>Proposed Data</TableHead>
                    <TableHead>Enqueued At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono text-xs font-semibold">
                        {m.externalId}
                      </TableCell>
                      <TableCell className="capitalize text-xs">
                        <Badge variant="outline">{m.entityType}</Badge>
                      </TableCell>
                      <TableCell className="capitalize text-xs font-medium">
                        {m.standard}
                      </TableCell>
                      <TableCell className="text-xs max-w-xs">
                        <code className="text-[11px] font-mono bg-muted px-1.5 py-0.5 rounded block truncate" title={m.proposedPayloadJson}>
                          {m.proposedPayloadJson}
                        </code>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => {
                            setResolvingItem(m);
                            setResolveAction("map");
                            setLocalTable(m.entityType === "staff" ? "staff" : "students");
                          }}
                        >
                          Resolve
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* New Connector Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Register SIS/LMS Connector</DialogTitle>
            <DialogDescription>
              Connect an external Ed-Fi Alliance endpoint, 1EdTech OneRoster 1.2 server, or secure CSV source.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateConnector} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="connectorName">Connector Name</Label>
              <Input
                id="connectorName"
                placeholder="e.g. State Department of Education (Ed-Fi)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="connectorStandard">Standards Protocol</Label>
              <Select
                id="connectorStandard"
                value={newStandard}
                onChange={(e) => {
                  const val = e.target.value as "edfi" | "oneroster" | "csv";
                  setNewStandard(val);
                  if (val === "edfi") setNewBaseUrl("https://api.ed-fi.org/v5.3/api");
                  else if (val === "oneroster") setNewBaseUrl("https://oneroster.institution.edu/ims/oneroster/v1p2");
                  else setNewBaseUrl("https://storage.internal.org/rosters.csv");
                }}
              >
                <SelectItem value="edfi">Ed-Fi Alliance (v5.x REST API)</SelectItem>
                <SelectItem value="oneroster">1EdTech OneRoster 1.2 REST</SelectItem>
                <SelectItem value="csv">Standardized CSV S3/HTTPS Ingest</SelectItem>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="connectorUrl">Endpoint Base URL</Label>
              <Input
                id="connectorUrl"
                type="url"
                placeholder="https://api.ed-fi.org/v5.3/api"
                value={newBaseUrl}
                onChange={(e) => setNewBaseUrl(e.target.value)}
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Egress guard strictly validates against private CIDRs and DNS rebinding attacks.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="credentialRef">Credential Vault Key</Label>
                <Input
                  id="credentialRef"
                  placeholder="VAULT_EDFI_SECRET"
                  value={newCredentialRef}
                  onChange={(e) => setNewCredentialRef(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="authMode">Auth Mode</Label>
                <Select
                  id="authMode"
                  value={newAuthMode}
                  onChange={(e) => setNewAuthMode(e.target.value)}
                >
                  <SelectItem value="oauth2">OAuth2 Client Credentials</SelectItem>
                  <SelectItem value="apiKey">API Key / Header Token</SelectItem>
                  <SelectItem value="basic">HTTP Basic Auth</SelectItem>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cronSchedule">Scheduled Sync Cron (Optional)</Label>
              <Input
                id="cronSchedule"
                placeholder="0 2 * * * (Daily at 2:00 AM)"
                value={newCron}
                onChange={(e) => setNewCron(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Registering..." : "Register Connector"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Mapping Resolution Dialog */}
      {resolvingItem && (
        <Dialog open={Boolean(resolvingItem)} onOpenChange={() => setResolvingItem(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Resolve Unmatched Record</DialogTitle>
              <DialogDescription>
                Link external ID <code>{resolvingItem.externalId}</code> ({resolvingItem.entityType}) to a local database entry.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Resolution Action</Label>
                <Select
                  value={resolveAction}
                  onChange={(e) => setResolveAction(e.target.value as "map" | "ignore" | "create")}
                >
                  <SelectItem value="map">Map to Existing Local Entity</SelectItem>
                  <SelectItem value="create">Provision New Local Record</SelectItem>
                  <SelectItem value="ignore">Ignore / Discard Record</SelectItem>
                </Select>
              </div>

              {resolveAction === "map" && (
                <>
                  <div className="space-y-1.5">
                    <Label>Local Table</Label>
                    <Select
                      value={localTable}
                      onChange={(e) => setLocalTable(e.target.value)}
                    >
                      <SelectItem value="students">Students (students)</SelectItem>
                      <SelectItem value="staff">Staff (staff)</SelectItem>
                      <SelectItem value="classes">Classes (classes)</SelectItem>
                      <SelectItem value="departments">Departments (departments)</SelectItem>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Local Entity Primary Key (ID)</Label>
                    <Input
                      placeholder="e.g. stu_abc123"
                      value={localId}
                      onChange={(e) => setLocalId(e.target.value)}
                    />
                  </div>
                </>
              )}

              <DialogFooter className="pt-4">
                <Button
                  variant="outline"
                  onClick={() => setResolvingItem(null)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button onClick={handleResolveMapping} disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Confirm Resolution"}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
