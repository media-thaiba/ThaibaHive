/**
 * Unit/Integration tests for Federated Threat Sharing API & Service (TIF-012)
 */

import { FederationService } from "../../security/threat-intel/federation-service";
import { QuarantineManager } from "../../security/quarantine-manager";
import { GET, POST } from "../../../app/api/security/threat-intel/federation/route";

describe("Federated Threat Sharing (TIF-012)", () => {
  beforeEach(() => {
    QuarantineManager.getInstance().reset();
  });

  it("filters private and reserved RFC 1918 IPs from exports", () => {
    const federationService = FederationService.getInstance();

    expect(federationService.isPrivateOrReservedIp("127.0.0.1")).toBe(true);
    expect(federationService.isPrivateOrReservedIp("10.1.2.3")).toBe(true);
    expect(federationService.isPrivateOrReservedIp("192.168.1.100")).toBe(true);
    expect(federationService.isPrivateOrReservedIp("172.16.5.5")).toBe(true);
    expect(federationService.isPrivateOrReservedIp("198.51.100.22")).toBe(false);
    expect(federationService.isPrivateOrReservedIp("203.0.113.88")).toBe(false);
  });

  it("exports active quarantines without leaking private IPs", async () => {
    const qm = QuarantineManager.getInstance();
    // 1 private IP (should be excluded)
    qm.quarantineIp("10.0.0.5", "Internal test ban");
    // 1 public IP (should be included)
    qm.quarantineIp("198.51.100.77", "External botnet attack");

    const req = new Request("http://localhost/api/security/threat-intel/federation", {
      method: "GET",
      headers: { "x-user-role": "admin" },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);

    const bundle = await res.json();
    expect(bundle.type).toBe("bundle");
    expect(bundle.objects.length).toBe(1);
    expect(bundle.objects[0].pattern).toContain("198.51.100.77");
    expect(bundle.objects[0].pattern).not.toContain("10.0.0.5");
  });

  it("ingests valid federated STIX bundle via POST", async () => {
    const validBundle = {
      type: "bundle",
      objects: [
        {
          type: "indicator",
          pattern: "[ipv4-addr:value = '203.0.113.44']",
          confidence: 90,
          valid_from: "2026-08-01T00:00:00Z",
          name: "Attacking crawler from sister university",
        },
      ],
    };

    const req = new Request("http://localhost/api/security/threat-intel/federation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-role": "admin",
        "x-peer-institution-id": "institution-beta",
      },
      body: JSON.stringify(validBundle),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.status).toBe("success");
    expect(json.peerId).toBe("institution-beta");
    expect(QuarantineManager.getInstance().isBanned("203.0.113.44")).toBe(true);
  });
});
