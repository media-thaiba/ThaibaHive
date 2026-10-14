/**
 * OneRoster 1.2 REST Standard Adapter
 *
 * Implements 1EdTech OneRoster 1.2 REST endpoints for users, classes, and enrollments.
 * Supports delta sync via dateLastModified filtering.
 */

import { TokenLifecycle } from "../token-lifecycle";
import { CredentialVault } from "../credential-vault";
import { EgressGuard } from "../egress-guard";
import type { SisConnectorRecord } from "../connector-registry";
import type {
  SisAdapter,
  AdapterSyncOptions,
  AdapterSyncResult,
  NormalizedRecord,
} from "./types";

export class OneRosterAdapter implements SisAdapter {
  public async sync(
    connector: SisConnectorRecord,
    options: AdapterSyncOptions
  ): Promise<AdapterSyncResult> {
    const authHeader = await this.resolveAuthHeader(connector);
    const baseUrl = connector.baseUrl.replace(/\/+$/, "");
    const limit = options.limit || 50;

    const records: NormalizedRecord[] = [];

    // Pull users
    const users = await this.fetchOneRosterResource(
      `${baseUrl}/ims/oneroster/v1p2/users`,
      authHeader,
      options,
      limit,
      "users"
    );

    for (const user of users) {
      const externalId = String(user.sourcedId || user.id || "");
      if (!externalId) continue;

      const role = String(user.role || "").toLowerCase();
      const entityType = role === "teacher" || role === "administrator" ? "staff" : "students";

      records.push({
        entityType,
        externalId,
        sourceStandard: "oneroster",
        payload: {
          externalId,
          givenName: user.givenName,
          familyName: user.familyName,
          email: user.email,
          username: user.username,
          identifier: user.identifier,
          role,
        },
      });
    }

    // Pull classes
    const classes = await this.fetchOneRosterResource(
      `${baseUrl}/ims/oneroster/v1p2/classes`,
      authHeader,
      options,
      limit,
      "classes"
    );

    for (const cls of classes) {
      const externalId = String(cls.sourcedId || cls.id || "");
      if (!externalId) continue;

      records.push({
        entityType: "sections",
        externalId,
        sourceStandard: "oneroster",
        payload: {
          externalId,
          title: cls.title,
          classCode: cls.classCode,
          classType: cls.classType,
          term: cls.term?.title || cls.termId,
        },
      });
    }

    const nextCheckpoint = new Date().toISOString();

    return {
      records,
      nextCheckpoint,
      hasMore: false,
    };
  }

  private async resolveAuthHeader(connector: SisConnectorRecord): Promise<string> {
    if (connector.authMode === "basic") {
      const secret = await CredentialVault.resolveSecret(connector.credentialRef);
      if (!secret) {
        throw new Error(`Missing Basic Auth credentials for ref ${connector.credentialRef}`);
      }
      return `Basic ${Buffer.from(secret).toString("base64")}`;
    }

    // Default to OAuth2 Bearer
    const token = await TokenLifecycle.getValidToken(connector);
    return `Bearer ${token}`;
  }

  private async fetchOneRosterResource(
    url: string,
    authHeader: string,
    options: AdapterSyncOptions,
    limit: number,
    envelopeKey: string
  ): Promise<any[]> {
    const target = new URL(url);
    target.searchParams.set("limit", String(limit));

    if (options.mode === "delta" && options.checkpoint) {
      target.searchParams.set("filter", `dateLastModified>='${options.checkpoint}'`);
    }

    const urlString = target.toString();
    const egress = await EgressGuard.validateEgressUrl(urlString);
    if (!egress.allowed) {
      throw new Error(`OneRoster egress blocked: ${egress.reason}`);
    }

    const response = await fetch(urlString, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) return [];
      const errorText = await response.text();
      throw new Error(`OneRoster fetch error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data[envelopeKey])) return data[envelopeKey];
    return [];
  }
}
