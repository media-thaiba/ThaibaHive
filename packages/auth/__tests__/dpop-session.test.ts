import { createDPoPSession, verifySession } from '../session';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { authConfig } from '../config';
import { db, staff, userSessions } from '@thaiba/db';
import { eq } from 'drizzle-orm';

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
  beforeAll(async () => {
    await db.delete(staff).where(eq(staff.employeeId, 'EMP_DPOP_123')).run().catch(() => {});
    await db.delete(staff).where(eq(staff.id, '123')).run().catch(() => {});
    await db.insert(staff).values({
      id: '123',
      email: 'dpop_test@example.com',
      employeeId: 'EMP_DPOP_123',
      firstName: 'Test',
      lastName: 'User',
      role: 'admin',
      isActive: true,
      tokenVersion: 1,
    }).run();
  });

  afterAll(async () => {
    try {
      await db.delete(userSessions).where(eq(userSessions.staffId, '123')).run();
      await db.delete(staff).where(eq(staff.id, '123')).run();
    } catch {}
  });

  beforeEach(() => {
    (cookies as jest.Mock).mockResolvedValue(mockCookies);
    jest.clearAllMocks();
  });

  it('should create a DPoP session with cnf claim and 10 min TTL', async () => {
    const payload = {
      staffId: '123',
      email: 'dpop_test@example.com',
      role: 'admin',
      employeeId: 'EMP_DPOP_123',
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
    expect((decoded as { cnf?: { jkt?: string } }).cnf?.jkt).toBe('thumbprint123');
  });

  it('should reject a DPoP-bound token when presented to verifySession() as an ambient bearer/cookie', async () => {
    const payload = {
      staffId: '123',
      email: 'dpop_test@example.com',
      role: 'admin',
      employeeId: 'EMP_DPOP_123',
      name: 'Test',
      tokenVersion: 1
    };

    const token = await createDPoPSession(payload, 'thumbprint123');
    mockCookies.get.mockReturnValue({ value: token });

    const session = await verifySession();
    expect(session).toBeNull();
  });
});
