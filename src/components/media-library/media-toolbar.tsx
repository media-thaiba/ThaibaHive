"use client";

import React from "react";
import {
  RefreshCw,
  Grid,
  ListIcon,
  Download,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumbs, BreadcrumbItem } from "@/components/ui/breadcrumbs";
import { SearchBar } from "@/components/ui/search-bar";
import { FilterPanel, FilterState } from "@/components/ui/filter-panel";

interface MediaToolbarProps {
  breadcrumbItems: BreadcrumbItem[];
  onNavigateFolder: (id: string | null) => void;
  isLoading: boolean;
  onRefresh: () => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  onOpenUpload: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onClearFilters: () => void;
  selectedCount: number;
  onBatchDownload: () => void;
  onBatchDelete: () => void;
  isDownloadingZip: boolean;
}

export function MediaToolbar({
  breadcrumbItems,
  onNavigateFolder,
  isLoading,
  onRefresh,
  viewMode,
  onViewModeChange,
  onOpenUpload,
  searchQuery,
  onSearchChange,
  filters,
  onFilterChange,
  onClearFilters,
  selectedCount,
  onBatchDownload,
  onBatchDelete,
  isDownloadingZip,
}: MediaToolbarProps) {
  return (
    <header className="p-4 border-b bg-card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumbs items={breadcrumbItems} onNavigate={onNavigateFolder} />

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={onRefresh}
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>

          <div className="border rounded-lg p-0.5 flex bg-muted/40">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => onViewModeChange("grid")}
            >
              <Grid className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => onViewModeChange("list")}
            >
              <ListIcon className="w-3.5 h-3.5" />
            </Button>
          </div>

          <Button
            variant="default"
            size="sm"
            onClick={onOpenUpload}
            className="gap-1.5 text-xs md:hidden"
          >
            Upload
          </Button>
        </div>
      </div>

      {/* Search, Filter, and Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <SearchBar
            value={searchQuery}
            onChange={onSearchChange}
            className="w-full sm:w-64"
          />
          <FilterPanel
            filters={filters}
            onChange={onFilterChange}
            onClear={onClearFilters}
          />
        </div>

        {/* Batch Action Toolbar */}
        {selectedCount > 0 && (
          <div className="flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-xl border border-primary/20 animate-in fade-in">
            <span className="text-xs font-medium text-primary">
              {selectedCount} selected
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={onBatchDownload}
              disabled={isDownloadingZip}
              className="h-7 text-xs gap-1"
            >
              <Download className="w-3 h-3" /> ZIP
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={onBatchDelete}
              className="h-7 text-xs gap-1"
            >
              <Trash2 className="w-3 h-3" /> Delete
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
