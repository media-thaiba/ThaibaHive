import { hasPermission } from "../../../../../packages/auth/roles";
import { VisitorQrPassService } from "@/lib/visitors/qr-pass-service";

describe("Campus Services Multi-Tenant Security & RBAC Suite", () => {
  describe("RBAC Scope Checks", () => {
    it("enforces fleet management permissions", () => {
      expect(hasPermission("admin", "fleet:manage")).toBe(true);
      expect(hasPermission("principal", "fleet:manage")).toBe(true);
      expect(hasPermission("staff", "fleet:manage")).toBe(false);
    });

    it("enforces canteen cashier redemption permissions", () => {
      expect(hasPermission("admin", "canteen:redeem")).toBe(true);
      expect(hasPermission("principal", "canteen:redeem")).toBe(true);
      expect(hasPermission("staff", "canteen:redeem")).toBe(false);
    });

    it("enforces visitor pass issuance & gate verification permissions", () => {
      expect(hasPermission("admin", "visitor:issue")).toBe(true);
      expect(hasPermission("principal", "visitor:verify")).toBe(true);
      expect(hasPermission("staff", "visitor:issue")).toBe(false);
    });
  });

  describe("HMAC Visitor QR Pass Cryptographic Verification", () => {
    it("validates tamper resistance of visitor pass signatures", () => {
      const validFrom = new Date(Date.now() - 1000).toISOString();
      const validUntil = new Date(Date.now() + 100000).toISOString();

      const pass = VisitorQrPassService.issuePassPayload({
        institutionId: "inst_001",
        visitorId: "v_101",
        hostId: "staff_99",
        validFrom,
        validUntil,
      });

      const validCheck = VisitorQrPassService.verifyPassPayload(pass.qrPayload);
      expect(validCheck.valid).toBe(true);

      const forgedPayload = pass.qrPayload.replace("inst_001", "inst_002_FORGED");
      const forgedCheck = VisitorQrPassService.verifyPassPayload(forgedPayload);
      expect(forgedCheck.valid).toBe(false);
    });
  });
});
