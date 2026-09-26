"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MetadataPanel, AssetMetadata } from "./metadata-panel";
import {
  Download,
  Share2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  FileText,
  Music,
  Film,
  Image as ImageIcon,
} from "lucide-react";

interface FilePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: AssetMetadata | null;
  onNext?: () => void;
  onPrev?: () => void;
  onDownload?: (asset: AssetMetadata) => void;
  onShare?: (asset: AssetMetadata) => void;
}

export function FilePreview({
  open,
  onOpenChange,
  asset,
  onNext,
  onPrev,
  onDownload,
  onShare,
}: FilePreviewProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const resetTransform = useCallback(() => {
    setZoom(1);
    setRotation(0);
  }, []);

  useEffect(() => {
    resetTransform();
  }, [asset, resetTransform]);

  // Keyboard navigation support
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      } else if (e.key === "ArrowRight" && onNext) {
        onNext();
      } else if (e.key === "ArrowLeft" && onPrev) {
        onPrev();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange, onNext, onPrev]);

  if (!asset) return null;

  const isImage = asset.mimeType?.startsWith("image/") || asset.fileType === "image";
  const isVideo = asset.mimeType?.startsWith("video/") || asset.fileType === "video";
  const isAudio = asset.mimeType?.startsWith("audio/") || asset.fileType === "audio";
  const isPdf = asset.mimeType === "application/pdf" || asset.name.endsWith(".pdf");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[85vh] p-0 overflow-hidden flex flex-col bg-background">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-card">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            {isImage && <ImageIcon className="w-5 h-5 text-blue-500 shrink-0" />}
            {isVideo && <Film className="w-5 h-5 text-purple-500 shrink-0" />}
            {isAudio && <Music className="w-5 h-5 text-pink-500 shrink-0" />}
            {!isImage && !isVideo && !isAudio && (
              <FileText className="w-5 h-5 text-amber-500 shrink-0" />
            )}
            <DialogTitle className="text-base font-semibold truncate">
              {asset.name}
            </DialogTitle>
          </div>

          <div className="flex items-center gap-2">
            {isImage && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  title="Rotate"
                >
                  <RotateCw className="w-4 h-4" />
                </Button>
              </>
            )}

            {onShare && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => onShare(asset)}
              >
                <Share2 className="w-3.5 h-3.5" />
                Share
              </Button>
            )}

            {onDownload && (
              <Button
                variant="default"
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => onDownload(asset)}
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </Button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden relative bg-black/5 dark:bg-black/40">
          {/* Previous / Next Navigation controls */}
          {onPrev && (
            <button
              type="button"
              onClick={onPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-background/80 hover:bg-background shadow-md backdrop-blur text-foreground transition-all"
              title="Previous (Left Arrow)"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {onNext && (
            <button
              type="button"
              onClick={onNext}
              className="absolute right-72 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-background/80 hover:bg-background shadow-md backdrop-blur text-foreground transition-all hidden md:block"
              title="Next (Right Arrow)"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {/* Media Viewport */}
          <div className="flex-1 flex items-center justify-center p-6 overflow-auto min-h-0">
            {isImage && (
              <div
                className="transition-transform duration-200 ease-out max-h-full max-w-full flex items-center justify-center"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                }}
              >
                {/* eslint-disable-next-html-element-suppression */}
                <img
                  src={asset.fileUrl}
                  alt={asset.name}
                  className="max-h-[65vh] max-w-full object-contain rounded-lg shadow-lg"
                />
              </div>
            )}

            {isVideo && (
              <video
                src={asset.fileUrl}
                controls
                autoPlay
                className="max-h-[65vh] max-w-full rounded-lg shadow-lg"
              >
                Your browser does not support video playback.
              </video>
            )}

            {isAudio && (
              <div className="bg-card p-8 rounded-2xl shadow-xl border text-center space-y-4 max-w-md w-full">
                <div className="p-4 bg-pink-500/10 rounded-full w-16 h-16 mx-auto flex items-center justify-center text-pink-500">
                  <Music className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{asset.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{asset.mimeType}</p>
                </div>
                <audio src={asset.fileUrl} controls className="w-full mt-4">
                  Your browser does not support audio playback.
                </audio>
              </div>
            )}

            {isPdf && (
              <iframe
                src={asset.fileUrl}
                title={asset.name}
                className="w-full h-full min-h-[60vh] rounded-lg border shadow"
              />
            )}

            {!isImage && !isVideo && !isAudio && !isPdf && (
              <div className="bg-card p-8 rounded-2xl shadow-xl border text-center space-y-4 max-w-md">
                <div className="p-4 bg-amber-500/10 rounded-full w-16 h-16 mx-auto flex items-center justify-center text-amber-500">
                  <FileText className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{asset.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Preview not available for this file type
                  </p>
                </div>
                {onDownload && (
                  <Button
                    variant="default"
                    onClick={() => onDownload(asset)}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download File
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Sidebar Metadata Panel */}
          <div className="w-72 border-l bg-card p-4 overflow-y-auto hidden md:block shrink-0">
            <MetadataPanel asset={asset} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
