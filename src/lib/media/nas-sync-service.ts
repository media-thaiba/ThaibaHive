import { readdir, stat, readFile } from "fs/promises";
import { join, relative, extname, basename, dirname } from "path";
import { createHash, randomUUID } from "crypto";
import { db } from "@/db";
import { mediaAssets, mediaFolders, departments } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export interface NASWatchConfig {
  rootPaths: string[];
  departmentId?: string;
  recursive?: boolean;
  allowedExtensions?: string[];
  maxFileSize?: number;
  scanIntervalMs?: number;
}

export interface NASFileEntry {
  path: string;
  relativePath: string;
  name: string;
  size: number;
  mimeType: string;
  fileType: "image" | "video" | "audio" | "document";
  sha256: string;
  modifiedAt: Date;
}

export interface SyncResult {
  scanned: number;
  newAssets: number;
  updatedAssets: number;
  skippedDuplicates: number;
  errors: string[];
  foldersCreated: number;
}

export interface NASFolderMapping {
  dbFolderId: string;
  fsPath: string;
  relativePath: string;
}

const DEFAULT_ALLOWED_EXTENSIONS = [
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tiff",
  ".mp4", ".mov", ".avi", ".mkv", ".webm", ".flv",
  ".mp3", ".wav", ".ogg", ".flac", ".aac",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt",
];

const MIME_TYPE_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".tiff": "image/tiff",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".avi": "video/x-msvideo",
  ".mkv": "video/x-matroska",
  ".webm": "video/webm",
  ".flv": "video/x-flv",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".flac": "audio/flac",
  ".aac": "audio/aac",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".txt": "text/plain",
};

function getFileType(mimeType: string): "image" | "video" | "audio" | "document" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
}

export class NASSyncService {
  private config: NASWatchConfig;
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(config: NASWatchConfig) {
    this.config = {
      recursive: true,
      allowedExtensions: DEFAULT_ALLOWED_EXTENSIONS,
      maxFileSize: 5 * 1024 * 1024 * 1024,
      scanIntervalMs: 5 * 60 * 1000,
      ...config,
    };
  }

  async scanOnce(): Promise<SyncResult> {
    const result: SyncResult = {
      scanned: 0,
      newAssets: 0,
      updatedAssets: 0,
      skippedDuplicates: 0,
      errors: [],
      foldersCreated: 0,
    };

    try {
      for (const rootPath of this.config.rootPaths) {
        const folderMappings = await this.ensureFolderHierarchy(rootPath);
        const files = await this.walkDirectory(rootPath, rootPath);
        
        for (const file of files) {
          result.scanned++;
          
          if (this.config.maxFileSize && file.size > this.config.maxFileSize) {
            result.errors.push(`${file.relativePath}: File too large (${file.size} bytes)`);
            continue;
          }

          const folderMapping = this.findMatchingFolder(folderMappings, file.relativePath);
          if (!folderMapping) {
            result.errors.push(`${file.relativePath}: No matching folder mapping`);
            continue;
          }

          const existingAsset = await this.findAssetByHash(file.sha256);
          if (existingAsset) {
            result.skippedDuplicates++;
            continue;
          }

          try {
            await this.createAssetRecord(file, folderMapping.dbFolderId);
            result.newAssets++;
          } catch (err) {
            result.errors.push(`${file.relativePath}: ${err instanceof Error ? err.message : "Unknown error"}`);
          }
        }
      }
    } catch (err) {
      result.errors.push(`Scan failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }

    return result;
  }

  private async walkDirectory(rootPath: string, currentPath: string): Promise<NASFileEntry[]> {
    const entries = await readdir(currentPath, { withFileTypes: true });
    const results: NASFileEntry[] = [];

    for (const entry of entries) {
      const fullPath = join(currentPath, entry.name);
      
      if (entry.isDirectory()) {
        if (this.config.recursive) {
          const subResults = await this.walkDirectory(rootPath, fullPath);
          results.push(...subResults);
        }
      } else if (entry.isFile()) {
        const ext = extname(entry.name).toLowerCase();
        if (this.config.allowedExtensions?.includes(ext)) {
          try {
            const fileStat = await stat(fullPath);
            const mimeType = MIME_TYPE_MAP[ext] || "application/octet-stream";
            
            const sha256 = await this.computeFileHash(fullPath);
            
            results.push({
              path: fullPath,
              relativePath: relative(rootPath, fullPath),
              name: entry.name,
              size: fileStat.size,
              mimeType,
              fileType: getFileType(mimeType),
              sha256,
              modifiedAt: fileStat.mtime,
            });
          } catch (err) {
            console.warn(`[NAS Sync] Failed to process ${fullPath}:`, err);
          }
        }
      }
    }

    return results;
  }

  private async computeFileHash(filePath: string): Promise<string> {
    const hash = createHash("sha256");
    const buffer = await readFile(filePath);
    hash.update(buffer);
    return hash.digest("hex");
  }

  private async ensureFolderHierarchy(rootPath: string): Promise<NASFolderMapping[]> {
    const mappings: NASFolderMapping[] = [];
    
    const rootFolder = await this.getOrCreateFolder({
      name: basename(rootPath) || "NAS Root",
      parentId: null,
      departmentId: this.config.departmentId,
    });
    
    mappings.push({
      dbFolderId: rootFolder.id,
      fsPath: rootPath,
      relativePath: "",
    });

    await this.ensureSubfolders(rootPath, rootPath, rootFolder.id, mappings);
    
    return mappings;
  }

  private async ensureSubfolders(
    rootPath: string,
    currentPath: string,
    parentDbId: string,
    mappings: NASFolderMapping[]
  ): Promise<void> {
    const entries = await readdir(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const fullPath = join(currentPath, entry.name);
        const relativePath = relative(rootPath, fullPath);
        
        const folder = await this.getOrCreateFolder({
          name: entry.name,
          parentId: parentDbId,
          departmentId: this.config.departmentId,
        });
        
        mappings.push({
          dbFolderId: folder.id,
          fsPath: fullPath,
          relativePath,
        });

        if (this.config.recursive) {
          await this.ensureSubfolders(rootPath, fullPath, folder.id, mappings);
        }
      }
    }
  }

  private async getOrCreateFolder(params: {
    name: string;
    parentId: string | null;
    departmentId?: string;
  }): Promise<{ id: string; name: string }> {
    const conditions = [
      eq(mediaFolders.name, params.name),
      params.parentId ? eq(mediaFolders.parentId, params.parentId) : sql`${mediaFolders.parentId} IS NULL`,
    ];
    
    if (params.departmentId) {
      conditions.push(eq(mediaFolders.departmentId, params.departmentId));
    }

    const existing = await db
      .select()
      .from(mediaFolders)
      .where(and(...conditions))
      .get();

    if (existing) {
      return { id: existing.id, name: existing.name };
    }

    let instId: string | null = null;
    if (params.departmentId) {
      const dept = await db
        .select({ institutionId: departments.institutionId })
        .from(departments)
        .where(eq(departments.id, params.departmentId))
        .get();
      instId = dept?.institutionId ?? null;
    }

    const newFolder = await db
      .insert(mediaFolders)
      .values({
        id: randomUUID(),
        name: params.name,
        parentId: params.parentId,
        departmentId: params.departmentId || null,
        institutionId: instId,
        createdById: "system-nas-sync",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning()
      .get();

    return { id: newFolder.id, name: newFolder.name };
  }

  private findMatchingFolder(mappings: NASFolderMapping[], fileRelativePath: string): NASFolderMapping | null {
    const fileDir = dirname(fileRelativePath);
    
    let bestMatch: NASFolderMapping | null = null;
    let bestDepth = -1;

    for (const mapping of mappings) {
      if (mapping.relativePath === fileDir || fileDir.startsWith(mapping.relativePath + "/")) {
        const depth = mapping.relativePath.split("/").filter(Boolean).length;
        if (depth > bestDepth) {
          bestDepth = depth;
          bestMatch = mapping;
        }
      }
    }

    return bestMatch || mappings[0] || null;
  }

  private async findAssetByHash(sha256: string) {
    return db
      .select()
      .from(mediaAssets)
      .where(sql`json_extract(${mediaAssets.metadata}, '$.sha256') = ${sha256}`)
      .get();
  }

  private async createAssetRecord(file: NASFileEntry, folderId: string): Promise<void> {
    const metadata = {
      sha256: file.sha256,
      nasPath: file.path,
      nasRelativePath: file.relativePath,
      importedAt: new Date().toISOString(),
    };

    const folder = await db
      .select({ institutionId: mediaFolders.institutionId })
      .from(mediaFolders)
      .where(eq(mediaFolders.id, folderId))
      .get();

    await db
      .insert(mediaAssets)
      .values({
        id: randomUUID(),
        name: file.name,
        fileUrl: `nas://${file.path}`,
        fileSize: file.size,
        mimeType: file.mimeType,
        fileType: file.fileType,
        status: "ready",
        folderId,
        institutionId: folder?.institutionId ?? null,
        tags: ["nas-import"],
        metadata,
        downloadCount: 0,
        createdById: "system-nas-sync",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .run();
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    
    this.intervalId = setInterval(async () => {
      try {
        await this.scanOnce();
      } catch (err) {
        console.error("[NAS Sync] Scheduled scan failed:", err);
      }
    }, this.config.scanIntervalMs);

    if (this.intervalId && typeof this.intervalId.unref === "function") {
      this.intervalId.unref();
    }
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  async getStatus(): Promise<{
    running: boolean;
    config: NASWatchConfig;
    nextScanInMs: number | null;
  }> {
    const intervalMs = this.config.scanIntervalMs ?? 0;
    return {
      running: this.isRunning,
      config: this.config,
      nextScanInMs: this.intervalId ? intervalMs : null,
    };
  }
}

export function createNASSyncService(config: NASWatchConfig): NASSyncService {
  return new NASSyncService(config);
}

export default NASSyncService;