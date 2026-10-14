export interface SamlIdentityProviderConfig {
  id: string;
  institutionId: string;
  name: string;
  entityId: string;
  idpEntityId?: string;
  ssoUrl: string;
  x509Certificate: string;
  certExpiresAt?: string | null;
  binding?: string; // HTTP-POST | HTTP-Redirect
  wantAssertionsSigned?: boolean;
  attributeMappingJson?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SamlAuthnRequestOptions {
  spEntityId: string;
  acsUrl: string;
  requestId: string;
  issueInstant: string;
  relayState?: string;
}

export interface SamlAssertionClaims {
  issuer: string;
  subjectId: string;
  email: string;
  name?: string;
  roles?: string[];
  attributes: Record<string, any>;
  sessionIndex?: string;
  assertionId: string;
  issueInstant: string;
}

export interface SamlValidationOptions {
  allowedClockSkewSeconds?: number;
  checkReplay?: boolean;
  enforceSignature?: boolean;
}
