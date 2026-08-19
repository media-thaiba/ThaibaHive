/**
 * mTLS Client Transport Adapter
 * Sprint-041 (ZASM)
 */

import { IssuedCertificate } from '../pki/pki-types';
import { MtlsAuthenticator, MtlsAuthResult } from './mtls-authenticator';

export interface MtlsRequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  targetService?: string;
}

export class MtlsClient {
  private clientCertificate: IssuedCertificate;
  private authenticator: MtlsAuthenticator;

  constructor(clientCertificate: IssuedCertificate, authenticator?: MtlsAuthenticator) {
    this.clientCertificate = clientCertificate;
    this.authenticator = authenticator || new MtlsAuthenticator();
  }

  /**
   * Prepares mTLS headers for an outgoing inter-service request
   */
  public prepareHeaders(existingHeaders: Record<string, string> = {}): Record<string, string> {
    return {
      ...existingHeaders,
      'x-mtls-client-cert': Buffer.from(this.clientCertificate.certificatePem).toString('base64'),
      'x-mtls-client-serial': this.clientCertificate.serialNumber,
      'x-mtls-client-fingerprint': this.clientCertificate.fingerprintSha256,
      'x-mtls-service-name': this.clientCertificate.subject.commonName,
    };
  }

  /**
   * Executes a simulated or direct authenticated inter-service dispatch
   */
  public async dispatch(options: MtlsRequestOptions): Promise<{
    status: number;
    data: any;
    auth: MtlsAuthResult;
  }> {
    // Authenticate the client certificate on dispatch
    const auth = this.authenticator.authenticateRequest({
      clientCertPem: this.clientCertificate.certificatePem,
      targetService: options.targetService,
    });

    if (!auth.authenticated) {
      return {
        status: auth.statusCode,
        data: { error: auth.reason },
        auth,
      };
    }

    return {
      status: 200,
      data: {
        success: true,
        dispatchedTo: options.url,
        service: auth.identity?.serviceName,
        payload: options.body,
      },
      auth,
    };
  }
}
