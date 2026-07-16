"use client";

import { useState } from "react";
import { telemetry } from "@/lib/diagnostics/logger";
import { toast } from "sonner";

export function DiagnosticsButton() {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [serverReport, setServerReport] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"client" | "server">("client");

  function openSheet() {
    setLogs(telemetry.getDiagnosticDump());
    setServerReport("");
    setActiveTab("client");
    setOpen(true);
  }

  function copyLogs() {
    const textToCopy = activeTab === "server" && serverReport ? serverReport : logs;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      toast.success("Logs copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function downloadLogs() {
    const textToDownload = activeTab === "server" && serverReport ? serverReport : logs;
    const blob = new Blob([textToDownload], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `thaibahive-diagnostics-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Diagnostics report downloaded.");
  }

  async function shareLogs() {
    setSharing(true);
    try {
      const res = await fetch("/api/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logs: logs.split("\n") }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setServerReport(data.report);
        setActiveTab("server");
        navigator.clipboard.writeText(data.report);
        toast.success(data.message || "Diagnostic report shared successfully!");
      } else {
        if (res.status === 403) {
          toast.error("Sharing failed: You do not have permission to share telemetry.");
        } else {
          toast.error(data.error || "Failed to share telemetry report.");
        }
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
      <button
        onClick={openSheet}
        className="fixed bottom-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg hover:opacity-90 transition-all hover:scale-105"
        title="Diagnostics & Bug Report"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="fixed bottom-0 right-0 z-50 m-4 w-full max-w-xl rounded-lg border bg-background shadow-xl">
            <div className="flex items-center justify-between border-b p-3">
              <h3 className="font-semibold text-sm">Diagnostics & Bug Report</h3>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground text-lg font-bold">&times;</button>
            </div>

            {serverReport && (
              <div className="flex border-b text-xs font-medium bg-muted/40">
                <button
                  onClick={() => setActiveTab("client")}
                  className={`px-4 py-2 border-b-2 transition-all ${
                    activeTab === "client"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Local Client Logs
                </button>
                <button
                  onClick={() => setActiveTab("server")}
                  className={`px-4 py-2 border-b-2 transition-all ${
                    activeTab === "server"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Shared Server Report
                </button>
              </div>
            )}

            <div className="max-h-96 overflow-auto p-3">
              <pre className="whitespace-pre-wrap break-all text-xs font-mono text-muted-foreground leading-relaxed">
                {activeTab === "server" && serverReport ? serverReport : (logs || "No logs captured yet. Interact with the app to generate logs.")}
              </pre>
            </div>

            <div className="flex gap-2 border-t p-3 bg-muted/20">
              <button onClick={copyLogs} className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted">
                {copied ? "Copied!" : "Copy Report"}
              </button>
              <button onClick={downloadLogs} className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted">
                Download
              </button>
              <button
                onClick={shareLogs}
                disabled={sharing || !logs}
                className="rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
              >
                {sharing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-1 h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sharing...
                  </>
                ) : (
                  "Share with Support"
                )}
              </button>
              <button onClick={() => { telemetry.clearLogs(); setLogs(""); setServerReport(""); setActiveTab("client"); }} className="rounded-md border px-3 py-1.5 text-xs font-medium text-destructive hover:bg-muted ml-auto">
                Clear
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
