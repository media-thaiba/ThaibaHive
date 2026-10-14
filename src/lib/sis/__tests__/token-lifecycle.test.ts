import { TokenLifecycle } from "../token-lifecycle";
import { CredentialVault } from "../credential-vault";
import { EgressGuard } from "../egress-guard";
import type { SisConnectorRecord } from "../connector-registry";

describe("Wave 3: SIS Token Lifecycle Engine", () => {
  const dummyConnector: SisConnectorRecord = {
    id: "sisc_test_conn",
    institutionId: "inst_alpha",
    standard: "edfi",
    name: "Test Connector",
    baseUrl: "https://edfi.myschool.edu/data/v1",
    credentialRef: "TEST_OAUTH_KEY",
    authMode: "oauth2",
    enabled: true,
    scheduleCron: null,
    fieldMappingJson: null,
    lastSyncAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  let originalFetch: any;

  beforeEach(() => {
    originalFetch = global.fetch;
    TokenLifecycle.clearCache();
    CredentialVault.clearTestCredentials();
    EgressGuard.clearDnsMocks();
    EgressGuard.setDnsMock("edfi.myschool.edu", ["93.184.216.34"]);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    TokenLifecycle.clearCache();
    CredentialVault.clearTestCredentials();
    EgressGuard.clearDnsMocks();
  });

  it("reuses a cached token if not near expiration", async () => {
    TokenLifecycle.setCachedToken("sisc_test_conn", "cached_valid_token", 3600 * 1000);

    const mockFetch = jest.fn();
    global.fetch = mockFetch;
    const token = await TokenLifecycle.getValidToken(dummyConnector);

    expect(token).toBe("cached_valid_token");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("refreshes token when within 60s expiration margin", async () => {
    // Token that expires in 30s (inside 60s refresh margin)
    TokenLifecycle.setCachedToken("sisc_test_conn", "expiring_soon_token", 30 * 1000);

    CredentialVault.setTestCredential(
      "TEST_OAUTH_KEY",
      JSON.stringify({ clientId: "client123", clientSecret: "secret456" })
    );

    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: "refreshed_fresh_token",
        token_type: "Bearer",
        expires_in: 3600,
      }),
    });
    global.fetch = mockFetch;

    const token = await TokenLifecycle.getValidToken(dummyConnector);

    expect(token).toBe("refreshed_fresh_token");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("fails closed on OAuth2 server error (Gate 12)", async () => {
    CredentialVault.setTestCredential(
      "TEST_OAUTH_KEY",
      JSON.stringify({ clientId: "client123", clientSecret: "secret456" })
    );

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => "Invalid client credentials",
    });

    await expect(TokenLifecycle.getValidToken(dummyConnector)).rejects.toThrow(
      /OAuth2 server returned HTTP 401/
    );
  });

  it("fails closed on missing or malformed credentials", async () => {
    // Missing credential in vault
    await expect(TokenLifecycle.getValidToken(dummyConnector)).rejects.toThrow(
      /missing credentials/
    );
  });

  it("correctly derives token endpoint URL based on standard", () => {
    const edfiUrl = TokenLifecycle.resolveTokenUrl(dummyConnector);
    expect(edfiUrl).toBe("https://edfi.myschool.edu/oauth/token");

    const onerosterConnector = {
      ...dummyConnector,
      standard: "oneroster" as const,
      baseUrl: "https://oneroster.myschool.edu/ims/oneroster/v1p2",
    };
    const oneRosterUrl = TokenLifecycle.resolveTokenUrl(onerosterConnector);
    expect(oneRosterUrl).toBe("https://oneroster.myschool.edu/token");
  });
});
