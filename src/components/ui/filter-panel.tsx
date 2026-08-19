"use client";

import React from "react";
import { Select, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RotateCcw,  } from "lucide-react";

export type FileTypeFilter = "all" | "image" | "video" | "audio" | "document" | "other";
export type DateFilter = "all" | "today" | "7d" | "30d";

export interface FilterState {
  fileType: FileTypeFilter;
  dateRange: DateFilter;
}

interface FilterPanelProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onClear: () => void;
  className?: string;
}

export function FilterPanel({ filters, onChange, onClear, className = "" }: FilterPanelProps) {
  const isFiltered = filters.fileType !== "all" || filters.dateRange !== "all";

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <div className="w-36">
        <Select
          value={filters.fileType}
          onChange={(e) => onChange({ ...filters, fileType: e.target.value as FileTypeFilter })}
          className="h-9 text-xs rounded-xl border-muted-foreground/20"
        >
          <SelectItem value="all">All File Types</SelectItem>
          <SelectItem value="image">Images</SelectItem>
          <SelectItem value="video">Videos</SelectItem>
          <SelectItem value="audio">Audio</SelectItem>
          <SelectItem value="document">Documents</SelectItem>
          <SelectItem value="other">Other</SelectItem>
        </Select>
      </div>

      <div className="w-36">
        <Select
          value={filters.dateRange}
          onChange={(e) => onChange({ ...filters, dateRange: e.target.value as DateFilter })}
          className="h-9 text-xs rounded-xl border-muted-foreground/20"
        >
          <SelectItem value="all">Any Time</SelectItem>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="7d">Last 7 Days</SelectItem>
          <SelectItem value="30d">Last 30 Days</SelectItem>
        </Select>
      </div>

      {isFiltered && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-9 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Clear Filters
        </Button>
      )}
    </div>
  );
}
