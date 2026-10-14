/**
 * SIS Credential Vault & DTO Masking Service
 *
 * Implements reference-based credential resolution. Secrets are never stored in plaintext
 * in the database; connectors store only a credential reference (env or vault key name).
 * Responses are masked with DTO transformations (hasCredential + ***-ref).
 */

const inMemoryTestVault = new Map<string, string>();

export class CredentialVault {
  /**
   * Resolves a secret from a credential reference key.
   * Checks the in-memory test vault first, then process.env.
   */
  public static async resolveCredential(credentialRef: string): Promise<string | null> {
    if (!credentialRef) return null;

    if (inMemoryTestVault.has(credentialRef)) {
      return inMemoryTestVault.get(credentialRef) ?? null;
    }

    const envValue = process.env[credentialRef];
    if (envValue && envValue.trim().length > 0) {
      return envValue.trim();
    }

    return null;
  }

  /**
   * Alias for resolveCredential.
   */
  public static async resolveSecret(credentialRef: string): Promise<string | null> {
    return this.resolveCredential(credentialRef);
  }

  /**
   * Masks a credential reference key for API DTO responses.
   * Returns a redacted string such as '***-ref' or '***-KEY'.
   */
  public static maskCredentialRef(credentialRef: string): string {
    if (!credentialRef || credentialRef.length <= 4) {
      return "***-ref";
    }
    const suffix = credentialRef.slice(-4);
    return `***-${suffix}`;
  }

  /**
   * Checks whether a credential reference has an active underlying secret.
   */
  public static async hasCredential(credentialRef: string): Promise<boolean> {
    const secret = await this.resolveCredential(credentialRef);
    return secret !== null && secret.length > 0;
  }

  /**
   * Transforms a database connector record into a secure DTO with masked credentials.
   * Never transmits the raw credentialRef or plaintext secret to clients.
   */
  public static async toMaskedConnectorDto<T extends { credentialRef: string }>(
    connector: T
  ): Promise<Omit<T, "credentialRef"> & { credentialRefMasked: string; hasCredential: boolean }> {
    const hasCred = await this.hasCredential(connector.credentialRef);
    const maskedRef = this.maskCredentialRef(connector.credentialRef);

    const { credentialRef: _rawRef, ...rest } = connector;
    return {
      ...rest,
      credentialRefMasked: maskedRef,
      hasCredential: hasCred,
    };
  }

  /**
   * Test helper to register or clear in-memory test secrets.
   */
  public static setTestCredential(key: string, secret: string | null): void {
    if (secret === null) {
      inMemoryTestVault.delete(key);
    } else {
      inMemoryTestVault.set(key, secret);
    }
  }

  /**
   * Clears all in-memory test secrets.
   */
  public static clearTestCredentials(): void {
    inMemoryTestVault.clear();
  }
}
