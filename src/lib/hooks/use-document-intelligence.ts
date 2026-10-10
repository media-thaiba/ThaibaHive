"use client";

import { useState, useCallback } from "react";

interface DocumentPreview {
  id: string;
  type: "fee_receipt" | "medical_certificate" | "student_id_card" | "cctv_incident" | "general";
  title: string;
  previewUrl?: string;
  extractedFields: Record<string, { value: any; confidence: number }>;
  confidence: number;
  createdAt: Date;
}

interface ConfirmedDocument {
  id: string;
  type: string;
  data: Record<string, any>;
  targetTable: string;
  confirmedAt: Date;
}

interface UseDocumentIntelligenceReturn {
  uploadDocument: (file: File) => Promise<void>;
  confirmDocument: (id: string) => Promise<any>;
  deleteDocument: (id: string) => Promise<void>;
  preview: DocumentPreview | null;
  setPreview: (preview: DocumentPreview | null) => void;
  confirmedData: any;
  setConfirmedData: (data: any) => void;
  isUploading: boolean;
  isConfirming: boolean;
  error?: string;
  setError: (error: string | undefined) => void;
}

export function useDocumentIntelligence(): UseDocumentIntelligenceReturn {
  const [preview, setPreview] = useState<DocumentPreview | null>(null);
  const [confirmedData, setConfirmedData] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const uploadDocument = useCallback(async (file: File) => {
    setError(undefined);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/ai/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await response.json();
      setPreview({
        id: data.documentId,
        type: data.type,
        title: data.title,
        previewUrl: data.previewUrl,
        extractedFields: data.extractedFields,
        confidence: data.confidence,
        createdAt: new Date(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const confirmDocument = useCallback(async (id: string) => {
    setIsConfirming(true);
    try {
      const response = await fetch(`/api/ai/documents/${id}/confirm`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Confirmation failed");
      }

      const data = await response.json();
      return data;
    } catch (err) {
      throw err;
    } finally {
      setIsConfirming(false);
    }
  }, []);

  const deleteDocument = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/ai/documents/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Delete failed");
      }
    } catch (err) {
      throw err;
    }
  }, []);

  return {
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
  };
}