import { createDPoPSession, verifySession } from '../session';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { authConfig } from '../config';

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
  headers: jest.fn()
}));

const mockCookies = {
  set: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
};

describe('DPoP Session', () => {
  beforeEach(() => {
    (cookies as jest.Mock).mockResolvedValue(mockCookies);
    jest.clearAllMocks();
  });

  it('should create a DPoP session with cnf claim and 10 min TTL', async () => {
    const payload = {
      staffId: '123',
      email: 'test@example.com',
      role: 'admin',
      employeeId: 'EMP001',
      name: 'Test',
      tokenVersion: 1
    };

    const token = await createDPoPSession(payload, 'thumbprint123');
    expect(token).toBeDefined();

    expect(mockCookies.set).toHaveBeenCalledWith(
      authConfig.cookieName,
      token,
      expect.objectContaining({ maxAge: 600 })
    );

    const secret = new TextEncoder().encode(authConfig.jwtSecret);
    const { payload: decoded } = await jwtVerify(token, secret);

    expect(decoded.dpopEnabled).toBe(true);
    expect((decoded as any).cnf.jkt).toBe('thumbprint123');
  });
});
