import * as crypto from 'crypto';
import type { DPoPKeyPair, DPoPVerifyResult } from './dpop-types';

const REPLAY_CACHE = new Map<string, number>();
const REPLAY_TTL_MS = 5 * 60 * 1000;

function cleanupCache() {
  const now = Date.now();
  for (const [jti, expiresAt] of REPLAY_CACHE.entries()) {
    if (now > expiresAt) {
      REPLAY_CACHE.delete(jti);
    }
  }
}

/**
 * Computes RFC 7638 SHA-256 JWK thumbprint (base64url encoded)
 */
export async function computeJwkThumbprint(jwk: any): Promise<string> {
  const canonical = JSON.stringify({
    crv: jwk.crv,
    kty: jwk.kty,
    x: jwk.x,
    y: jwk.y,
  });
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('base64url');
}

/**
 * Generates an EC P-256 key pair with RFC 7638 thumbprint
 */
export async function generateDPoPKeyPair(): Promise<DPoPKeyPair> {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const publicJwk = publicKey.export({ format: 'jwk' }) as JsonWebKey;
  const thumbprint = await computeJwkThumbprint(publicJwk);

  return {
    publicKey,
    privateKey,
    publicJwk,
    thumbprint,
  };
}

/**
 * Creates an RFC 9449-compliant DPoP proof JWT
 */
export async function createDPoPProof(privateKey: crypto.KeyObject, htm: string, htu: string): Promise<string> {
  const jti = crypto.randomUUID();
  const iat = Math.floor(Date.now() / 1000);
  const publicJwk = crypto.createPublicKey(privateKey).export({ format: 'jwk' });

  const header = {
    alg: 'ES256',
    typ: 'dpop+jwt',
    jwk: publicJwk,
  };

  const payload = {
    jti,
    htm,
    htu,
    iat,
  };

  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signingInput = `${headerB64}.${payloadB64}`;

  const sign = crypto.createSign('SHA256');
  sign.update(signingInput);
  const signatureB64 = sign.sign({ key: privateKey, dsaEncoding: 'ieee-p1363' }, 'base64url');

  return `${signingInput}.${signatureB64}`;
}

/**
 * Verifies an RFC 9449 DPoP proof JWT
 */
export async function verifyDPoPProof(
  proof: string,
  htm: string,
  htu: string,
  expectedThumbprint?: string,
): Promise<DPoPVerifyResult> {
  try {
    const parts = (proof || '').split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid DPoP proof format' };
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    const headerStr = Buffer.from(headerB64, 'base64url').toString('utf8');
    const header = JSON.parse(headerStr);

    if (header.typ !== 'dpop+jwt') {
      return { valid: false, error: 'Invalid typ in DPoP header' };
    }
    if (header.alg !== 'ES256') {
      return { valid: false, error: 'Invalid alg in DPoP header' };
    }
    if (!header.jwk) {
      return { valid: false, error: 'Missing jwk in DPoP header' };
    }

    const publicJwk = header.jwk;
    const thumbprint = await computeJwkThumbprint(publicJwk);

    if (expectedThumbprint && thumbprint !== expectedThumbprint) {
      return { valid: false, error: 'DPoP thumbprint mismatch' };
    }

    const payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const payload = JSON.parse(payloadStr);

    if (payload.htm !== htm) {
      return { valid: false, error: 'htm mismatch' };
    }
    if (payload.htu !== htu) {
      return { valid: false, error: 'htu mismatch' };
    }
    if (!payload.jti) {
      return { valid: false, error: 'Missing jti' };
    }

    const iat = payload.iat as number;
    if (!iat) {
      return { valid: false, error: 'Missing iat' };
    }

    const now = Math.floor(Date.now() / 1000);
    // 5 minutes expiry window
    if (now - iat > 300 || now < iat - 60) {
      return { valid: false, error: 'Invalid iat / expired' };
    }

    // Signature verification
    const signingInput = `${headerB64}.${payloadB64}`;
    const publicKey = crypto.createPublicKey({ key: publicJwk, format: 'jwk' });
    const verify = crypto.createVerify('SHA256');
    verify.update(signingInput);
    const validSig = verify.verify({ key: publicKey, dsaEncoding: 'ieee-p1363' }, signatureB64, 'base64url');

    if (!validSig) {
      return { valid: false, error: 'Invalid signature' };
    }

    cleanupCache();
    if (REPLAY_CACHE.has(payload.jti)) {
      return { valid: false, error: 'Replayed DPoP proof' };
    }

    REPLAY_CACHE.set(payload.jti, Date.now() + REPLAY_TTL_MS);

    return { valid: true, thumbprint };
  } catch (err: unknown) {
    return { valid: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
