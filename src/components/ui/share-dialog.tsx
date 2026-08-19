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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { api } from "@/lib/api/client";
import { toast } from "sonner";
import { Share2, Copy, Check, Lock, Clock, Link as LinkIcon } from "lucide-react";

export type ExpiryOption = "1h" | "24h" | "7d" | "never";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId?: string | null;
  folderId?: string | null;
  itemName: string;
}

export function ShareDialog({
  open,
  onOpenChange,
  assetId,
  folderId,
  itemName,
}: ShareDialogProps) {
  const [expiry, setExpiry] = useState<ExpiryOption>("24h");
  const [password, setPassword] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const calculateExpiresAt = (option: ExpiryOption): string | null => {
    const now = new Date();
    if (option === "1h") {
      now.setHours(now.getHours() + 1);
      return now.toISOString();
    } else if (option === "24h") {
      now.setHours(now.getHours() + 24);
      return now.toISOString();
    } else if (option === "7d") {
      now.setDate(now.getDate() + 7);
      return now.toISOString();
    }
    return null; // never
  };

  const handleGenerateShareLink = async () => {
    setIsGenerating(true);
    setCopied(false);
    try {
      const expiresAt = calculateExpiresAt(expiry);
      const { data, ok, error } = await api.post<{ token: string; shareUrl: string }>(
        "/api/media/share-links",
        {
          assetId: assetId || undefined,
          folderId: folderId || undefined,
          expiresAt: expiresAt || undefined,
          password: password.trim() || undefined,
        }
      );

      if (ok && data) {
        const fullUrl = `${window.location.origin}${data.shareUrl}`;
        setGeneratedUrl(fullUrl);
        await navigator.clipboard.writeText(fullUrl);
        setCopied(true);
        toast.success("Share link created and copied to clipboard!");
      } else {
        toast.error(error || "Failed to create share link");
      }
    } catch {
      toast.error("Failed to create share link");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedUrl) return;
    await navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setGeneratedUrl(null);
    setPassword("");
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            <DialogTitle>Share &quot;{itemName}&quot;</DialogTitle>
          </div>
          <DialogDescription>
            Create a secure shareable link with optional expiration and password protection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!generatedUrl ? (
            <>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs font-medium">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  Link Expiration
                </Label>
                <Select
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value as ExpiryOption)}
                  className="w-full text-xs"
                >
                  <SelectItem value="1h">1 Hour</SelectItem>
                  <SelectItem value="24h">24 Hours (Default)</SelectItem>
                  <SelectItem value="7d">7 Days</SelectItem>
                  <SelectItem value="never">Never (No expiry)</SelectItem>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs font-medium">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                  Password Protection (Optional)
                </Label>
                <Input
                  type="password"
                  placeholder="Set optional password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <Button
                onClick={handleGenerateShareLink}
                disabled={isGenerating}
                className="w-full gap-2 mt-2"
              >
                <LinkIcon className="w-4 h-4" />
                {isGenerating ? "Generating..." : "Generate Share Link"}
              </Button>
            </>
          ) : (
            <div className="space-y-4 bg-muted/40 p-4 rounded-xl border">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <Check className="w-4 h-4" />
                Share link ready!
              </div>

              <div className="flex gap-2">
                <Input value={generatedUrl} readOnly className="font-mono text-xs" />
                <Button variant="secondary" onClick={handleCopy} className="shrink-0 gap-1.5">
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>

              <p className="text-[11px] text-muted-foreground">
                Anyone with this link {password ? "and password" : ""} can access this file.
              </p>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setGeneratedUrl(null)}
                className="w-full text-xs"
              >
                Create Another Link
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
