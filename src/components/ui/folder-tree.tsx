"use client";

import React, { useState } from "react";
import { Folder, FolderOpen, ChevronRight, ChevronDown, Plus, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type FolderNode = {
  id: string;
  name: string;
  parentId?: string | null;
  children?: FolderNode[];
};

interface FolderTreeProps {
  folders: FolderNode[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder?: (parentId: string | null) => void;
  onRenameFolder?: (folder: FolderNode) => void;
  onDeleteFolder?: (folder: FolderNode) => void;
}

export function FolderTree({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: FolderTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderNodes = (nodes: FolderNode[], level = 0) => {
    return nodes.map((folder) => {
      const isExpanded = expandedIds[folder.id];
      const isSelected = selectedFolderId === folder.id;
      const hasChildren = folder.children && folder.children.length > 0;

      return (
        <div key={folder.id} className="select-none">
          <div
            onClick={() => onSelectFolder(folder.id)}
            style={{ paddingLeft: `${level * 16 + 8}px` }}
            className={`group flex items-center justify-between py-1.5 pr-2 rounded-lg cursor-pointer text-sm transition-colors ${
              isSelected
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              {hasChildren ? (
                <button
                  type="button"
                  onClick={(e) => toggleExpand(folder.id, e)}
                  className="p-0.5 hover:bg-muted rounded"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>
              ) : (
                <span className="w-4" />
              )}
              {isSelected ? (
                <FolderOpen className="w-4 h-4 text-primary shrink-0" />
              ) : (
                <Folder className="w-4 h-4 shrink-0" />
              )}
              <span className="truncate">{folder.name}</span>
            </div>

            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
              {onCreateFolder && (
                <button
                  type="button"
                  title="Create Subfolder"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateFolder(folder.id);
                  }}
                  className="p-1 text-muted-foreground hover:text-foreground rounded"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
              {onRenameFolder && (
                <button
                  type="button"
                  title="Rename Folder"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRenameFolder(folder);
                  }}
                  className="p-1 text-muted-foreground hover:text-foreground rounded"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
              {onDeleteFolder && (
                <button
                  type="button"
                  title="Delete Folder"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFolder(folder);
                  }}
                  className="p-1 text-muted-foreground hover:text-destructive rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {hasChildren && isExpanded && (
            <div>{renderNodes(folder.children!, level + 1)}</div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="space-y-1">
      <div
        onClick={() => onSelectFolder(null)}
        className={`flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer text-sm font-medium transition-colors ${
          selectedFolderId === null
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
        }`}
      >
        <div className="flex items-center gap-2">
          <Folder className="w-4 h-4" />
          <span>All Media</span>
        </div>
        {onCreateFolder && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onCreateFolder(null);
            }}
            title="Create Root Folder"
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      <div className="mt-1">{renderNodes(folders)}</div>
    </div>
  );
}
