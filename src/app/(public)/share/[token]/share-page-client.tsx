"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FileText, Music, Film, Image as ImageIcon, Download, Lock, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

interface AssetMeta {
  name: string;
  mimeType: string;
  fileType: string;
  fileSize: number;
  thumbnailUrl?: string | null;
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
  const [asset, setAsset] = useState<AssetMeta | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(!hasPassword && !isExpired && !isLocked);
  const [requiresPassword, setRequiresPassword] = useState(hasPassword);

  const fetchLink = useCallback(async (pwd?: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = pwd
        ? `/api/media/share-links/${token}?password=${encodeURIComponent(pwd)}`
        : `/api/media/share-links/${token}`;

      const res = await fetch(url);
      const data = await res.json() as {
        error?: string;
        requiresPassword?: boolean;
        asset?: AssetMeta;
        downloadUrl?: string;
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
      setAsset(data.asset ?? null);
      setDownloadUrl(data.downloadUrl ?? null);
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
            <p className="text-muted-foreground text-sm">Enter the password to access this file.</p>
          </div>
          {error && (
            <Alert variant="error">{error}</Alert>
          )}
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
          <h1 className="text-xl font-semibold">Unable to Load File</h1>
          <p className="text-muted-foreground text-sm">{error}</p>
        </Card>
      </div>
    );
  }

  if (!asset) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
      <Card className="max-w-lg w-full overflow-hidden">
        {/* Preview */}
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

        {/* File info */}
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
                Download
              </Button>
            </a>
          )}
        </div>
      </Card>
    </div>
  );
}
