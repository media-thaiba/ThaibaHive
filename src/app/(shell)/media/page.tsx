"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Folder,
  Image as ImageIcon,
  Film,
  Music,
  FileText,
  UploadCloud,
  Search,
  Grid,
  List as ListIcon,
  MoreVertical,
  X,
  Share2,
  Download,
  Trash2,
  FolderPlus,
  ChevronRight,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api/client";
import { toast } from "sonner";

type AssetType = "image" | "video" | "audio" | "document";
type AssetStatus = "ready" | "processing" | "failed";

interface MediaAsset {
  id: string;
  name: string;
  fileUrl: string;
  thumbnailUrl: string | null;
  fileSize: number;
  mimeType: string;
  fileType: AssetType;
  status: AssetStatus;
  folderId: string | null;
  tags: string[] | null;
  metadata: Record<string, unknown> | null;
  downloadCount: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

interface MediaFolder {
  id: string;
  name: string;
  parentId: string | null;
  departmentId: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export default function MediaDashboard() {
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeFilter, setActiveFilter] = useState<AssetType | "all">("all");
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [sharePassword, setSharePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<MediaAsset | null>(null);

  const fetchAssets = useCallback(async () => {
    const params: Record<string, string> = {};
    if (activeFolder) params.folderId = activeFolder;
    if (activeFilter !== "all") params.fileType = activeFilter;
    if (searchQuery) params.search = searchQuery;

    const { data, ok } = await api.get<{ assets: MediaAsset[] }>("/api/media/assets", {
      params,
      toast: false,
    });
    if (ok && data) setAssets(data.assets || []);
  }, [activeFolder, activeFilter, searchQuery]);

  const fetchFolders = useCallback(async () => {
    const { data, ok } = await api.get<{ folders: MediaFolder[] }>("/api/media/folders", {
      toast: false,
    });
    if (ok && data) setFolders(data.folders || []);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchAssets(), fetchFolders()])
      .finally(() => setIsLoading(false));
  }, [fetchAssets, fetchFolders]);

  const currentFolder = folders.find(f => f.id === activeFolder);
  const subFolders = folders.filter(f => f.parentId === activeFolder);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split(".").pop() || "";

      // Step 1: Get signed upload URL
      const { data: signData, ok: signOk } = await api.post<{ uploadUrl: string; fileUrl: string }>(
        "/api/media/upload/sign",
        { ext },
        { toast: false }
      );
      if (!signOk || !signData) {
        toast.error(`Failed to get upload URL for ${file.name}`);
        continue;
      }

      // Step 2: Upload file to signed URL
      try {
        const uploadRes = await fetch(signData.uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });
        if (!uploadRes.ok) {
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }
      } catch {
        toast.error(`Upload failed for ${file.name}`);
        continue;
      }

      // Step 3: Register asset
      const fileType = file.type.startsWith("image/") ? "image"
        : file.type.startsWith("video/") ? "video"
        : file.type.startsWith("audio/") ? "audio"
        : "document";

      const { data: assetData, ok: assetOk } = await api.post<{ asset: MediaAsset }>(
        "/api/media/assets",
        {
          name: file.name,
          fileUrl: signData.fileUrl,
          fileSize: file.size,
          mimeType: file.type,
          fileType,
          status: fileType === "video" ? "processing" : "ready",
          folderId: activeFolder,
        },
        { toast: false }
      );
      if (assetOk && assetData) {
        setAssets(prev => [...prev, assetData.asset]);
      }

      setUploadProgress(Math.round(((i + 1) / files.length) * 100));
    }

    setIsUploading(false);
    setUploadProgress(0);
    e.target.value = "";
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    const { data, ok } = await api.post<{ folder: MediaFolder }>(
      "/api/media/folders",
      { name: newFolderName, parentId: activeFolder },
      { errorMessage: "Failed to create folder" }
    );
    if (ok && data) {
      setFolders(prev => [...prev, data.folder]);
      toast.success("Folder created");
      setNewFolderName("");
      setIsDialogOpen(false);
    }
  };

  const handleShare = async () => {
    if (!selectedAsset) return;
    setIsSharing(true);
    const { data, ok } = await api.post<{ token: string; shareUrl: string }>(
      "/api/media/share-links",
      {
        assetId: selectedAsset.id,
        password: sharePassword || undefined,
      },
      { errorMessage: "Failed to create share link" }
    );
    if (ok && data) {
      const fullUrl = `${window.location.origin}${data.shareUrl}`;
      setShareUrl(fullUrl);
      toast.success("Share link created");
    }
    setIsSharing(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied to clipboard");
  };

  const handleDownload = async () => {
    if (!selectedAsset) return;
    const { data, ok } = await api.download(
      "/api/media/batch-download",
      {
        method: "POST",
        body: { assetIds: [selectedAsset.id] },
        toast: false,
      }
    );
    if (ok && data) {
      const url = window.URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = selectedAsset.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success("Download started");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const { ok } = await api.delete(`/api/media/assets/${deleteConfirm.id}`, {
      errorMessage: "Failed to delete asset",
    });
    if (ok) {
      setAssets(prev => prev.filter(a => a.id !== deleteConfirm.id));
      if (selectedAsset?.id === deleteConfirm.id) setSelectedAsset(null);
      setDeleteConfirm(null);
      toast.success("Asset deleted");
    }
  };

  const getFileIcon = (type: AssetType) => {
    switch (type) {
      case "image": return <ImageIcon className="text-blue-500 w-8 h-8" />;
      case "video": return <Film className="text-purple-500 w-8 h-8" />;
      case "audio": return <Music className="text-yellow-500 w-8 h-8" />;
      case "document": return <FileText className="text-gray-500 w-8 h-8" />;
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">

      {/* LEFT PANEL */}
      <div className="w-64 border-r bg-white dark:bg-slate-900 flex flex-col hidden md:flex shrink-0">
        <div className="p-4 border-b flex flex-col gap-2">
          <Button className="w-full flex items-center justify-center gap-2 relative" size="lg">
            <UploadCloud size={18} />
            <span className="font-semibold">Upload Media</span>
            <input
              type="file"
              className="absolute inset-0 opacity-0 cursor-pointer"
              multiple
              onChange={handleFileUpload}
            />
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger>
              <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                <FolderPlus size={18} />
                <span>New Folder</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <form onSubmit={handleCreateFolder}>
                <DialogHeader>
                  <DialogTitle>Create Folder</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col space-y-4 mt-4">
                  <div className="grid gap-2">
                    <Label htmlFor="folder-name">Folder Name</Label>
                    <Input id="folder-name" name="name" placeholder="New Folder Name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button type="submit">Create</Button>
                  </div>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Folders</h3>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => setActiveFolder(null)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
                    ${activeFolder === null
                      ? "bg-primary/10 text-primary"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                >
                  <Folder size={16} className={activeFolder === null ? "text-primary" : "text-slate-400"} />
                  <span className="truncate">All Media</span>
                </button>
              </li>
              {folders.filter(f => !f.parentId).map(folder => (
                <li key={folder.id}>
                  <button
                    onClick={() => setActiveFolder(folder.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
                      ${activeFolder === folder.id
                        ? "bg-primary/10 text-primary"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                  >
                    <Folder size={16} className={activeFolder === folder.id ? "text-primary" : "text-slate-400"} />
                    <span className="truncate">{folder.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Filters</h3>
            <ul className="space-y-1">
              {[
                { id: "all", icon: <Grid size={16} />, label: "All Types" },
                { id: "image", icon: <ImageIcon size={16} />, label: "Images" },
                { id: "video", icon: <Film size={16} />, label: "Videos" },
                { id: "audio", icon: <Music size={16} />, label: "Audio" },
                { id: "document", icon: <FileText size={16} />, label: "Documents" },
              ].map(filter => (
                <li key={filter.id}>
                  <button
                    onClick={() => setActiveFilter(filter.id as "all" | AssetType)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
                      ${activeFilter === filter.id
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}
                  >
                    {filter.icon}
                    <span>{filter.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-slate-950/50">
        <header className="h-16 border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            <h1 className="text-slate-400 text-sm font-medium m-0">Media</h1>
            <ChevronRight size={16} className="text-slate-400" />
            <span className="text-slate-900 dark:text-white">{currentFolder?.name || "All Media"}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative w-64 hidden sm:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search files..."
                className="pl-9 bg-slate-100/50 dark:bg-slate-800/50 border-none focus-visible:ring-1"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-md">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-sm transition-colors ${viewMode === "grid" ? "bg-white dark:bg-slate-700 shadow-sm" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}
              >
                <Grid size={16} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-sm transition-colors ${viewMode === "list" ? "bg-white dark:bg-slate-700 shadow-sm" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}
              >
                <ListIcon size={16} />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 relative">
          {subFolders.length > 0 && !isLoading && (
            <div className="mb-8">
              <h4 className="text-sm font-medium text-slate-500 mb-4">Folders</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {subFolders.map(folder => (
                  <div
                    key={folder.id}
                    onClick={() => setActiveFolder(folder.id)}
                    className="group bg-white dark:bg-slate-900 border rounded-lg p-4 flex items-center gap-3 cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all"
                  >
                    <div className="bg-primary/10 text-primary p-2 rounded-md group-hover:scale-110 transition-transform">
                      <Folder size={20} />
                    </div>
                    <span className="font-medium text-sm truncate">{folder.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-sm font-medium text-slate-500 mb-4">Files</h4>

            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="flex flex-col gap-2">
                    <Skeleton className="aspect-square w-full rounded-xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : assets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl border-slate-200 dark:border-slate-800">
                <UploadCloud size={48} className="text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">No files found</h3>
                <p className="text-sm text-slate-500 mb-4">Drag and drop files here to upload</p>
                <Button variant="outline">Browse Files</Button>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {assets.map(asset => (
                  <Card
                    key={asset.id}
                    className={`overflow-hidden cursor-pointer group hover:ring-2 hover:ring-primary/50 transition-all ${selectedAsset?.id === asset.id ? "ring-2 ring-primary border-transparent" : ""}`}
                    onClick={() => setSelectedAsset(asset)}
                  >
                    <div className="aspect-square bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center relative p-4">
                      {asset.status === "processing" ? (
                        <div className="flex flex-col items-center gap-3">
                          <Skeleton className="w-12 h-12 rounded-full animate-pulse" />
                          <span className="text-xs font-medium text-slate-500">Processing...</span>
                        </div>
                      ) : (
                        <div className="transition-transform group-hover:scale-110">
                          {getFileIcon(asset.fileType)}
                        </div>
                      )}
                      {asset.status === "processing" && (
                        <Badge variant="secondary" className="absolute top-2 right-2 text-[10px]">Processing</Badge>
                      )}
                    </div>
                    <div className="p-3 border-t bg-white dark:bg-slate-900">
                      <p className="text-sm font-medium truncate" title={asset.name}>{asset.name}</p>
                      <p className="text-xs text-slate-500 mt-1">{formatSize(asset.fileSize)} • {new Date(asset.createdAt).toLocaleDateString()}</p>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-lg border overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase text-xs border-b">
                    <tr>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Size</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {assets.map(asset => (
                      <tr
                        key={asset.id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer ${selectedAsset?.id === asset.id ? "bg-primary/5 dark:bg-primary/10" : ""}`}
                        onClick={() => setSelectedAsset(asset)}
                      >
                        <td className="px-4 py-3 flex items-center gap-3">
                          {getFileIcon(asset.fileType)}
                          <span className="font-medium truncate max-w-[200px]">{asset.name}</span>
                          {asset.status === "processing" && <Badge variant="secondary" className="ml-2">Processing</Badge>}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{formatSize(asset.fileSize)}</td>
                        <td className="px-4 py-3 text-slate-500 capitalize">{asset.fileType}</td>
                        <td className="px-4 py-3 text-slate-500">{new Date(asset.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900">
                            <MoreVertical size={16} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {isUploading && (
            <div className="absolute bottom-6 right-6 bg-white dark:bg-slate-900 border shadow-lg rounded-lg p-4 w-72 z-20 flex flex-col gap-3 animate-in slide-in-from-bottom-5">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Uploading...</span>
                <span className="text-xs text-slate-500">{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* RIGHT PANEL - File Details */}
      {selectedAsset && (
        <div className="w-80 border-l bg-white dark:bg-slate-900 flex flex-col shrink-0 animate-in slide-in-from-right-4 z-20 shadow-xl md:shadow-none absolute md:relative right-0 h-full">
          <div className="h-16 border-b flex items-center justify-between px-4 shrink-0">
            <h3 className="font-semibold flex items-center gap-2">
              <Info size={16} className="text-slate-400" />
              File Details
            </h3>
            <Button variant="ghost" size="icon" onClick={() => { setSelectedAsset(null); setShareUrl(""); }} className="h-8 w-8">
              <X size={16} />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-6 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-950/50 border-b min-h-[200px]">
              {selectedAsset.status === "processing" ? (
                <div className="flex flex-col items-center gap-4 text-slate-400">
                  <div className="w-16 h-16 rounded-full border-4 border-slate-200 border-t-primary animate-spin"></div>
                  <span className="text-sm">Processing Media...</span>
                </div>
              ) : (
                <div className="w-full flex items-center justify-center">
                  {getFileIcon(selectedAsset.fileType)}
                </div>
              )}
            </div>

            <div className="p-5 space-y-6">
              <div>
                <h4 className="text-lg font-semibold truncate mb-1" title={selectedAsset.name}>{selectedAsset.name}</h4>
                <p className="text-sm text-slate-500 flex items-center justify-between">
                  <span>{formatSize(selectedAsset.fileSize)}</span>
                  <span className="uppercase">{selectedAsset.fileType}</span>
                </p>
              </div>

              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger>
                    <Button className="flex-1 gap-2" variant="default" onClick={(e) => { e.stopPropagation(); handleShare(); }}>
                      <Share2 size={16} /> Share
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Share File</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 mt-4">
                      <div className="grid gap-2">
                        <Label htmlFor="share-password">Password (optional)</Label>
                        <Input
                          id="share-password"
                          type="password"
                          placeholder="Min 8 characters"
                          value={sharePassword}
                          onChange={e => setSharePassword(e.target.value)}
                        />
                      </div>
                      {shareUrl && (
                        <div className="flex items-center space-x-2">
                          <Input id="link" defaultValue={shareUrl} readOnly />
                          <Button type="button" size="sm" className="px-3" onClick={handleCopyLink}>
                            Copy
                          </Button>
                        </div>
                      )}
                      {!shareUrl && (
                        <Button onClick={handleShare} disabled={isSharing} className="w-full">
                          {isSharing ? "Creating link..." : "Generate Link"}
                        </Button>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>

                <Button variant="outline" size="icon" className="shrink-0" title="Download" onClick={handleDownload}>
                  <Download size={16} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                  title="Delete"
                  onClick={(e) => { e.stopPropagation(); setDeleteConfirm(selectedAsset); }}
                >
                  <Trash2 size={16} />
                </Button>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <h5 className="text-sm font-semibold text-slate-900 dark:text-white">Properties</h5>
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <div className="text-slate-500">Added</div>
                  <div className="text-right text-slate-900 dark:text-slate-300">{new Date(selectedAsset.createdAt).toLocaleDateString()}</div>

                  <div className="text-slate-500">MIME Type</div>
                  <div className="text-right text-slate-900 dark:text-slate-300 truncate" title={selectedAsset.mimeType}>{selectedAsset.mimeType}</div>

                  {selectedAsset.metadata && typeof selectedAsset.metadata === "object" && (
                    <>
                      {"width" in selectedAsset.metadata && "height" in selectedAsset.metadata && (
                        <>
                          <div className="text-slate-500">Dimensions</div>
                          <div className="text-right text-slate-900 dark:text-slate-300">
                            {String(selectedAsset.metadata.width)} × {String(selectedAsset.metadata.height)}
                          </div>
                        </>
                      )}
                      {"duration" in selectedAsset.metadata && (
                        <>
                          <div className="text-slate-500">Duration</div>
                          <div className="text-right text-slate-900 dark:text-slate-300">{String(selectedAsset.metadata.duration)}</div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t">
                <h5 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Tags</h5>
                <div className="flex flex-wrap gap-2">
                  {selectedAsset.tags?.map(tag => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                  <Button variant="outline" size="sm" className="h-6 rounded-full text-xs px-2 py-0 border-dashed">
                    + Add Tag
                  </Button>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h5 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Stats</h5>
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <div className="text-slate-500">Downloads</div>
                  <div className="text-right text-slate-900 dark:text-slate-300">{selectedAsset.downloadCount}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Asset</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500 mt-2">
            Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
