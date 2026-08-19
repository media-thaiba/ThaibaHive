/**
 * AWS Signature Version 4 (SigV4) Cryptographic Request Signer
 * Sprint-039 / TIF-004 (TD-015)
 */

import crypto from "crypto";

export interface AwsSigV4Credentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  region: string;
  service?: string;
}

export interface SigV4RequestOptions {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  datetime?: Date;
}

export interface SignedRequestHeaders {
  [header: string]: string;
  Authorization: string;
  "x-amz-date": string;
  "x-amz-content-sha256": string;
}

export class AwsSigV4Signer {
  private credentials: AwsSigV4Credentials;
  private service: string;
  private region: string;

  constructor(credentials?: Partial<AwsSigV4Credentials>) {
    this.region = credentials?.region || process.env.AWS_REGION || "us-east-1";
    this.service = credentials?.service || "wafv2";
    this.credentials = {
      accessKeyId: credentials?.accessKeyId || process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: credentials?.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY || "",
      sessionToken: credentials?.sessionToken || process.env.AWS_SESSION_TOKEN,
      region: this.region,
      service: this.service,
    };
  }

  public hasCredentials(): boolean {
    return Boolean(this.credentials.accessKeyId && this.credentials.secretAccessKey);
  }

  private hmac(key: Buffer | string, data: string): Buffer {
    return crypto.createHmac("sha256", key).update(data, "utf8").digest();
  }

  private sha256(data: string | Buffer): string {
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  private getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string): Buffer {
    const kDate = this.hmac("AWS4" + key, dateStamp);
    const kRegion = this.hmac(kDate, regionName);
    const kService = this.hmac(kRegion, serviceName);
    const kSigning = this.hmac(kService, "aws4_request");
    return kSigning;
  }

  /**
   * Signs an HTTP request according to AWS SigV4 specification.
   */
  public sign(options: SigV4RequestOptions): SignedRequestHeaders {
    const now = options.datetime || new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.substring(0, 8);

    const parsedUrl = new URL(options.url);
    const host = parsedUrl.host;
    const canonicalUri = parsedUrl.pathname || "/";
    const canonicalQuerystring = Array.from(parsedUrl.searchParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");

    const payload = options.body || "";
    const payloadHash = this.sha256(payload);

    // Prepare headers
    const rawHeaders: Record<string, string> = {
      host,
      "x-amz-date": amzDate,
      "x-amz-content-sha256": payloadHash,
      ...(options.headers || {}),
    };

    if (this.credentials.sessionToken) {
      rawHeaders["x-amz-security-token"] = this.credentials.sessionToken;
    }

    // Lowercase header keys and sort
    const canonicalHeadersMap: Record<string, string> = {};
    for (const [k, v] of Object.entries(rawHeaders)) {
      canonicalHeadersMap[k.toLowerCase()] = v.trim().replace(/\s+/g, " ");
    }

    const sortedHeaderKeys = Object.keys(canonicalHeadersMap).sort();
    const canonicalHeaders = sortedHeaderKeys
      .map((k) => `${k}:${canonicalHeadersMap[k]}\n`)
      .join("");
    const signedHeaders = sortedHeaderKeys.join(";");

    // Canonical Request
    const canonicalRequest = [
      options.method.toUpperCase(),
      canonicalUri,
      canonicalQuerystring,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const hashedCanonicalRequest = this.sha256(canonicalRequest);

    // String to Sign
    const credentialScope = `${dateStamp}/${this.region}/${this.service}/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      hashedCanonicalRequest,
    ].join("\n");

    // Signing key & signature
    const signingKey = this.getSignatureKey(
      this.credentials.secretAccessKey,
      dateStamp,
      this.region,
      this.service
    );
    const signature = this.hmac(signingKey, stringToSign).toString("hex");

    const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${this.credentials.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const resultHeaders: Record<string, string> = {
      ...rawHeaders,
      Authorization: authorizationHeader,
      "x-amz-date": amzDate,
      "x-amz-content-sha256": payloadHash,
    };

    return resultHeaders as SignedRequestHeaders;
  }
}
