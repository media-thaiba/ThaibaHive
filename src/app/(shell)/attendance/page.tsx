"use client";

/**
 * Attendance Page
 * Migrated to TanStack Query (P2-46) and Central API Client (P2-47).
 */

import { useState, useEffect } from "react";
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
import { Clock, LogOut } from "lucide-react";
import { CheckInPanel } from "@/components/attendance/check-in-panel";
import { formatDate, formatTime } from "@/lib/utils";
import { useDepartments, useInstitutions } from "@/lib/hooks/use-shared";
import {
  useTodayAttendance,
  useMyAttendance,
  useTeamAttendance,
  useCheckOut,
  type AttendanceLog,
} from "@/lib/hooks/use-attendance";

const statusVariant: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  present: "success",
  late: "warning",
  absent: "destructive",
  half_day: "warning",
};

type Tab = "my" | "team";

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
  const [dateFrom, setDateFrom] = useState(defaultRange.from);
  const [dateTo, setDateTo] = useState(defaultRange.to);
  const [teamSearch, setTeamSearch] = useState("");

  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>("");

  const [myPage, setMyPage] = useState(1);
  const [teamPage, setTeamPage] = useState(1);
  const teamLimit = 20;

  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(teamSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [teamSearch]);

  // Shared queries
  const { data: departments = [], isLoading: deptsLoading } = useDepartments();
  const { data: institutions = [], isLoading: instsLoading } = useInstitutions();
  const filtersLoading = deptsLoading || instsLoading;

  // Attendance queries
  const { data: todayLog, refetch: refetchToday } = useTodayAttendance();
  const { data: myData, isLoading: loadingMy, refetch: refetchMy } = useMyAttendance({
    dateFrom,
    dateTo,
    page: myPage,
  });
  const { data: teamData, isLoading: teamLoading } = useTeamAttendance(
    {
      dateFrom,
      dateTo,
      page: teamPage,
      search: debouncedSearch,
      departmentId: selectedDepartmentId,
      institutionId: selectedInstitutionId,
    },
    activeTab === "team" && !!canViewTeam
  );

  const checkOutMutation = useCheckOut();

  const logs = myData?.logs || [];
  const myTotal = myData?.pagination?.total || 0;
  const hasMoreMy = myPage * 20 < myTotal;

  const teamLogs = teamData?.logs || [];
  const teamTotal = teamData?.pagination?.total || 0;

  async function checkOut() {
    try {
      await checkOutMutation.mutateAsync();
      toast.success("Checked out successfully!");
      refetchToday();
      refetchMy();
    } catch {
      toast.error("Failed to check out. Please try again.");
    }
  }

  if (loadingMy && activeTab === "my") {
    return <div className="flex-1 p-6 lg:p-8"><Skeleton className="h-8 w-48" /></div>;
  }

  const tabs: { key: Tab; label: string }[] = [{ key: "my", label: "My Attendance" }];
  if (canViewTeam) tabs.push({ key: "team", label: "Team Overview" });

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8">
      <PageHeader title="Attendance" />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setMyPage(1); setTeamPage(1); }} className="w-auto max-w-[160px]" />
          <span className="text-muted-foreground text-xs">to</span>
          <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setMyPage(1); setTeamPage(1); }} className="w-auto max-w-[160px]" />
        </div>
        <ExportButton type="attendance" params={{ dateFrom, dateTo }} />
      </div>

      {/* Tabs */}
      {tabs.length > 1 && (
        <div className="flex gap-0.5 border-b">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative px-4 py-2.5 text-sm font-medium transition-colors -mb-px ${
                activeTab === tab.key
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* My Attendance */}
      {activeTab === "my" && (
        <>
          {/* Today's Status */}
          <Card className="animate-slide-up">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Today</CardTitle>
                {todayLog?.checkIn && <Badge variant="success">Active today</Badge>}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4">
                {todayLog ? (
                  <>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Check-in</p>
                        <p className="text-sm font-semibold">{todayLog.checkIn ? formatTime(todayLog.checkIn) : "\u2014"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Check-out</p>
                        <p className="text-sm font-semibold">{todayLog.checkOut ? formatTime(todayLog.checkOut) : "\u2014"}</p>
                      </div>
                      {todayLog.lateMinutes ? (
                        <div>
                          <p className="text-xs text-muted-foreground">Late by</p>
                          <p className="text-sm font-semibold text-warning">{todayLog.lateMinutes} min</p>
                        </div>
                      ) : null}
                      {todayLog.workedMinutes ? (
                        <div>
                          <p className="text-xs text-muted-foreground">Worked</p>
                          <p className="text-sm font-semibold">{Math.floor(todayLog.workedMinutes / 60)}h {todayLog.workedMinutes % 60}m</p>
                        </div>
                      ) : null}
                    </div>
                    <Badge variant={statusVariant[todayLog.status] || "secondary"} className="capitalize">{todayLog.status}</Badge>
                  </>
                ) : null}
              </div>
              <div className="mt-4">
                {todayLog && !todayLog.checkOut && (
                  <Button variant="outline" onClick={checkOut} disabled={checkOutMutation.isPending}>
                    <LogOut className="h-4 w-4 mr-1.5" />
                    {checkOutMutation.isPending ? "Checking out..." : "Check Out"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {!todayLog && (
            <CheckInPanel
              staff={staff}
              onCheckInComplete={() => { refetchToday(); refetchMy(); }}
            />
          )}

          {/* History */}
          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle className="text-base">History</CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <EmptyState
                  icon={<Clock className="h-12 w-12" />}
                  title="No records yet"
                  description="Your attendance history will appear here once you check in."
                />
              ) : (
                <div className="space-y-2">
                  {logs.map((log: AttendanceLog) => (
                    <div key={log.id} className="flex items-center justify-between rounded-xl border p-3.5 hover:bg-muted/30 transition-colors">
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
                        disabled={loadingMy}
                        className="w-full sm:w-auto"
                        aria-label="Load more attendance logs"
                      >
                        {loadingMy ? "Loading..." : "Load More"}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Team Attendance */}
      {activeTab === "team" && (
        <Card className="animate-slide-up">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-base">Team Attendance</CardTitle>
              <Input
                type="text"
                placeholder="Search by name or ID..."
                value={teamSearch}
                onChange={(e) => { setTeamSearch(e.target.value); setTeamPage(1); }}
                className="w-full sm:w-64"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-muted-foreground">Department:</label>
                <Select
                  value={selectedDepartmentId}
                  onChange={(e) => { setSelectedDepartmentId(e.target.value); setTeamPage(1); }}
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
                <label className="text-xs font-medium text-muted-foreground">Institution:</label>
                <Select
                  value={selectedInstitutionId}
                  onChange={(e) => { setSelectedInstitutionId(e.target.value); setTeamPage(1); }}
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
            ) : teamLogs.length === 0 ? (
              <EmptyState
                icon={<Clock className="h-12 w-12" />}
                title="No team records"
                description="No attendance records found for the selected date range."
              />
            ) : (
              <>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Employee ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Check-in</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Check-out</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Late (min)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamLogs.map((log) => (
                        <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 text-muted-foreground">{log.employeeId || "\u2014"}</td>
                          <td className="px-4 py-3 font-medium">{[log.staffName, log.staffLastName].filter(Boolean).join(" ") || "\u2014"}</td>
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
