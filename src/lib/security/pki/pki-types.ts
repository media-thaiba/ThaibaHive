/**
 * Internal PKI & Certificate Authority Type Definitions
 * Sprint-041 (ZASM)
 */

export type KeyAlgorithm = 'RSA' | 'ECDSA';
export type KeySize = 2048 | 4096;
export type NamedCurve = 'prime256v1' | 'secp384r1';

export type CertificateType = 'ROOT_CA' | 'INTERMEDIATE_CA' | 'SERVICE_CERT' | 'CLIENT_CERT';

export interface KeyPairResult {
  publicKeyPem: string;
  privateKeyPem: string;
  algorithm: KeyAlgorithm;
  keyFingerprint: string;
}

export interface CertificateSubject {
  commonName: string;
  organization?: string;
  organizationalUnit?: string;
  country?: string;
  stateOrProvince?: string;
  locality?: string;
  emailAddress?: string;
}

export interface CertificateOptions {
  type: CertificateType;
  subject: CertificateSubject;
  issuerSubject?: CertificateSubject;
  issuerPrivateKeyPem?: string;
  issuerCertPem?: string;
  publicKeyPem?: string;
  sanList?: string[]; // Subject Alternative Names (DNS or IP)
  validityDays: number;
  keyAlgorithm?: KeyAlgorithm;
  keySize?: KeySize;
  namedCurve?: NamedCurve;
  isCa?: boolean;
  maxPathLen?: number;
}

export interface IssuedCertificate {
  serialNumber: string;
  certificatePem: string;
  privateKeyPem?: string;
  publicKeyPem: string;
  subject: CertificateSubject;
  issuer: CertificateSubject;
  fingerprintSha256: string;
  validFrom: string; // ISO string
  validTo: string;   // ISO string
  sanList: string[];
  type: CertificateType;
  isCa: boolean;
}

export interface RevocationRecord {
  serialNumber: string;
  revokedAt: string; // ISO string
  reason: 'KEY_COMPROMISE' | 'CA_COMPROMISE' | 'AFFILIATION_CHANGED' | 'SUPERSEDED' | 'CESSATION_OF_OPERATION' | 'UNSPECIFIED';
  revokedBy: string;
}

export interface CaConfig {
  rootSubject: CertificateSubject;
  rootValidityDays: number;
  defaultServiceValidityDays: number;
  keyAlgorithm?: KeyAlgorithm;
  keySize?: KeySize;
  namedCurve?: NamedCurve;
}
