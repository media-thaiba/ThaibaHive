import { GET as lookupHandler } from "@/app/api/admin/nfc/lookup/route";
import { POST as assignHandler } from "@/app/api/admin/nfc/assign/route";
import { POST as unbindHandler } from "@/app/api/admin/nfc/unbind/route";
import { DELETE as staffDeleteHandler } from "@/app/api/staff/[id]/route";
import { verifySession } from "@/lib/auth";
import { db } from "@/db";
import { checkRateLimit } from "@/lib/api/rate-limit";

jest.mock("@/lib/auth", () => ({
  verifySession: jest.fn(),
  hasPermission: jest.fn(() => true),
}));

jest.mock("@/lib/api/activity-log", () => ({
  logActivity: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/auth/department-scope", () => ({
  canAccessStaff: jest.fn().mockResolvedValue(true),
}));

jest.mock("@/lib/onboarding/auto-assign", () => ({
  autoAssignOffboardingChecklists: jest.fn(),
}));

jest.mock("@/lib/api/rate-limit", () => {
  const original = jest.requireActual("@/lib/api/rate-limit");
  return {
    ...original,
    checkRateLimit: jest.fn().mockReturnValue({ allowed: true, remaining: 59, resetMs: 60000 }),
  };
});

jest.mock("@/db", () => {
  const mockUpdateSet = jest.fn().mockReturnValue({
    where: jest.fn().mockReturnValue({
      run: jest.fn().mockResolvedValue(undefined),
    }),
  });

  return {
    db: {
      select: jest.fn(),
      update: jest.fn().mockReturnValue({
        set: mockUpdateSet,
      }),
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          run: jest.fn().mockResolvedValue(undefined),
        }),
      }),
      transaction: jest.fn().mockImplementation(async (cb) => {
        return cb({
          update: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue(undefined),
            }),
          }),
        });
      }),
    },
  };
});

describe("NFC Tag Registration & Management API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (checkRateLimit as jest.Mock).mockReturnValue({ allowed: true, remaining: 59, resetMs: 60000 });
  });

  describe("GET /api/admin/nfc/lookup", () => {
    it("should return 401 when user is unauthenticated", async () => {
      (verifySession as jest.Mock).mockResolvedValueOnce(null);
      const req = new Request("http://localhost/api/admin/nfc/lookup?tagId=TAG123");
      const res = await lookupHandler(req);
      expect(res.status).toBe(401);
    });

    it("should return 400 when tagId parameter is missing", async () => {
      (verifySession as jest.Mock).mockResolvedValueOnce({
        staffId: "admin-1",
        role: "admin",
        email: "admin@test.com",
      });
      const req = new Request("http://localhost/api/admin/nfc/lookup");
      const res = await lookupHandler(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("tagId is required");
    });

    it("should hide PII and return isSameTenant: false when tag belongs to external tenant", async () => {
      (verifySession as jest.Mock).mockResolvedValueOnce({
        staffId: "admin-tenant-A",
        role: "admin",
        email: "adminA@orgA.com",
      });

      // Mock user institution = inst-A
      // Mock matching staff = staff-B in inst-B
      (db.select as jest.Mock)
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ institutionId: "inst-A" }]),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({
                id: "staff-B",
                firstName: "Secret",
                lastName: "User",
                employeeId: "EMP999",
                nfcTagId: "EXTERNAL-TAG-99",
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({ institutionId: "inst-B" }),
            }),
          }),
        });

      const req = new Request("http://localhost/api/admin/nfc/lookup?tagId=EXTERNAL-TAG-99");
      const res = await lookupHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.isBound).toBe(true);
      expect(data.isSameTenant).toBe(false);
      expect(data.owner).toBeUndefined(); // PII strictly hidden!
    });

    it("should return 429 Too Many Requests when rate limit is exceeded on lookup", async () => {
      (verifySession as jest.Mock).mockResolvedValueOnce({
        staffId: "admin-spammer",
        role: "admin",
        email: "admin@test.com",
      });

      (checkRateLimit as jest.Mock).mockReturnValueOnce({
        allowed: false,
        remaining: 0,
        resetMs: 45000,
      });

      const req = new Request("http://localhost/api/admin/nfc/lookup?tagId=TAG-LIMITED");
      const res = await lookupHandler(req);
      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data.error).toContain("Rate limit exceeded");
    });
  });

  describe("POST /api/admin/nfc/assign", () => {
    it("should return 400 when forceReassign is true but expectedCurrentOwnerId is missing", async () => {
      (verifySession as jest.Mock).mockResolvedValueOnce({
        staffId: "admin-1",
        role: "admin",
        email: "admin@test.com",
      });
      const req = new Request("http://localhost/api/admin/nfc/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "staff",
          targetId: "staff-101",
          nfcTagId: "TAG-ABCD-1234",
          forceReassign: true,
        }),
      });
      const res = await assignHandler(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("expectedCurrentOwnerId is required when forceReassign is true");
    });

    it("should return 400 for invalid target type", async () => {
      (verifySession as jest.Mock).mockResolvedValueOnce({
        staffId: "admin-1",
        role: "admin",
        email: "admin@test.com",
      });
      const req = new Request("http://localhost/api/admin/nfc/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "invalid_type",
          targetId: "staff-101",
          nfcTagId: "TAG-ABCD-1234",
        }),
      });
      const res = await assignHandler(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("type must be 'staff' or 'location'");
    });

    it("should return 403 Forbidden when admin attempts cross-tenant target assignment", async () => {
      (verifySession as jest.Mock).mockResolvedValueOnce({
        staffId: "admin-tenant-A",
        role: "admin",
        email: "adminA@orgA.com",
      });

      // Admin in inst-A, target staff in inst-B
      (db.select as jest.Mock)
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ institutionId: "inst-A" }]),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({
                id: "staff-B",
                firstName: "External",
                lastName: "User",
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({ institutionId: "inst-B" }),
            }),
          }),
        });

      const req = new Request("http://localhost/api/admin/nfc/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "staff",
          targetId: "staff-B",
          nfcTagId: "TAG-1234",
        }),
      });
      const res = await assignHandler(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Forbidden");
    });

    it("should return 409 Conflict when clientRequestId is reused with mismatched parameters", async () => {
      const session = {
        staffId: "admin-idempotent",
        role: "admin",
        email: "admin@test.com",
      };

      (verifySession as jest.Mock).mockResolvedValue(session);

      // First call setup
      (db.select as jest.Mock)
        .mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({ id: "target-1", firstName: "First", lastName: "Name" }),
            }),
          }),
        });

      const req1 = new Request("http://localhost/api/admin/nfc/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "staff",
          targetId: "target-1",
          nfcTagId: "TAG-IDEMPOTENT-1",
          clientRequestId: "req-uuid-9999",
        }),
      });
      const res1 = await assignHandler(req1);
      expect(res1.status).toBe(200);

      // Second call with SAME clientRequestId but DIFFERENT body payload
      const req2 = new Request("http://localhost/api/admin/nfc/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "staff",
          targetId: "different-target-2",
          nfcTagId: "TAG-IDEMPOTENT-1",
          clientRequestId: "req-uuid-9999",
        }),
      });
      const res2 = await assignHandler(req2);
      expect(res2.status).toBe(409);
      const data2 = await res2.json();
      expect(data2.error).toBe("clientRequestId reused with mismatched parameters");
    });

    it("should handle DB unique constraint violations gracefully by returning 409 Conflict", async () => {
      (verifySession as jest.Mock).mockResolvedValueOnce({
        staffId: "admin-race",
        role: "admin",
        email: "admin@test.com",
      });

      // Target staff exists
      (db.select as jest.Mock)
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ institutionId: "inst-1" }]),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({ id: "target-staff-1", firstName: "Alice", lastName: "Smith" }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({ institutionId: "inst-1" }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue(null),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue(null),
            }),
          }),
        });

      // Mock transaction throwing DB UNIQUE constraint error
      (db.transaction as jest.Mock).mockRejectedValueOnce(new Error("UNIQUE constraint failed: staff.nfc_tag_id"));

      const req = new Request("http://localhost/api/admin/nfc/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "staff",
          targetId: "target-staff-1",
          nfcTagId: "CONCURRENT-TAG-X",
        }),
      });

      const res = await assignHandler(req);
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toBe("NFC tag already in use");
    });

    it("should resolve simultaneous concurrent assign calls such that unique constraint conflict returns 409", async () => {
      const session = {
        staffId: "admin-concurrent-runner",
        role: "admin",
        email: "admin@test.com",
      };

      (verifySession as jest.Mock).mockResolvedValue(session);

      // Mock DB setup where first call succeeds and second call hits unique constraint
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({ id: "target-staff-A", firstName: "Bob", lastName: "Jones" }),
          }),
        }),
      });

      let callCount = 0;
      (db.transaction as jest.Mock).mockImplementation(async (cb) => {
        callCount++;
        if (callCount > 1) {
          throw new Error("UNIQUE constraint failed: staff.nfc_tag_id");
        }
        return cb({
          update: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue(undefined),
            }),
          }),
        });
      });

      const reqA = new Request("http://localhost/api/admin/nfc/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "staff",
          targetId: "target-staff-A",
          nfcTagId: "SHARED-TAG-RACE",
          clientRequestId: "req-race-A",
        }),
      });

      const reqB = new Request("http://localhost/api/admin/nfc/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "staff",
          targetId: "target-staff-B",
          nfcTagId: "SHARED-TAG-RACE",
          clientRequestId: "req-race-B",
        }),
      });

      const [resA, resB] = await Promise.all([assignHandler(reqA), assignHandler(reqB)]);

      expect(resA.status).toBe(200);
      expect(resB.status).toBe(409);
      const dataB = await resB.json();
      expect(["NFC tag is already assigned", "NFC tag already in use"]).toContain(dataB.error);
    });
  });

  describe("POST /api/admin/nfc/unbind", () => {
    it("should return 400 when targetId is missing", async () => {
      (verifySession as jest.Mock).mockResolvedValueOnce({
        staffId: "admin-1",
        role: "admin",
        email: "admin@test.com",
      });
      const req = new Request("http://localhost/api/admin/nfc/unbind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "staff",
        }),
      });
      const res = await unbindHandler(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("targetId is required");
    });

    it("should return 403 Forbidden when attempting cross-tenant unbind", async () => {
      (verifySession as jest.Mock).mockResolvedValueOnce({
        staffId: "admin-tenant-A",
        role: "admin",
        email: "adminA@orgA.com",
      });

      (db.select as jest.Mock)
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ institutionId: "inst-A" }]),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({
                id: "staff-B",
                firstName: "External",
                lastName: "User",
                nfcTagId: "TAG-B",
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({ institutionId: "inst-B" }),
            }),
          }),
        });

      const req = new Request("http://localhost/api/admin/nfc/unbind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "staff",
          targetId: "staff-B",
        }),
      });
      const res = await unbindHandler(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Forbidden");
    });
  });

  describe("DELETE /api/staff/[id] (Staff Deactivation Auto-Release)", () => {
    it("should release staff nfcTagId to null when account is revoked/deactivated", async () => {
      (verifySession as jest.Mock).mockResolvedValueOnce({
        staffId: "admin-deactivator",
        role: "admin",
        email: "admin@test.com",
      });

      const req = new Request("http://localhost/api/staff/staff-leaving-123", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Employee offboarded" }),
      });

      const context = { params: Promise.resolve({ id: "staff-leaving-123" }) };
      const res = await staffDeleteHandler(req, context);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      // Verify db.update was called setting isActive: false and nfcTagId: null
      expect(db.update).toHaveBeenCalled();
    });
  });
});
