"use client";

import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  FileText,
  FileSpreadsheet,
  File,
  Image as ImageIcon,
  User,
  Calendar,
  Layers,
  Building,
  Building2,
  Users,
  Eye,
  Download,
} from "lucide-react";
import { roleOptions } from "./circular-publish-form";

export type Circular = {
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

interface Department {
  id: string;
  name: string;
}

interface Institution {
  id: string;
  name: string;
}

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

interface CircularFeedGridProps {
  circulars: Circular[];
  isAdmin: boolean;
  departments: Department[];
  institutions: Institution[];
  onOpenCompliance: (circular: Circular) => void;
}

export function CircularFeedGrid({
  circulars,
  isAdmin,
  departments,
  institutions,
  onOpenCompliance,
}: CircularFeedGridProps) {
  if (circulars.length === 0) {
    return (
      <div className="col-span-full py-8">
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title="No documents found"
          description="Upload files or check filters to find documents."
        />
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {circulars.map((c) => (
        <Card
          key={c.id}
          className="flex flex-col justify-between hover:shadow-md transition-shadow"
        >
          <CardHeader className="pb-2">
            <div className="flex items-start gap-3">
              {getFileIcon(c.fileType)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="outline" className="capitalize text-[10px] py-0">
                    {c.category}
                  </Badge>
                  {c.fileSize && (
                    <span className="text-[10px] text-muted-foreground">
                      {formatBytes(c.fileSize)}
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-sm truncate mt-1" title={c.title}>
                  {c.title}
                </h3>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0 text-xs">
            {c.description ? (
              <p className="text-muted-foreground line-clamp-2 h-8">{c.description}</p>
            ) : (
              <p className="text-muted-foreground/45 italic line-clamp-2 h-8">
                No description provided
              </p>
            )}

            {/* Targeting Details (for admins/HODs) */}
            {isAdmin && (c.targetRole || c.targetDepartmentId || c.targetInstitutionId) && (
              <div className="p-2 rounded bg-muted/40 space-y-1 text-[10px] text-muted-foreground">
                <p className="font-medium text-foreground flex items-center gap-1">
                  <Layers className="h-3 w-3" /> Target Audience:
                </p>
                {c.targetRole && (
                  <span className="inline-flex items-center gap-1 bg-background border px-1 rounded mr-1">
                    <Users className="h-2.5 w-2.5" />{" "}
                    {roleOptions.find((r) => r.value === c.targetRole)?.label || c.targetRole}
                  </span>
                )}
                {c.targetDepartmentId && departments.length > 0 && (
                  <span className="inline-flex items-center gap-1 bg-background border px-1 rounded mr-1">
                    <Layers className="h-2.5 w-2.5" />{" "}
                    {departments.find((d) => d.id === c.targetDepartmentId)?.name || "Department"}
                  </span>
                )}
                {c.targetInstitutionId && institutions.length > 0 && (
                  <span className="inline-flex items-center gap-1 bg-background border px-1 rounded mr-1">
                    <Building className="h-2.5 w-2.5" />{" "}
                    {institutions.find((i) => i.id === c.targetInstitutionId)?.name || "Institution"}
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

                {/* Campus Compliance Tracker Button for Coordinators & Admins */}
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-[10px] gap-1 text-primary border-primary/30 hover:bg-primary/10"
                    onClick={() => onOpenCompliance(c)}
                    title="View Campus Compliance"
                  >
                    <Building2 className="h-3 w-3" />
                    Compliance
                  </Button>
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
    </div>
  );
}
