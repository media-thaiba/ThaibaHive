"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { CircularComplianceDrawer } from "@/components/circulars/CircularComplianceDrawer";
import { Plus } from "lucide-react";
import { CircularFilterBar } from "@/components/circulars/circular-filter-bar";
import { CircularPublishForm } from "@/components/circulars/circular-publish-form";
import { CircularFeedGrid, Circular } from "@/components/circulars/circular-feed-grid";
import { useCircularStore } from "@/stores";

type Department = { id: string; name: string };
type Institution = { id: string; name: string };
type Permissions = { role: string; permissions: string[] };

export default function CircularsPage() {
  const {
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    showForm,
    setShowForm,
    form,
    setForm,
    resetForm,
    uploading,
    setUploading,
    submitting,
    setSubmitting,
    selectedComplianceCircular,
    setSelectedComplianceCircular,
    isComplianceOpen,
    setIsComplianceOpen,
  } = useCircularStore();

  const [circulars, setCirculars] = useState<Circular[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [departments, setDepartments] = useState<Department[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [permissions, setPermissions] = useState<Permissions | null>(null);

  const canCreate = permissions?.role === "super_admin" || (permissions?.permissions.includes("circulars:create") ?? false);
  const isAdmin = permissions?.role === "super_admin" || (permissions?.permissions.includes("announcements:manage") ?? false);

  const fetchData = useCallback(async () => {
    try {
      const [circData, deptsData, instsData, permsData] = await Promise.all([
        fetch("/api/circulars").then((r) => r.json()),
        fetch("/api/departments").then((r) => r.json()).catch(() => ({ departments: [] })),
        fetch("/api/institutions").then((r) => r.json()).catch(() => ({ institutions: [] })),
        fetch("/api/auth/permissions").then((r) => r.json()).catch(() => ({ permissions: [], role: "" })),
      ]);

      setCirculars(Array.isArray(circData.circulars) ? circData.circulars : []);
      setDepartments(Array.isArray(deptsData.departments) ? deptsData.departments : []);
      setInstitutions(Array.isArray(instsData.institutions) ? instsData.institutions : []);
      if (permsData.role) setPermissions(permsData);
    } catch {
      setError("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
        let resolvedType = "other";
        if (["pdf"].includes(ext)) resolvedType = "pdf";
        else if (["doc", "docx"].includes(ext)) resolvedType = "doc";
        else if (["xls", "xlsx", "csv"].includes(ext)) resolvedType = "xls";
        else if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) resolvedType = "image";

        setForm((prev) => ({
          ...prev,
          title: prev.title || file.name.replace(/\.[^/.]+$/, ""),
          fileUrl: data.url,
          fileType: resolvedType,
          fileSize: file.size,
        }));
        toast.success("File uploaded successfully");
      } else {
        const d = await res.json();
        setError(d.error || "Failed to upload file");
      }
    } catch {
      setError("File upload failed due to network error");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fileUrl) {
      setError("Please upload a file first");
      return;
    }

    setError("");
    setSuccess("");
    setSubmitting(true);

    const payload = {
      title: form.title,
      description: form.description || undefined,
      fileUrl: form.fileUrl,
      fileType: form.fileType,
      fileSize: form.fileSize || undefined,
      category: form.category,
      targetRole: form.targetRole || undefined,
      targetDepartmentId: form.targetDepartmentId || undefined,
      targetInstitutionId: form.targetInstitutionId || undefined,
    };

    try {
      const res = await fetch("/api/circulars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSuccess("Document published successfully.");
        toast.success("Document published successfully");
        setShowForm(false);
        resetForm();
        fetchData();
      } else {
        const d = await res.json();
        setError(d.error || "Failed to publish document. Please try again.");
      }
    } catch {
      setError("Failed to publish document due to a network error.");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = circulars.filter(
    (c) =>
      (c.title.toLowerCase().includes(search.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(search.toLowerCase())) ||
        c.category.toLowerCase().includes(search.toLowerCase())) &&
      (categoryFilter === "" || c.category === categoryFilter)
  );

  const categories = [...new Set(circulars.map((c) => c.category))];

  if (loading) {
    return (
      <div className="flex-1 p-6 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Circulars &amp; Documents</h1>
        {canCreate && (
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : <><Plus className="h-4 w-4 mr-1.5" /> Upload Document</>}
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="error" onDismiss={() => setError("")}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" onDismiss={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      {showForm && canCreate && (
        <CircularPublishForm
          form={form}
          setForm={setForm}
          onSubmit={handleSubmit}
          onFileUpload={handleFileUpload}
          uploading={uploading}
          submitting={submitting}
          departments={departments}
          institutions={institutions}
        />
      )}

      <CircularFilterBar
        search={search}
        onSearchChange={setSearch}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        categories={categories}
      />

      <CircularFeedGrid
        circulars={filtered}
        isAdmin={isAdmin}
        departments={departments}
        institutions={institutions}
        onOpenCompliance={(c) => {
          setSelectedComplianceCircular(c);
          setIsComplianceOpen(true);
        }}
      />

      {/* Campus Compliance Summary Drawer */}
      <CircularComplianceDrawer
        open={isComplianceOpen}
        onOpenChange={setIsComplianceOpen}
        circularId={selectedComplianceCircular?.id || null}
        circularTitle={selectedComplianceCircular?.title || ""}
        canManage={isAdmin}
      />
    </div>
  );
}
