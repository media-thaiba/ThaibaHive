import { withDPoP } from '../../identity/dpop-middleware';
import { generateDPoPKeyPair, createDPoPProof } from '../../identity/dpop-engine';
import { LegacyTokenDeprecationEngine } from '../../identity/legacy-token-deprecation';
import { SignJWT } from 'jose';

describe('DPoP Middleware (TIF-008)', () => {
  let secretKey: Uint8Array;

  beforeAll(() => {
    secretKey = new TextEncoder().encode('test-secret-32-chars-key-123456!');
  });

  beforeEach(() => {
    LegacyTokenDeprecationEngine.getInstance().setMode('WARN');
  });

  it('should reject requests without DPoP header if required', async () => {
    const handler = jest.fn();
    const middleware = withDPoP(handler);

    const request = new Request('https://api.example.com/test', { method: 'POST' });
    const response = await middleware(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('DPoP proof required');
    expect(handler).not.toHaveBeenCalled();
  });

  it('should allow requests without DPoP header if not required', async () => {
    const handler = jest.fn().mockResolvedValue(new Response('OK'));
    const middleware = withDPoP(handler, { required: false });

    const request = new Request('https://api.example.com/test', { method: 'POST' });
    const response = await middleware(request);

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalled();
  });

  it('should accept valid DPoP header and attach thumbprint', async () => {
    const handler = jest.fn().mockImplementation((req: Request) => {
      expect(req.headers.get('x-dpop-thumbprint')).toBeDefined();
      return new Response('OK');
    });

    const middleware = withDPoP(handler);
    const keyPair = await generateDPoPKeyPair();
    const proof = await createDPoPProof(keyPair.privateKey, 'POST', 'https://api.example.com/test');

    const request = new Request('https://api.example.com/test', {
      method: 'POST',
      headers: {
        dpop: proof,
      },
    });

    const response = await middleware(request);
    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalled();
  });

  it('should reject legacy tokens in STRICT deprecation mode', async () => {
    LegacyTokenDeprecationEngine.getInstance().setMode('STRICT');

    const legacyToken = await new SignJWT({ sub: 'user-1' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(secretKey);

    const handler = jest.fn().mockResolvedValue(new Response('OK'));
    const middleware = withDPoP(handler, { required: false });

    const request = new Request('https://api.example.com/test', {
      method: 'GET',
      headers: {
        authorization: `Bearer ${legacyToken}`,
      },
    });

    const response = await middleware(request);
    expect(response.status).toBe(401);
    expect(response.headers.get('Deprecation')).toBeDefined();
    expect(response.headers.get('Sunset')).toBeDefined();
  });
});
