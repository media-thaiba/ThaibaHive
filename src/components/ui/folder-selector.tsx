"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FolderTree, FolderNode } from "./folder-tree";
import { FolderInput, ArrowRight } from "lucide-react";

interface FolderSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: FolderNode[];
  currentFolderId?: string | null;
  onSelectTarget: (targetFolderId: string | null) => void;
}

export function FolderSelector({
  open,
  onOpenChange,
  folders,
  currentFolderId = null,
  onSelectTarget,
}: FolderSelectorProps) {
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  const handleConfirm = () => {
    onSelectTarget(selectedTargetId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <FolderInput className="w-5 h-5 text-primary" />
            <DialogTitle>Move Items</DialogTitle>
          </div>
          <DialogDescription>
            Select destination folder for the selected file(s).
          </DialogDescription>
        </DialogHeader>

        <div className="border rounded-xl p-3 max-h-60 overflow-y-auto bg-muted/20">
          <FolderTree
            folders={folders}
            selectedFolderId={selectedTargetId}
            onSelectFolder={setSelectedTargetId}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedTargetId === currentFolderId}
            className="gap-2"
          >
            Move Here
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
