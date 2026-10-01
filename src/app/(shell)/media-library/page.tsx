"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Folder, FolderPlus, HardDrive, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/client";
import { toast } from "sonner";

// Supporting UI components
import { UploadItem } from "@/components/ui/upload-progress";
import { FolderTree, FolderNode } from "@/components/ui/folder-tree";
import { BreadcrumbItem } from "@/components/ui/breadcrumbs";

import dynamic from "next/dynamic";
import { MediaToolbar } from "@/components/media-library/media-toolbar";
import { MediaGridView, MediaAsset } from "@/components/media-library/media-grid-view";
import { MediaListView } from "@/components/media-library/media-list-view";
import { useMediaStore } from "@/stores";

const MediaModals = dynamic(
  () => import("@/components/media-library/media-modals").then((m) => m.MediaModals),
  { ssr: false }
);

export type { MediaAsset };

export type MediaFolder = {
  id: string;
  name: string;
  parentId?: string | null;
  departmentId?: string | null;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
};

const ITEMS_PER_PAGE = 50;

export default function MediaLibraryPage() {
  const {
    activeFolderId,
    setActiveFolderId,
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    viewMode,
    setViewMode,
    page,
    setPage,
    selectedAssetIds,
    toggleSelectAsset,
    toggleSelectAll,
    isDownloadingZip,
    setIsDownloadingZip,
    uploadQueue,
    setUploadQueue,
    showUploadModal,
    setShowUploadModal,
    previewAsset,
    setPreviewAsset,
    shareTarget,
    setShareTarget,
    showShareModal,
    setShowShareModal,
    newFolderName,
    setNewFolderName,
    newFolderParentId,
    setNewFolderParentId,
    showNewFolderModal,
    setShowNewFolderModal,
    folderToRename,
    setFolderToRename,
    renameFolderName,
    setRenameFolderName,
    showMoveModal,
    setShowMoveModal,
    assetToMove,
    setAssetToMove,
    deleteConfirmTarget,
    setDeleteConfirmTarget,
    resetFilters,
  } = useMediaStore();

  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch Assets from API
  const fetchAssets = useCallback(async () => {
    const params: Record<string, string> = {};
    if (activeFolderId) params.folderId = activeFolderId;
    if (filters.fileType !== "all") params.fileType = filters.fileType;
    if (searchQuery) params.search = searchQuery;

    const { data, ok } = await api.get<{ assets: MediaAsset[] }>("/api/media/assets", { params, toast: false });
    if (ok && data) {
      setAssets(data.assets || []);
    }
  }, [activeFolderId, filters.fileType, searchQuery]);

  // Fetch Folders from API
  const fetchFolders = useCallback(async () => {
    const { data, ok } = await api.get<{ folders: MediaFolder[] }>("/api/media/folders", { toast: false });
    if (ok && data) {
      setFolders(data.folders || []);
    }
  }, []);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchAssets(), fetchFolders()]);
    setIsLoading(false);
  }, [fetchAssets, fetchFolders]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Client-side date filtering & pagination
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      if (filters.dateRange === "all") return true;
      const date = new Date(asset.createdAt);
      const now = new Date();
      if (filters.dateRange === "today") {
        return date.toDateString() === now.toDateString();
      } else if (filters.dateRange === "7d") {
        const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7));
        return date >= sevenDaysAgo;
      } else if (filters.dateRange === "30d") {
        const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
        return date >= thirtyDaysAgo;
      }
      return true;
    });
  }, [assets, filters.dateRange]);

  const paginatedAssets = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredAssets.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAssets, page]);

  const totalPages = Math.ceil(filteredAssets.length / ITEMS_PER_PAGE);

  // Folder Tree Transformation
  const folderTreeNodes = useMemo(() => {
    const nodeMap = new Map<string, FolderNode>();
    folders.forEach((f) => nodeMap.set(f.id, { id: f.id, name: f.name, parentId: f.parentId, children: [] }));

    const rootNodes: FolderNode[] = [];
    nodeMap.forEach((node) => {
      if (node.parentId && nodeMap.has(node.parentId)) {
        nodeMap.get(node.parentId)!.children!.push(node);
      } else {
        rootNodes.push(node);
      }
    });
    return rootNodes;
  }, [folders]);

  // Breadcrumbs Computation
  const breadcrumbItems = useMemo((): BreadcrumbItem[] => {
    if (!activeFolderId) return [];
    const items: BreadcrumbItem[] = [];
    let current: MediaFolder | undefined = folders.find((f) => f.id === activeFolderId);

    while (current) {
      items.unshift({ id: current.id, label: current.name });
      current = folders.find((f) => f.id === current?.parentId);
    }
    return items;
  }, [activeFolderId, folders]);

  // Upload Logic
  const handleFilesSelected = (files: File[]) => {
    const newItems: UploadItem[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      progress: 0,
      status: "pending",
    }));

    setUploadQueue((prev) => [...prev, ...newItems]);
    processUploadQueue(newItems);
  };

  const processUploadQueue = async (items: UploadItem[]) => {
    for (const item of items) {
      setUploadQueue((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: "uploading", progress: 10 } : i))
      );

      const file = item.file;
      const ext = file.name.split(".").pop() || "";

      // 1. Get signed upload URL
      const { data: signData, ok: signOk } = await api.post<{ uploadUrl: string; fileUrl: string }>(
        "/api/media/upload/sign",
        { ext },
        { toast: false }
      );

      if (!signOk || !signData) {
        setUploadQueue((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: "failed", error: "Signed URL failed" } : i))
        );
        continue;
      }

      setUploadQueue((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, progress: 40 } : i))
      );

      // 2. Upload file to signed/local upload URL
      try {
        const uploadRes = await fetch(signData.uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type || "application/octet-stream" },
        });

        if (!uploadRes.ok) {
          setUploadQueue((prev) =>
            prev.map((i) => (i.id === item.id ? { ...i, status: "failed", error: "Upload failed" } : i))
          );
          continue;
        }
      } catch {
        setUploadQueue((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: "failed", error: "Network error" } : i))
        );
        continue;
      }

      setUploadQueue((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, progress: 80 } : i))
      );

      // 3. Register asset entry
      const fileType = file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/")
        ? "video"
        : file.type.startsWith("audio/")
        ? "audio"
        : "document";

      const { data: assetData, ok: assetOk } = await api.post<{ asset: MediaAsset }>(
        "/api/media/assets",
        {
          name: file.name,
          fileUrl: signData.fileUrl,
          fileSize: file.size,
          mimeType: file.type || "application/octet-stream",
          fileType,
          status: "ready",
          folderId: activeFolderId,
        },
        { toast: false }
      );

      if (assetOk && assetData) {
        setAssets((prev) => [assetData.asset, ...prev]);
        setUploadQueue((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: "completed", progress: 100 } : i))
        );
        toast.success(`Uploaded ${file.name}`);
      } else {
        setUploadQueue((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: "failed", error: "Asset creation failed" } : i))
        );
      }
    }
  };

  // Folder Operations
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    const { data, ok } = await api.post<{ folder: MediaFolder }>(
      "/api/media/folders",
      { name: newFolderName.trim(), parentId: newFolderParentId }
    );

    if (ok && data) {
      setFolders((prev) => [...prev, data.folder]);
      toast.success("Folder created");
      setNewFolderName("");
      setShowNewFolderModal(false);
    }
  };

  const handleRenameFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderToRename || !renameFolderName.trim()) return;

    const { ok } = await api.patch(`/api/media/folders/${folderToRename.id}`, {
      name: renameFolderName.trim(),
    });

    if (ok) {
      setFolders((prev) =>
        prev.map((f) => (f.id === folderToRename.id ? { ...f, name: renameFolderName.trim() } : f))
      );
      toast.success("Folder renamed");
      setFolderToRename(null);
    }
  };

  const handleDeleteFolder = async (folder: FolderNode) => {
    setDeleteConfirmTarget({ type: "folder", target: folder });
  };

  const executeDeleteFolder = async (folder: FolderNode) => {
    const { ok, error } = await api.delete(`/api/media/folders/${folder.id}`);
    if (ok) {
      setFolders((prev) => prev.filter((f) => f.id !== folder.id));
      if (activeFolderId === folder.id) setActiveFolderId(null);
      toast.success("Folder deleted");
    } else {
      toast.error(error || "Cannot delete non-empty folder");
    }
  };

  // Asset Operations (Delete & Move)
  const handleDeleteAsset = (asset: MediaAsset) => {
    setDeleteConfirmTarget({ type: "asset", target: asset });
  };

  const executeDeleteAsset = async (asset: MediaAsset) => {
    const { ok } = await api.delete(`/api/media/assets/${asset.id}`);
    if (ok) {
      setAssets((prev) => prev.filter((a) => a.id !== asset.id));
      toggleSelectAsset(asset.id);
      toast.success("File deleted");
    }
  };

  const handleBatchDelete = () => {
    if (selectedAssetIds.size === 0) return;
    setDeleteConfirmTarget({ type: "batch", target: Array.from(selectedAssetIds) });
  };

  const executeBatchDelete = async (assetIds: string[]) => {
    let successCount = 0;
    for (const id of assetIds) {
      const { ok } = await api.delete(`/api/media/assets/${id}`, { toast: false });
      if (ok) successCount++;
    }
    setAssets((prev) => prev.filter((a) => !assetIds.includes(a.id)));
    toggleSelectAll([]);
    toast.success(`Deleted ${successCount} files`);
  };

  const handleMoveAsset = async (targetFolderId: string | null) => {
    if (!assetToMove) return;
    const { ok } = await api.patch(`/api/media/assets/${assetToMove.id}`, {
      folderId: targetFolderId,
    });
    if (ok) {
      setAssets((prev) =>
        prev.map((a) => (a.id === assetToMove.id ? { ...a, folderId: targetFolderId } : a))
      );
      toast.success("File moved successfully");
      setAssetToMove(null);
    }
  };

  // Batch Download as ZIP
  const handleBatchDownload = async () => {
    if (selectedAssetIds.size === 0) return;
    setIsDownloadingZip(true);

    const { data, ok } = await api.download("/api/media/batch-download", {
      method: "POST",
      body: { assetIds: Array.from(selectedAssetIds) },
    });

    setIsDownloadingZip(false);

    if (ok && data) {
      const url = window.URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `media-export-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success("Download started!");
    }
  };

  // Open Share Dialog
  const openShareModalForAsset = (asset: MediaAsset) => {
    setShareTarget({ assetId: asset.id, name: asset.name });
    setShowShareModal(true);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
      {/* Sidebar Folder Navigation */}
      <aside className="w-64 border-r bg-card flex flex-col shrink-0 hidden md:flex">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <Folder className="w-4 h-4 text-primary" />
            <span>Folders</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              setNewFolderParentId(activeFolderId);
              setShowNewFolderModal(true);
            }}
            title="Create Folder"
          >
            <FolderPlus className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <FolderTree
            folders={folderTreeNodes}
            selectedFolderId={activeFolderId}
            onSelectFolder={(id) => {
              setActiveFolderId(id);
              setPage(1);
            }}
            onCreateFolder={(parentId) => {
              setNewFolderParentId(parentId);
              setShowNewFolderModal(true);
            }}
            onRenameFolder={(folder) => {
              setFolderToRename(folder);
              setRenameFolderName(folder.name);
            }}
            onDeleteFolder={handleDeleteFolder}
          />
        </div>

        {/* Upload Dropzone Sidebar Trigger */}
        <div className="p-3 border-t bg-muted/20">
          <Button
            variant="default"
            className="w-full gap-2 text-xs shadow-sm"
            onClick={() => setShowUploadModal(true)}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Upload Media
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <MediaToolbar
          breadcrumbItems={breadcrumbItems}
          onNavigateFolder={(id) => {
            setActiveFolderId(id);
            setPage(1);
          }}
          isLoading={isLoading}
          onRefresh={refreshData}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onOpenUpload={() => setShowUploadModal(true)}
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            setPage(1);
          }}
          filters={filters}
          onFilterChange={(f) => {
            setFilters(f);
            setPage(1);
          }}
          onClearFilters={resetFilters}
          selectedCount={selectedAssetIds.size}
          onBatchDownload={handleBatchDownload}
          onBatchDelete={handleBatchDelete}
          isDownloadingZip={isDownloadingZip}
        />

        {/* Assets Grid / List Viewport */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-44 rounded-xl" />
              ))}
            </div>
          ) : paginatedAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed rounded-2xl p-8 bg-card">
              <div className="p-4 bg-muted/40 rounded-full text-muted-foreground mb-3">
                <HardDrive className="w-8 h-8" />
              </div>
              <h3 className="font-semibold text-base">No media files found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Upload files or select a different folder or filter criteria.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 gap-2"
                onClick={() => setShowUploadModal(true)}
              >
                Upload Files Now
              </Button>
            </div>
          ) : viewMode === "grid" ? (
            <MediaGridView
              assets={paginatedAssets}
              selectedAssetIds={selectedAssetIds}
              onToggleSelect={toggleSelectAsset}
              onPreview={(asset) => setPreviewAsset(asset)}
              onShare={openShareModalForAsset}
              onMove={(asset) => {
                setAssetToMove(asset);
                setShowMoveModal(true);
              }}
              onDelete={handleDeleteAsset}
            />
          ) : (
            <MediaListView
              assets={paginatedAssets}
              selectedAssetIds={selectedAssetIds}
              onToggleSelect={toggleSelectAsset}
              onToggleSelectAll={() => toggleSelectAll(paginatedAssets.map((a) => a.id))}
              onPreview={(asset) => setPreviewAsset(asset)}
              onShare={openShareModalForAsset}
              onDelete={handleDeleteAsset}
            />
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t text-xs text-muted-foreground">
              <span>
                Showing {(page - 1) * ITEMS_PER_PAGE + 1} to{" "}
                {Math.min(page * ITEMS_PER_PAGE, filteredAssets.length)} of {filteredAssets.length}{" "}
                files
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <MediaModals
        showUploadModal={showUploadModal}
        setShowUploadModal={setShowUploadModal}
        onFilesSelected={handleFilesSelected}
        uploadQueue={uploadQueue}
        setUploadQueue={setUploadQueue}
        showNewFolderModal={showNewFolderModal}
        setShowNewFolderModal={setShowNewFolderModal}
        newFolderName={newFolderName}
        setNewFolderName={setNewFolderName}
        handleCreateFolder={handleCreateFolder}
        folderToRename={folderToRename}
        setFolderToRename={setFolderToRename}
        renameFolderName={renameFolderName}
        setRenameFolderName={setRenameFolderName}
        handleRenameFolder={handleRenameFolder}
        previewAsset={previewAsset}
        setPreviewAsset={setPreviewAsset}
        shareTarget={shareTarget}
        showShareModal={showShareModal}
        setShowShareModal={setShowShareModal}
        setShareTarget={setShareTarget}
        showMoveModal={showMoveModal}
        setShowMoveModal={setShowMoveModal}
        folderTreeNodes={folderTreeNodes}
        assetToMove={assetToMove}
        handleMoveAsset={handleMoveAsset}
        deleteConfirmTarget={deleteConfirmTarget}
        setDeleteConfirmTarget={setDeleteConfirmTarget}
        executeDeleteAsset={executeDeleteAsset}
        executeDeleteFolder={executeDeleteFolder}
        executeBatchDelete={executeBatchDelete}
        isDownloadingZip={isDownloadingZip}
        selectedAssetCount={selectedAssetIds.size}
      />
    </div>
  );
}
