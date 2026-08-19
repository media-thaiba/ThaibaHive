export interface DPoPKeyPair {
  publicKey: import('crypto').KeyObject;
  privateKey: import('crypto').KeyObject;
  publicJwk: JsonWebKey;
  thumbprint: string;
}

export interface DPoPProof {
  jti: string;
  htm: string;
  htu: string;
  iat: number;
}

export interface DPoPVerifyResult {
  valid: boolean;
  thumbprint?: string;
  error?: string;
}

export interface DPoPReplayCache {
  has(jti: string): boolean;
  set(jti: string, expiresAt: number): void;
}
