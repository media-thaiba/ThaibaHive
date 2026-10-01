"use client";

import React from "react";
import {
  Film,
  Share2,
  Trash2,
  FolderInput,
  CheckSquare,
  Square,
  FileIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type MediaAsset = {
  id: string;
  name: string;
  fileUrl: string;
  thumbnailUrl?: string | null;
  fileSize: number;
  mimeType: string;
  fileType: string;
  status: "ready" | "processing" | "failed";
  folderId?: string | null;
  tags?: string[] | null;
  createdById?: string;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
};

interface MediaGridViewProps {
  assets: MediaAsset[];
  selectedAssetIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onPreview: (asset: MediaAsset) => void;
  onShare: (asset: MediaAsset) => void;
  onMove: (asset: MediaAsset) => void;
  onDelete: (asset: MediaAsset) => void;
}

export function MediaGridView({
  assets,
  selectedAssetIds,
  onToggleSelect,
  onPreview,
  onShare,
  onMove,
  onDelete,
}: MediaGridViewProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {assets.map((asset) => {
        const isSelected = selectedAssetIds.has(asset.id);
        const isImage = asset.mimeType?.startsWith("image/");
        const isVideo = asset.mimeType?.startsWith("video/");

        return (
          <Card
            key={asset.id}
            className={`group relative overflow-hidden rounded-xl border transition-all hover:shadow-md ${
              isSelected ? "ring-2 ring-primary border-primary bg-primary/5" : ""
            }`}
          >
            {/* Checkbox Overlay */}
            <button
              type="button"
              onClick={() => onToggleSelect(asset.id)}
              className="absolute top-2 left-2 z-10 p-1 rounded-md bg-black/40 text-white backdrop-blur hover:bg-black/60 transition-colors"
              aria-label={isSelected ? `Deselect ${asset.name}` : `Select ${asset.name}`}
            >
              {isSelected ? (
                <CheckSquare className="w-4 h-4 text-primary fill-primary-foreground" />
              ) : (
                <Square className="w-4 h-4 opacity-70" />
              )}
            </button>

            {/* Asset Preview Thumbnail */}
            <div
              onClick={() => onPreview(asset)}
              className="aspect-square bg-muted/30 relative cursor-pointer overflow-hidden flex items-center justify-center"
            >
              {isImage ? (
                /* eslint-disable-next-html-element-suppression */
                <img
                  src={asset.fileUrl}
                  alt={asset.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : isVideo ? (
                <div className="flex flex-col items-center gap-1 text-purple-500">
                  <Film className="w-8 h-8" />
                  <span className="text-[10px] font-mono uppercase bg-purple-500/10 px-1.5 py-0.5 rounded">
                    Video
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 text-amber-500">
                  <FileIcon className="w-8 h-8" />
                  <span className="text-[10px] font-mono uppercase bg-amber-500/10 px-1.5 py-0.5 rounded">
                    {asset.fileType}
                  </span>
                </div>
              )}
            </div>

            {/* Card Footer Info */}
            <div className="p-2.5 flex items-center justify-between gap-2 border-t bg-card">
              <div className="min-w-0 flex-1" onClick={() => onPreview(asset)}>
                <p className="text-xs font-medium truncate cursor-pointer hover:text-primary">
                  {asset.name}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {(asset.fileSize / (1024 * 1024)).toFixed(1)} MB
                </p>
              </div>

              {/* Action Menu Buttons */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={() => onShare(asset)}
                  title="Share"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={() => onMove(asset)}
                  title="Move"
                >
                  <FolderInput className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => onDelete(asset)}
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
