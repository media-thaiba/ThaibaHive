"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Music,
  Film,
  Image as ImageIcon,
  Download,
  Lock,
  AlertCircle,
  Clock,
  Folder,
  ChevronRight,
  Search,
  Grid,
  List as ListIcon,
  Archive,
  Eye,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AssetMeta {
  id: string;
  name: string;
  mimeType: string;
  fileType: string;
  fileSize: number;
  thumbnailUrl?: string | null;
  fileUrl?: string;
  createdAt?: string;
}

interface SubfolderItem {
  id: string;
  name: string;
  createdAt?: string;
}

interface BreadcrumbItem {
  id: string;
  name: string;
}

interface SharePageClientProps {
  token: string;
  hasPassword: boolean;
  isExpired: boolean;
  isLocked: boolean;
  assetId: string | null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileTypeIcon({ fileType, className }: { fileType: string; className?: string }) {
  switch (fileType) {
    case "image": return <ImageIcon className={className} />;
    case "video": return <Film className={className} />;
    case "audio": return <Music className={className} />;
    default: return <FileText className={className} />;
  }
}

export function SharePageClient({
  token,
  hasPassword,
  isExpired,
  isLocked,
  assetId: _assetId,
}: SharePageClientProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shareType, setShareType] = useState<"asset" | "folder">("asset");

  // Asset state
  const [asset, setAsset] = useState<AssetMeta | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // Folder state
  const [folder, setFolder] = useState<{ id: string; name: string; breadcrumbs: BreadcrumbItem[] } | null>(null);
  const [subfolders, setSubfolders] = useState<SubfolderItem[]>([]);
  const [folderAssets, setFolderAssets] = useState<AssetMeta[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Modal / download states
  const [previewAsset, setPreviewAsset] = useState<AssetMeta | null>(null);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [loading, setLoading] = useState(!hasPassword && !isExpired && !isLocked);
  const [requiresPassword, setRequiresPassword] = useState(hasPassword);

  const fetchLink = useCallback(async (pwd?: string, subfolderId?: string) => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/media/share-links/${token}`;
      const params = new URLSearchParams();
      if (pwd) params.set("password", pwd);
      if (subfolderId) params.set("subfolderId", subfolderId);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      const data = await res.json() as {
        error?: string;
        requiresPassword?: boolean;
        type?: "asset" | "folder";
        asset?: AssetMeta;
        downloadUrl?: string;
        folder?: { id: string; name: string; breadcrumbs: BreadcrumbItem[] };
        subfolders?: SubfolderItem[];
        assets?: AssetMeta[];
      };

      if (!res.ok) {
        if (data.requiresPassword) {
          setRequiresPassword(true);
        } else {
          setError(data.error ?? "Failed to access share link");
        }
        return;
      }

      setRequiresPassword(false);
      setShareType(data.type ?? "asset");

      if (data.type === "asset") {
        setAsset(data.asset ?? null);
        setDownloadUrl(data.downloadUrl ?? null);
      } else if (data.type === "folder") {
        setFolder(data.folder ?? null);
        setSubfolders(data.subfolders ?? []);
        setFolderAssets(data.assets ?? []);
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!hasPassword && !isExpired && !isLocked) {
      fetchLink().catch(() => setError("Failed to load share link"));
    }
  }, [hasPassword, isExpired, isLocked, fetchLink]);

  const handleSubfolderClick = (subId: string) => {
    fetchLink(undefined, subId).catch(() => setError("Failed to navigate folder"));
  };

  const handleBreadcrumbClick = (folderId: string) => {
    if (folder && folder.breadcrumbs.length > 0 && folder.breadcrumbs[0].id === folderId) {
      // Clicked root
      fetchLink().catch(() => setError("Failed to navigate folder"));
    } else {
      fetchLink(undefined, folderId).catch(() => setError("Failed to navigate folder"));
    }
  };

  const handleDownloadZip = async () => {
    if (!folder) return;
    setDownloadingZip(true);
    try {
      const res = await fetch("/api/media/batch-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          folderId: folder.id,
          password: password || undefined,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        setError((errJson as { error?: string }).error ?? "Batch download failed");
        return;
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${folder.name}-archive.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      setError("Failed to download ZIP archive");
    } finally {
      setDownloadingZip(false);
    }
  };

  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <Clock className="w-12 h-12 mx-auto text-muted-foreground" />
          <h1 className="text-xl font-semibold">Link Expired</h1>
          <p className="text-muted-foreground text-sm">This share link has expired and is no longer accessible.</p>
        </Card>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <Lock className="w-12 h-12 mx-auto text-destructive" />
          <h1 className="text-xl font-semibold">Link Locked</h1>
          <p className="text-muted-foreground text-sm">Too many failed attempts. This link is temporarily locked. Try again later.</p>
        </Card>
      </div>
    );
  }

  if (requiresPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 space-y-6">
          <div className="text-center space-y-2">
            <Lock className="w-10 h-10 mx-auto text-muted-foreground" />
            <h1 className="text-xl font-semibold">Password Protected</h1>
            <p className="text-muted-foreground text-sm">Enter the password to access this file or folder.</p>
          </div>
          {error && <Alert variant="error">{error}</Alert>}
          <div className="space-y-3">
            <Input
              id="share-password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && fetchLink(password)}
              disabled={loading}
            />
            <Button
              className="w-full"
              onClick={() => fetchLink(password)}
              disabled={loading || !password}
            >
              {loading ? "Verifying…" : "Unlock"}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
          <h1 className="text-xl font-semibold">Unable to Load Content</h1>
          <p className="text-muted-foreground text-sm">{error}</p>
        </Card>
      </div>
    );
  }

  // ── Single Asset View ──────────────────────────────────────────────────────
  if (shareType === "asset" && asset) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
        <Card className="max-w-lg w-full overflow-hidden">
          <div className="bg-muted/50 flex items-center justify-center" style={{ minHeight: 240 }}>
            {asset.fileType === "image" && downloadUrl ? (
              <img
                src={downloadUrl}
                alt={asset.name}
                className="max-h-64 max-w-full object-contain"
              />
            ) : asset.fileType === "video" && downloadUrl ? (
              <video
                src={downloadUrl}
                controls
                className="max-h-64 max-w-full"
              />
            ) : asset.fileType === "audio" && downloadUrl ? (
              <audio src={downloadUrl} controls className="w-full px-4" />
            ) : (
              <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
                <FileTypeIcon fileType={asset.fileType} className="w-16 h-16" />
                <span className="text-sm">{asset.mimeType}</span>
              </div>
            )}
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <FileTypeIcon fileType={asset.fileType} className="w-5 h-5 mt-0.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <h1 className="font-semibold text-base leading-tight break-words">{asset.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs capitalize">{asset.fileType}</Badge>
                  <span className="text-xs text-muted-foreground">{formatBytes(asset.fileSize)}</span>
                </div>
              </div>
            </div>

            {downloadUrl && (
              <a href={downloadUrl} download={asset.name} className="block">
                <Button className="w-full gap-2">
                  <Download className="w-4 h-4" />
                  Download File
                </Button>
              </a>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // ── Folder Explorer View ──────────────────────────────────────────────────
  if (shareType === "folder" && folder) {
    const filteredSubfolders = subfolders.filter(s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredAssets = folderAssets.filter(a =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
            <div>
              {/* Breadcrumb Navigation */}
              <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1 flex-wrap">
                {folder.breadcrumbs.map((crumb, idx) => (
                  <React.Fragment key={crumb.id}>
                    {idx > 0 && <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground/60" />}
                    <button
                      onClick={() => handleBreadcrumbClick(crumb.id)}
                      className={`hover:text-foreground transition-colors ${
                        idx === folder.breadcrumbs.length - 1 ? "font-semibold text-foreground" : ""
                      }`}
                    >
                      {crumb.name}
                    </button>
                  </React.Fragment>
                ))}
              </nav>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Folder className="w-6 h-6 text-primary" />
                {folder.name}
              </h1>
            </div>

            <Button
              onClick={handleDownloadZip}
              disabled={downloadingZip}
              className="gap-2 shrink-0"
            >
              <Archive className="w-4 h-4" />
              {downloadingZip ? "Preparing ZIP…" : "Download All as ZIP"}
            </Button>
          </div>

          {/* Controls: Search & Grid/List view */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search files and folders…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/20">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="h-8 w-8 p-0"
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="h-8 w-8 p-0"
              >
                <ListIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Empty state */}
          {filteredSubfolders.length === 0 && filteredAssets.length === 0 && (
            <Card className="p-12 text-center text-muted-foreground space-y-3">
              <Folder className="w-12 h-12 mx-auto text-muted-foreground/50" />
              <p className="text-base font-medium">This folder is empty</p>
            </Card>
          )}

          {/* Grid View */}
          {viewMode === "grid" ? (
            <div className="space-y-6">
              {/* Subfolders Grid */}
              {filteredSubfolders.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Folders</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {filteredSubfolders.map(sub => (
                      <Card
                        key={sub.id}
                        onClick={() => handleSubfolderClick(sub.id)}
                        className="p-4 cursor-pointer hover:border-primary/50 transition-all flex items-center gap-3 group"
                      >
                        <Folder className="w-8 h-8 text-primary group-hover:scale-105 transition-transform" />
                        <span className="font-medium text-sm truncate">{sub.name}</span>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Assets Grid */}
              {filteredAssets.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Files</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {filteredAssets.map(item => (
                      <Card key={item.id} className="p-4 space-y-3 flex flex-col justify-between group">
                        <div
                          className="bg-muted/40 rounded-lg p-6 flex items-center justify-center cursor-pointer relative"
                          onClick={() => setPreviewAsset(item)}
                        >
                          <FileTypeIcon fileType={item.fileType} className="w-10 h-10 text-muted-foreground" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center text-white">
                            <Eye className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="font-medium text-sm truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{formatBytes(item.fileSize)}</p>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* List View */
            <Card className="divide-y">
              {filteredSubfolders.map(sub => (
                <div
                  key={sub.id}
                  onClick={() => handleSubfolderClick(sub.id)}
                  className="p-4 flex items-center justify-between hover:bg-muted/30 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Folder className="w-5 h-5 text-primary" />
                    <span className="font-medium text-sm">{sub.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Folder</span>
                </div>
              ))}
              {filteredAssets.map(item => (
                <div key={item.id} className="p-4 flex items-center justify-between hover:bg-muted/30">
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => setPreviewAsset(item)}>
                    <FileTypeIcon fileType={item.fileType} className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium text-sm">{item.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatBytes(item.fileSize)}</span>
                </div>
              ))}
            </Card>
          )}
        </div>

        {/* Single Asset Preview Dialog */}
        {previewAsset && (
          <Dialog open={!!previewAsset} onOpenChange={open => !open && setPreviewAsset(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileTypeIcon fileType={previewAsset.fileType} className="w-5 h-5" />
                  {previewAsset.name}
                </DialogTitle>
              </DialogHeader>

              <div className="bg-muted/30 rounded-lg flex items-center justify-center p-4 min-h-64 max-h-[70vh] overflow-hidden">
                {previewAsset.fileType === "image" && previewAsset.fileUrl ? (
                  <img src={previewAsset.fileUrl} alt={previewAsset.name} className="max-h-[60vh] object-contain" />
                ) : previewAsset.fileType === "video" && previewAsset.fileUrl ? (
                  <video src={previewAsset.fileUrl} controls className="max-h-[60vh] w-full" />
                ) : previewAsset.fileType === "audio" && previewAsset.fileUrl ? (
                  <audio src={previewAsset.fileUrl} controls className="w-full" />
                ) : (
                  <div className="text-center text-muted-foreground space-y-2">
                    <FileTypeIcon fileType={previewAsset.fileType} className="w-12 h-12 mx-auto" />
                    <p className="text-sm">{previewAsset.mimeType}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setPreviewAsset(null)}>
                  <X className="w-4 h-4 mr-2" />
                  Close
                </Button>
                {previewAsset.fileUrl && (
                  <a href={previewAsset.fileUrl} download={previewAsset.name}>
                    <Button className="gap-2">
                      <Download className="w-4 h-4" />
                      Download
                    </Button>
                  </a>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }

  return null;
}
