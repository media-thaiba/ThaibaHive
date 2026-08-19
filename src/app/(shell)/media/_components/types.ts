export type AssetType = "image" | "video" | "audio" | "document";
export type AssetStatus = "ready" | "processing" | "failed";

export interface MediaAsset {
  id: string;
  name: string;
  fileUrl: string;
  thumbnailUrl: string | null;
  fileSize: number;
  mimeType: string;
  fileType: AssetType;
  status: AssetStatus;
  folderId: string | null;
  tags: string[] | null;
  metadata: Record<string, unknown> | null;
  downloadCount: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface MediaFolder {
  id: string;
  name: string;
  parentId: string | null;
  departmentId: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}
