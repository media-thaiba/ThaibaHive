"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, Download } from "lucide-react";
import { ensureArray } from "@/lib/utils";
import { ReportList } from "@/components/reports/report-list";
import { ReportFormDialog } from "@/components/reports/report-form-dialog";
import { ReportDetailDialog } from "@/components/reports/report-detail-dialog";

type DailyReport = {
  id: string;
  staffId: string;
  date: string;
  summary: string | null;
  status: string;
  reviewerComment: string | null;
  firstName?: string;
  lastName?: string;
  createdAt: string;
};

export default function ReportsPage() {
  const { staff } = useAuth();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"my" | "team">("my");

  const [showForm, setShowForm] = useState(false);
  const [editingReport, setEditingReport] = useState<DailyReport | null>(null);
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);

  const isHodOrAdmin = staff ? ["super_admin", "admin", "hod"].includes(staff.role) : false;
  const teamReportsPending = reports.filter(r => r.staffId !== staff?.id && r.status === "submitted").length;

  const fetchReports = () => {
    setLoading(true);
    fetch("/api/reports")
      .then((r) => r.ok ? r.json() : { reports: [] })
      .then((data) => setReports(ensureArray(data.reports)))
      .catch(() => toast.error("Failed to load daily reports"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchReports(); }, []);

  if (loading && reports.length === 0) {
    return (
      <div className="flex-1 space-y-4 p-6 lg:p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Daily Activity Logs"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => window.open("/api/export?type=staff", "_blank")} className="gap-1.5">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button onClick={() => { setEditingReport(null); setShowForm(true); }} className="gap-1.5">
              <Plus className="h-4 w-4" /> New Report
            </Button>
          </div>
        }
      />

      {isHodOrAdmin && (
        <div className="flex gap-2 border-b pb-px">
          <Button variant={activeTab === "my" ? "secondary" : "ghost"} size="sm" onClick={() => setActiveTab("my")} className="font-medium">
            My Reports
          </Button>
          <Button variant={activeTab === "team" ? "secondary" : "ghost"} size="sm" onClick={() => setActiveTab("team")} className="font-medium">
            Team Reports ({teamReportsPending} Pending)
          </Button>
        </div>
      )}

      <ReportList
        reports={reports}
        activeTab={activeTab}
        staffId={staff?.id}
        onViewReport={setSelectedReport}
        onEditReport={(r) => { setEditingReport(r); setShowForm(true); }}
      />

      <ReportFormDialog
        open={showForm}
        onOpenChange={(open) => { setShowForm(open); if (!open) setEditingReport(null); }}
        editingReport={editingReport}
        onSubmitted={fetchReports}
      />

      <ReportDetailDialog
        report={selectedReport}
        isHodOrAdmin={isHodOrAdmin}
        currentStaffId={staff?.id}
        onClose={() => setSelectedReport(null)}
        onReviewed={fetchReports}
      />
    </div>
  );
}
