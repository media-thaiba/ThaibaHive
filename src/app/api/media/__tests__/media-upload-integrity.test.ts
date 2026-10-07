/**
 * Phase 3 Commit 1 — upload integrity + media security fixes.
 *
 * Covers: hybrid sign v2 (presign/multipart), SHA-256 verification on both
 * transports, complete-route flag/tenant/idempotency guards, nested-path
 * serving validation (D14*), and folder/asset tenant + object cleanup (D9*).
 */
import { POST as signPost } from "../upload/sign/route";
import { POST as completePost } from "../upload/complete/route";
import { POST as uploadPost } from "../../upload/route";
import { GET as filesGet } from "../../upload/files/[...filename]/route";
import { validateFileKey } from "@/lib/media/serve-file-utils";
import { DELETE as folderDelete } from "../folders/[id]/route";
import { DELETE as assetDelete } from "../assets/[id]/route";
import { setTenantFeatureFlag, clearTenantFeatureOverrides } from "@/lib/features";
import { db } from "@/db";
import type { NextRequest } from "next/server";

jest.mock("@/db", () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    delete: jest.fn(),
    transaction: jest.fn(),
  },
}));

jest.mock("@/lib/api/auth-guard", () => ({
  requireAuth:
    (handler: (req: unknown, session: unknown, ctx?: unknown) => unknown, _perm?: unknown) =>
    (req: unknown, ctx?: unknown) =>
      handler(
        req,
        { staffId: "staff_1", role: "admin", institutionId: "inst_a", permissions: ["*"] },
        ctx
      ),
}));

jest.mock("@/lib/auth", () => ({
  resolveScopedInstitutionId: async (id?: string | null) => id ?? null,
  verifySession: async () => ({ staffId: "staff_1", institutionId: "inst_a" }),
}));

jest.mock("@/lib/api/rate-limit", () => ({
  checkRateLimit: () => ({ allowed: true, resetMs: 0 }),
  extractIp: () => "test-ip",
  rateLimitResponse: () => new Response(null, { status: 429 }),
}));

const mockStorageState = { configured: false };

jest.mock("@/lib/storage", () => ({
  get isStorageConfigured() {
    return mockStorageState.configured;
  },
  uploadToSupabase: jest.fn(async () => "/api/upload/files/uuid.jpg"),
  downloadFromSupabase: jest.fn(),
  deleteFromSupabase: jest.fn(async () => undefined),
  copySupabaseObject: jest.fn(async () => undefined),
  checkStorageConfig: jest.fn(),
  uploadToSupabaseRaw: jest.fn(),
}));

import {
  downloadFromSupabase,
  deleteFromSupabase,
  copySupabaseObject,
  uploadToSupabase,
} from "@/lib/storage";

function jsonReq(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function ctxWith(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

/** Queue-driven select results: one entry per db.select() call, in order. */
type SelectSlot = { get?: unknown; all?: unknown[] };
function queueSelects(slots: SelectSlot[]) {
  const queue = [...slots];
  (db.select as jest.Mock).mockImplementation(() => {
    const slot = queue.shift() ?? {};
    return chainable({
      get: jest.fn(async () => slot.get ?? null),
      all: jest.fn(async () => slot.all ?? []),
    });
  });
}

function chainable(terminal: Record<string, (...args: any[]) => any>) {
  const chain: Record<string, any> = {};
  for (const key of ["from", "where", "values", "returning"]) {
    chain[key] = jest.fn().mockReturnValue(chain);
  }
  Object.assign(chain, terminal);
  return chain;
}

function bytesStream(text: string): ReadableStream {
  const bytes = new TextEncoder().encode(text);
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

// Valid RFC-7232 v4 UUID (zod v4 enforces version + variant nibbles)
const UUID_A = "11111111-2222-4333-8444-555555555555";
const NESTED_PATH = `private_tmp/tenant_inst_a/dept_general/${UUID_A}.jpg`;
const HEX = "a".repeat(64);

beforeEach(() => {
  jest.clearAllMocks();
  mockStorageState.configured = false;
  clearTenantFeatureOverrides();
});

describe("POST /api/media/upload/sign (v2)", () => {
  it("returns multipart fallback when storage is unconfigured (D3*)", async () => {
    const res = await signPost(jsonReq("http://localhost/api/media/upload/sign", { ext: "jpg" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ mode: "multipart", uploadUrl: "/api/upload", fileUrl: null });
  });

  it("presigns under the SESSION tenant and ignores client institutionId (D15*)", async () => {
    mockStorageState.configured = true;
    global.fetch = jest.fn(async () =>
      ({ ok: true, json: async () => ({ signedUrl: "https://supabase.example/sign" }) }) as Response
    ) as jest.Mock;

    const res = await signPost(
      jsonReq("http://localhost/api/media/upload/sign", {
        ext: "jpg",
        institutionId: "inst_other",
        departmentId: "dept_other",
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.mode).toBe("presign");
    expect(body.path).toMatch(/^private_tmp\/tenant_inst_a\//);
    expect(body.path).not.toContain("inst_other");
  });

  it("rejects oversize declarations with 413", async () => {
    const res = await signPost(
      jsonReq("http://localhost/api/media/upload/sign", {
        ext: "mp4",
        size: 101 * 1024 * 1024,
      })
    );
    expect(res.status).toBe(413);
  });

  it("rejects missing extension with 400", async () => {
    const res = await signPost(jsonReq("http://localhost/api/media/upload/sign", {}));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/media/upload/complete", () => {
  it("returns 403 when the media_queue flag is off", async () => {
    setTenantFeatureFlag("inst_a", "media_queue", false);
    const res = await completePost(
      jsonReq("http://localhost/api/media/upload/complete", {
        clientEventId: UUID_A,
        path: NESTED_PATH,
        sha256: HEX,
        name: "a.jpg",
        mime: "image/jpeg",
        size: 10,
      })
    );
    expect(res.status).toBe(403);
  });

  it("rejects a path outside the session tenant (D15*)", async () => {
    mockStorageState.configured = true;
    const res = await completePost(
      jsonReq("http://localhost/api/media/upload/complete", {
        clientEventId: UUID_A,
        path: `private_tmp/tenant_inst_b/dept_general/${UUID_A}.jpg`,
        sha256: HEX,
        name: "a.jpg",
        mime: "image/jpeg",
        size: 10,
      })
    );
    expect(res.status).toBe(403);
    expect(downloadFromSupabase).not.toHaveBeenCalled();
  });

  it("returns 422 on checksum mismatch and deletes the temp object (D2*)", async () => {
    mockStorageState.configured = true;
    (downloadFromSupabase as jest.Mock).mockResolvedValueOnce({
      stream: bytesStream("tampered-bytes"),
      mimeType: "image/jpeg",
    });
    queueSelects([{ get: null }, { get: null }]);

    const res = await completePost(
      jsonReq("http://localhost/api/media/upload/complete", {
        clientEventId: UUID_A,
        path: NESTED_PATH,
        sha256: HEX,
        name: "a.jpg",
        mime: "image/jpeg",
        size: 10,
      })
    );
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: "checksum_mismatch" });
    expect(deleteFromSupabase).toHaveBeenCalledWith([NESTED_PATH]);
    expect(copySupabaseObject).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("dedupes an idempotent replay by clientEventId without touching storage", async () => {
    mockStorageState.configured = true;
    queueSelects([{ get: { id: "asset_existing", name: "a.jpg" } }]);

    const res = await completePost(
      jsonReq("http://localhost/api/media/upload/complete", {
        clientEventId: UUID_A,
        path: NESTED_PATH,
        sha256: HEX,
        name: "a.jpg",
        mime: "image/jpeg",
        size: 10,
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deduped).toBe(true);
    expect(body.asset.id).toBe("asset_existing");
    expect(downloadFromSupabase).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("verifies, promotes, and inserts the asset row on first completion", async () => {
    mockStorageState.configured = true;
    const content = "verified-bytes";
    (downloadFromSupabase as jest.Mock).mockResolvedValueOnce({
      stream: bytesStream(content),
      mimeType: "image/jpeg",
    });
    const { createHash } = await import("crypto");
    const digest = createHash("sha256").update(content).digest("hex");

    // select #1 (byEventId) → null, select #2 (byHash) → null
    queueSelects([{ get: null }, { get: null }]);
    const inserted = { id: "asset_new", name: "a.jpg" };
    (db.transaction as jest.Mock).mockImplementationOnce(async (fn: (tx: unknown) => unknown) =>
      fn({
        select: () => chainable({ get: jest.fn(async () => null) }),
        insert: () =>
          chainable({ returning: () => chainable({ get: jest.fn(async () => inserted) }) }),
      })
    );

    const res = await completePost(
      jsonReq("http://localhost/api/media/upload/complete", {
        clientEventId: UUID_A,
        path: NESTED_PATH,
        sha256: digest,
        name: "a.jpg",
        mime: "image/jpeg",
        size: 14,
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ deduped: false });
    expect(body.asset).toEqual(inserted);
    expect(copySupabaseObject).toHaveBeenCalledWith(
      NESTED_PATH,
      NESTED_PATH.replace(/^private_tmp\//, "assets/")
    );
    expect(db.transaction).toHaveBeenCalledTimes(1);
  });

  it("409s when storage is not configured", async () => {
    const res = await completePost(
      jsonReq("http://localhost/api/media/upload/complete", {
        clientEventId: UUID_A,
        path: NESTED_PATH,
        sha256: HEX,
        name: "a.jpg",
        mime: "image/jpeg",
        size: 10,
      })
    );
    expect(res.status).toBe(409);
  });
});

const UPLOAD_BYTES = "hello-upload";

function uploadRequest(fields: Record<string, string>): Request {
  // Minimal fake: the route only calls request.formData().get(...), and the
  // jsdom Request polyfill has no formData() support.
  const map: Record<string, unknown> = {
    file: {
      name: "receipt.jpg",
      type: "image/jpeg",
      size: UPLOAD_BYTES.length,
      arrayBuffer: async () => new TextEncoder().encode(UPLOAD_BYTES).buffer,
    },
    ...fields,
  };
  return {
    formData: async () => ({
      get: (key: string) => (key in map ? map[key] : null),
    }),
  } as unknown as Request;
}

describe("POST /api/upload (multipart transport)", () => {
  it("rejects a declared digest that does not match the bytes (D2*)", async () => {
    const res = await uploadPost(uploadRequest({ sha256: HEX }));
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: "checksum_mismatch" });
    expect(uploadToSupabase).not.toHaveBeenCalled();
  });

  it("verifies the digest and creates an asset row for media-queue clients", async () => {
    mockStorageState.configured = true;
    const { createHash } = await import("crypto");
    const digest = createHash("sha256").update(UPLOAD_BYTES).digest("hex");
    const inserted = { id: "asset_mp" };
    (db.insert as jest.Mock).mockReturnValueOnce(
      chainable({ returning: () => chainable({ get: jest.fn(async () => inserted) }) })
    );

    const res = await uploadPost(
      uploadRequest({ sha256: digest, clientEventId: UUID_A })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.asset).toEqual(inserted);
    expect(uploadToSupabase).toHaveBeenCalled();
  });

  it("keeps the legacy URL-only contract for web callers (no clientEventId)", async () => {
    mockStorageState.configured = true;
    const res = await uploadPost(uploadRequest({}));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.url).toBeTruthy();
    expect(body.asset).toBeUndefined();
    expect(db.insert).not.toHaveBeenCalled();
  });
});

describe("GET /api/upload/files (nested serving, D14*)", () => {
  it("accepts flat UUID keys and guarded nested keys", () => {
    expect(validateFileKey([`${UUID_A}.jpg`])).toBe(`${UUID_A}.jpg`);
    expect(
      validateFileKey(["assets", "tenant_inst_a", "dept_general", `${UUID_A}.jpg`])
    ).toBe(`assets/tenant_inst_a/dept_general/${UUID_A}.jpg`);
  });

  it("rejects traversal, unknown roots, non-UUID names, and over-deep paths", () => {
    expect(validateFileKey(["..", "evil.jpg"])).toBeNull();
    expect(validateFileKey(["..%2fevil.jpg"])).toBeNull();
    expect(validateFileKey(["secrets", "tenant_a", "x.jpg"])).toBeNull();
    expect(validateFileKey(["assets", "tenant_a", "notauuid.jpg"])).toBeNull();
    expect(validateFileKey(["plain.jpg"])).toBeNull();
    expect(
      validateFileKey(["a", "b", "c", "d", "e", `${UUID_A}.jpg`])
    ).toBeNull();
  });

  it("400s invalid nested paths at request time", async () => {
    const res = await filesGet(
      new Request("http://localhost/api/upload/files/whatever"),
      { params: Promise.resolve({ filename: ["..", "evil.jpg"] }) }
    );
    expect(res.status).toBe(400);
  });

  it("serves a valid nested key from Supabase when configured", async () => {
    mockStorageState.configured = true;
    (downloadFromSupabase as jest.Mock).mockResolvedValueOnce({
      stream: bytesStream("image-bytes"),
      mimeType: "image/jpeg",
    });
    const res = await filesGet(new Request("http://localhost/api/upload/files/x"), {
      params: Promise.resolve({
        filename: ["assets", "tenant_inst_a", "dept_general", `${UUID_A}.jpg`],
      }),
    });
    expect(res.status).toBe(200);
    expect(downloadFromSupabase).toHaveBeenCalledWith(
      `assets/tenant_inst_a/dept_general/${UUID_A}.jpg`,
      "uploads"
    );
  });
});

describe("DELETE /api/media/folders/[id] (D9*)", () => {
  it("404s when the folder is not in scope", async () => {
    queueSelects([{ get: null }]);
    const res = await folderDelete(new Request("http://localhost/x"), ctxWith("f1"));
    expect(res.status).toBe(404);
    expect(db.delete).not.toHaveBeenCalled();
  });

  it("cleans physical objects of descendant assets before the cascade delete", async () => {
    mockStorageState.configured = true;
    // 1) folder lookup, 2) children of root → child, 3) children of child → none,
    // 4) assets in scope
    queueSelects([
      { get: { id: "f1", institutionId: "inst_a" } },
      { all: [{ id: "f2" }] },
      { all: [] },
      {
        all: [
          { fileUrl: `/api/upload/files/assets/tenant_inst_a/dept_general/${UUID_A}.jpg`, thumbnailUrl: null },
          { fileUrl: `nas://srv/media/nested.jpg`, thumbnailUrl: null },
        ],
      },
    ]);
    (db.delete as jest.Mock).mockReturnValueOnce(chainable({ run: jest.fn(async () => undefined) }));

    const res = await folderDelete(new Request("http://localhost/x"), ctxWith("f1"));
    expect(res.status).toBe(200);
    expect(deleteFromSupabase).toHaveBeenCalledWith([
      `assets/tenant_inst_a/dept_general/${UUID_A}.jpg`,
    ]);
    // NAS objects are never unlinked
    const nasCalls = (deleteFromSupabase as jest.Mock).mock.calls.filter((c) =>
      String(c[0][0]).includes("nas")
    );
    expect(nasCalls).toHaveLength(0);
    expect(db.delete).toHaveBeenCalledTimes(1);
  });
});

describe("DELETE /api/media/assets/[id] (D9*)", () => {
  it("404s for out-of-scope assets", async () => {
    queueSelects([{ get: null }]);
    const res = await assetDelete(new Request("http://localhost/x"), ctxWith("a1"));
    expect(res.status).toBe(404);
    expect(db.delete).not.toHaveBeenCalled();
  });

  it("deletes the physical Supabase object alongside the row", async () => {
    mockStorageState.configured = true;
    queueSelects([
      { get: { id: "a1", fileUrl: `/api/upload/files/assets/tenant_inst_a/dept_general/${UUID_A}.jpg`, thumbnailUrl: null } },
    ]);
    (db.delete as jest.Mock).mockReturnValueOnce(chainable({ run: jest.fn(async () => undefined) }));

    const res = await assetDelete(new Request("http://localhost/x"), ctxWith("a1"));
    expect(res.status).toBe(200);
    expect(deleteFromSupabase).toHaveBeenCalledWith([
      `assets/tenant_inst_a/dept_general/${UUID_A}.jpg`,
    ]);
    expect(db.delete).toHaveBeenCalledTimes(1);
  });
});
