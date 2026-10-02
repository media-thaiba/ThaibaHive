"use client";

import { useState } from "react";
import { telemetry } from "@/lib/diagnostics/logger";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
      <Button
        onClick={openSheet}
        size="icon"
        variant="destructive"
        className="fixed bottom-4 right-4 z-50 h-10 w-10 rounded-full shadow-lg hover:scale-105 transition-all"
        title="Diagnostics & Bug Report"
        aria-label="Diagnostics & Bug Report"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2 border-b">
            <DialogTitle className="text-base">Diagnostics &amp; Bug Report</DialogTitle>
          </DialogHeader>

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

          <div className="flex-1 overflow-auto p-4 max-h-96">
            <pre className="whitespace-pre-wrap break-all text-xs font-mono text-muted-foreground leading-relaxed">
              {activeTab === "server" && serverReport ? serverReport : (logs || "No logs captured yet. Interact with the app to generate logs.")}
            </pre>
          </div>

          <div className="flex flex-wrap gap-2 border-t p-3 bg-muted/20">
            <Button size="sm" variant="outline" onClick={copyLogs}>
              {copied ? "Copied!" : "Copy Report"}
            </Button>
            <Button size="sm" variant="outline" onClick={downloadLogs}>
              Download
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={shareLogs}
              disabled={sharing || !logs}
            >
              {sharing ? "Sharing..." : "Share with Support"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { telemetry.clearLogs(); setLogs(""); setServerReport(""); setActiveTab("client"); }}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
            >
              Clear
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
