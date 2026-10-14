/**
 * SIS Token Lifecycle Engine
 *
 * Manages TTL-aware OAuth2 token retrieval, caching, and refresh for SIS connectors.
 * Enforces fail-closed token resolution: on refresh failure or network error, it never
 * returns a stale/expired token.
 */

import { CredentialVault } from "./credential-vault";
import { EgressGuard } from "./egress-guard";
import type { SisConnectorRecord } from "./connector-registry";

export interface CachedTokenEntry {
  accessToken: string;
  tokenType: string;
  expiresAt: number; // Unix timestamp in ms
}

export class TokenLifecycle {
  private static tokenCache = new Map<string, CachedTokenEntry>();
  private static refreshMarginMs = 60 * 1000; // Refresh 60s before expiry

  /**
   * Clears the cached tokens (useful for testing).
   */
  public static clearCache(): void {
    this.tokenCache.clear();
  }

  /**
   * Sets a mock token directly for testing.
   */
  public static setCachedToken(
    connectorId: string,
    token: string,
    expiresInMs: number
  ): void {
    this.tokenCache.set(connectorId, {
      accessToken: token,
      tokenType: "Bearer",
      expiresAt: Date.now() + expiresInMs,
    });
  }

  /**
   * Resolves a valid OAuth2 Bearer token for a given SIS connector.
   * If a cached token is still valid (outside the 60s margin), it is reused.
   * Otherwise, requests a fresh token using client credentials.
   * Fails closed if credential resolution or token exchange fails.
   */
  public static async getValidToken(
    connector: SisConnectorRecord
  ): Promise<string> {
    const now = Date.now();
    const cached = this.tokenCache.get(connector.id);

    if (cached && cached.expiresAt - now > this.refreshMarginMs) {
      return cached.accessToken;
    }

    // Must fetch or refresh token using connector's credentialRef
    const secret = await CredentialVault.resolveSecret(connector.credentialRef);
    if (!secret) {
      throw new Error(
        `OAuth2 token refresh failed: missing credentials for ref ${connector.credentialRef}`
      );
    }

    let clientId = "";
    let clientSecret = "";

    try {
      const parsed = JSON.parse(secret);
      clientId = parsed.clientId || parsed.client_id || "";
      clientSecret = parsed.clientSecret || parsed.client_secret || "";
    } catch {
      if (secret.includes(":")) {
        const parts = secret.split(":");
        clientId = parts[0];
        clientSecret = parts.slice(1).join(":");
      } else {
        clientId = connector.credentialRef;
        clientSecret = secret;
      }
    }

    if (!clientId || !clientSecret) {
      throw new Error(
        `OAuth2 token refresh failed: malformed credentials for ref ${connector.credentialRef}`
      );
    }

    const tokenUrl = this.resolveTokenUrl(connector);

    // SSRF validation on token endpoint
    const egressCheck = await EgressGuard.validateEgressUrl(tokenUrl);
    if (!egressCheck.allowed) {
      throw new Error(
        `OAuth2 token request blocked by egress guard: ${egressCheck.reason}`
      );
    }

    try {
      const params = new URLSearchParams();
      params.append("grant_type", "client_credentials");
      params.append("client_id", clientId);
      params.append("client_secret", clientSecret);

      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `OAuth2 server returned HTTP ${response.status}: ${errorText}`
        );
      }

      const data = await response.json();
      if (!data || !data.access_token) {
        throw new Error("OAuth2 response missing access_token");
      }

      const expiresInSec = typeof data.expires_in === "number" ? data.expires_in : 3600;
      const expiresAt = Date.now() + expiresInSec * 1000;

      this.tokenCache.set(connector.id, {
        accessToken: data.access_token,
        tokenType: data.token_type || "Bearer",
        expiresAt,
      });

      return data.access_token;
    } catch (err: any) {
      // Invalidate any expired entry on failure so next attempt won't use it
      this.tokenCache.delete(connector.id);
      throw new Error(
        `OAuth2 token exchange failed for connector ${connector.id}: ${err.message}`
      );
    }
  }

  /**
   * Derives token endpoint URL based on standard and baseUrl.
   */
  public static resolveTokenUrl(connector: SisConnectorRecord): string {
    const base = connector.baseUrl.replace(/\/+$/, "");

    if (connector.standard === "edfi") {
      // Ed-Fi convention: baseUrl often has /data/v1/ed-fi or similar
      const root = base.replace(/\/data\/v1.*$/i, "");
      return `${root}/oauth/token`;
    }

    if (connector.standard === "oneroster") {
      const root = base.replace(/\/ims\/oneroster.*$/i, "");
      return `${root}/token`;
    }

    return `${base}/oauth/token`;
  }
}
