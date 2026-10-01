"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/client";
import { ensureArray } from "@/lib/utils";
import { toast } from "sonner";
import { MessageSquare, Plus } from "lucide-react";
import dynamic from "next/dynamic";
import { GrievanceStatCards } from "@/components/grievances/grievance-stat-cards";
import { GrievanceList, Grievance } from "@/components/grievances/grievance-list";
import { useGrievanceStore } from "@/stores";

const GrievanceSubmitDialog = dynamic(
  () => import("@/components/grievances/grievance-submit-dialog").then((m) => m.GrievanceSubmitDialog),
  { ssr: false }
);
const GrievanceDetailDialog = dynamic(
  () => import("@/components/grievances/grievance-detail-dialog").then((m) => m.GrievanceDetailDialog),
  { ssr: false }
);

type Permissions = { role: string; permissions: string[] };

export default function GrievancesPage() {
  const {
    activeTab,
    setActiveTab,
    submitOpen,
    setSubmitOpen,
    submitting,
    setSubmitting,
    form,
    setForm,
    resetForm,
    selected,
    setSelected,
    detailOpen,
    setDetailOpen,
    responding,
    setResponding,
    responseForm,
    setResponseForm,
  } = useGrievanceStore();

  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<Permissions | null>(null);

  const isAdmin = permissions?.role === "super_admin" || permissions?.role === "admin";

  const fetchGrievances = useCallback(async () => {
    setLoading(true);
    const res = await api.get<{ grievances: Grievance[] }>("/api/grievances", { toast: false });
    if (res.ok) {
      setGrievances(ensureArray<Grievance>(res.data?.grievances));
    } else {
      toast.error("Failed to load grievances");
    }
    setLoading(false);
  }, []);

  const fetchPermissions = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/permissions");
      if (res.ok) {
        const data = await res.json();
        if (data.role) setPermissions(data);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchGrievances();
    fetchPermissions();
  }, [fetchGrievances, fetchPermissions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) {
      toast.error("Subject and description are required");
      return;
    }
    setSubmitting(true);
    const res = await api.post("/api/grievances", {
      isAnonymous: form.isAnonymous,
      category: form.category,
      subject: form.subject,
      description: form.description,
    });
    setSubmitting(false);
    if (res.ok) {
      toast.success("Grievance submitted successfully");
      setSubmitOpen(false);
      resetForm();
      fetchGrievances();
    }
  };

  const handleAdminResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setResponding(true);
    const res = await api.patch(`/api/grievances/${selected.id}`, {
      status: responseForm.status,
      response: responseForm.response || undefined,
    });
    setResponding(false);
    if (res.ok) {
      toast.success("Response submitted");
      setDetailOpen(false);
      setSelected(null);
      fetchGrievances();
    }
  };

  const openDetail = (g: Grievance) => {
    setSelected(g);
    setResponseForm({
      status: g.status === "open" ? "in_review" : g.status,
      response: g.response || "",
    });
    setDetailOpen(true);
  };

  const filteredGrievances = grievances.filter((g) => {
    if (activeTab === "mine") return g.staffId !== null && !g.isAnonymous;
    if (activeTab === "open") return g.status === "open" || g.status === "in_review";
    if (activeTab === "resolved") return g.status === "resolved";
    return true;
  });

  const totalCount = grievances.length;
  const openCount = grievances.filter((g) => g.status === "open" || g.status === "in_review").length;
  const resolvedCount = grievances.filter((g) => g.status === "resolved").length;
  const anonymousCount = grievances.filter((g) => g.isAnonymous).length;
  const myCount = grievances.filter((g) => g.staffId !== null && !g.isAnonymous).length;

  if (loading) {
    return (
      <div className="flex-1 p-6 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Grievance &amp; Workplace Feedback
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Submit suggestions, concerns, or anonymous feedback to help improve the workplace.
          </p>
        </div>
        <Button onClick={() => setSubmitOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Submit Grievance
        </Button>
      </div>

      <GrievanceStatCards
        totalCount={totalCount}
        openCount={openCount}
        resolvedCount={resolvedCount}
        anonymousCount={anonymousCount}
      />

      <GrievanceList
        grievances={filteredGrievances}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        totalCount={totalCount}
        myCount={myCount}
        openCount={openCount}
        resolvedCount={resolvedCount}
        onSelectGrievance={openDetail}
      />

      <GrievanceSubmitDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        form={form}
        setForm={setForm}
        onSubmit={handleSubmit}
        submitting={submitting}
      />

      <GrievanceDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        selected={selected}
        isAdmin={isAdmin}
        responseForm={responseForm}
        setResponseForm={setResponseForm}
        onSubmitResponse={handleAdminResponse}
        responding={responding}
      />
    </div>
  );
}
