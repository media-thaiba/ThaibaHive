"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropzone } from "@/components/ui/dropzone";
import { UploadProgress, UploadItem } from "@/components/ui/upload-progress";
import { FilePreview } from "@/components/ui/file-preview";
import { ShareDialog } from "@/components/ui/share-dialog";
import { FolderSelector } from "@/components/ui/folder-selector";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DownloadProgress } from "@/components/ui/download-progress";
import { FolderNode } from "@/components/ui/folder-tree";
import { AssetMetadata } from "@/components/ui/metadata-panel";
import { MediaAsset } from "./media-grid-view";

interface MediaModalsProps {
  showUploadModal: boolean;
  setShowUploadModal: (open: boolean) => void;
  onFilesSelected: (files: File[]) => void;
  uploadQueue: UploadItem[];
  setUploadQueue: React.Dispatch<React.SetStateAction<UploadItem[]>>;
  showNewFolderModal: boolean;
  setShowNewFolderModal: (open: boolean) => void;
  newFolderName: string;
  setNewFolderName: (name: string) => void;
  handleCreateFolder: (e: React.FormEvent) => void;
  folderToRename: FolderNode | null;
  setFolderToRename: (folder: FolderNode | null) => void;
  renameFolderName: string;
  setRenameFolderName: (name: string) => void;
  handleRenameFolder: (e: React.FormEvent) => void;
  previewAsset: AssetMetadata | null;
  setPreviewAsset: (asset: AssetMetadata | null) => void;
  shareTarget: { assetId?: string; folderId?: string; name: string } | null;
  showShareModal: boolean;
  setShowShareModal: (open: boolean) => void;
  setShareTarget: (target: { assetId?: string; folderId?: string; name: string } | null) => void;
  showMoveModal: boolean;
  setShowMoveModal: (open: boolean) => void;
  folderTreeNodes: FolderNode[];
  assetToMove: MediaAsset | null;
  handleMoveAsset: (targetFolderId: string | null) => void;
  deleteConfirmTarget: { type: "asset" | "folder" | "batch"; target: any } | null;
  setDeleteConfirmTarget: (target: { type: "asset" | "folder" | "batch"; target: any } | null) => void;
  executeDeleteAsset: (asset: MediaAsset) => Promise<void>;
  executeDeleteFolder: (folder: FolderNode) => Promise<void>;
  executeBatchDelete: (assetIds: string[]) => Promise<void>;
  isDownloadingZip: boolean;
  selectedAssetCount: number;
}

export function MediaModals({
  showUploadModal,
  setShowUploadModal,
  onFilesSelected,
  uploadQueue,
  setUploadQueue,
  showNewFolderModal,
  setShowNewFolderModal,
  newFolderName,
  setNewFolderName,
  handleCreateFolder,
  folderToRename,
  setFolderToRename,
  renameFolderName,
  setRenameFolderName,
  handleRenameFolder,
  previewAsset,
  setPreviewAsset,
  shareTarget,
  showShareModal,
  setShowShareModal,
  setShareTarget,
  showMoveModal,
  setShowMoveModal,
  folderTreeNodes,
  assetToMove,
  handleMoveAsset,
  deleteConfirmTarget,
  setDeleteConfirmTarget,
  executeDeleteAsset,
  executeDeleteFolder,
  executeBatchDelete,
  isDownloadingZip,
  selectedAssetCount,
}: MediaModalsProps) {
  return (
    <>
      {/* Upload Dialog Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Dropzone onFilesSelected={onFilesSelected} />
            <UploadProgress
              items={uploadQueue}
              onClearCompleted={() =>
                setUploadQueue((prev) => prev.filter((i) => i.status !== "completed"))
              }
              onCancelAll={() => setUploadQueue([])}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Create New Folder Modal */}
      <Dialog open={showNewFolderModal} onOpenChange={setShowNewFolderModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateFolder} className="space-y-4">
            <div className="space-y-2">
              <Label>Folder Name</Label>
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name..."
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewFolderModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!newFolderName.trim()}>
                Create
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rename Folder Modal */}
      <Dialog
        open={!!folderToRename}
        onOpenChange={(open) => !open && setFolderToRename(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRenameFolder} className="space-y-4">
            <div className="space-y-2">
              <Label>Folder Name</Label>
              <Input
                value={renameFolderName}
                onChange={(e) => setRenameFolderName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFolderToRename(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!renameFolderName.trim()}>
                Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* File Preview Modal */}
      <FilePreview
        open={!!previewAsset}
        onOpenChange={(open) => !open && setPreviewAsset(null)}
        asset={previewAsset}
        onShare={(asset) => {
          setPreviewAsset(null);
          setShareTarget({ assetId: asset.id, name: asset.name });
          setShowShareModal(true);
        }}
        onDownload={(asset) => {
          const a = document.createElement("a");
          a.href = asset.fileUrl;
          a.download = asset.name;
          a.click();
        }}
      />

      {/* Share Dialog */}
      {shareTarget && (
        <ShareDialog
          open={showShareModal}
          onOpenChange={setShowShareModal}
          assetId={shareTarget.assetId}
          folderId={shareTarget.folderId}
          itemName={shareTarget.name}
        />
      )}

      {/* Move Selector Dialog */}
      <FolderSelector
        open={showMoveModal}
        onOpenChange={setShowMoveModal}
        folders={folderTreeNodes}
        currentFolderId={assetToMove?.folderId}
        onSelectTarget={handleMoveAsset}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteConfirmTarget}
        onOpenChange={(open) => !open && setDeleteConfirmTarget(null)}
        title="Confirm Deletion"
        description="Are you sure you want to delete this item? This action cannot be undone."
        onConfirm={async () => {
          if (!deleteConfirmTarget) return;
          if (deleteConfirmTarget.type === "asset") {
            await executeDeleteAsset(deleteConfirmTarget.target);
          } else if (deleteConfirmTarget.type === "folder") {
            await executeDeleteFolder(deleteConfirmTarget.target);
          } else if (deleteConfirmTarget.type === "batch") {
            await executeBatchDelete(deleteConfirmTarget.target);
          }
          setDeleteConfirmTarget(null);
        }}
      />

      {/* ZIP Download Progress Overlay */}
      <DownloadProgress
        isDownloading={isDownloadingZip}
        itemCount={selectedAssetCount}
      />
    </>
  );
}
