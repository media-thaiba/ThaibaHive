import { generateDPoPKeyPair, createDPoPProof, verifyDPoPProof, computeJwkThumbprint } from '../../identity/dpop-engine';
import * as crypto from 'crypto';

describe('DPoP Engine', () => {
  it('should generate a valid key pair', async () => {
    const keyPair = await generateDPoPKeyPair();
    expect(keyPair.publicKey).toBeDefined();
    expect(keyPair.privateKey).toBeDefined();
    expect(keyPair.publicJwk).toBeDefined();
    expect(keyPair.thumbprint).toBeDefined();
  });

  it('should create and verify a DPoP proof', async () => {
    const keyPair = await generateDPoPKeyPair();
    const htm = 'POST';
    const htu = 'https://api.example.com/login';
    
    const proof = await createDPoPProof(keyPair.privateKey, htm, htu);
    expect(typeof proof).toBe('string');
    
    const result = await verifyDPoPProof(proof, htm, htu, keyPair.thumbprint);
    expect(result.valid).toBe(true);
    expect(result.thumbprint).toBe(keyPair.thumbprint);
  });

  it('should reject invalid htm/htu', async () => {
    const keyPair = await generateDPoPKeyPair();
    const proof = await createDPoPProof(keyPair.privateKey, 'POST', 'https://api.example.com/login');
    
    const result = await verifyDPoPProof(proof, 'GET', 'https://api.example.com/login');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('htm mismatch');
  });

  it('should reject replay attacks', async () => {
    const keyPair = await generateDPoPKeyPair();
    const proof = await createDPoPProof(keyPair.privateKey, 'POST', 'https://api.example.com/login');
    
    const result1 = await verifyDPoPProof(proof, 'POST', 'https://api.example.com/login');
    expect(result1.valid).toBe(true);
    
    const result2 = await verifyDPoPProof(proof, 'POST', 'https://api.example.com/login');
    expect(result2.valid).toBe(false);
    expect(result2.error).toContain('Replayed');
  });
});
