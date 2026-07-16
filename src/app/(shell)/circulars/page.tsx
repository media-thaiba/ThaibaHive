"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  FileText, 
  File, 
  Image as ImageIcon, 
  FileSpreadsheet, 
  Download, 
  Search, 
  Plus, 
  Upload,
  User,
  Calendar,
  Layers,
  Building,
  Users,
  Eye,
  Loader2
} from "lucide-react";

type Circular = {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string;
  fileType: string | null;
  fileSize: number | null;
  category: string;
  targetRole?: string | null;
  targetDepartmentId?: string | null;
  targetInstitutionId?: string | null;
  uploadedByName: string;
  uploadedByLastName: string;
  createdAt: string;
  downloadCount?: number;
};

type Department = { id: string; name: string };
type Institution = { id: string; name: string };
type Permissions = { role: string; permissions: string[] };

const roleOptions = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "principal", label: "Principal" },
  { value: "hod", label: "HOD" },
  { value: "staff", label: "Staff" },
];

export default function CircularsPage() {
  const [circulars, setCirculars] = useState<Circular[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // Form State
  const [form, setForm] = useState({
    title: "",
    description: "",
    fileUrl: "",
    fileType: "pdf",
    fileSize: 0,
    category: "general",
    targetRole: "",
    targetDepartmentId: "",
    targetInstitutionId: "",
  });

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
        // Determine file type category from name or type
        const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
        let resolvedType = "other";
        if (["pdf"].includes(ext)) resolvedType = "pdf";
        else if (["doc", "docx"].includes(ext)) resolvedType = "doc";
        else if (["xls", "xlsx", "csv"].includes(ext)) resolvedType = "xls";
        else if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) resolvedType = "image";

        setForm((prev) => ({
          ...prev,
          title: prev.title || file.name.replace(/\.[^/.]+$/, ""), // Autofill title
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
        setForm({
          title: "",
          description: "",
          fileUrl: "",
          fileType: "pdf",
          fileSize: 0,
          category: "general",
          targetRole: "",
          targetDepartmentId: "",
          targetInstitutionId: "",
        });
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

  const getFileIcon = (fileType: string | null) => {
    switch (fileType?.toLowerCase()) {
      case "pdf":
        return <FileText className="h-8 w-8 text-rose-500 shrink-0" />;
      case "xls":
      case "xlsx":
        return <FileSpreadsheet className="h-8 w-8 text-emerald-500 shrink-0" />;
      case "doc":
      case "docx":
        return <File className="h-8 w-8 text-blue-500 shrink-0" />;
      case "image":
        return <ImageIcon className="h-8 w-8 text-violet-500 shrink-0" />;
      default:
        return <File className="h-8 w-8 text-muted-foreground shrink-0" />;
    }
  };

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
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
        <h1 className="text-2xl font-bold">Circulars & Documents</h1>
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
        <Card className="max-w-2xl border bg-card shadow-sm animate-in fade-in duration-200">
          <CardHeader>
            <CardTitle>Publish a Document</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Dropzone File Selector */}
              <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 bg-muted/20 hover:bg-muted/40 transition-colors relative cursor-pointer group">
                <input
                  type="file"
                  id="circular-file"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={uploading}
                />
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm font-medium">Uploading file to server...</p>
                  </div>
                ) : form.fileUrl ? (
                  <div className="flex items-center gap-3 w-full">
                    {getFileIcon(form.fileType)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate text-foreground">{form.title || "File Uploaded"}</p>
                      <p className="text-xs text-muted-foreground">{form.fileSize ? formatBytes(form.fileSize) : ""}</p>
                    </div>
                    <Badge variant="success">Uploaded</Badge>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                    <p className="text-sm font-semibold">Click or drag file here to upload</p>
                    <p className="text-xs text-muted-foreground">PDF, Word, Excel, Images up to 2GB</p>
                  </div>
                )}
              </div>

              {/* Title & Description */}
              <Input
                placeholder="Document Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />

              <Textarea
                placeholder="Description / Purpose of this document..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />

              <div className="grid grid-cols-2 gap-3">
                {/* File Type Category */}
                <Select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  <option value="general">General</option>
                  <option value="policy">Policy / HR</option>
                  <option value="circular">Circular</option>
                  <option value="form">Form Template</option>
                  <option value="notice">Official Notice</option>
                </Select>

                {/* Target Audience: Role */}
                <Select
                  value={form.targetRole}
                  onChange={(e) => setForm({ ...form, targetRole: e.target.value })}
                >
                  <option value="">All Roles</option>
                  {roleOptions.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Target Audience: Department */}
                <Select
                  value={form.targetDepartmentId}
                  onChange={(e) => setForm({ ...form, targetDepartmentId: e.target.value })}
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </Select>

                {/* Target Audience: Institution */}
                <Select
                  value={form.targetInstitutionId}
                  onChange={(e) => setForm({ ...form, targetInstitutionId: e.target.value })}
                >
                  <option value="">All Institutions</option>
                  {institutions.map((i) => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </Select>
              </div>

              <Button type="submit" disabled={submitting || uploading} className="w-full">
                {submitting ? "Publishing..." : "Publish Document"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filter Bar */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          className="w-48"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
      </div>

      {/* List Layout with Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => (
          <Card key={c.id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start gap-3">
                {getFileIcon(c.fileType)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className="capitalize text-[10px] py-0">{c.category}</Badge>
                    {c.fileSize && (
                      <span className="text-[10px] text-muted-foreground">{formatBytes(c.fileSize)}</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm truncate mt-1" title={c.title}>{c.title}</h3>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0 text-xs">
              {c.description ? (
                <p className="text-muted-foreground line-clamp-2 h-8">{c.description}</p>
              ) : (
                <p className="text-muted-foreground/45 italic line-clamp-2 h-8">No description provided</p>
              )}

              {/* Targeting Details (for admins/HODs) */}
              {isAdmin && (c.targetRole || c.targetDepartmentId || c.targetInstitutionId) && (
                <div className="p-2 rounded bg-muted/40 space-y-1 text-[10px] text-muted-foreground">
                  <p className="font-medium text-foreground flex items-center gap-1">
                    <Layers className="h-3 w-3" /> Target Audience:
                  </p>
                  {c.targetRole && (
                    <span className="inline-flex items-center gap-1 bg-background border px-1 rounded mr-1">
                      <Users className="h-2.5 w-2.5" /> {roleOptions.find(r => r.value === c.targetRole)?.label || c.targetRole}
                    </span>
                  )}
                  {c.targetDepartmentId && departments.length > 0 && (
                    <span className="inline-flex items-center gap-1 bg-background border px-1 rounded mr-1">
                      <Layers className="h-2.5 w-2.5" /> {departments.find(d => d.id === c.targetDepartmentId)?.name || "Department"}
                    </span>
                  )}
                  {c.targetInstitutionId && institutions.length > 0 && (
                    <span className="inline-flex items-center gap-1 bg-background border px-1 rounded mr-1">
                      <Building className="h-2.5 w-2.5" /> {institutions.find(i => i.id === c.targetInstitutionId)?.name || "Institution"}
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between text-muted-foreground border-t pt-2 mt-auto">
                <div className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-1 text-[10px]">
                    <User className="h-3 w-3" /> {c.uploadedByName} {c.uploadedByLastName}
                  </span>
                  <span className="flex items-center gap-1 text-[9px]">
                    <Calendar className="h-3 w-3" /> {c.createdAt?.split("T")[0]}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {isAdmin && c.downloadCount !== undefined && (
                    <span className="flex items-center gap-1 text-[10px] text-foreground font-medium bg-muted px-1.5 py-0.5 rounded">
                      <Eye className="h-3 w-3" /> {c.downloadCount} downloads
                    </span>
                  )}
                  {/* Download Tracking Link */}
                  <a
                    href={`/api/circulars/${c.id}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                    title="Download Document"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-8">
            <EmptyState
              icon={<FileText className="h-12 w-12" />}
              title="No documents found"
              description="Upload files or check filters to find documents."
            />
          </div>
        )}
      </div>
    </div>
  );
}
