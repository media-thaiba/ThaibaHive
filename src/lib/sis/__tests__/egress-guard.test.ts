import { EgressGuard } from "../egress-guard";

describe("Gate 11: Egress Defense & SSRF Protection Test Suite", () => {
  beforeEach(() => {
    EgressGuard.clearDnsMocks();
  });

  afterEach(() => {
    EgressGuard.clearDnsMocks();
  });

  describe("Pre-DNS Static Hostname Blocking", () => {
    it("blocks cloud metadata hostnames directly before DNS resolution", async () => {
      const blockedHosts = [
        "http://169.254.169.254/latest/meta-data/",
        "https://metadata.google.internal/computeMetadata/v1/",
        "http://metadata.tencentyun.com/latest/meta-data/",
        "http://100.100.100.200/latest/meta-data/",
        "http://instance-data/latest/meta-data/",
      ];

      for (const url of blockedHosts) {
        const result = await EgressGuard.validateEgressUrl(url);
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain("SSRF");
      }
    });

    it("blocks loopback and local domain suffixes", async () => {
      const blockedUrls = [
        "http://localhost:8080/api",
        "https://service.internal/status",
        "http://cluster.local/secret",
        "https://myserver.localhost/data",
        "http://127.0.0.1:3000/",
        "http://0.0.0.0:8000/",
        "http://[::1]:9000/",
      ];

      for (const url of blockedUrls) {
        const result = await EgressGuard.validateEgressUrl(url);
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain("SSRF");
      }
    });
  });

  describe("IP Address Range Checks (IPv4 & IPv6)", () => {
    it("identifies private RFC 1918 IPv4 addresses", () => {
      expect(EgressGuard.isPrivateOrReservedIp("10.0.0.1")).toBe(true);
      expect(EgressGuard.isPrivateOrReservedIp("10.255.255.254")).toBe(true);
      expect(EgressGuard.isPrivateOrReservedIp("172.16.0.1")).toBe(true);
      expect(EgressGuard.isPrivateOrReservedIp("172.31.255.255")).toBe(true);
      expect(EgressGuard.isPrivateOrReservedIp("192.168.1.1")).toBe(true);
      expect(EgressGuard.isPrivateOrReservedIp("192.168.254.254")).toBe(true);
    });

    it("identifies link-local, carrier-NAT, loopback, and broadcast ranges", () => {
      expect(EgressGuard.isPrivateOrReservedIp("169.254.1.1")).toBe(true);
      expect(EgressGuard.isPrivateOrReservedIp("127.0.0.2")).toBe(true);
      expect(EgressGuard.isPrivateOrReservedIp("100.64.0.1")).toBe(true);
      expect(EgressGuard.isPrivateOrReservedIp("100.127.255.255")).toBe(true);
      expect(EgressGuard.isPrivateOrReservedIp("0.0.0.0")).toBe(true);
      expect(EgressGuard.isPrivateOrReservedIp("224.0.0.1")).toBe(true); // Multicast
      expect(EgressGuard.isPrivateOrReservedIp("240.0.0.1")).toBe(true); // Reserved
    });

    it("identifies private and reserved IPv6 ranges", () => {
      expect(EgressGuard.isPrivateOrReservedIp("::1")).toBe(true);
      expect(EgressGuard.isPrivateOrReservedIp("fc00::1")).toBe(true);
      expect(EgressGuard.isPrivateOrReservedIp("fd12:3456:789a::1")).toBe(true);
      expect(EgressGuard.isPrivateOrReservedIp("fe80::1")).toBe(true);
      expect(EgressGuard.isPrivateOrReservedIp("ff02::1")).toBe(true);
    });

    it("allows valid public IP addresses", () => {
      expect(EgressGuard.isPrivateOrReservedIp("8.8.8.8")).toBe(false);
      expect(EgressGuard.isPrivateOrReservedIp("1.1.1.1")).toBe(false);
      expect(EgressGuard.isPrivateOrReservedIp("93.184.216.34")).toBe(false);
      expect(EgressGuard.isPrivateOrReservedIp("2606:4700:4700::1111")).toBe(false);
    });
  });

  describe("DNS Pinned Resolution & Safe Fetching", () => {
    it("pins and allows a safe public domain", async () => {
      EgressGuard.setDnsMock("api.edfi.org", ["93.184.216.34"]);

      const result = await EgressGuard.validateEgressUrl("https://api.edfi.org/v5.3/api");
      expect(result.allowed).toBe(true);
      expect(result.pinnedIp).toBe("93.184.216.34");
    });

    it("detects and blocks DNS rebinding when domain resolves to a private IP", async () => {
      EgressGuard.setDnsMock("attacker-rebind.com", ["192.168.1.50"]);

      const result = await EgressGuard.validateEgressUrl("https://attacker-rebind.com/api");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("private address '192.168.1.50'");
    });

    it("blocks safeFetch if response redirects to an internal metadata IP (Per-Hop Revalidation)", async () => {
      // Mock safe domain resolving to public IP
      EgressGuard.setDnsMock("external-partner.com", ["93.184.216.34"]);

      // Mock global fetch to return a 302 redirect towards 169.254.169.254
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url === "https://external-partner.com/redirect") {
          return Promise.resolve(
            new Response(null, {
              status: 302,
              headers: { Location: "http://169.254.169.254/latest/meta-data/" },
            })
          );
        }
        return Promise.resolve(new Response("OK", { status: 200 }));
      });

      try {
        await expect(
          EgressGuard.safeFetch("https://external-partner.com/redirect")
        ).rejects.toThrow("SSRF Blocked");
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});
