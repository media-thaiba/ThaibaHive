import { GET as locationQrHandler } from "@/app/api/admin/attendance-locations/[id]/qr/route";
import { POST as assetTagHandler } from "@/app/api/assets/[id]/tag/route";
import { POST as faceEnrollHandler } from "@/app/api/staff/[id]/enroll-face/route";
import { POST as beaconPairHandler } from "@/app/api/admin/attendance-locations/[id]/beacon/route";
import { GET as visitorVerifyHandler, POST as visitorCheckInHandler } from "@/app/api/visitors/verify/route";
import { verifySession } from "@/lib/auth";
import { db } from "@/db";

jest.mock("@/lib/auth", () => ({
  verifySession: jest.fn(),
  hasPermission: jest.fn(() => true),
}));

jest.mock("@/lib/api/activity-log", () => ({
  logActivity: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/db", () => {
  return {
    db: {
      select: jest.fn(),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({ id: "mock-id" }),
            }),
          }),
        }),
      }),
    },
  };
});

describe("Hardware & Scanning Mobile Features API Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("1. GET /api/admin/attendance-locations/[id]/qr", () => {
    it("should return 404 if location is missing", async () => {
      (verifySession as jest.Mock).mockResolvedValueOnce({ staffId: "admin-1", role: "admin" });
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(null),
          }),
        }),
      });

      const req = new Request("http://localhost/api/admin/attendance-locations/loc-99/qr");
      const context = { params: Promise.resolve({ id: "loc-99" }) };
      const res = await locationQrHandler(req, context);
      expect(res.status).toBe(404);
    });

    it("should return dynamic HMAC TOTP QR payload for active location", async () => {
      (verifySession as jest.Mock).mockResolvedValueOnce({ staffId: "admin-1", role: "admin" });
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({ id: "loc-1", name: "Main Gate", isActive: true, qrSecret: "secret-key-123" }),
          }),
        }),
      });

      const req = new Request("http://localhost/api/admin/attendance-locations/loc-1/qr");
      const context = { params: Promise.resolve({ id: "loc-1" }) };
      const res = await locationQrHandler(req, context);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.qr).toBeDefined();
      expect(data.payload.locationId).toBe("loc-1");
    });
  });

  describe("2. POST /api/assets/[id]/tag", () => {
    it("should return 400 when no tag parameter is provided", async () => {
      (verifySession as jest.Mock).mockResolvedValueOnce({ staffId: "admin-1", role: "admin" });
      const req = new Request("http://localhost/api/assets/asset-1/tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const context = { params: Promise.resolve({ id: "asset-1" }) };
      const res = await assetTagHandler(req, context);
      expect(res.status).toBe(400);
    });

    it("should bind barcode/NFC tag successfully and return success", async () => {
      (verifySession as jest.Mock).mockResolvedValueOnce({ staffId: "admin-1", role: "admin" });
      (db.select as jest.Mock)
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({ id: "asset-1", name: "Dell Laptop" }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue(null), // no existing collision
            }),
          }),
        });

      const req = new Request("http://localhost/api/assets/asset-1/tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode: "BC-DELL-998877" }),
      });
      const context = { params: Promise.resolve({ id: "asset-1" }) };
      const res = await assetTagHandler(req, context);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });

  describe("3. POST /api/staff/[id]/enroll-face", () => {
    it("should return 403 when a non-admin staff tries to enroll another user", async () => {
      (verifySession as jest.Mock).mockResolvedValueOnce({ staffId: "staff-user-1", role: "staff" });
      const req = new Request("http://localhost/api/staff/staff-user-2/enroll-face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoDataUrl: "data:image/png;base64,123" }),
      });
      const context = { params: Promise.resolve({ id: "staff-user-2" }) };
      const res = await faceEnrollHandler(req, context);
      expect(res.status).toBe(403);
    });

    it("should enroll face reference photo for self or admin", async () => {
      (verifySession as jest.Mock).mockResolvedValueOnce({ staffId: "staff-self", role: "staff" });
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({ id: "staff-self", firstName: "Jane", lastName: "Doe" }),
          }),
        }),
      });

      const req = new Request("http://localhost/api/staff/staff-self/enroll-face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoDataUrl: "data:image/jpeg;base64,VGhpcyBpcyBhIHRlc3Q=" }),
      });
      const context = { params: Promise.resolve({ id: "staff-self" }) };
      const res = await faceEnrollHandler(req, context);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });

  describe("4. POST /api/admin/attendance-locations/[id]/beacon", () => {
    it("should return 400 when BLE beacon UUID is missing", async () => {
      (verifySession as jest.Mock).mockResolvedValueOnce({ staffId: "admin-1", role: "admin" });
      const req = new Request("http://localhost/api/admin/attendance-locations/loc-1/beacon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ major: 1, minor: 100 }),
      });
      const context = { params: Promise.resolve({ id: "loc-1" }) };
      const res = await beaconPairHandler(req, context);
      expect(res.status).toBe(400);
    });

    it("should pair BLE beacon parameters to attendance location", async () => {
      (verifySession as jest.Mock).mockResolvedValueOnce({ staffId: "admin-1", role: "admin" });
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({ id: "loc-1", name: "Library Entrance" }),
          }),
        }),
      });

      const req = new Request("http://localhost/api/admin/attendance-locations/loc-1/beacon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uuid: "E2C56DB5-DFFB-48D2-B060-D0F5A71096E0",
          major: 1,
          minor: 100,
        }),
      });
      const context = { params: Promise.resolve({ id: "loc-1" }) };
      const res = await beaconPairHandler(req, context);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });

  describe("5. Visitor Gate Verification API", () => {
    it("should verify visitor pass status", async () => {
      (verifySession as jest.Mock).mockResolvedValueOnce({ staffId: "guard-1", role: "staff" });
      (db.select as jest.Mock)
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({
                id: "vis-123",
                name: "John Visitor",
                purpose: "Interview",
                status: "checked_in",
                hostStaffId: "staff-host",
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({ firstName: "Host", lastName: "Admin" }),
            }),
          }),
        });

      const req = new Request("http://localhost/api/visitors/verify?passToken=vis-123");
      const res = await visitorVerifyHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.visitor.name).toBe("John Visitor");
      expect(data.verificationStatus).toBe("checked_in");
    });

    it("should log visitor gate check-in or check-out", async () => {
      (verifySession as jest.Mock).mockResolvedValueOnce({ staffId: "guard-1", role: "staff" });
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({ id: "vis-123", name: "John Visitor", status: "approved" }),
          }),
        }),
      });

      const req = new Request("http://localhost/api/visitors/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId: "vis-123", action: "check_in" }),
      });
      const res = await visitorCheckInHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.action).toBe("check_in");
    });
  });
});
