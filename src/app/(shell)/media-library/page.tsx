"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Folder,
  FolderPlus,
  ImageIcon,
  Film,
  Grid,
  ListIcon,
  Share2,
  Download,
  Trash2,
  Eye,
  Filter,
  Search,
  Upload,
  RefreshCw,
  FolderInput,
  CheckSquare,
  Square,
  HardDrive,
  FileIcon,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle,  } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api/client";
import { toast } from "sonner";

// Imported supporting UI components
import { Dropzone } from "@/components/ui/dropzone";
import { UploadProgress, UploadItem } from "@/components/ui/upload-progress";
import { FolderTree, FolderNode } from "@/components/ui/folder-tree";
import { Breadcrumbs, BreadcrumbItem } from "@/components/ui/breadcrumbs";
import { FilePreview } from "@/components/ui/file-preview";
import { AssetMetadata } from "@/components/ui/metadata-panel";
import { ShareDialog } from "@/components/ui/share-dialog";
import { ShareItem } from "@/components/ui/share-list";
import { DownloadProgress } from "@/components/ui/download-progress";
import { FolderSelector } from "@/components/ui/folder-selector";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SearchBar } from "@/components/ui/search-bar";
import { FilterPanel, FilterState,  } from "@/components/ui/filter-panel";

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
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>({ fileType: "all", dateRange: "all" });
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);

  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selection & Batch Operations State
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);

  // Upload Management State
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Preview & Share Modals
  const [previewAsset, setPreviewAsset] = useState<AssetMetadata | null>(null);
  const [shareTarget, setShareTarget] = useState<{ assetId?: string; folderId?: string; name: string } | null>(null);
  const [activeShares, setActiveShares] = useState<ShareItem[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);

  // Folder Operations
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [folderToRename, setFolderToRename] = useState<FolderNode | null>(null);
  const [renameFolderName, setRenameFolderName] = useState("");

  // Move & Delete Modals
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [assetToMove, setAssetToMove] = useState<MediaAsset | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ type: "asset" | "folder" | "batch"; target: any } | null>(null);

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

  // Batch Selection Helpers
  const toggleSelectAsset = (id: string) => {
    setSelectedAssetIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedAssetIds.size === paginatedAssets.length) {
      setSelectedAssetIds(new Set());
    } else {
      setSelectedAssetIds(new Set(paginatedAssets.map((a) => a.id)));
    }
  };

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
      setSelectedAssetIds((prev) => {
        const next = new Set(prev);
        next.delete(asset.id);
        return next;
      });
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
    setSelectedAssetIds(new Set());
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
        {/* Header Bar */}
        <header className="p-4 border-b bg-card space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Breadcrumbs
              items={breadcrumbItems}
              onNavigate={(id) => {
                setActiveFolderId(id);
                setPage(1);
              }}
            />

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={refreshData}
                title="Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              </Button>

              <div className="border rounded-lg p-0.5 flex bg-muted/40">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setViewMode("list")}
                >
                  <ListIcon className="w-3.5 h-3.5" />
                </Button>
              </div>

              <Button
                variant="default"
                size="sm"
                onClick={() => setShowUploadModal(true)}
                className="gap-1.5 text-xs md:hidden"
              >
                Upload
              </Button>
            </div>
          </div>

          {/* Search, Filter, and Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <SearchBar
                value={searchQuery}
                onChange={(q) => {
                  setSearchQuery(q);
                  setPage(1);
                }}
                className="w-full sm:w-64"
              />
              <FilterPanel
                filters={filters}
                onChange={(f) => {
                  setFilters(f);
                  setPage(1);
                }}
                onClear={() => {
                  setFilters({ fileType: "all", dateRange: "all" });
                  setSearchQuery("");
                  setPage(1);
                }}
              />
            </div>

            {/* Batch Action Toolbar */}
            {selectedAssetIds.size > 0 && (
              <div className="flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-xl border border-primary/20 animate-in fade-in">
                <span className="text-xs font-medium text-primary">
                  {selectedAssetIds.size} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBatchDownload}
                  disabled={isDownloadingZip}
                  className="h-7 text-xs gap-1"
                >
                  <Download className="w-3 h-3" /> ZIP
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBatchDelete}
                  className="h-7 text-xs gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </Button>
              </div>
            )}
          </div>
        </header>

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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {paginatedAssets.map((asset) => {
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
                      onClick={() => toggleSelectAsset(asset.id)}
                      className="absolute top-2 left-2 z-10 p-1 rounded-md bg-black/40 text-white backdrop-blur hover:bg-black/60 transition-colors"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-primary fill-primary-foreground" />
                      ) : (
                        <Square className="w-4 h-4 opacity-70" />
                      )}
                    </button>

                    {/* Asset Preview Thumbnail */}
                    <div
                      onClick={() => setPreviewAsset(asset)}
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
                      <div className="min-w-0 flex-1" onClick={() => setPreviewAsset(asset)}>
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
                          onClick={() => openShareModalForAsset(asset)}
                          title="Share"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setAssetToMove(asset);
                            setShowMoveModal(true);
                          }}
                          title="Move"
                        >
                          <FolderInput className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteAsset(asset)}
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
          ) : (
            /* List View */
            <div className="border rounded-xl bg-card overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b font-semibold text-muted-foreground">
                  <tr>
                    <th className="p-3 w-10">
                      <button type="button" onClick={toggleSelectAll}>
                        {selectedAssetIds.size === paginatedAssets.length ? (
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
                  {paginatedAssets.map((asset) => {
                    const isSelected = selectedAssetIds.has(asset.id);
                    return (
                      <tr
                        key={asset.id}
                        className={`hover:bg-muted/20 transition-colors ${
                          isSelected ? "bg-primary/5" : ""
                        }`}
                      >
                        <td className="p-3">
                          <button type="button" onClick={() => toggleSelectAsset(asset.id)}>
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
                            onClick={() => setPreviewAsset(asset)}
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
                              onClick={() => setPreviewAsset(asset)}
                              title="Preview"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openShareModalForAsset(asset)}
                              title="Share"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleDeleteAsset(asset)}
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

      {/* Upload Dialog Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Dropzone onFilesSelected={handleFilesSelected} />
            <UploadProgress
              items={uploadQueue}
              onClearCompleted={() => setUploadQueue((prev) => prev.filter((i) => i.status !== "completed"))}
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
              <Button type="button" variant="outline" onClick={() => setShowNewFolderModal(false)}>
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
      <Dialog open={!!folderToRename} onOpenChange={(open) => !open && setFolderToRename(null)}>
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
              <Button type="button" variant="outline" onClick={() => setFolderToRename(null)}>
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
        itemCount={selectedAssetIds.size}
      />
    </div>
  );
}
