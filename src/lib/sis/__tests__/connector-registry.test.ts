import { ConnectorRegistry } from "../connector-registry";
import { CredentialVault } from "../credential-vault";
import { EgressGuard } from "../egress-guard";

describe("Gate 8: Connector Registry & Credential Vault Isolation", () => {
  const tenantA = "inst_campus_alpha";
  const tenantB = "inst_campus_beta";

  beforeEach(() => {
    ConnectorRegistry.setUseMemory(true);
    ConnectorRegistry.clearMemory();
    CredentialVault.clearTestCredentials();
    EgressGuard.clearDnsMocks();
  });

  afterEach(() => {
    ConnectorRegistry.clearMemory();
    CredentialVault.clearTestCredentials();
    EgressGuard.clearDnsMocks();
  });

  it("creates a connector and transforms it into a masked DTO", async () => {
    EgressGuard.setDnsMock("sis.myschool.edu", ["93.184.216.34"]);
    CredentialVault.setTestCredential("EDFI_PROD_SECRET", "super-secret-token-12345");

    const connector = await ConnectorRegistry.createConnector(tenantA, {
      name: "Main EdFi Hub",
      standard: "edfi",
      baseUrl: "https://sis.myschool.edu/api/v5",
      credentialRef: "EDFI_PROD_SECRET",
      authMode: "oauth2",
      enabled: true,
    });

    expect(connector.id).toMatch(/^sisc_/);
    expect(connector.institutionId).toBe(tenantA);

    // Transform to DTO
    const dto = await ConnectorRegistry.toDto(connector);

    // Raw credentialRef must NOT exist in DTO
    expect((dto as any).credentialRef).toBeUndefined();
    expect(dto.credentialRefMasked).toBe("***-CRET");
    expect(dto.hasCredential).toBe(true);
  });

  it("correctly indicates hasCredential=false when secret is missing", async () => {
    EgressGuard.setDnsMock("sis.myschool.edu", ["93.184.216.34"]);

    const connector = await ConnectorRegistry.createConnector(tenantA, {
      name: "Unconfigured Hub",
      standard: "oneroster",
      baseUrl: "https://sis.myschool.edu/ims/oneroster/v1p1",
      credentialRef: "UNCONFIGURED_KEY",
      authMode: "oauth2",
    });

    const dto = await ConnectorRegistry.toDto(connector);
    expect(dto.hasCredential).toBe(false);
    expect(dto.credentialRefMasked).toBe("***-_KEY");
  });

  it("strictly enforces tenant isolation across connectors (Gate 8)", async () => {
    EgressGuard.setDnsMock("sis.myschool.edu", ["93.184.216.34"]);

    const connectorA = await ConnectorRegistry.createConnector(tenantA, {
      name: "Alpha Connector",
      standard: "edfi",
      baseUrl: "https://sis.myschool.edu/alpha",
      credentialRef: "ALPHA_KEY",
    });

    // Tenant B cannot retrieve Tenant A's connector
    const foundByB = await ConnectorRegistry.getConnector(tenantB, connectorA.id);
    expect(foundByB).toBeNull();

    // Tenant B's listing does not include Tenant A's connector
    const listB = await ConnectorRegistry.listConnectors(tenantB);
    expect(listB).toHaveLength(0);

    const listA = await ConnectorRegistry.listConnectors(tenantA);
    expect(listA).toHaveLength(1);
    expect(listA[0].id).toBe(connectorA.id);

    // Tenant B cannot update Tenant A's connector
    const updateResult = await ConnectorRegistry.updateConnector(tenantB, connectorA.id, {
      name: "Hacked by Tenant B",
    });
    expect(updateResult).toBeNull();

    // Tenant B cannot delete Tenant A's connector
    const deleteResult = await ConnectorRegistry.deleteConnector(tenantB, connectorA.id);
    expect(deleteResult).toBe(false);
  });

  it("blocks connector creation if baseUrl targets internal IP (SSRF Gate 11)", async () => {
    await expect(
      ConnectorRegistry.createConnector(tenantA, {
        name: "Malicious Connector",
        standard: "edfi",
        baseUrl: "http://169.254.169.254/latest/meta-data",
        credentialRef: "SOME_KEY",
      })
    ).rejects.toThrow("Invalid connector baseUrl");
  });
});
