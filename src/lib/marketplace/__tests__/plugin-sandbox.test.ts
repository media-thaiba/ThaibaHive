import { PluginSandbox } from "../plugin-sandbox";

describe("PluginSandbox", () => {
  describe("SSRF & Egress URL Validation", () => {
    it("allows valid external HTTPS URLs within declared allowlist", () => {
      const allowed = ["https://api.stripe.com", "https://api.twilio.com/v1"];

      const res1 = PluginSandbox.validateEgressUrl(
        "https://api.stripe.com/v1/charges",
        allowed
      );
      expect(res1.allowed).toBe(true);

      const res2 = PluginSandbox.validateEgressUrl(
        "https://api.twilio.com/v1/Messages",
        allowed
      );
      expect(res2.allowed).toBe(true);
    });

    it("blocks non-allowlisted target URLs", () => {
      const allowed = ["https://api.stripe.com"];
      const res = PluginSandbox.validateEgressUrl(
        "https://api.untrusted-endpoint.com/data",
        allowed
      );
      expect(res.allowed).toBe(false);
      expect(res.reason).toMatch(/not declared in the plugin's egress allowlist/);
    });

    it("blocks non-HTTPS protocols (file, gopher, ftp)", () => {
      const res1 = PluginSandbox.validateEgressUrl("file:///etc/passwd");
      expect(res1.allowed).toBe(false);
      expect(res1.reason).toMatch(/Disallowed protocol/);

      const res2 = PluginSandbox.validateEgressUrl("gopher://internal.lan");
      expect(res2.allowed).toBe(false);
    });

    it("blocks loopback, localhost, and internal hostnames (SSRF defense)", () => {
      const loopbacks = [
        "https://localhost:8080/metrics",
        "https://127.0.0.1:3000/api",
        "https://0.0.0.0/debug",
        "https://internal-service.local/admin",
      ];

      for (const url of loopbacks) {
        const res = PluginSandbox.validateEgressUrl(url);
        expect(res.allowed).toBe(false);
        expect(res.reason).toMatch(/blocked/);
      }
    });

    it("blocks RFC 1918 private IPv4 and AWS/GCP link-local metadata addresses", () => {
      const privateIps = [
        "https://10.0.0.1/secrets",
        "https://172.16.50.1/status",
        "https://192.168.1.1/router",
        "https://169.254.169.254/latest/meta-data", // Cloud metadata service
        "https://100.64.0.1/cgnat",
      ];

      for (const url of privateIps) {
        const res = PluginSandbox.validateEgressUrl(url);
        expect(res.allowed).toBe(false);
        expect(res.reason).toMatch(/Private or link-local IP address/);
      }
    });
  });

  describe("Capability Access Gating", () => {
    it("permits exact match or wildcard capability permissions", () => {
      const perms = ["finance:fees:read", "notifications:*", "profile:read"];

      expect(PluginSandbox.evaluateToolAccess("finance:fees:read", perms).allowed).toBe(true);
      expect(PluginSandbox.evaluateToolAccess("notifications:sms:send", perms).allowed).toBe(true);
      expect(PluginSandbox.evaluateToolAccess("notifications:email:send", perms).allowed).toBe(true);
      expect(PluginSandbox.evaluateToolAccess("profile:read", perms).allowed).toBe(true);
    });

    it("denies access to tools outside granted permissions", () => {
      const perms = ["finance:fees:read"];

      const res1 = PluginSandbox.evaluateToolAccess("finance:fees:delete", perms);
      expect(res1.allowed).toBe(false);
      expect(res1.reason).toMatch(/not permitted/);

      const res2 = PluginSandbox.evaluateToolAccess("system:admin:execute", perms);
      expect(res2.allowed).toBe(false);
    });
  });

  describe("Sandboxed Execution, Resource Limits & Merkle Logging", () => {
    it("successfully executes tool within budget and records audit entry", async () => {
      const result = await PluginSandbox.executeTool({
        agentId: "agent_fee_bot",
        pluginId: "plugin_fee_123",
        toolName: "finance:fees:read",
        input: { studentId: "std_456" },
        institutionId: "inst_test_tenant",
        grantedPermissions: ["finance:fees:read"],
        resourceBudget: { maxExecutionTimeMs: 2000 },
        executeFn: async () => {
          return { feeBalance: 1200, currency: "INR" };
        },
      });

      expect(result.status).toBe("success");
      expect(result.output).toEqual({ feeBalance: 1200, currency: "INR" });
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.auditHash).toBeDefined();
    });

    it("denies ungranted tool execution and writes audited denial", async () => {
      const result = await PluginSandbox.executeTool({
        agentId: "agent_fee_bot",
        pluginId: "plugin_fee_123",
        toolName: "super_admin_secret:execute",
        input: {},
        institutionId: "inst_test_tenant",
        grantedPermissions: ["finance:fees:read"],
        executeFn: async () => {
          return { leaked: true };
        },
      });

      expect(result.status).toBe("denied");
      expect(result.error).toMatch(/not permitted/);
    });

    it("terminates tool execution exceeding wall-clock timeout", async () => {
      const result = await PluginSandbox.executeTool({
        agentId: "agent_slow_bot",
        pluginId: "plugin_slow_123",
        toolName: "tasks:compute",
        input: {},
        institutionId: "inst_test_tenant",
        grantedPermissions: ["tasks:compute"],
        resourceBudget: { maxExecutionTimeMs: 100 }, // 100ms timeout
        executeFn: async () => {
          await new Promise((resolve) => setTimeout(resolve, 500));
          return { completed: true };
        },
      });

      expect(result.status).toBe("timeout");
      expect(result.error).toMatch(/timeout after 100ms/);
    });

    it("handles execution errors gracefully and records audit entry", async () => {
      const result = await PluginSandbox.executeTool({
        agentId: "agent_failing_bot",
        pluginId: "plugin_fail_123",
        toolName: "finance:fees:read",
        input: {},
        institutionId: "inst_test_tenant",
        grantedPermissions: ["finance:fees:read"],
        executeFn: async () => {
          throw new Error("Upstream service connection reset");
        },
      });

      expect(result.status).toBe("error");
      expect(result.error).toBe("Upstream service connection reset");
    });
  });
});
