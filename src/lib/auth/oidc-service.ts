import crypto from 'crypto';

export interface OidcProviderConfig {
  id: string;
  tenantId: string;
  name: string;
  clientId: string;
  clientSecret: string;
  issuerUrl: string;
  discoveryUrl: string;
  isActive: boolean;
}

export interface OidcClaims {
  sub: string;
  email: string;
  name?: string;
  roles?: string[];
  tenantId: string;
}

export class OidcService {
  /**
   * Generates PKCE code verifier and code challenge (S256)
   */
  public generatePkce(): { codeVerifier: string; codeChallenge: string } {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    return { codeVerifier, codeChallenge };
  }

  /**
   * Builds OIDC authorization redirect URL with PKCE
   */
  public buildAuthorizationUrl(config: OidcProviderConfig, redirectUri: string, state: string, codeChallenge: string): string {
    const params = new URLSearchParams({
      client_id: config.clientId,
      response_type: 'code',
      scope: 'openid profile email roles',
      redirect_uri: redirectUri,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    return `${config.issuerUrl}/protocol/openid-connect/auth?${params.toString()}`;
  }

  /**
   * Mocks token exchange and claims extraction for OIDC RP validation
   */
  public async processCallback(_config: OidcProviderConfig, code: string, _codeVerifier: string): Promise<OidcClaims> {
    if (!code) {
      throw new Error('Authorization code missing');
    }

    return {
      sub: `oidc-sub-${code.substring(0, 8)}`,
      email: `user-${code.substring(0, 6)}@enterprise-oidc.org`,
      name: 'Enterprise User',
      roles: ['staff'],
      tenantId: _config.tenantId,
    };
  }
}
