"use client";

import React from "react";
import { Eye, Share2, Trash2, CheckSquare, Square } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MediaAsset } from "./media-grid-view";

interface MediaListViewProps {
  assets: MediaAsset[];
  selectedAssetIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onPreview: (asset: MediaAsset) => void;
  onShare: (asset: MediaAsset) => void;
  onDelete: (asset: MediaAsset) => void;
}

export function MediaListView({
  assets,
  selectedAssetIds,
  onToggleSelect,
  onToggleSelectAll,
  onPreview,
  onShare,
  onDelete,
}: MediaListViewProps) {
  const allSelected = assets.length > 0 && selectedAssetIds.size === assets.length;

  return (
    <div className="border rounded-xl bg-card overflow-hidden">
      <table className="w-full text-left text-xs">
        <thead className="bg-muted/40 border-b font-semibold text-muted-foreground">
          <tr>
            <th className="p-3 w-10">
              <button
                type="button"
                onClick={onToggleSelectAll}
                aria-label={allSelected ? "Deselect all files" : "Select all files"}
              >
                {allSelected ? (
                  <CheckSquare className="w-4 h-4 text-primary" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
              </button>
            </th>
            <th className="p-3">Name</th>
            <th className="p-3">Type</th>
            <th className="p-3">Size</th>
            <th className="p-3">Uploaded</th>
            <th className="p-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {assets.map((asset) => {
            const isSelected = selectedAssetIds.has(asset.id);
            return (
              <tr
                key={asset.id}
                className={`hover:bg-muted/20 transition-colors ${
                  isSelected ? "bg-primary/5" : ""
                }`}
              >
                <td className="p-3">
                  <button
                    type="button"
                    onClick={() => onToggleSelect(asset.id)}
                    aria-label={isSelected ? `Deselect ${asset.name}` : `Select ${asset.name}`}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-primary" />
                    ) : (
                      <Square className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </td>
                <td className="p-3">
                  <button
                    type="button"
                    onClick={() => onPreview(asset)}
                    className="font-medium hover:underline text-left truncate max-w-xs block"
                  >
                    {asset.name}
                  </button>
                </td>
                <td className="p-3">
                  <Badge variant="secondary" className="capitalize text-[10px]">
                    {asset.fileType}
                  </Badge>
                </td>
                <td className="p-3 text-muted-foreground font-mono">
                  {(asset.fileSize / (1024 * 1024)).toFixed(1)} MB
                </td>
                <td className="p-3 text-muted-foreground">
                  {new Date(asset.createdAt).toLocaleDateString()}
                </td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onPreview(asset)}
                      title="Preview"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onShare(asset)}
                      title="Share"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => onDelete(asset)}
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
