/**
 * Internal PKI Certificate Authority Engine
 * Sprint-041 (ZASM)
 */

import { CertGenerator } from './cert-generator';
import {
  CaConfig,
  IssuedCertificate,
  CertificateOptions,
  CertificateSubject,
} from './pki-types';

export class CaEngine {
  private static instance: CaEngine | null = null;
  private rootCertificate: IssuedCertificate | null = null;
  private issuedCertificates: Map<string, IssuedCertificate> = new Map();

  private defaultConfig: CaConfig = {
    rootSubject: {
      commonName: 'ThaibaHive Internal Root CA',
      organization: 'ThaibaHive Mesh Security',
      organizationalUnit: 'Security Infrastructure',
      country: 'IN',
      stateOrProvince: 'Kerala',
      locality: 'Malappuram',
    },
    rootValidityDays: 3650, // 10 years
    defaultServiceValidityDays: 90, // 90 days for mTLS zero-trust
    keyAlgorithm: 'ECDSA',
    namedCurve: 'prime256v1',
  };

  private constructor(config?: Partial<CaConfig>) {
    if (config) {
      this.defaultConfig = { ...this.defaultConfig, ...config };
    }
  }

  public static getInstance(config?: Partial<CaConfig>): CaEngine {
    if (!CaEngine.instance) {
      CaEngine.instance = new CaEngine(config);
    }
    return CaEngine.instance;
  }

  public static resetInstance(): void {
    CaEngine.instance = null;
  }

  /**
   * Initializes the internal Root CA certificate and private key
   */
  public initializeRootCa(customSubject?: CertificateSubject): IssuedCertificate {
    if (this.rootCertificate) {
      return this.rootCertificate;
    }

    const subject = customSubject || this.defaultConfig.rootSubject;
    const rootCert = CertGenerator.createCertificate({
      type: 'ROOT_CA',
      subject,
      validityDays: this.defaultConfig.rootValidityDays,
      keyAlgorithm: this.defaultConfig.keyAlgorithm,
      namedCurve: this.defaultConfig.namedCurve,
      keySize: this.defaultConfig.keySize,
      isCa: true,
    });

    this.rootCertificate = rootCert;
    this.issuedCertificates.set(rootCert.serialNumber, rootCert);
    return rootCert;
  }

  /**
   * Retrieves the current Root CA certificate
   */
  public getRootCertificate(): IssuedCertificate {
    if (!this.rootCertificate) {
      return this.initializeRootCa();
    }
    return this.rootCertificate;
  }

  /**
   * Issues a signed service certificate under the internal CA
   */
  public issueServiceCertificate(options: {
    serviceName: string;
    sanList?: string[];
    validityDays?: number;
    customSubject?: Partial<CertificateSubject>;
  }): IssuedCertificate {
    const rootCa = this.getRootCertificate();

    const subject: CertificateSubject = {
      commonName: `${options.serviceName}.mesh.thaiba.internal`,
      organization: rootCa.subject.organization,
      organizationalUnit: 'Inter-Service Mesh',
      ...options.customSubject,
    };

    const sans = options.sanList || [
      `${options.serviceName}.mesh.thaiba.internal`,
      options.serviceName,
      'localhost',
      '127.0.0.1',
    ];

    const cert = CertGenerator.createCertificate({
      type: 'SERVICE_CERT',
      subject,
      issuerSubject: rootCa.subject,
      issuerPrivateKeyPem: rootCa.privateKeyPem,
      issuerCertPem: rootCa.certificatePem,
      sanList: sans,
      validityDays: options.validityDays || this.defaultConfig.defaultServiceValidityDays,
      keyAlgorithm: this.defaultConfig.keyAlgorithm,
      namedCurve: this.defaultConfig.namedCurve,
      isCa: false,
    });

    this.issuedCertificates.set(cert.serialNumber, cert);
    return cert;
  }

  /**
   * Issues a signed client certificate (e.g. for campus endpoints or microservices)
   */
  public issueClientCertificate(options: {
    clientId: string;
    role?: string;
    sanList?: string[];
    validityDays?: number;
  }): IssuedCertificate {
    const rootCa = this.getRootCertificate();

    const subject: CertificateSubject = {
      commonName: `client-${options.clientId}.identity.thaiba.internal`,
      organization: rootCa.subject.organization,
      organizationalUnit: options.role || 'Zero-Trust Client',
    };

    const sans = options.sanList || [
      `client-${options.clientId}.identity.thaiba.internal`,
      options.clientId,
    ];

    const cert = CertGenerator.createCertificate({
      type: 'CLIENT_CERT',
      subject,
      issuerSubject: rootCa.subject,
      issuerPrivateKeyPem: rootCa.privateKeyPem,
      issuerCertPem: rootCa.certificatePem,
      sanList: sans,
      validityDays: options.validityDays || this.defaultConfig.defaultServiceValidityDays,
      keyAlgorithm: this.defaultConfig.keyAlgorithm,
      namedCurve: this.defaultConfig.namedCurve,
      isCa: false,
    });

    this.issuedCertificates.set(cert.serialNumber, cert);
    return cert;
  }

  /**
   * Validates a certificate against the Root CA public key
   */
  public verifyCertificate(certPem: string): { valid: boolean; reason?: string; cert?: IssuedCertificate } {
    const rootCa = this.getRootCertificate();
    return CertGenerator.verifyCertificate(certPem, rootCa.publicKeyPem);
  }

  /**
   * Retrieves an issued certificate by serial number
   */
  public getCertificateBySerial(serialNumber: string): IssuedCertificate | undefined {
    return this.issuedCertificates.get(serialNumber);
  }

  /**
   * Returns all issued certificates
   */
  public listIssuedCertificates(): IssuedCertificate[] {
    return Array.from(this.issuedCertificates.values());
  }
}
