/**
 * PKI Certificate & Key Generator
 * Sprint-041 (ZASM)
 */

import crypto from 'crypto';
import {
  KeyAlgorithm,
  KeySize,
  NamedCurve,
  KeyPairResult,
  CertificateOptions,
  IssuedCertificate,
  CertificateSubject,
} from './pki-types';

export class CertGenerator {
  /**
   * Generates a cryptographic keypair (RSA or ECDSA)
   */
  public static generateKeyPair(
    algorithm: KeyAlgorithm = 'ECDSA',
    options?: { keySize?: KeySize; namedCurve?: NamedCurve }
  ): KeyPairResult {
    let keyPair: { publicKey: string; privateKey: string };

    if (algorithm === 'ECDSA') {
      const curve = options?.namedCurve || 'prime256v1';
      const generated = crypto.generateKeyPairSync('ec', {
        namedCurve: curve,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
      keyPair = { publicKey: generated.publicKey, privateKey: generated.privateKey };
    } else {
      const modulusLength = options?.keySize || 2048;
      const generated = crypto.generateKeyPairSync('rsa', {
        modulusLength,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
      keyPair = { publicKey: generated.publicKey, privateKey: generated.privateKey };
    }

    const keyFingerprint = crypto
      .createHash('sha256')
      .update(keyPair.publicKey)
      .digest('hex');

    return {
      publicKeyPem: keyPair.publicKey,
      privateKeyPem: keyPair.privateKey,
      algorithm,
      keyFingerprint,
    };
  }

  /**
   * Generates a unique serial number for the certificate
   */
  public static generateSerialNumber(): string {
    return crypto.randomBytes(16).toString('hex').toUpperCase();
  }

  /**
   * Formats subject details into a standard string
   */
  public static formatSubject(sub: CertificateSubject): string {
    const parts: string[] = [];
    if (sub.commonName) parts.push(`CN=${sub.commonName}`);
    if (sub.organizationalUnit) parts.push(`OU=${sub.organizationalUnit}`);
    if (sub.organization) parts.push(`O=${sub.organization}`);
    if (sub.locality) parts.push(`L=${sub.locality}`);
    if (sub.stateOrProvince) parts.push(`ST=${sub.stateOrProvince}`);
    if (sub.country) parts.push(`C=${sub.country}`);
    if (sub.emailAddress) parts.push(`EMAIL=${sub.emailAddress}`);
    return parts.join(', ');
  }

  /**
   * Creates a self-contained, cryptographically signed PEM certificate structure
   */
  public static createCertificate(options: CertificateOptions): IssuedCertificate {
    const serialNumber = this.generateSerialNumber();
    const now = new Date();
    const validFrom = now.toISOString();
    const validTo = new Date(now.getTime() + options.validityDays * 24 * 60 * 60 * 1000).toISOString();

    let publicKeyPem = options.publicKeyPem;
    let privateKeyPem: string | undefined;

    if (!publicKeyPem) {
      const generated = this.generateKeyPair(options.keyAlgorithm, {
        keySize: options.keySize,
        namedCurve: options.namedCurve,
      });
      publicKeyPem = generated.publicKeyPem;
      privateKeyPem = generated.privateKeyPem;
    }

    const issuerSubject = options.issuerSubject || options.subject;
    const signingKeyPem = options.issuerPrivateKeyPem || privateKeyPem;

    if (!signingKeyPem) {
      throw new Error('Signing private key is required to issue certificate');
    }

    const sanList = options.sanList || [options.subject.commonName];
    const isCa = options.isCa ?? (options.type === 'ROOT_CA' || options.type === 'INTERMEDIATE_CA');

    // Canonical payload to sign
    const certPayload = JSON.stringify({
      version: 3,
      serialNumber,
      type: options.type,
      isCa,
      subject: options.subject,
      issuer: issuerSubject,
      validFrom,
      validTo,
      sanList,
      publicKeyPem,
    });

    // Create cryptographic signature over the payload
    const sign = crypto.createSign('SHA256');
    sign.update(certPayload);
    sign.end();
    const signature = sign.sign(signingKeyPem, 'base64');

    const certData = {
      payload: certPayload,
      signature,
      signatureAlgorithm: 'SHA256withRSA/ECDSA',
    };

    const encoded = Buffer.from(JSON.stringify(certData)).toString('base64');
    const formattedPem = `-----BEGIN CERTIFICATE-----\n${encoded.match(/.{1,64}/g)?.join('\n') || encoded}\n-----END CERTIFICATE-----`;

    const fingerprintSha256 = crypto
      .createHash('sha256')
      .update(formattedPem)
      .digest('hex');

    return {
      serialNumber,
      certificatePem: formattedPem,
      privateKeyPem,
      publicKeyPem,
      subject: options.subject,
      issuer: issuerSubject,
      fingerprintSha256,
      validFrom,
      validTo,
      sanList,
      type: options.type,
      isCa,
    };
  }

  /**
   * Verifies the cryptographic signature and validity of a certificate
   */
  public static verifyCertificate(
    certPem: string,
    issuerPublicKeyPem: string
  ): { valid: boolean; reason?: string; cert?: IssuedCertificate } {
    try {
      const rawBase64 = certPem
        .replace(/-----BEGIN CERTIFICATE-----/g, '')
        .replace(/-----END CERTIFICATE-----/g, '')
        .replace(/\s+/g, '');

      const parsedJson = JSON.parse(Buffer.from(rawBase64, 'base64').toString('utf8'));
      const { payload, signature } = parsedJson;

      if (!payload || !signature) {
        return { valid: false, reason: 'Malformed certificate payload' };
      }

      const verify = crypto.createVerify('SHA256');
      verify.update(payload);
      verify.end();

      const isSigValid = verify.verify(issuerPublicKeyPem, signature, 'base64');
      if (!isSigValid) {
        return { valid: false, reason: 'Invalid cryptographic signature' };
      }

      const certInfo = JSON.parse(payload);
      const now = new Date();
      const validFrom = new Date(certInfo.validFrom);
      const validTo = new Date(certInfo.validTo);

      if (now < validFrom) {
        return { valid: false, reason: 'Certificate not yet valid' };
      }
      if (now > validTo) {
        return { valid: false, reason: 'Certificate has expired' };
      }

      const fingerprintSha256 = crypto.createHash('sha256').update(certPem).digest('hex');

      return {
        valid: true,
        cert: {
          serialNumber: certInfo.serialNumber,
          certificatePem: certPem,
          publicKeyPem: certInfo.publicKeyPem,
          subject: certInfo.subject,
          issuer: certInfo.issuer,
          fingerprintSha256,
          validFrom: certInfo.validFrom,
          validTo: certInfo.validTo,
          sanList: certInfo.sanList || [],
          type: certInfo.type,
          isCa: certInfo.isCa,
        },
      };
    } catch (err: any) {
      return { valid: false, reason: `Verification error: ${err.message}` };
    }
  }
}
