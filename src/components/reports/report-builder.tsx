"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, Calendar, Mail, RefreshCw, Trash2, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

export function ReportBuilder() {
  const [activeSubTab, setActiveSubTab] = useState<"builder" | "schedules">("builder");

  // On-demand Builder State
  const [metricType, setMetricType] = useState<"attendance" | "finance" | "academics">("attendance");
  const [format, setFormat] = useState<"pdf" | "excel">("pdf");
  const [startDate, setStartDate] = useState(() => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [classId, setClassId] = useState("");
  const [isCompiling, setIsCompiling] = useState(false);
  const [compiledPath, setCompiledPath] = useState<string | null>(null);

  // Schedules state
  const [scheduleTitle, setScheduleTitle] = useState("");
  const [scheduleFrequency, setScheduleFrequency] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [scheduleFormat, setScheduleFormat] = useState<"pdf" | "excel">("pdf");
  const [recipients, setRecipients] = useState("");
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  
  const [schedulesList, setSchedulesList] = useState<any[]>([]);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);

  const fetchLists = () => {
    setLoadingLists(true);
    
    Promise.all([
      fetch("/api/analytics/schedules").then(res => res.json()),
      fetch("/api/analytics/history").then(res => res.json())
    ])
      .then(([schedulesData, historyData]) => {
        if (schedulesData.schedules) setSchedulesList(schedulesData.schedules);
        if (historyData.history) setHistoryList(historyData.history);
      })
      .catch((err) => {
        console.error("Error fetching schedules or history list:", err);
        toast.error("Failed to load schedules or report history.");
      })
      .finally(() => {
        setLoadingLists(false);
      });
  };

  useEffect(() => {
    fetchLists();
  }, []);

  const handleCompile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsCompiling(true);
    setCompiledPath(null);

    fetch("/api/analytics/compile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: metricType,
        format,
        startDate,
        endDate,
        classId: metricType === "academics" && classId ? classId : undefined
      })
    })
      .then(res => {
        if (!res.ok) throw new Error("Server error compiling report");
        return res.json();
      })
      .then(json => {
        if (json.success) {
          setCompiledPath(json.filePath);
          toast.success("Report compiled successfully!");
          fetchLists(); // refresh history
        } else {
          throw new Error(json.error || "Failed to compile report");
        }
      })
      .catch((err: any) => {
        console.error("Compile error:", err);
        toast.error(err.message || "Failed to compile report.");
      })
      .finally(() => {
        setIsCompiling(false);
      });
  };

  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleTitle.trim()) {
      toast.error("Please enter a title for the schedule.");
      return;
    }

    const emails = recipients
      .split(",")
      .map(e => e.trim())
      .filter(e => e.length > 0);

    if (emails.length === 0) {
      toast.error("Please provide at least one recipient email.");
      return;
    }

    setIsSavingSchedule(true);

    fetch("/api/analytics/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: scheduleTitle,
        frequency: scheduleFrequency,
        format: scheduleFormat,
        recipients: emails,
        isActive: true
      })
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to create report schedule");
        return res.json();
      })
      .then(json => {
        if (json.schedule) {
          toast.success("Schedule configured successfully!");
          setScheduleTitle("");
          setRecipients("");
          fetchLists(); // refresh
        }
      })
      .catch((err: any) => {
        console.error("Schedule error:", err);
        toast.error(err.message || "Failed to configure schedule.");
      })
      .finally(() => {
        setIsSavingSchedule(false);
      });
  };

  const handleDeleteSchedule = (id: string) => {
    fetch(`/api/analytics/schedules/${id}`, {
      method: "DELETE"
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to delete schedule");
        toast.success("Schedule deleted successfully!");
        fetchLists();
      })
      .catch((err) => {
        console.error("Delete schedule error:", err);
        toast.error("Failed to delete schedule.");
      });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Configuration Form Panel */}
      <Card className="lg:col-span-1 border border-slate-200 dark:border-slate-800">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="text-lg">Report Configuration</CardTitle>
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-md p-1 mt-3 gap-1">
            <button
              onClick={() => setActiveSubTab("builder")}
              className={`flex-1 text-xs py-1.5 font-semibold rounded-sm transition-all ${
                activeSubTab === "builder"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              Compile On-Demand
            </button>
            <button
              onClick={() => setActiveSubTab("schedules")}
              className={`flex-1 text-xs py-1.5 font-semibold rounded-sm transition-all ${
                activeSubTab === "schedules"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              Schedules Setup
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {activeSubTab === "builder" ? (
            <form onSubmit={handleCompile} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Analytics Category</label>
                <select
                  value={metricType}
                  onChange={(e) => setMetricType(e.target.value as any)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none dark:border-slate-800 dark:bg-slate-950"
                >
                  <option value="attendance">Student/Staff Attendance</option>
                  <option value="finance">Collections & Cash Ledger</option>
                  <option value="academics">Academic Grades & GPA</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Document Format</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormat("pdf")}
                    className={`flex-1 h-9 rounded-md border text-sm font-semibold transition-all ${
                      format === "pdf"
                        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950"
                        : "border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-950"
                    }`}
                  >
                    PDF Document
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormat("excel")}
                    className={`flex-1 h-9 rounded-md border text-sm font-semibold transition-all ${
                      format === "excel"
                        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950"
                        : "border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-950"
                    }`}
                  >
                    Excel Spreadsheet
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none dark:border-slate-800 dark:bg-slate-950"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none dark:border-slate-800 dark:bg-slate-950"
                />
              </div>

              {metricType === "academics" && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Class ID (Optional)</label>
                  <input
                    type="text"
                    placeholder="All Classes"
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none dark:border-slate-800 dark:bg-slate-950"
                  />
                </div>
              )}

              <Button type="submit" disabled={isCompiling} className="w-full mt-4">
                {isCompiling ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Compiling Report...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" /> Compile Report
                  </>
                )}
              </Button>

              {compiledPath && (
                <div className="p-3 border border-emerald-500/20 bg-emerald-500/5 rounded-md mt-4 flex items-center justify-between text-xs">
                  <div className="flex items-center text-emerald-600 font-semibold">
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Ready to download
                  </div>
                  <a
                    href={compiledPath}
                    download
                    className="flex items-center bg-emerald-600 text-white rounded px-2.5 py-1 font-bold hover:bg-emerald-700 transition-colors"
                  >
                    Download <Download className="h-3 w-3 ml-1" />
                  </a>
                </div>
              )}
            </form>
          ) : (
            <form onSubmit={handleSaveSchedule} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Schedule Title</label>
                <input
                  type="text"
                  placeholder="Weekly Finance Report"
                  value={scheduleTitle}
                  onChange={(e) => setScheduleTitle(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none dark:border-slate-800 dark:bg-slate-950"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Dispatch Frequency</label>
                <select
                  value={scheduleFrequency}
                  onChange={(e) => setScheduleFrequency(e.target.value as any)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none dark:border-slate-800 dark:bg-slate-950"
                >
                  <option value="daily">Daily Cron Dispatch</option>
                  <option value="weekly">Weekly Cron Dispatch</option>
                  <option value="monthly">Monthly Cron Dispatch</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Format</label>
                <select
                  value={scheduleFormat}
                  onChange={(e) => setScheduleFormat(e.target.value as any)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none dark:border-slate-800 dark:bg-slate-950"
                >
                  <option value="pdf">PDF Document</option>
                  <option value="excel">Excel Spreadsheet</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Recipients (comma separated)</label>
                <textarea
                  placeholder="principal@campus.edu, accounts@campus.edu"
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none dark:border-slate-800 dark:bg-slate-950"
                />
              </div>

              <Button type="submit" disabled={isSavingSchedule} className="w-full mt-4">
                {isSavingSchedule ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving Schedule...
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 mr-2" /> Configure Schedule
                  </>
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* History and Active Schedules Lists */}
      <div className="lg:col-span-2 space-y-6">
        {/* Active Schedules Panel */}
        <Card className="border border-slate-200 dark:border-slate-800">
          <CardHeader className="py-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Active Schedules</CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchLists}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {schedulesList.map((sched) => (
                <div key={sched.id} className="p-4 flex items-center justify-between text-sm hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                  <div className="space-y-1">
                    <span className="font-bold text-slate-850 dark:text-slate-100">{sched.title}</span>
                    <div className="flex gap-2 text-xs text-slate-500">
                      <Badge variant="secondary">{sched.frequency.toUpperCase()}</Badge>
                      <Badge variant="info">{sched.format.toUpperCase()}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteSchedule(sched.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {schedulesList.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-400">No active automated report schedules.</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Compile History Panel */}
        <Card className="border border-slate-200 dark:border-slate-800">
          <CardHeader className="py-4 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm font-semibold">Compiled Reports Archive</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {historyList.map((hist) => {
                const dateFormatted = new Date(hist.generatedAt).toLocaleString();
                const sizeKB = Math.round(hist.sizeBytes / 1024);
                return (
                  <div key={hist.id} className="p-4 flex items-center justify-between text-sm hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-slate-800 dark:text-slate-100">{hist.filePath.split("/").pop()}</span>
                        <Badge variant={hist.status === "success" ? "success" : "destructive"}>{hist.status}</Badge>
                      </div>
                      <div className="text-xs text-slate-500">
                        Generated: {dateFormatted}  |  Size: {sizeKB} KB  |  Format: {hist.format.toUpperCase()}
                      </div>
                    </div>
                    {hist.status === "success" && (
                      <a
                        href={hist.filePath}
                        download
                        className="p-2 border border-slate-200 bg-white hover:bg-slate-100 rounded-md transition-colors inline-flex items-center text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                );
              })}
              {historyList.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-400">No compiled reports in archive.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
