"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const DB_NAME = "thaibahive_identity";
const STORE_NAME = "dpop_keys";
const KEY_ID = "current_session_key";
const KEY_ROTATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface KeyRecord {
  id: string;
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  publicJwk: JsonWebKey;
  createdAt: number;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      return reject(new Error("IndexedDB unavailable"));
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getStoredKey(db: IDBDatabase): Promise<KeyRecord | null> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(KEY_ID);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function saveKey(db: IDBDatabase, record: KeyRecord): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function generateNonExtractableKeyPair(): Promise<{
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  publicJwk: JsonWebKey;
  createdAt: number;
}> {
  // Generate non-extractable private key (extractable: false)
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    false, // non-extractable private key
    ["sign"],
  );

  // Export only the public key
  const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);

  return {
    privateKey: keyPair.privateKey,
    publicKey: keyPair.publicKey,
    publicJwk,
    createdAt: Date.now(),
  };
}

async function loadOrGenerateKeyPair(): Promise<KeyRecord> {
  try {
    const db = await openDatabase();
    const existing = await getStoredKey(db);
    if (existing && Date.now() - existing.createdAt < KEY_ROTATION_MS) {
      return existing;
    }

    const generated = await generateNonExtractableKeyPair();
    const record: KeyRecord = {
      id: KEY_ID,
      ...generated,
    };
    await saveKey(db, record);
    return record;
  } catch {
    // In-memory fallback if IndexedDB is not supported or restricted
    const generated = await generateNonExtractableKeyPair();
    return {
      id: KEY_ID,
      ...generated,
    };
  }
}

async function buildDPoPProof(
  privateKey: CryptoKey,
  publicJwk: JsonWebKey,
  htm: string,
  htu: string,
): Promise<string> {
  const jti = crypto.randomUUID();
  const iat = Math.floor(Date.now() / 1000);

  const header = { alg: "ES256", typ: "dpop+jwt", jwk: publicJwk };
  const payload = { jti, htm, htu, iat };

  const encode = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

  const headerB64 = encode(header);
  const payloadB64 = encode(payload);
  const signingInput = `${headerB64}.${payloadB64}`;

  // Sign directly with non-extractable CryptoKey
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    new TextEncoder().encode(signingInput),
  );

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  return `${signingInput}.${sigB64}`;
}

export interface UseDPoPReturn {
  isReady: boolean;
  getPublicKeyJwk: () => JsonWebKey | null;
  /** Generates a fresh DPoP proof for the given HTTP method and URL. */
  attachDPoP: (url: string, method: string) => Promise<string | null>;
}

/**
 * Browser-side DPoP key manager.
 * Stores non-extractable P-256 ECDSA CryptoKey in IndexedDB.
 * Rotates automatically every 30 days.
 * SSR-safe: returns isReady=false until mounted.
 */
export function useDPoP(): UseDPoPReturn {
  const keyRecordRef = useRef<KeyRecord | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    loadOrGenerateKeyPair()
      .then((record) => {
        keyRecordRef.current = record;
        setIsReady(true);
      })
      .catch(() => {
        // Non-fatal — DPoP remains disabled for this session
      });
  }, []);

  const getPublicKeyJwk = useCallback((): JsonWebKey | null => {
    return keyRecordRef.current?.publicJwk ?? null;
  }, []);

  const attachDPoP = useCallback(async (url: string, method: string): Promise<string | null> => {
    const record = keyRecordRef.current;
    if (!record) return null;
    try {
      return await buildDPoPProof(record.privateKey, record.publicJwk, method.toUpperCase(), url.split("?")[0]);
    } catch {
      return null;
    }
  }, []);

  return { isReady, getPublicKeyJwk, attachDPoP };
}
