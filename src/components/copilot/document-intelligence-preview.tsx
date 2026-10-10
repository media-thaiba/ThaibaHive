"use client";

import { useState, useCallback } from "react";
import { useDocumentIntelligence } from "@/lib/hooks/use-document-intelligence";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Upload,
  FileText,
  Image,
  CreditCard,
  Stethoscope,
  IdCard,
  Camera,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit,
  Download,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DocumentIntelligencePreviewProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onConfirm?: (document: any) => void;
}

export function DocumentIntelligencePreview({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onConfirm,
}: DocumentIntelligencePreviewProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange !== undefined ? controlledOnOpenChange : setInternalOpen;

  const {
    uploadDocument,
    confirmDocument,
    deleteDocument,
    preview,
    setPreview,
    confirmedData,
    setConfirmedData,
    isUploading,
    isConfirming,
    error,
    setError,
  } = useDocumentIntelligence();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<"upload" | "preview" | "confirmed">("upload");

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setActiveTab("upload");
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;
    try {
      await uploadDocument(selectedFile);
    } catch (error) {
      console.error("Upload failed:", error);
    }
  }, [selectedFile, uploadDocument]);

  const handleConfirm = useCallback(async () => {
    if (!preview) return;
    try {
      const confirmed = await confirmDocument(preview.id);
      setConfirmedData(confirmed);
      setActiveTab("confirmed");
      onConfirm?.(confirmed);
    } catch (error) {
      console.error("Confirmation failed:", error);
    }
  }, [preview, confirmDocument, onConfirm]);

  const handleDelete = useCallback(async () => {
    if (!preview) return;
    try {
      await deleteDocument(preview.id);
      setPreview(null);
      setSelectedFile(null);
      setActiveTab("upload");
    } catch (error) {
      console.error("Delete failed:", error);
    }
  }, [preview, deleteDocument]);

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case "fee_receipt":
        return <CreditCard className="h-5 w-5" />;
      case "medical_certificate":
        return <Stethoscope className="h-5 w-5" />;
      case "student_id_card":
        return <IdCard className="h-5 w-5" />;
      case "cctv_incident":
        return <Camera className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "fee_receipt":
        return "Fee Receipt";
      case "medical_certificate":
        return "Medical Certificate";
      case "student_id_card":
        return "Student ID Card";
      case "cctv_incident":
        return "CCTV Incident";
      default:
        return "Document";
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Document Intelligence Center</DialogTitle>
            <DialogDescription>
              Upload, preview, and confirm documents with AI-powered extraction
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col h-[calc(100%-80px)]">
            {/* Tab Navigation */}
            <div className="flex border-b mb-4">
              {[
                { id: "upload", label: "Upload", icon: Upload },
                { id: "preview", label: "Preview", icon: Eye },
                { id: "confirmed", label: "Confirmed", icon: CheckCircle2 },
              ].map((tab) => {
                const isTabDisabled = tab.id === "preview" && !preview || tab.id === "confirmed" && !confirmedData;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    disabled={isTabDisabled}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
                      activeTab === tab.id
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                      isTabDisabled && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <tab.icon className="h-4 w-4" />
                    <span className="capitalize">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 p-4">
              {/* Upload Tab */}
              {activeTab === "upload" && (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* File Drop Zone */}
                    <div className="col-span-1">
                      <Label className="block text-sm font-medium mb-2">Select Document</Label>
                      <div
                        className={cn(
                          "border-2 border-dashed rounded-xl p-8 text-center transition-colors",
                          selectedFile ? "border-primary bg-primary/5" : "border-muted/50 hover:border-primary/50"
                        )}
                        onClick={() => document.getElementById("document-upload")?.click()}
                      >
                        <input
                          id="document-upload"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.heic,.webp"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        <Upload className="h-10 w-10 mx-auto text-muted-foreground/50" />
                        <p className="mt-2 text-sm font-medium text-foreground">
                          {selectedFile ? selectedFile.name : "Click to upload or drag & drop"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PDF, JPG, PNG, HEIC, WEBP · Max 25MB
                        </p>
                      </div>
                    </div>

                    {/* Document Type Selection */}
                    <div className="col-span-1 space-y-2">
                      <Label className="block text-sm font-medium">Document Type</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: "fee_receipt", label: "Fee Receipt", icon: CreditCard },
                          { id: "medical_certificate", label: "Medical Certificate", icon: Stethoscope },
                          { id: "student_id_card", label: "Student ID Card", icon: IdCard },
                          { id: "cctv_incident", label: "CCTV Incident", icon: Camera },
                        ].map((type) => (
                          <button
                            key={type.id}
                            type="button"
                            className={cn(
                              "flex items-center gap-2 p-3 rounded-lg border transition-colors",
                              "hover:bg-muted hover:border-primary/50"
                            )}
                          >
                            <type.icon className="h-5 w-5 text-muted-foreground" />
                            <span className="text-sm font-medium">{type.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {selectedFile && (
                    <Button
                      onClick={handleUpload}
                      disabled={isUploading}
                      className="w-full"
                      size="lg"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Processing with AI...
                        </>
                      ) : (
                        <>
                          <Loader2 className="h-4 w-4 mr-2" />
                          Extract & Analyze
                        </>
                      )}
                    </Button>
                  )}

                  {error && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                      {error}
                    </div>
                  )}
                </div>
              )}

              {/* Preview Tab */}
              {activeTab === "preview" && preview && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        {getDocumentIcon(preview.type)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{getTypeLabel(preview.type)}</h3>
                        <p className="text-sm text-muted-foreground">
                          Confidence: {Math.round(preview.confidence * 100)}%
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={() => setActiveTab("upload")}>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                      <Button variant="outline" onClick={() => setActiveTab("upload")}>
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Re-process
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Extracted Fields */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Extracted Fields
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {Object.entries(preview.extractedFields || {}).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                {key.replace(/_/g, " ")}
                              </span>
                              <Badge
                                variant={
                                  (value as any)?.confidence > 0.85 ? "success" :
                                  (value as any)?.confidence > 0.7 ? "warning" : "destructive"
                                }
                                className="text-[10px]"
                              >
                                {Math.round(((value as any)?.confidence || 0) * 100)}%
                              </Badge>
                            </div>
                            <div className="text-sm font-medium text-right max-w-[60%] truncate">
                              {(value as any)?.value || value}
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    {/* Raw Preview */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Image className="h-4 w-4" />
                          Document Preview
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                          {preview.previewUrl ? (
                            <img
                              src={preview.previewUrl}
                              alt="Document preview"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                              No preview available
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Confirm Actions */}
                  <div className="flex items-center justify-end gap-2 pt-4 border-t">
                    <Button variant="ghost" onClick={() => setActiveTab("upload")}>
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Re-process
                    </Button>
                    <Button variant="destructive" onClick={handleDelete}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                    <Button onClick={handleConfirm} disabled={isConfirming}>
                      {isConfirming ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Confirming...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Confirm & Save
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Confirmed Tab */}
              {activeTab === "confirmed" && confirmedData && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald/10 rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{getTypeLabel(confirmedData.type)} Confirmed</h3>
                        <p className="text-sm text-muted-foreground">
                          Saved to {confirmedData.targetTable || "database"} · {new Date(confirmedData.confirmedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" onClick={() => setActiveTab("upload")}>
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Process Another
                    </Button>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Confirmed Data</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {Object.entries(confirmedData.data || {}).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            {key.replace(/_/g, " ")}
                          </span>
                          <span className="text-sm font-medium text-right max-w-[60%] truncate">
                            {String(value)}
                          </span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setActiveTab("upload")}>
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Process Another Document
                    </Button>
                    <Button variant="outline" onClick={() => {
                      // Download confirmed data as JSON
                      const blob = new Blob([JSON.stringify(confirmedData, null, 2)], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${confirmedData.type}-${confirmedData.id}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}>
                      <Download className="h-4 w-4 mr-1" />
                      Download JSON
                    </Button>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!selectedFile && activeTab === "upload" && (
                <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                  <Upload className="h-12 w-12 mb-4 opacity-30" />
                  <p className="text-lg font-medium">Drop a document to get started</p>
                  <p className="text-sm">Supports PDF, JPG, PNG, HEIC, WEBP · Max 25MB</p>
                </div>
              )}

              {!preview && activeTab === "preview" && (
                <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                  <Eye className="h-12 w-12 mb-4 opacity-30" />
                  <p className="text-lg font-medium">No document to preview</p>
                  <p className="text-sm">Upload and process a document first</p>
                </div>
              )}

              {!confirmedData && activeTab === "confirmed" && (
                <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mb-4 opacity-30" />
                  <p className="text-lg font-medium">No confirmed documents yet</p>
                  <p className="text-sm">Confirm a document to see it here</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function DocumentIntelligenceButton({ className }: { className?: string }) {
  return (
    <DialogTrigger>
      <Button variant="outline" className={className} size="sm">
        <FileText className="h-4 w-4 mr-1" />
        Document Intelligence
      </Button>
    </DialogTrigger>
  );
}
