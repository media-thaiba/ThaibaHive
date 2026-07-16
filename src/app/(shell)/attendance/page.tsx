"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ExportButton } from "@/components/export-button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Clock, LogOut, Smartphone } from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils";

type AttendanceLog = {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  lateMinutes: number | null;
  workedMinutes: number | null;
  method: string;
};

type TeamLog = AttendanceLog & {
  staffId: string;
  staffName: string | null;
  staffLastName: string | null;
  employeeId: string | null;
};

const statusVariant: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  present: "success",
  late: "warning",
  absent: "destructive",
  half_day: "warning",
};

type Tab = "my" | "team";

type Department = { id: string; name: string };
type Institution = { id: string; name: string };

function getDefaultDateRange() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    from: first.toISOString().split("T")[0],
    to: now.toISOString().split("T")[0],
  };
}

export default function AttendancePage() {
  const { staff } = useAuth();
  const canViewTeam = staff && ["super_admin", "admin", "principal", "hod"].includes(staff.role);
  const isPrincipal = staff?.role === "principal";
  const isHod = staff?.role === "hod";
  const defaultRange = getDefaultDateRange();

  const [activeTab, setActiveTab] = useState<Tab>("my");
  const [todayLog, setTodayLog] = useState<AttendanceLog | null>(null);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [teamLogs, setTeamLogs] = useState<TeamLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamLoading, setTeamLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState(defaultRange.from);
  const [dateTo, setDateTo] = useState(defaultRange.to);
  const [checkingOut, setCheckingOut] = useState(false);
  const [teamSearch, setTeamSearch] = useState("");

  const [departments, setDepartments] = useState<Department[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>("");
  const [filtersLoading, setFiltersLoading] = useState(false);

  // Pagination states
  const [myPage, setMyPage] = useState(1);
  const [myTotal, setMyTotal] = useState(0);
  const [hasMoreMy, setHasMoreMy] = useState(false);
  const [loadingMoreMy, setLoadingMoreMy] = useState(false);

  const [teamPage, setTeamPage] = useState(1);
  const [teamTotal, setTeamTotal] = useState(0);
  const teamLimit = 20;

  // Debounced search state
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(teamSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [teamSearch]);

  useEffect(() => {
    async function fetchFilters() {
      setFiltersLoading(true);
      try {
        const [deptRes, instRes] = await Promise.all([
          fetch("/api/departments"),
          fetch("/api/institutions"),
        ]);
        if (deptRes.ok) {
          const deptData = await deptRes.json();
          setDepartments(deptData.departments || []);
        }
        if (instRes.ok) {
          const instData = await instRes.json();
          setInstitutions(instData.institutions || []);
        }
      } catch {
        // Filters failed to load, continue without them
      }
      setFiltersLoading(false);
    }
    fetchFilters();
  }, []);

  // Reset pagination to page 1 on filter/search changes
  useEffect(() => {
    setMyPage(1);
  }, [dateFrom, dateTo]);

  useEffect(() => {
    setTeamPage(1);
  }, [dateFrom, dateTo, selectedDepartmentId, selectedInstitutionId, debouncedSearch]);

  const fetchAttendance = useCallback(async (targetPage = 1, append = false) => {
    if (!append) {
      setLoading(true);
    } else {
      setLoadingMoreMy(true);
    }
    const params = new URLSearchParams();
    if (dateFrom) params.set("startDate", dateFrom);
    if (dateTo) params.set("endDate", dateTo);
    params.set("page", targetPage.toString());
    params.set("limit", "20");
    const qs = params.toString();

    try {
      const res = await fetch(`/api/attendance/my${qs ? `?${qs}` : ""}`);
      if (res.ok) {
        const data = await res.json();
        setTodayLog(data.todayLog || null);
        
        const newLogs = data.logs || [];
        if (append) {
          setLogs((prev) => {
            const existingIds = new Set(prev.map(l => l.id));
            const filteredNew = newLogs.filter((l: AttendanceLog) => !existingIds.has(l.id));
            return [...prev, ...filteredNew];
          });
        } else {
          setLogs(newLogs);
        }
        
        setMyTotal(data.total || 0);
        const pageVal = data.page || 1;
        const limitVal = data.limit || 20;
        setHasMoreMy(pageVal * limitVal < (data.total || 0));
        setMyPage(targetPage);
      } else {
        toast.error("Failed to load attendance history");
      }
    } catch {
      toast.error("Failed to load attendance history");
    } finally {
      setLoading(false);
      setLoadingMoreMy(false);
    }
  }, [dateFrom, dateTo]);

  const fetchTeamLogs = useCallback(async (targetPage = 1) => {
    setTeamLoading(true);
    const params = new URLSearchParams();
    if (dateFrom) params.set("startDate", dateFrom);
    if (dateTo) params.set("endDate", dateTo);
    if (selectedDepartmentId) params.set("departmentId", selectedDepartmentId);
    if (selectedInstitutionId) params.set("institutionId", selectedInstitutionId);
    if (debouncedSearch) params.set("search", debouncedSearch);
    params.set("page", targetPage.toString());
    params.set("limit", teamLimit.toString());
    const qs = params.toString();

    try {
      const res = await fetch(`/api/attendance/logs${qs ? `?${qs}` : ""}`);
      if (res.ok) {
        const data = await res.json();
        setTeamLogs(data.logs || []);
        setTeamTotal(data.total || 0);
        setTeamPage(targetPage);
      } else {
        toast.error("Failed to load team attendance logs");
      }
    } catch {
      toast.error("Failed to load team attendance logs");
    } finally {
      setTeamLoading(false);
    }
  }, [dateFrom, dateTo, selectedDepartmentId, selectedInstitutionId, debouncedSearch]);

  // Fetch effects triggered by page changes or active tabs
  useEffect(() => {
    if (activeTab === "my") {
      fetchAttendance(myPage, myPage > 1);
    }
  }, [activeTab, dateFrom, dateTo, myPage, fetchAttendance]);

  useEffect(() => {
    if (activeTab === "team") {
      fetchTeamLogs(teamPage);
    }
  }, [activeTab, dateFrom, dateTo, selectedDepartmentId, selectedInstitutionId, debouncedSearch, teamPage, fetchTeamLogs]);

  async function checkOut() {
    setCheckingOut(true);
    const res = await fetch("/api/attendance/check-out", { method: "POST" });
    if (res.ok) {
      toast.success("Checked out successfully!");
      fetchAttendance(1, false);
    } else {
      const d = await res.json();
      toast.error(d.error || "Failed to check out. Please try again.");
    }
    setCheckingOut(false);
  }

  const filteredTeamLogs = teamLogs;

  if (loading) return <div className="flex-1 p-6"><Skeleton className="h-8 w-48" /></div>;

  const tabs: { key: Tab; label: string }[] = [{ key: "my", label: "My Attendance" }];
  if (canViewTeam) tabs.push({ key: "team", label: "Team Overview" });

  return (
    <div className="flex-1 space-y-6 p-6">
      <PageHeader title="Attendance" />

      <div className="flex flex-wrap items-center gap-2">
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-auto max-w-[160px]" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-auto max-w-[160px]" />
        <ExportButton type="attendance" params={{ dateFrom, dateTo }} />
      </div>

      {tabs.length > 1 && (
        <div className="flex gap-1 border-b">
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              variant="ghost"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-none border-b-2 px-4 py-2 text-sm font-medium transition-colors -mb-px ${
                activeTab === tab.key
                  ? "border-primary text-primary hover:text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      )}

      {activeTab === "my" && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Today</CardTitle>
                {todayLog?.checkIn && <Badge variant="success">Active today</Badge>}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4">
                {todayLog ? (
                  <>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Check-in: <span className="font-medium text-foreground">{todayLog.checkIn ? formatTime(todayLog.checkIn) : "\u2014"}</span></p>
                      <p className="text-sm text-muted-foreground">Check-out: <span className="font-medium text-foreground">{todayLog.checkOut ? formatTime(todayLog.checkOut) : "\u2014"}</span></p>
                      {todayLog.lateMinutes ? <p className="text-sm text-muted-foreground">Late by: <span className="font-medium text-warning">{todayLog.lateMinutes} min</span></p> : null}
                      {todayLog.workedMinutes ? <p className="text-sm text-muted-foreground">Worked: <span className="font-medium">{Math.floor(todayLog.workedMinutes / 60)}h {todayLog.workedMinutes % 60}m</span></p> : null}
                    </div>
                    <Badge variant={statusVariant[todayLog.status] || "secondary"} className="capitalize">{todayLog.status}</Badge>
                  </>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10 text-warning">
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Check-in via mobile app</p>
                      <p className="text-xs text-muted-foreground">Use the mobile app with NFC or QR code to check in</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-4 flex items-center gap-3">
                {todayLog && !todayLog.checkOut && (
                  <Button variant="outline" onClick={checkOut} disabled={checkingOut}>
                    <LogOut className="h-4 w-4 mr-1.5" />
                    {checkingOut ? "Checking out..." : "Check Out"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>History</CardTitle></CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <EmptyState
                  icon={<Clock className="h-12 w-12" />}
                  title="No records yet"
                  description="Your attendance history will appear here once you check in."
                />
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <p className="text-sm font-medium">{formatDate(log.date)}</p>
                        <p className="text-xs text-muted-foreground">In: {log.checkIn ? formatTime(log.checkIn) : "\u2014"} &middot; Out: {log.checkOut ? formatTime(log.checkOut) : "\u2014"}</p>
                      </div>
                      <Badge variant={statusVariant[log.status] || "secondary"} className="capitalize">{log.status}</Badge>
                    </div>
                  ))}

                  {hasMoreMy && (
                    <div className="mt-4 flex justify-center">
                      <Button
                        variant="outline"
                        onClick={() => setMyPage((p) => p + 1)}
                        disabled={loadingMoreMy}
                        className="w-full sm:w-auto"
                        aria-label="Load more attendance logs"
                      >
                        {loadingMoreMy ? "Loading..." : "Load More"}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === "team" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Team Attendance</CardTitle>
              <Input
                type="text"
                placeholder="Search by name or ID..."
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                className="w-64"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-muted-foreground">Department:</label>
                <Select
                  value={selectedDepartmentId}
                  onChange={(e) => setSelectedDepartmentId(e.target.value)}
                  disabled={isHod || filtersLoading}
                  className="w-48"
                >
                  <option value="">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-muted-foreground">Institution:</label>
                <Select
                  value={selectedInstitutionId}
                  onChange={(e) => setSelectedInstitutionId(e.target.value)}
                  disabled={isPrincipal || filtersLoading}
                  className="w-48"
                >
                  <option value="">All Institutions</option>
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>{inst.name}</option>
                  ))}
                </Select>
              </div>
            </div>
            {teamLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : filteredTeamLogs.length === 0 ? (
              <EmptyState
                icon={<Clock className="h-12 w-12" />}
                title="No team records"
                description="No attendance records found for the selected date range."
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left font-medium">Employee ID</th>
                        <th className="px-4 py-3 text-left font-medium">Name</th>
                        <th className="px-4 py-3 text-left font-medium">Date</th>
                        <th className="px-4 py-3 text-left font-medium">Check-in</th>
                        <th className="px-4 py-3 text-left font-medium">Check-out</th>
                        <th className="px-4 py-3 text-left font-medium">Status</th>
                        <th className="px-4 py-3 text-left font-medium">Late (min)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTeamLogs.map((log) => (
                        <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-3 text-muted-foreground">{log.employeeId || "\u2014"}</td>
                          <td className="px-4 py-3">{[log.staffName, log.staffLastName].filter(Boolean).join(" ") || "\u2014"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{formatDate(log.date)}</td>
                          <td className="px-4 py-3 text-muted-foreground">{log.checkIn ? formatTime(log.checkIn) : "\u2014"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{log.checkOut ? formatTime(log.checkOut) : "\u2014"}</td>
                          <td className="px-4 py-3"><Badge variant={statusVariant[log.status] || "secondary"} className="capitalize">{log.status}</Badge></td>
                          <td className="px-4 py-3 text-muted-foreground">{log.lateMinutes || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {teamTotal > teamLimit && (
                  <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-4">
                    <p className="text-xs text-muted-foreground">
                      Showing <span className="font-medium">{Math.min(teamTotal, (teamPage - 1) * teamLimit + 1)}</span> to{" "}
                      <span className="font-medium">{Math.min(teamTotal, teamPage * teamLimit)}</span> of{" "}
                      <span className="font-medium">{teamTotal}</span> entries
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTeamPage((p) => Math.max(1, p - 1))}
                        disabled={teamPage === 1 || teamLoading}
                        aria-label="Go to previous page"
                      >
                        Previous
                      </Button>
                      <span className="text-xs text-muted-foreground font-medium">
                        Page {teamPage} of {Math.ceil(teamTotal / teamLimit)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTeamPage((p) => Math.min(Math.ceil(teamTotal / teamLimit), p + 1))}
                        disabled={teamPage >= Math.ceil(teamTotal / teamLimit) || teamLoading}
                        aria-label="Go to next page"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
