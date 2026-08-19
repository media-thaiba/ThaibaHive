"use client";

import React from "react";
import { HardDrive, Calendar, User, FileType, Image as ImageIcon, Video,  } from "lucide-react";

export type AssetMetadata = {
  id: string;
  name: string;
  fileSize: number;
  mimeType: string;
  fileType: string;
  fileUrl: string;
  thumbnailUrl?: string | null;
  createdAt: string;
  createdByName?: string | null;
  dimensions?: { width: number; height: number };
  duration?: number;
};

interface MetadataPanelProps {
  asset: AssetMetadata;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function MetadataPanel({ asset }: MetadataPanelProps) {
  return (
    <div className="space-y-4 text-xs text-foreground bg-card border rounded-xl p-4">
      <h4 className="font-semibold text-sm border-b pb-2">File Details</h4>
      
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FileType className="w-4 h-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-muted-foreground text-[11px]">File Name</p>
            <p className="font-medium truncate break-all">{asset.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-muted-foreground text-[11px]">Size</p>
            <p className="font-medium">{formatBytes(asset.fileSize)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <FileType className="w-4 h-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-muted-foreground text-[11px]">MIME Type</p>
            <p className="font-mono text-[11px]">{asset.mimeType || asset.fileType}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-muted-foreground text-[11px]">Uploaded At</p>
            <p className="font-medium">{formatDate(asset.createdAt)}</p>
          </div>
        </div>

        {asset.createdByName && (
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-muted-foreground text-[11px]">Uploaded By</p>
              <p className="font-medium">{asset.createdByName}</p>
            </div>
          </div>
        )}

        {asset.dimensions && (
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-muted-foreground text-[11px]">Dimensions</p>
              <p className="font-medium">{asset.dimensions.width} x {asset.dimensions.height} px</p>
            </div>
          </div>
        )}

        {asset.duration && (
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-muted-foreground text-[11px]">Duration</p>
              <p className="font-medium">{Math.round(asset.duration)} seconds</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
