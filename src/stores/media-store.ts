import { create } from "zustand";
import { FilterState } from "@/components/ui/filter-panel";
import { UploadItem } from "@/components/ui/upload-progress";
import { FolderNode } from "@/components/ui/folder-tree";
import { AssetMetadata } from "@/components/ui/metadata-panel";
import { MediaAsset } from "@/components/media-library/media-grid-view";

export type DeleteConfirmTarget = {
  type: "asset" | "folder" | "batch";
  target: any;
};

interface MediaState {
  // Navigation & Search
  activeFolderId: string | null;
  searchQuery: string;
  filters: FilterState;
  viewMode: "grid" | "list";
  page: number;

  // Batch Selection
  selectedAssetIds: Set<string>;
  isDownloadingZip: boolean;

  // Upload Management
  uploadQueue: UploadItem[];
  showUploadModal: boolean;

  // Preview & Share
  previewAsset: AssetMetadata | null;
  shareTarget: { assetId?: string; folderId?: string; name: string } | null;
  showShareModal: boolean;

  // Folder Dialogs
  newFolderName: string;
  newFolderParentId: string | null;
  showNewFolderModal: boolean;
  folderToRename: FolderNode | null;
  renameFolderName: string;

  // Move & Delete Dialogs
  showMoveModal: boolean;
  assetToMove: MediaAsset | null;
  deleteConfirmTarget: DeleteConfirmTarget | null;

  // Actions
  setActiveFolderId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setFilters: (filters: FilterState) => void;
  setViewMode: (mode: "grid" | "list") => void;
  setPage: (page: number | ((p: number) => number)) => void;
  toggleSelectAsset: (id: string) => void;
  toggleSelectAll: (allIds: string[]) => void;
  clearSelection: () => void;
  setIsDownloadingZip: (v: boolean) => void;
  setUploadQueue: (updater: UploadItem[] | ((prev: UploadItem[]) => UploadItem[])) => void;
  setShowUploadModal: (v: boolean) => void;
  setPreviewAsset: (asset: AssetMetadata | null) => void;
  setShareTarget: (target: { assetId?: string; folderId?: string; name: string } | null) => void;
  setShowShareModal: (v: boolean) => void;
  setNewFolderName: (name: string) => void;
  setNewFolderParentId: (id: string | null) => void;
  setShowNewFolderModal: (v: boolean) => void;
  setFolderToRename: (folder: FolderNode | null) => void;
  setRenameFolderName: (name: string) => void;
  setShowMoveModal: (v: boolean) => void;
  setAssetToMove: (asset: MediaAsset | null) => void;
  setDeleteConfirmTarget: (target: DeleteConfirmTarget | null) => void;
  resetFilters: () => void;
}

export const useMediaStore = create<MediaState>((set) => ({
  activeFolderId: null,
  searchQuery: "",
  filters: { fileType: "all", dateRange: "all" },
  viewMode: "grid",
  page: 1,

  selectedAssetIds: new Set<string>(),
  isDownloadingZip: false,

  uploadQueue: [],
  showUploadModal: false,

  previewAsset: null,
  shareTarget: null,
  showShareModal: false,

  newFolderName: "",
  newFolderParentId: null,
  showNewFolderModal: false,
  folderToRename: null,
  renameFolderName: "",

  showMoveModal: false,
  assetToMove: null,
  deleteConfirmTarget: null,

  setActiveFolderId: (id) => set({ activeFolderId: id, page: 1 }),
  setSearchQuery: (query) => set({ searchQuery: query, page: 1 }),
  setFilters: (filters) => set({ filters, page: 1 }),
  setViewMode: (viewMode) => set({ viewMode }),
  setPage: (page) =>
    set((state) => ({
      page: typeof page === "function" ? page(state.page) : page,
    })),
  toggleSelectAsset: (id) =>
    set((state) => {
      const next = new Set(state.selectedAssetIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedAssetIds: next };
    }),
  toggleSelectAll: (allIds) =>
    set((state) => {
      if (state.selectedAssetIds.size === allIds.length) {
        return { selectedAssetIds: new Set() };
      }
      return { selectedAssetIds: new Set(allIds) };
    }),
  clearSelection: () => set({ selectedAssetIds: new Set() }),
  setIsDownloadingZip: (isDownloadingZip) => set({ isDownloadingZip }),
  setUploadQueue: (updater) =>
    set((state) => ({
      uploadQueue: typeof updater === "function" ? updater(state.uploadQueue) : updater,
    })),
  setShowUploadModal: (showUploadModal) => set({ showUploadModal }),
  setPreviewAsset: (previewAsset) => set({ previewAsset }),
  setShareTarget: (shareTarget) => set({ shareTarget }),
  setShowShareModal: (showShareModal) => set({ showShareModal }),
  setNewFolderName: (newFolderName) => set({ newFolderName }),
  setNewFolderParentId: (newFolderParentId) => set({ newFolderParentId }),
  setShowNewFolderModal: (showNewFolderModal) => set({ showNewFolderModal }),
  setFolderToRename: (folderToRename) => set({ folderToRename }),
  setRenameFolderName: (renameFolderName) => set({ renameFolderName }),
  setShowMoveModal: (showMoveModal) => set({ showMoveModal }),
  setAssetToMove: (assetToMove) => set({ assetToMove }),
  setDeleteConfirmTarget: (deleteConfirmTarget) => set({ deleteConfirmTarget }),
  resetFilters: () =>
    set({
      filters: { fileType: "all", dateRange: "all" },
      searchQuery: "",
      page: 1,
    }),
}));
