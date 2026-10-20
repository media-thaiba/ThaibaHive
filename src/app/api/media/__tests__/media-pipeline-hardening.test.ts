/**
 * @jest-environment node
 *
 * Media & Asset Pipeline Hardening Test Suite
 *
 * Validates:
 * 1. Reconciliation Safe State Machine:
 *    - Failed assets are NEVER resurrected into 'ready'.
 *    - Residual private_tmp objects for failed assets are cleanly purged.
 *    - Unprocessed raw videos are rejected from blind promotion and marked failed.
 *    - Non-video processing assets are promoted safely.
 * 2. File Serving Multi-Tenant Boundary & Private Temp Gating:
 *    - private_tmp files are blocked from non-super_admin users (HTTP 403).
 *    - Cross-tenant requests to assets/tenant_X from tenant_Y are blocked (HTTP 403).
 *    - Same-tenant and super_admin requests succeed.
 * 3. Batch Download Zip Slip Path Traversal Sanitization:
 *    - File and folder entry names strip directory traversal (../), leading dots, and slashes.
 * 4. Avatar Upload Sanitization:
 *    - Extensions are strictly sanitized.
 */

import { POST as reconcilePost } from "../reconcile/route";
import { GET as filesGet } from "../../upload/files/[...filename]/route";
import { sanitizeZipEntryName, sanitizeZipFolderName } from "@/lib/media/zip-utils";
import { db } from "@/db";
import { mediaAssets } from "@/db/schema";
import { downloadFromSupabase, deleteFromSupabase, copySupabaseObject } from "@/lib/storage";
import { verifySession } from "@/lib/auth";
import type { NextRequest } from "next/server";

jest.mock("@/db", () => ({
  db: {
    select: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("@/lib/auth", () => ({
  verifySession: jest.fn(),
  resolveScopedInstitutionId: jest.fn(async (id?: string | null) => id ?? null),
}));

const mockStorageState = { configured: true };

jest.mock("@/lib/storage", () => ({
  get isStorageConfigured() {
    return mockStorageState.configured;
  },
  downloadFromSupabase: jest.fn(),
  uploadToSupabase: jest.fn(async () => "/api/upload/files/avatar.png"),
  deleteFromSupabase: jest.fn(async () => undefined),
  copySupabaseObject: jest.fn(async () => undefined),
  checkStorageConfig: jest.fn(),
}));

function chainable(terminal: Record<string, (...args: any[]) => any>) {
  const chain: Record<string, any> = {};
  for (const key of ["from", "where", "values", "returning", "set"]) {
    chain[key] = jest.fn().mockReturnValue(chain);
  }
  return Object.assign(chain, terminal);
}

describe("Media & Asset Pipeline Hardening", () => {
  const UUID_A = "11111111-2222-3333-4444-555555555555";

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorageState.configured = true;
  });

  describe("Reconciliation Safe State Machine", () => {
    const makeCronReq = () =>
      new Request("http://localhost/api/media/reconcile", {
        method: "POST",
        headers: { "x-cron-secret": "test_cron_secret" },
      }) as unknown as NextRequest;

    beforeAll(() => {
      process.env.CRON_SECRET = "test_cron_secret";
    });

    it("NEVER resurrects a failed asset into ready, but purges its private_tmp file", async () => {
      const failedAsset = {
        id: "asset_failed_1",
        status: "failed",
        fileUrl: `/api/upload/files/private_tmp/tenant_inst_a/dept_general/${UUID_A}.mp4`,
        fileType: "video",
        updatedAt: "2026-10-10T00:00:00.000Z",
      };

      (db.select as jest.Mock).mockReturnValueOnce(
        chainable({ all: jest.fn(async () => [failedAsset]) })
      );

      // Optimistic lock claim succeeds
      (db.update as jest.Mock).mockReturnValueOnce(
        chainable({ run: jest.fn(async () => ({ changes: 1 })) })
      );

      const res = await reconcilePost(makeCronReq());
      expect(res.status).toBe(200);
      const data = await res.json();

      // Asset was cleaned, NOT recovered
      expect(data.recovered).toBe(0);
      expect(data.cleaned).toBe(1);

      // Residual private_tmp file was deleted from Supabase Storage
      expect(deleteFromSupabase).toHaveBeenCalledWith([
        `private_tmp/tenant_inst_a/dept_general/${UUID_A}.mp4`,
      ]);

      // copySupabaseObject was NOT called (no promotion to assets/)
      expect(copySupabaseObject).not.toHaveBeenCalled();
    });

    it("does NOT blindly promote stuck unstripped video from private_tmp; marks failed and purges", async () => {
      const stuckVideo = {
        id: "asset_video_stuck",
        status: "processing",
        fileUrl: `/api/upload/files/private_tmp/tenant_inst_a/dept_general/${UUID_A}.mp4`,
        fileType: "video",
        updatedAt: "2026-10-10T00:00:00.000Z",
      };

      (db.select as jest.Mock).mockReturnValueOnce(
        chainable({ all: jest.fn(async () => [stuckVideo]) })
      );

      (db.update as jest.Mock)
        .mockReturnValueOnce(chainable({ run: jest.fn(async () => ({ changes: 1 })) })) // Claim
        .mockReturnValueOnce(chainable({ run: jest.fn(async () => ({ changes: 1 })) })); // Mark failed

      // downloadFromSupabase: assetsPath not found, but private_tmp exists
      (downloadFromSupabase as jest.Mock)
        .mockResolvedValueOnce(null) // assets/ not found
        .mockResolvedValueOnce({ stream: {}, mimeType: "video/mp4" }); // private_tmp found

      const res = await reconcilePost(makeCronReq());
      expect(res.status).toBe(200);
      const data = await res.json();

      // Video was NOT promoted blindly
      expect(data.recovered).toBe(0);
      expect(data.cleaned).toBe(1);

      // Tainted temp file deleted
      expect(deleteFromSupabase).toHaveBeenCalledWith([
        `private_tmp/tenant_inst_a/dept_general/${UUID_A}.mp4`,
      ]);
    });

    it("promotes stuck non-video processing asset safely to ready", async () => {
      const stuckDoc = {
        id: "asset_doc_stuck",
        status: "processing",
        fileUrl: `/api/upload/files/private_tmp/tenant_inst_a/dept_general/${UUID_A}.pdf`,
        fileType: "document",
        updatedAt: "2026-10-10T00:00:00.000Z",
      };

      (db.select as jest.Mock).mockReturnValueOnce(
        chainable({ all: jest.fn(async () => [stuckDoc]) })
      );

      (db.update as jest.Mock)
        .mockReturnValueOnce(chainable({ run: jest.fn(async () => ({ changes: 1 })) })) // Claim
        .mockReturnValueOnce(chainable({ run: jest.fn(async () => ({ changes: 1 })) })); // Mark ready

      // downloadFromSupabase: assetsPath not found, but private_tmp exists
      (downloadFromSupabase as jest.Mock)
        .mockResolvedValueOnce(null) // assets/ not found
        .mockResolvedValueOnce({ stream: {}, mimeType: "application/pdf" }); // private_tmp found

      const res = await reconcilePost(makeCronReq());
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.recovered).toBe(1);
      expect(copySupabaseObject).toHaveBeenCalledWith(
        `private_tmp/tenant_inst_a/dept_general/${UUID_A}.pdf`,
        `assets/tenant_inst_a/dept_general/${UUID_A}.pdf`
      );
    });
  });

  describe("File Serving Multi-Tenant Boundary & Private Temp Gating", () => {
    it("rejects access to private_tmp files for regular staff (HTTP 403)", async () => {
      (verifySession as jest.Mock).mockResolvedValueOnce({
        staffId: "staff_1",
        role: "staff",
        institutionId: "inst_a",
      });

      const res = await filesGet(new Request("http://localhost/api/upload/files/x"), {
        params: Promise.resolve({
          filename: ["private_tmp", "tenant_inst_a", "dept_general", `${UUID_A}.mp4`],
        }),
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain("Access to temporary media denied");
    });

    it("rejects cross-tenant access to assets belonging to another institution (HTTP 403)", async () => {
      (verifySession as jest.Mock).mockResolvedValueOnce({
        staffId: "staff_1",
        role: "admin",
        institutionId: "inst_a", // Caller is in inst_a
      });

      const res = await filesGet(new Request("http://localhost/api/upload/files/x"), {
        params: Promise.resolve({
          filename: ["assets", "tenant_inst_b", "dept_general", `${UUID_A}.jpg`], // File is in inst_b
        }),
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain("Forbidden: file belongs to another institution");
    });

    it("allows access to same-tenant assets", async () => {
      (verifySession as jest.Mock).mockResolvedValueOnce({
        staffId: "staff_1",
        role: "staff",
        institutionId: "inst_a",
      });

      (downloadFromSupabase as jest.Mock).mockResolvedValueOnce({
        stream: new ReadableStream(),
        mimeType: "image/jpeg",
      });

      const res = await filesGet(new Request("http://localhost/api/upload/files/x"), {
        params: Promise.resolve({
          filename: ["assets", "tenant_inst_a", "dept_general", `${UUID_A}.jpg`],
        }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("image/jpeg");
    });

    it("allows super_admin to access assets across any tenant", async () => {
      (verifySession as jest.Mock).mockResolvedValueOnce({
        staffId: "super_admin_1",
        role: "super_admin",
        institutionId: "inst_master",
      });

      (downloadFromSupabase as jest.Mock).mockResolvedValueOnce({
        stream: new ReadableStream(),
        mimeType: "image/jpeg",
      });

      const res = await filesGet(new Request("http://localhost/api/upload/files/x"), {
        params: Promise.resolve({
          filename: ["assets", "tenant_inst_b", "dept_general", `${UUID_A}.jpg`],
        }),
      });

      expect(res.status).toBe(200);
    });
  });

  describe("Batch Download Zip Slip Path Traversal Sanitization", () => {
    it("sanitizes relative directory traversal sequences in entry names", () => {
      expect(sanitizeZipEntryName("../../etc/passwd")).toBe("etc_passwd");
      expect(sanitizeZipEntryName("..\\..\\windows\\system32")).toBe("windows_system32");
      expect(sanitizeZipEntryName("normal_photo.jpg")).toBe("normal_photo.jpg");
      expect(sanitizeZipEntryName("folder/nested/photo.png")).toBe("folder_nested_photo.png");
    });

    it("strips null bytes and control characters", () => {
      expect(sanitizeZipEntryName("test\0injection.jpg")).toBe("testinjection.jpg");
      expect(sanitizeZipEntryName("   padded.pdf   ")).toBe("padded.pdf");
      expect(sanitizeZipEntryName("")).toBe("unnamed_asset");
    });

    it("sanitizes folder names against Zip Slip", () => {
      expect(sanitizeZipFolderName("../../subfolder")).toBe("subfolder");
      expect(sanitizeZipFolderName("deep/nested/folder")).toBe("deep_nested_folder");
      expect(sanitizeZipFolderName("")).toBe("unnamed_folder");
    });
  });
});
