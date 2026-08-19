"use client";

import React, { useState, useRef, useCallback } from "react";
import { UploadCloud, File,  } from "lucide-react";
import { toast } from "sonner";

interface DropzoneProps {
  onFilesSelected: (files: File[]) => void;
  maxSizeBytes?: number; // Default 100MB
  disabled?: boolean;
  className?: string;
}

const BLOCKED_EXTENSIONS = [".exe", ".bat", ".sh", ".dll", ".cmd", ".msi", ".vbs", ".ps1"];

export function Dropzone({
  onFilesSelected,
  maxSizeBytes = 100 * 1024 * 1024,
  disabled = false,
  className = "",
}: DropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndEmit = useCallback(
    (fileList: FileList | File[]) => {
      const selected = Array.from(fileList);
      const validFiles: File[] = [];

      for (const file of selected) {
        const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
        if (BLOCKED_EXTENSIONS.includes(ext)) {
          toast.error(`File "${file.name}" rejected: Executable files are not allowed.`);
          continue;
        }

        if (file.size > maxSizeBytes) {
          toast.error(`File "${file.name}" rejected: Exceeds maximum size limit (100MB).`);
          continue;
        }

        validFiles.push(file);
      }

      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    },
    [maxSizeBytes, onFilesSelected]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndEmit(e.dataTransfer.files);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
        isDragOver
          ? "border-primary bg-primary/5 dark:bg-primary/10"
          : "border-muted-foreground/25 hover:border-primary/50 bg-card"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          if (e.target.files) {
            validateAndEmit(e.target.files);
            e.target.value = "";
          }
        }}
      />
      <div className="flex flex-col items-center justify-center space-y-2">
        <div className="p-3 bg-primary/10 rounded-full text-primary">
          <UploadCloud className="w-8 h-8" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Images, Videos, PDFs, Audio up to 100MB
          </p>
        </div>
      </div>
    </div>
  );
}
