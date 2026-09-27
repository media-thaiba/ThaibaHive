"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QueueItem } from "./ApprovalQueue";
import { ApprovalDecisionPanel } from "./ApprovalDecisionPanel";
import { toast } from "sonner";
import { ShieldAlert, FileText, Paperclip, ExternalLink, Download, Upload, Image as ImageIcon } from "lucide-react";

interface ApprovalModalProps {
  item: QueueItem;
  onClose: () => void;
  onSuccess: () => void;
}

export function ApprovalModal({ item, onClose, onSuccess }: ApprovalModalProps) {
  const [action, setAction] = useState<"approve" | "reject" | "return">("approve");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(item.receiptUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Upload failed");
      }

      const data = await res.json();
      setReceiptUrl(data.url || data.filePath);
      toast.success("Receipt attached successfully.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to attach receipt");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitDecision = () => {
    if (action === "reject" && !notes.trim()) {
      toast.error("Rejection notes are required when rejecting a request.");
      return;
    }

    setIsSubmitting(true);
    fetch("/api/finance/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: item.id,
        requestType: item.type,
        action,
        notes,
        receiptUrl: receiptUrl || undefined,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to submit approval decision");
        return res.json();
      })
      .then(() => {
        toast.success(`Request ${action} decision processed successfully.`);
        onSuccess();
      })
      .catch((err) => {
        toast.error(err.message || "Error submitting decision");
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const isImageReceipt = receiptUrl?.match(/\.(jpg|jpeg|png|webp|gif)$/i);
  const isPdfReceipt = receiptUrl?.match(/\.pdf$/i);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Review {item.type.toUpperCase()} #{item.id.slice(0, 8)}
            </DialogTitle>
            {item.isEmergency && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> Emergency
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-muted/50 p-4 rounded-lg space-y-2 border text-sm">
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground font-medium">Title:</span>
              <span className="font-semibold">{item.title}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground font-medium">Submitted By:</span>
              <span>{item.submittedBy}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground font-medium">Date Submitted:</span>
              <span>{new Date(item.submittedAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground font-medium">Amount:</span>
              <span className="font-bold text-foreground">
                {item.amount !== null ? `$${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "N/A"}
              </span>
            </div>

            {/* Receipt & Invoice Attachment Section */}
            <div className="pt-1">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5" /> Receipt / Invoice:
                </span>
                {receiptUrl ? (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowReceiptPreview(!showReceiptPreview)}
                      className="h-7 text-xs gap-1"
                    >
                      <ImageIcon className="w-3 h-3" />
                      {showReceiptPreview ? "Hide Preview" : "View Receipt"}
                    </Button>
                    <a
                      href={receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleReceiptUpload}
                      disabled={isUploading}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isUploading}
                      className="h-7 text-xs gap-1 pointer-events-none text-muted-foreground hover:text-foreground"
                    >
                      <Upload className="w-3 h-3" />
                      {isUploading ? "Uploading..." : "Attach Document"}
                    </Button>
                  </label>
                )}
              </div>

              {/* Collapsible Receipt Preview Drawer */}
              {showReceiptPreview && receiptUrl && (
                <div className="mt-3 p-2 bg-background rounded border border-border/80 text-center">
                  {isImageReceipt ? (
                    <img
                      src={receiptUrl}
                      alt="Receipt Attachment"
                      className="max-h-64 mx-auto rounded object-contain"
                    />
                  ) : isPdfReceipt ? (
                    <div className="py-4 space-y-2">
                      <FileText className="w-10 h-10 mx-auto text-primary opacity-80" />
                      <p className="text-xs text-muted-foreground">PDF Invoice Document</p>
                      <a
                        href={receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md"
                      >
                        <Download className="w-3 h-3" /> Download / Open PDF
                      </a>
                    </div>
                  ) : (
                    <a
                      href={receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline py-2"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Attached File
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          <ApprovalDecisionPanel
            action={action}
            onActionChange={setAction}
            notes={notes}
            onNotesChange={setNotes}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmitDecision}
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
