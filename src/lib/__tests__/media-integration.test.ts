import { api } from "../api/client";
import {  } from "sonner";

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

describe("MediaHive Frontend Integration API Contract", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("should fetch media assets from API endpoint", async () => {
    const mockAssets = [
      { id: "asset-1", name: "logo.png", fileUrl: "/uploads/logo.png", fileSize: 1024, mimeType: "image/png", fileType: "image", status: "ready", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ];

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ assets: mockAssets }),
    });

    const res = await api.get<{ assets: typeof mockAssets }>("/api/media/assets", {
      params: { folderId: "folder-1", fileType: "image" },
      retries: 0,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/media/assets?folderId=folder-1&fileType=image",
      expect.objectContaining({ method: "GET" })
    );
    expect(res.ok).toBe(true);
    expect(res.data.assets).toHaveLength(1);
    expect(res.data.assets[0].name).toBe("logo.png");
  });

  it("should create folder via API endpoint", async () => {
    const mockFolder = { id: "folder-123", name: "Documents", parentId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ folder: mockFolder }),
    });

    const res = await api.post<{ folder: typeof mockFolder }>(
      "/api/media/folders",
      { name: "Documents", parentId: null },
      { retries: 0 }
    );

    expect(res.ok).toBe(true);
    expect(res.data.folder.name).toBe("Documents");
  });

  it("should generate share link token", async () => {
    const mockShare = { token: "abc123token", shareUrl: "/share/abc123token" };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => mockShare,
    });

    const res = await api.post<{ token: string; shareUrl: string }>(
      "/api/media/share-links",
      { assetId: "asset-1", password: "secretpassword" },
      { retries: 0 }
    );

    expect(res.ok).toBe(true);
    expect(res.data.token).toBe("abc123token");
    expect(res.data.shareUrl).toBe("/share/abc123token");
  });

  it("should request batch download ZIP archive", async () => {
    const mockBlob = new Blob(["fake zip content"], { type: "application/zip" });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/zip" }),
      blob: async () => mockBlob,
    });

    const res = await api.download("/api/media/batch-download", {
      method: "POST",
      body: { assetIds: ["asset-1", "asset-2"] },
      retries: 0,
    });

    expect(res.ok).toBe(true);
    expect(res.data).toBeInstanceOf(Blob);
  });
});
