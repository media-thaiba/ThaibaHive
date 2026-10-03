import { NASSyncService, createNASSyncService, NASFileEntry, SyncResult } from "../nas-sync-service";

jest.mock("fs/promises", () => ({
  readdir: jest.fn(),
  stat: jest.fn(),
  readFile: jest.fn(),
}));

jest.mock("crypto", () => ({
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue("abc123hash"),
  })),
  randomUUID: jest.fn(() => "test-uuid"),
}));

jest.mock("@/db", () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock("@/db/schema", () => ({
  mediaAssets: {},
  mediaFolders: {},
  departments: {},
}));

jest.mock("drizzle-orm", () => ({
  eq: jest.fn((col, val) => ({ type: "eq", col, val })),
  and: jest.fn((...args) => ({ type: "and", args })),
  sql: jest.fn((strings, ...values) => ({ type: "sql", strings, values })),
}));

import { readdir, stat, readFile } from "fs/promises";
import { db } from "@/db";
import { mediaAssets, mediaFolders } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import crypto from "crypto";

describe("NASSyncService", () => {
  let service: NASSyncService;
  const mockReaddir = readdir as jest.Mock;
  const mockStat = stat as jest.Mock;
  const mockReadFile = readFile as jest.Mock;
  const mockDbSelect = db.select as jest.Mock;
  const mockDbInsert = db.insert as jest.Mock;
  const mockEq = eq as jest.Mock;
  const mockAnd = and as jest.Mock;
  const mockSql = sql as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    service = createNASSyncService({
      rootPaths: ["/mnt/nas/media"],
      departmentId: "dept-456",
    });

    (crypto.randomUUID as jest.Mock).mockReturnValue("test-uuid");
    (crypto.createHash as jest.Mock).mockReturnValue({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue("abc123hash"),
    });
  });

  describe("walkDirectory", () => {
    it("returns empty array for empty directory", async () => {
      mockReaddir.mockResolvedValue([]);

      const files = await (service as any).walkDirectory("/mnt/nas", "/mnt/nas");
      
      expect(files).toEqual([]);
    });

    it("filters files by allowed extensions", async () => {
      const mockEntries = [
        { name: "video.mp4", isDirectory: () => false, isFile: () => true },
        { name: "image.jpg", isDirectory: () => false, isFile: () => true },
        { name: "document.xyz", isDirectory: () => false, isFile: () => true },
      ];
      
      mockReaddir.mockResolvedValue(mockEntries);
      mockStat.mockResolvedValue({ size: 1024, mtime: new Date() });
      mockReadFile.mockResolvedValue(Buffer.from("content"));

      const files = await (service as any).walkDirectory("/mnt/nas", "/mnt/nas");

      expect(files).toHaveLength(2);
      expect(files.map((f: NASFileEntry) => f.name)).toContain("video.mp4");
      expect(files.map((f: NASFileEntry) => f.name)).toContain("image.jpg");
      expect(files.map((f: NASFileEntry) => f.name)).not.toContain("document.xyz");
    });

    it("recursively walks subdirectories", async () => {
      const rootEntries = [
        { name: "subdir", isDirectory: () => true, isFile: () => false },
        { name: "video.mp4", isDirectory: () => false, isFile: () => true },
      ];
      
      const subEntries = [
        { name: "nested.mp4", isDirectory: () => false, isFile: () => true },
      ];

      mockReaddir
        .mockResolvedValueOnce(rootEntries)
        .mockResolvedValueOnce(subEntries);
      
      mockStat.mockResolvedValue({ size: 1024, mtime: new Date() });
      mockReadFile.mockResolvedValue(Buffer.from("content"));

      const files = await (service as any).walkDirectory("/mnt/nas", "/mnt/nas");

      expect(files).toHaveLength(2);
      expect(files.map((f: NASFileEntry) => f.relativePath.replace(/\\/g, "/"))).toContain("video.mp4");
      expect(files.map((f: NASFileEntry) => f.relativePath.replace(/\\/g, "/"))).toContain("subdir/nested.mp4");
    });

    it("skips files larger than maxFileSize in scanOnce", async () => {
      const mockEntries = [
        { name: "large.mp4", isDirectory: () => false, isFile: () => true },
      ];
      
      mockReaddir.mockResolvedValue(mockEntries);
      mockStat.mockResolvedValue({ size: 10 * 1024 * 1024 * 1024, mtime: new Date() });
      mockReadFile.mockResolvedValue(Buffer.from("content"));

      const serviceWithLimit = createNASSyncService({
        rootPaths: ["/mnt/nas"],
        maxFileSize: 5 * 1024 * 1024 * 1024,
      });

      mockEq.mockImplementation((col, val) => ({ type: "eq", col, val }));
      mockAnd.mockImplementation((...args) => ({ type: "and", args }));
      mockSql.mockImplementation((strings, ...values) => ({ type: "sql", strings, values }));

      const mockSelectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(undefined),
      };
      mockDbSelect.mockReturnValue(mockSelectChain);

      const mockInsertChain = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ id: "folder-id", name: "nas" }),
      };
      mockDbInsert.mockReturnValue(mockInsertChain);

      const mockAssetSelectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(undefined),
      };
      mockDbSelect.mockReturnValueOnce(mockAssetSelectChain);

      const result = await serviceWithLimit.scanOnce();

      expect(result.scanned).toBe(1);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]).toContain("File too large");
    });
  });

  describe("computeFileHash", () => {
    it("computes SHA256 hash of file", async () => {
      mockReadFile.mockResolvedValue(Buffer.from("test content"));

      const hash = await (service as any).computeFileHash("/mnt/nas/video.mp4");

      expect(hash).toBe("abc123hash");
      expect(crypto.createHash).toHaveBeenCalledWith("sha256");
    });
  });

  describe("getOrCreateFolder", () => {
    it("returns existing folder when found", async () => {
      const mockChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ id: "existing-folder", name: "Test Folder" }),
      };
      mockDbSelect.mockReturnValue(mockChain);
      mockEq.mockImplementation((col, val) => ({ type: "eq", col, val }));
      mockAnd.mockImplementation((...args) => ({ type: "and", args }));
      mockSql.mockImplementation((strings, ...values) => ({ type: "sql", strings, values }));

      const folder = await (service as any).getOrCreateFolder({
        name: "Test Folder",
        parentId: null,
        departmentId: "dept-456",
      });

      expect(folder.id).toBe("existing-folder");
      expect(mockDbInsert).not.toHaveBeenCalled();
    });

    it("creates new folder when not found", async () => {
      const mockSelectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(undefined),
      };
      mockDbSelect.mockReturnValue(mockSelectChain);

      const mockInsertChain = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ id: "new-folder", name: "New Folder" }),
      };
      mockDbInsert.mockReturnValue(mockInsertChain);

      const folder = await (service as any).getOrCreateFolder({
        name: "New Folder",
        parentId: "parent-id",
        departmentId: "dept-456",
      });

      expect(folder.id).toBe("new-folder");
      expect(mockDbInsert).toHaveBeenCalled();
      expect(mockInsertChain.values).toHaveBeenCalledWith(expect.objectContaining({
        name: "New Folder",
        parentId: "parent-id",
        departmentId: "dept-456",
      }));
    });
  });

  describe("ensureFolderHierarchy", () => {
    it("creates folder hierarchy from root path", async () => {
      const mockSelectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(undefined),
      };
      mockDbSelect.mockReturnValue(mockSelectChain);

      const mockInsertChain = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ id: "folder-id", name: "media" }),
      };
      mockDbInsert.mockReturnValue(mockInsertChain);

      mockReaddir.mockResolvedValue([]);
      mockEq.mockImplementation((col, val) => ({ type: "eq", col, val }));
      mockAnd.mockImplementation((...args) => ({ type: "and", args }));
      mockSql.mockImplementation((strings, ...values) => ({ type: "sql", strings, values }));

      const mappings = await (service as any).ensureFolderHierarchy("/mnt/nas/media");

      expect(mappings.length).toBeGreaterThan(0);
      expect(mappings[0].relativePath).toBe("");
      expect(mappings[0].fsPath).toBe("/mnt/nas/media");
    });
  });

  describe("scanOnce", () => {
    it("returns scan result with counts", async () => {
      const mockSelectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(undefined),
      };
      mockDbSelect.mockReturnValue(mockSelectChain);

      const mockInsertChain = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ id: "folder-id", name: "media" }),
      };
      mockDbInsert.mockReturnValue(mockInsertChain);

      mockReaddir
        .mockResolvedValueOnce([{ name: "video.mp4", isDirectory: () => false, isFile: () => true }])
        .mockResolvedValueOnce([]);
      
      mockStat.mockResolvedValue({ size: 1024, mtime: new Date() });
      mockReadFile.mockResolvedValue(Buffer.from("content"));

      const mockAssetSelectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(undefined),
      };
      mockDbSelect.mockReturnValueOnce(mockAssetSelectChain);

      mockEq.mockImplementation((col, val) => ({ type: "eq", col, val }));
      mockAnd.mockImplementation((...args) => ({ type: "and", args }));
      mockSql.mockImplementation((strings, ...values) => ({ type: "sql", strings, values }));

      const result = await service.scanOnce();

      expect(result).toEqual(expect.objectContaining({
        scanned: expect.any(Number),
        newAssets: expect.any(Number),
        updatedAssets: 0,
        skippedDuplicates: 0,
        errors: expect.any(Array),
        foldersCreated: expect.any(Number),
      }));
    });

it("skips duplicate files by hash", async () => {
      const mockSelectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(undefined),
      };
      mockDbSelect.mockReturnValue(mockSelectChain);

      const mockInsertChain = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ id: "folder-id", name: "media" }),
      };
      mockDbInsert.mockReturnValue(mockInsertChain);

      // ensureFolderHierarchy calls readdir first (for root folder)
      // walkDirectory calls readdir second (for files)
      mockReaddir
        .mockResolvedValueOnce([]) // ensureSubfolders - no subdirs
        .mockResolvedValueOnce([{ name: "video.mp4", isDirectory: () => false, isFile: () => true }]); // walkDirectory
      
      mockStat.mockResolvedValue({ size: 1024, mtime: new Date() });
      mockReadFile.mockResolvedValue(Buffer.from("content"));

      mockEq.mockImplementation((col, val) => ({ type: "eq", col, val }));
      mockAnd.mockImplementation((...args) => ({ type: "and", args }));
      mockSql.mockImplementation((strings, ...values) => ({ type: "sql", strings, values }));

      // Mock the private method by replacing it on the instance
      const mockFindAsset = jest.fn().mockResolvedValue({ id: "existing-asset" });
      (service as any).findAssetByHash = mockFindAsset;

      const result = await service.scanOnce();

      expect(mockFindAsset).toHaveBeenCalledWith("abc123hash");
      expect(result.skippedDuplicates).toBe(1);
      expect(result.newAssets).toBe(0);
    });
  });

  describe("start/stop", () => {
    it("starts periodic scanning", async () => {
      jest.useFakeTimers();
      
      service.start();
      
      const status = await service.getStatus();
      expect(status.running).toBe(true);
      
      jest.useRealTimers();
      service.stop();
    });

    it("stops periodic scanning", async () => {
      jest.useFakeTimers();
      
      service.start();
      service.stop();
      
      const status = await service.getStatus();
      expect(status.running).toBe(false);
      
      jest.useRealTimers();
    });
  });

  describe("getStatus", () => {
    it("returns current status", async () => {
      const status = await service.getStatus();
      
      expect(status).toEqual({
        running: false,
        config: expect.objectContaining({
          rootPaths: ["/mnt/nas/media"],
          departmentId: "dept-456",
        }),
        nextScanInMs: null,
      });
    });
  });
});