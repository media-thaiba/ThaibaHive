import { POST as postHelpDeskComment } from "../help-desk/[id]/comments/route";
import { GET as getLocationQr } from "../admin/attendance-locations/[id]/qr/route";
import { POST as postLocationBeacon } from "../admin/attendance-locations/[id]/beacon/route";
import { POST as postPollVote } from "../polls/[id]/vote/route";
import { POST as postEnrollFace } from "../staff/[id]/enroll-face/route";
import { POST as postVerifyFace } from "../biometric/verify-face/route";
import { GET as getAssetService } from "../assets/[id]/service/route";
import { DELETE as deleteChecklistTemplateItem } from "../checklists/templates/[templateId]/items/route";
import { GET as getCircularDownload } from "../circulars/[id]/download/route";
import { POST as postAnnouncementRead } from "../announcements/[id]/read/route";
import { db } from "@/db";
import { canAccessStaff } from "@/lib/auth/department-scope";

let mockSession = {
  staffId: "staff-1",
  email: "staff1@thaiba.edu",
  role: "staff",
  institutionId: "inst-a",
};

jest.mock("@/lib/api/auth-guard", () => ({
  requireAuth: (handler: (...args: any[]) => any) => {
    return (req: Request, ctx?: any) => handler(req, mockSession, ctx);
  },
  resolveRequestInstitution: jest.fn(async (_s: any, id: string) => id),
}));

jest.mock("@/lib/auth", () => ({
  resolveScopedInstitutionId: jest.fn(async (instId?: string) => instId || "inst-a"),
}));

jest.mock("@/lib/auth/department-scope", () => ({
  canAccessStaff: jest.fn(async () => false),
}));

jest.mock("@/lib/api/activity-log", () => ({
  logActivity: jest.fn(async () => undefined),
}));

jest.mock("@/db", () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

function makeChain(resultGet: any = null, resultAll: any[] = []) {
  const chain: Record<string, jest.Mock> = {};
  for (const m of [
    "select",
    "from",
    "where",
    "leftJoin",
    "orderBy",
    "insert",
    "values",
    "update",
    "set",
    "delete",
    "returning",
  ]) {
    chain[m] = jest.fn().mockReturnValue(chain);
  }
  chain.get = jest.fn(async () => (typeof resultGet === "function" ? resultGet() : resultGet));
  chain.all = jest.fn(async () => resultAll);
  chain.run = jest.fn(async () => undefined);
  return chain;
}

describe("Wave A — Sub-Resource Tenant & Access Hardening", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession = {
      staffId: "staff-1",
      email: "staff1@thaiba.edu",
      role: "staff",
      institutionId: "inst-a",
    };
  });

  describe("POST /api/help-desk/[id]/comments", () => {
    it("returns 404 when parent ticket does not exist in caller tenant", async () => {
      (db.select as jest.Mock).mockReturnValue(makeChain(null));
      const req = new Request("http://localhost/api/help-desk/t-1/comments", {
        method: "POST",
        body: JSON.stringify({ content: "Hello" }),
      });
      const res = await postHelpDeskComment(req, { params: Promise.resolve({ id: "t-1" }) });
      expect(res.status).toBe(404);
    });

    it("returns 403 when non-admin caller is neither submitter nor assignee", async () => {
      (db.select as jest.Mock).mockReturnValue(
        makeChain({
          id: "t-1",
          institutionId: "inst-a",
          submittedById: "other-staff",
          assignedToId: "another-staff",
        })
      );
      const req = new Request("http://localhost/api/help-desk/t-1/comments", {
        method: "POST",
        body: JSON.stringify({ content: "Unauthorized comment" }),
      });
      const res = await postHelpDeskComment(req, { params: Promise.resolve({ id: "t-1" }) });
      expect(res.status).toBe(403);
    });

    it("returns 201 when ticket submitter posts a valid comment", async () => {
      (db.select as jest.Mock).mockReturnValue(
        makeChain({
          id: "t-1",
          institutionId: "inst-a",
          submittedById: "staff-1",
          assignedToId: null,
        })
      );
      (db.insert as jest.Mock).mockReturnValue(
        makeChain({ id: "c-1", ticketId: "t-1", content: "My update" })
      );
      const req = new Request("http://localhost/api/help-desk/t-1/comments", {
        method: "POST",
        body: JSON.stringify({ content: "My update" }),
      });
      const res = await postHelpDeskComment(req, { params: Promise.resolve({ id: "t-1" }) });
      expect(res.status).toBe(201);
    });
  });

  describe("GET /api/admin/attendance-locations/[id]/qr & POST .../beacon", () => {
    it("blocks cross-tenant QR minting and beacon overwrite with 404", async () => {
      mockSession.role = "principal";
      (db.select as jest.Mock).mockReturnValue(
        makeChain({
          id: "loc-b",
          institutionId: "inst-b",
          isActive: true,
          qrSecret: "secret",
        })
      );

      const qrRes = await getLocationQr(new Request("http://localhost/api/admin/attendance-locations/loc-b/qr"), {
        params: Promise.resolve({ id: "loc-b" }),
      });
      expect(qrRes.status).toBe(404);

      const beaconRes = await postLocationBeacon(
        new Request("http://localhost/api/admin/attendance-locations/loc-b/beacon", {
          method: "POST",
          body: JSON.stringify({ uuid: "beacon-uuid-1" }),
        }),
        { params: Promise.resolve({ id: "loc-b" }) }
      );
      expect(beaconRes.status).toBe(404);
    });
  });

  describe("POST /api/polls/[id]/vote", () => {
    it("rejects empty string or boolean selectedOption coercion (Number('') === 0)", async () => {
      const req = new Request("http://localhost/api/polls/p-1/vote", {
        method: "POST",
        body: JSON.stringify({ selectedOption: "" }),
      });
      const res = await postPollVote(req, { params: Promise.resolve({ id: "p-1" }) });
      expect(res.status).toBe(400);
    });

    it("rejects out-of-range option index and cross-tenant polls", async () => {
      (db.select as jest.Mock).mockReturnValue(
        makeChain({
          id: "p-1",
          isActive: true,
          targetInstitutionId: "inst-b",
          options: JSON.stringify(["Yes", "No"]),
        })
      );
      const crossTenantRes = await postPollVote(
        new Request("http://localhost/api/polls/p-1/vote", {
          method: "POST",
          body: JSON.stringify({ selectedOption: 0 }),
        }),
        { params: Promise.resolve({ id: "p-1" }) }
      );
      expect(crossTenantRes.status).toBe(404);

      (db.select as jest.Mock).mockReturnValue(
        makeChain({
          id: "p-1",
          isActive: true,
          targetInstitutionId: "inst-a",
          options: JSON.stringify(["Yes", "No"]),
        })
      );
      const outOfBoundsRes = await postPollVote(
        new Request("http://localhost/api/polls/p-1/vote", {
          method: "POST",
          body: JSON.stringify({ selectedOption: 5 }),
        }),
        { params: Promise.resolve({ id: "p-1" }) }
      );
      expect(outOfBoundsRes.status).toBe(400);
    });
  });

  describe("Biometric Enroll & Verify Face", () => {
    it("enforces canAccessStaff when enrolling or verifying another staff member", async () => {
      (canAccessStaff as jest.Mock).mockResolvedValueOnce(false);
      const enrollRes = await postEnrollFace(
        new Request("http://localhost/api/staff/other-id/enroll-face", {
          method: "POST",
          body: JSON.stringify({ embedding: [0.2, 0.8, 0.5] }),
        }),
        { params: Promise.resolve({ id: "other-id" }) }
      );
      expect(enrollRes.status).toBe(403);

      (canAccessStaff as jest.Mock).mockResolvedValueOnce(false);
      const verifyRes = await postVerifyFace(
        new Request("http://localhost/api/biometric/verify-face", {
          method: "POST",
          body: JSON.stringify({ staffId: "other-id", embedding: [0.2, 0.8, 0.5] }),
        })
      );
      expect(verifyRes.status).toBe(403);
    });

    it("enrolls and verifies deterministic image embeddings end-to-end", async () => {
      let storedEmbedding = "";
      (db.select as jest.Mock).mockImplementation(() =>
        makeChain({ id: "staff-1", faceEmbedding: storedEmbedding })
      );
      const updateChain = makeChain();
      updateChain.set = jest.fn((payload: { faceEmbedding: string }) => {
        storedEmbedding = payload.faceEmbedding;
        return updateChain;
      });
      (db.update as jest.Mock).mockReturnValue(updateChain);

      const enrollRes = await postEnrollFace(
        new Request("http://localhost/api/staff/staff-1/enroll-face", {
          method: "POST",
          body: JSON.stringify({ image: "data:image/jpeg;base64,SAMPLE_FACE_PAYLOAD" }),
        }),
        { params: Promise.resolve({ id: "staff-1" }) }
      );
      expect(enrollRes.status).toBe(200);
      expect(JSON.parse(storedEmbedding)).toHaveLength(16);

      const verifyRes = await postVerifyFace(
        new Request("http://localhost/api/biometric/verify-face", {
          method: "POST",
          body: JSON.stringify({
            staffId: "staff-1",
            image: "data:image/jpeg;base64,SAMPLE_FACE_PAYLOAD",
          }),
        })
      );
      const verifyBody = await verifyRes.json();
      expect(verifyRes.status).toBe(200);
      expect(verifyBody.matched).toBe(true);
      expect(verifyBody.confidence).toBeCloseTo(1, 4);
    });
  });

  describe("Sibling Sub-Resources (A6–A9)", () => {
    it("blocks cross-tenant asset service history lookup (A6)", async () => {
      (db.select as jest.Mock).mockReturnValue(
        makeChain({ id: "asset-b", institutionId: "inst-b" })
      );
      const res = await getAssetService(new Request("http://localhost/api/assets/asset-b/service"), {
        params: Promise.resolve({ id: "asset-b" }),
      });
      expect(res.status).toBe(404);
    });

    it("scopes checklist template item deletion to parent templateId (A7)", async () => {
      (db.delete as jest.Mock).mockReturnValue(makeChain(null));
      const res = await deleteChecklistTemplateItem(
        new Request("http://localhost/api/checklists/templates/tpl-1/items", {
          method: "DELETE",
          body: JSON.stringify({ id: "item-from-tpl-2" }),
        }),
        { params: Promise.resolve({ templateId: "tpl-1" }) }
      );
      expect(res.status).toBe(404);
    });

    it("blocks open-redirect on circular download when fileUrl points to external origin (A8)", async () => {
      (db.select as jest.Mock).mockReturnValue(
        makeChain({
          id: "circ-1",
          fileUrl: "https://evil.example/payload.pdf",
          title: "Policy",
          fileType: "pdf",
          isActive: true,
          targetInstitutionId: "inst-a",
        })
      );
      const res = await getCircularDownload(
        new Request("http://localhost/api/circulars/circ-1/download"),
        { params: Promise.resolve({ id: "circ-1" }) }
      );
      expect(res.status).toBe(400);
    });

    it("blocks announcement read receipt for cross-tenant announcement (A9)", async () => {
      (db.select as jest.Mock).mockReturnValue(
        makeChain({
          id: "ann-b",
          targetInstitutionId: "inst-b",
        })
      );
      const res = await postAnnouncementRead(
        new Request("http://localhost/api/announcements/ann-b/read", { method: "POST" }),
        { params: Promise.resolve({ id: "ann-b" }) }
      );
      expect(res.status).toBe(404);
    });
  });
});
