export interface SamlIdentityProviderConfig {
  id: string;
  tenantId: string;
  name: string;
  idpEntityId: string;
  ssoUrl: string;
  x509Certificate: string;
  isActive: boolean;
}

export interface SamlAuthnRequestOptions {
  spEntityId: string;
  acsUrl: string;
  requestId: string;
  issueInstant: string;
}

export interface SamlAssertionClaims {
  issuer: string;
  subjectId: string;
  email: string;
  name?: string;
  roles?: string[];
  attributes: Record<string, any>;
  sessionIndex?: string;
}
