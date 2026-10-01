"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Upload, Loader2, FileText, FileSpreadsheet, File, Image as ImageIcon } from "lucide-react";

export type CircularFormData = {
  title: string;
  description: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  category: string;
  targetRole: string;
  targetDepartmentId: string;
  targetInstitutionId: string;
};

interface Department {
  id: string;
  name: string;
}

interface Institution {
  id: string;
  name: string;
}

export const roleOptions = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "principal", label: "Principal" },
  { value: "hod", label: "HOD" },
  { value: "staff", label: "Staff" },
];

function getFileIcon(fileType: string | null) {
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
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

interface CircularPublishFormProps {
  form: CircularFormData;
  setForm: React.Dispatch<React.SetStateAction<CircularFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploading: boolean;
  submitting: boolean;
  departments: Department[];
  institutions: Institution[];
}

export function CircularPublishForm({
  form,
  setForm,
  onSubmit,
  onFileUpload,
  uploading,
  submitting,
  departments,
  institutions,
}: CircularPublishFormProps) {
  return (
    <Card className="max-w-2xl border bg-card shadow-sm animate-in fade-in duration-200">
      <CardHeader>
        <CardTitle>Publish a Document</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Dropzone File Selector */}
          <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 bg-muted/20 hover:bg-muted/40 transition-colors relative cursor-pointer group">
            <input
              type="file"
              id="circular-file"
              onChange={onFileUpload}
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
                  <p className="text-sm font-semibold truncate text-foreground">
                    {form.title || "File Uploaded"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {form.fileSize ? formatBytes(form.fileSize) : ""}
                  </p>
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
              aria-label="Document Category"
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
              aria-label="Target Role"
            >
              <option value="">All Roles</option>
              {roleOptions.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Target Audience: Department */}
            <Select
              value={form.targetDepartmentId}
              onChange={(e) => setForm({ ...form, targetDepartmentId: e.target.value })}
              aria-label="Target Department"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>

            {/* Target Audience: Institution */}
            <Select
              value={form.targetInstitutionId}
              onChange={(e) => setForm({ ...form, targetInstitutionId: e.target.value })}
              aria-label="Target Institution"
            >
              <option value="">All Institutions</option>
              {institutions.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </Select>
          </div>

          <Button type="submit" disabled={submitting || uploading} className="w-full">
            {submitting ? "Publishing..." : "Publish Document"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
