import crypto from "crypto";

// Default ephemeral keypair for standard execution / testing if COMPLIANCE_SIGNING_KEY is not set
let cachedKeyPair: { publicKey: string; privateKey: string } | null = null;

export function getSigningKeyPair(): { publicKey: string; privateKey: string } {
  if (process.env.COMPLIANCE_PRIVATE_KEY && process.env.COMPLIANCE_PUBLIC_KEY) {
    return {
      privateKey: process.env.COMPLIANCE_PRIVATE_KEY,
      publicKey: process.env.COMPLIANCE_PUBLIC_KEY,
    };
  }

  if (!cachedKeyPair) {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    cachedKeyPair = { publicKey, privateKey };
  }

  return cachedKeyPair;
}

/**
 * Computes canonical SHA-256 checksum over any JSON-serializable object
 */
export function computeCanonicalChecksum(data: any): string {
  const canonicalize = (obj: any): any => {
    if (obj === null || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(canonicalize);
    const sortedKeys = Object.keys(obj).sort();
    const result: Record<string, any> = {};
    for (const key of sortedKeys) {
      result[key] = canonicalize(obj[key]);
    }
    return result;
  };

  const canonicalJson = JSON.stringify(canonicalize(data));
  return crypto.createHash("sha256").update(canonicalJson, "utf8").digest("hex");
}

/**
 * Cryptographically signs raw text or canonical JSON using RSA-SHA256
 */
export function signSnapshotData(data: string, privateKeyPem?: string): { signature: string; publicKey: string } {
  const keyPair = getSigningKeyPair();
  const privKey = privateKeyPem || keyPair.privateKey;
  const pubKey = keyPair.publicKey;

  const signer = crypto.createSign("SHA256");
  signer.update(data);
  signer.end();

  const signature = signer.sign(privKey, "base64");
  return { signature, publicKey: pubKey };
}

/**
 * Cryptographically verifies RSA-SHA256 signature over data
 */
export function verifySnapshotSignature(data: string, signature: string, publicKeyPem: string): boolean {
  try {
    const verifier = crypto.createVerify("SHA256");
    verifier.update(data);
    verifier.end();
    return verifier.verify(publicKeyPem, signature, "base64");
  } catch (err) {
    console.warn("[@thaiba/compliance] Signature verification failed with error:", err);
    return false;
  }
}
