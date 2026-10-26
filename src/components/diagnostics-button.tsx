"use client";

import { useState, useEffect, useMemo } from "react";
import { telemetry, type LogEntry } from "@/lib/diagnostics/logger";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Terminal,
  Activity,
  AlertCircle,
  AlertTriangle,
  Info,
  Copy,
  Download,
  Trash2,
  RefreshCw,
  Globe,
  Shield,
  Key,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from "lucide-react";

interface DiagnosticsButtonProps {
  className?: string;
  variant?: "floating" | "pill" | "icon";
  label?: string;
}

export function DiagnosticsButton({
  className = "",
  variant = "floating",
  label = "Live Diagnostics",
}: DiagnosticsButtonProps) {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logFilter, setLogFilter] = useState<"all" | "error" | "warn" | "info">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"logs" | "sso" | "health" | "server">("logs");
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [serverReport, setServerReport] = useState<string>("");
  const [healthStatus, setHealthStatus] = useState<{
    tested: boolean;
    loading: boolean;
    ok?: boolean;
    latencyMs?: number;
    error?: string;
    timestamp?: string;
  }>({ tested: false, loading: false });

  const [gisProbeStatus, setGisProbeStatus] = useState<string>("");

  // Sync logs when dialog opens and subscribe to real-time additions
  useEffect(() => {
    if (!open) return;
    setLogs(telemetry.getLogs());

    const unsubscribe = telemetry.subscribe((newEntry) => {
      setLogs((prev) => [...prev, newEntry]);
    });

    return () => {
      unsubscribe();
    };
  }, [open]);

  // Cleaned client ID for display
  const rawGoogleClientIds = (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_IDS || "")
    .replace(/[\uFEFF\u200B\u00A0"']/g, "")
    .trim();
  const googleClientId = rawGoogleClientIds.split(",")[0]?.trim() || "";

  const maskedClientId = useMemo(() => {
    if (!googleClientId) return "Not Configured";
    if (googleClientId.length <= 20) return googleClientId;
    return `${googleClientId.slice(0, 16)}...${googleClientId.slice(-12)}`;
  }, [googleClientId]);

  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";

  const filteredLogs = useMemo(() => {
    return logs
      .filter((l) => {
        if (logFilter === "all") return true;
        return l.level === logFilter;
      })
      .filter((l) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          l.message.toLowerCase().includes(q) ||
          (l.data && JSON.stringify(l.data).toLowerCase().includes(q))
        );
      });
  }, [logs, logFilter, searchQuery]);

  function copyAllLogs() {
    const text = telemetry.getDiagnosticDump();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success("All diagnostic logs copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function downloadLogs() {
    const text = telemetry.getDiagnosticDump();
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `thaibahive-telemetry-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Telemetry report downloaded");
  }

  function handleClearLogs() {
    telemetry.clearLogs();
    setLogs([]);
    setServerReport("");
    toast.info("Local telemetry logs cleared");
  }

  async function testHealthPing() {
    setHealthStatus({ tested: true, loading: true });
    const start = performance.now();
    try {
      const res = await fetch("/api/health");
      const elapsed = Math.round(performance.now() - start);
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setHealthStatus({
          tested: true,
          loading: false,
          ok: true,
          latencyMs: elapsed,
          timestamp: data.timestamp || new Date().toISOString(),
        });
        telemetry.info(`[Health Probe] Status: 200 OK (${elapsed}ms)`);
      } else {
        setHealthStatus({
          tested: true,
          loading: false,
          ok: false,
          latencyMs: elapsed,
          error: `HTTP ${res.status}: ${res.statusText}`,
        });
        telemetry.error(`[Health Probe] Failed: HTTP ${res.status}`);
      }
    } catch (err) {
      const elapsed = Math.round(performance.now() - start);
      setHealthStatus({
        tested: true,
        loading: false,
        ok: false,
        latencyMs: elapsed,
        error: err instanceof Error ? err.message : "Network error",
      });
      telemetry.error(`[Health Probe] Network error: ${err}`);
    }
  }

  function testGisPrompt() {
    setGisProbeStatus("Invoking Google Identity prompt...");
    telemetry.info("[GIS Probe] Initiating One Tap prompt probe...");
    try {
      if (!(window as any)?.google?.accounts?.id) {
        setGisProbeStatus("ERROR: window.google.accounts.id is undefined (script not loaded)");
        telemetry.error("[GIS Probe] Script not loaded");
        return;
      }

      (window as any).google.accounts.id.prompt((notification: any) => {
        const payload = {
          isDisplayed: notification.isDisplayed?.(),
          isNotDisplayed: notification.isNotDisplayed?.(),
          notDisplayedReason: notification.getNotDisplayedReason?.(),
          isSkipped: notification.isSkippedMoment?.(),
          skippedReason: notification.getSkippedReason?.(),
          isDismissed: notification.isDismissedMoment?.(),
          dismissedReason: notification.getDismissedReason?.(),
        };
        const statusText = JSON.stringify(payload, null, 2);
        setGisProbeStatus(statusText);
        telemetry.info(`[GIS Probe] Notification: ${statusText}`);
      });
    } catch (err) {
      const errText = err instanceof Error ? err.message : String(err);
      setGisProbeStatus(`Threw exception: ${errText}`);
      telemetry.error(`[GIS Probe] Exception: ${errText}`);
    }
  }

  async function shareLogs() {
    setSharing(true);
    try {
      const res = await fetch("/api/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logs: telemetry.getDiagnosticDump().split("\n") }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setServerReport(data.report);
        setActiveTab("server");
        navigator.clipboard.writeText(data.report);
        toast.success(data.message || "Diagnostic report shared successfully!");
      } else {
        toast.error(data.error || "Failed to share telemetry report.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while sharing telemetry logs.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <>
      {variant === "floating" && (
        <Button
          onClick={() => setOpen(true)}
          size="icon"
          variant="outline"
          className={`fixed bottom-4 right-4 z-50 h-10 w-10 rounded-full shadow-2xl bg-card/90 backdrop-blur-md border border-border/80 hover:border-primary hover:scale-105 active:scale-95 transition-all text-foreground ${className}`}
          title="Telemetry & Diagnostics HUD"
          aria-label="Telemetry & Diagnostics HUD"
        >
          <Terminal className="h-4 w-4 text-emerald-400" />
        </Button>
      )}

      {variant === "pill" && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border/40 bg-card/60 backdrop-blur-md text-xs font-medium text-foreground hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all shadow-xs cursor-pointer ${className}`}
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <Terminal className="h-3 w-3 text-emerald-400" />
          <span>{label}</span>
        </button>
      )}

      {variant === "icon" && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`relative rounded-xl p-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-150 min-w-[36px] min-h-[36px] flex items-center justify-center shrink-0 ${className}`}
          title="Live Telemetry & Diagnostics HUD"
          aria-label="Live Telemetry & Diagnostics HUD"
        >
          <Terminal className="h-[18px] w-[18px] text-emerald-400" />
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl w-full max-h-[85vh] flex flex-col p-0 overflow-hidden bg-[#0c1222] border-border/60 text-foreground shadow-2xl">
          <DialogHeader className="p-4 pb-3 border-b border-border/40 bg-[#090d1a] flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Terminal className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                  <span>ThaibaHive Telemetry &amp; Diagnostics</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    LIVE
                  </span>
                </DialogTitle>
                <p className="text-[11px] text-muted-foreground">
                  Real-time event stream, Google SSO state, and client-server connectivity.
                </p>
              </div>
            </div>
          </DialogHeader>

          {/* Navigation Tabs */}
          <div className="flex items-center border-b border-border/40 bg-[#070b14] px-4 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab("logs")}
              className={`px-3 py-2.5 border-b-2 flex items-center gap-1.5 transition-all ${
                activeTab === "logs"
                  ? "border-emerald-500 text-emerald-400 font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>Console &amp; Event Stream</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted/60 text-muted-foreground font-mono">
                {logs.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("sso")}
              className={`px-3 py-2.5 border-b-2 flex items-center gap-1.5 transition-all ${
                activeTab === "sso"
                  ? "border-emerald-500 text-emerald-400 font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Key className="h-3.5 w-3.5" />
              <span>Google SSO &amp; Identity</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("health")}
              className={`px-3 py-2.5 border-b-2 flex items-center gap-1.5 transition-all ${
                activeTab === "health"
                  ? "border-emerald-500 text-emerald-400 font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Health &amp; Network</span>
            </button>

            {serverReport && (
              <button
                type="button"
                onClick={() => setActiveTab("server")}
                className={`px-3 py-2.5 border-b-2 flex items-center gap-1.5 transition-all ${
                  activeTab === "server"
                    ? "border-emerald-500 text-emerald-400 font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Globe className="h-3.5 w-3.5" />
                <span>Server Report</span>
              </button>
            )}
          </div>

          {/* Tab 1: Live Event & Console Stream */}
          {activeTab === "logs" && (
            <div className="flex-1 flex flex-col min-h-0 bg-[#070b14]">
              {/* Filter controls */}
              <div className="p-3 border-b border-border/30 flex flex-wrap items-center gap-2 bg-[#090d1a]">
                <div className="flex items-center gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setLogFilter("all")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                      logFilter === "all"
                        ? "bg-foreground/15 text-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All ({logs.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogFilter("error")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                      logFilter === "error"
                        ? "bg-red-500/20 text-red-400 font-semibold border border-red-500/30"
                        : "text-muted-foreground hover:text-red-400"
                    }`}
                  >
                    Errors ({logs.filter((l) => l.level === "error").length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogFilter("warn")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                      logFilter === "warn"
                        ? "bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/30"
                        : "text-muted-foreground hover:text-amber-400"
                    }`}
                  >
                    Warnings ({logs.filter((l) => l.level === "warn").length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogFilter("info")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                      logFilter === "info"
                        ? "bg-blue-500/20 text-blue-400 font-semibold border border-blue-500/30"
                        : "text-muted-foreground hover:text-blue-400"
                    }`}
                  >
                    Info ({logs.filter((l) => l.level === "info").length})
                  </button>
                </div>

                <div className="ml-auto w-full sm:w-48">
                  <Input
                    placeholder="Search logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-7 text-xs bg-black/40 border-border/40 rounded-lg"
                  />
                </div>
              </div>

              {/* Log stream view */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1 font-mono text-[11px] max-h-96 min-h-[260px] select-text">
                {filteredLogs.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center text-muted-foreground text-center">
                    <Terminal className="h-6 w-6 mb-2 opacity-40" />
                    <p>No matching logs found.</p>
                  </div>
                ) : (
                  filteredLogs.map((entry) => {
                    const time = entry.timestamp.split("T")[1]?.slice(0, 8) || entry.timestamp;
                    return (
                      <div
                        key={entry.id}
                        className={`p-1.5 rounded-md flex items-start gap-2 border transition-all ${
                          entry.level === "error"
                            ? "bg-red-950/20 border-red-500/20 text-red-200"
                            : entry.level === "warn"
                            ? "bg-amber-950/20 border-amber-500/20 text-amber-200"
                            : "bg-white/[0.02] border-white/5 text-muted-foreground"
                        }`}
                      >
                        <span className="text-[10px] text-muted-foreground/60 shrink-0 select-none">
                          {time}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                            entry.level === "error"
                              ? "bg-red-500/20 text-red-400"
                              : entry.level === "warn"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-blue-500/20 text-blue-400"
                          }`}
                        >
                          {entry.level.toUpperCase()}
                        </span>
                        <div className="flex-1 break-all">
                          <span className="text-foreground/90">{entry.message}</span>
                          {entry.data !== undefined && (
                            <pre className="mt-1 p-1.5 rounded bg-black/50 text-[10px] text-muted-foreground overflow-x-auto">
                              {JSON.stringify(entry.data, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Google SSO & Identity */}
          {activeTab === "sso" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#070b14] max-h-96 min-h-[260px]">
              <div className="p-3 rounded-xl border border-border/40 bg-card/40 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Key className="h-3.5 w-3.5 text-blue-400" />
                  <span>Google Client Configuration</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg border border-border/30 bg-black/30 space-y-1">
                    <span className="text-[11px] text-muted-foreground">Configured Client ID</span>
                    <p className="font-mono text-xs font-semibold text-foreground break-all">
                      {maskedClientId}
                    </p>
                    <span
                      className={`text-[10px] inline-flex items-center gap-1 font-medium ${
                        googleClientId ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {googleClientId ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" /> Valid ASCII Format
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3" /> Missing Client ID
                        </>
                      )}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg border border-border/30 bg-black/30 space-y-1">
                    <span className="text-[11px] text-muted-foreground">Google Identity SDK (GIS)</span>
                    <p className="font-mono text-xs font-semibold text-foreground">
                      {typeof window !== "undefined" && (window as any).google?.accounts?.id
                        ? "Loaded & Active"
                        : "Not Loaded"}
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      Source: accounts.google.com/gsi/client
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg border border-blue-500/20 bg-blue-500/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5" />
                      <span>Current Authorized Origin</span>
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[10px] px-2 text-blue-400 hover:bg-blue-500/10"
                      onClick={() => {
                        navigator.clipboard.writeText(currentOrigin);
                        toast.success("Origin copied to clipboard");
                      }}
                    >
                      <Copy className="h-3 w-3 mr-1" /> Copy Origin
                    </Button>
                  </div>
                  <p className="font-mono text-xs text-foreground bg-black/40 p-2 rounded border border-border/40">
                    {currentOrigin}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    <strong>Critical:</strong> This exact origin must be listed in Google Cloud Console under:
                    <br />
                    <code>APIs &amp; Services &gt; Credentials &gt; OAuth 2.0 Client IDs &gt; Authorized JavaScript origins</code>
                  </p>
                </div>

                <div className="pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={testGisPrompt}
                    className="text-xs h-8 border-primary/40 hover:bg-primary/10 text-primary"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Trigger GIS One Tap Probe
                  </Button>
                  {gisProbeStatus && (
                    <pre className="mt-2 p-2 rounded bg-black/60 border border-border/30 font-mono text-[10px] text-muted-foreground whitespace-pre-wrap">
                      {gisProbeStatus}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Health & Network */}
          {activeTab === "health" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#070b14] max-h-96 min-h-[260px]">
              <div className="p-3 rounded-xl border border-border/40 bg-card/40 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Server Health &amp; Latency</span>
                  </h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={testHealthPing}
                    disabled={healthStatus.loading}
                    className="text-xs h-7 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                  >
                    <RefreshCw
                      className={`h-3 w-3 mr-1 ${healthStatus.loading ? "animate-spin" : ""}`}
                    />
                    Ping /api/health
                  </Button>
                </div>

                {healthStatus.tested ? (
                  <div
                    className={`p-3 rounded-lg border flex items-center justify-between ${
                      healthStatus.ok
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-red-500/30 bg-red-500/10 text-red-400"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      {healthStatus.ok ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      <span>{healthStatus.ok ? "Server Healthy" : "Ping Failed"}</span>
                      {healthStatus.error && (
                        <span className="text-[11px] text-muted-foreground">({healthStatus.error})</span>
                      )}
                    </div>
                    <span className="font-mono text-xs font-bold">
                      {healthStatus.latencyMs} ms
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Click &quot;Ping /api/health&quot; to test the round-trip latency to the server.
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2">
                  <div className="p-2 rounded bg-black/30 border border-border/20">
                    <span className="text-[10px] text-muted-foreground">Network Status</span>
                    <p className="font-semibold text-foreground">
                      {typeof navigator !== "undefined" && navigator.onLine ? "Online" : "Offline"}
                    </p>
                  </div>
                  <div className="p-2 rounded bg-black/30 border border-border/20">
                    <span className="text-[10px] text-muted-foreground">Telemetry Entries</span>
                    <p className="font-semibold text-foreground">{logs.length} in memory</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Server Shared Report */}
          {activeTab === "server" && serverReport && (
            <div className="flex-1 overflow-auto p-4 max-h-96 bg-[#070b14]">
              <pre className="whitespace-pre-wrap break-all text-xs font-mono text-muted-foreground leading-relaxed">
                {serverReport}
              </pre>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex flex-wrap items-center gap-2 border-t border-border/40 p-3 bg-[#090d1a]">
            <Button size="sm" variant="outline" onClick={copyAllLogs} className="h-8 text-xs">
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              {copied ? "Copied!" : "Copy All"}
            </Button>
            <Button size="sm" variant="outline" onClick={downloadLogs} className="h-8 text-xs">
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Download Report
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={shareLogs}
              disabled={sharing || logs.length === 0}
              className="h-8 text-xs"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              {sharing ? "Sharing..." : "Share with Support"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClearLogs}
              className="h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 ml-auto"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Clear
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
