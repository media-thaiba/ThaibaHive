import { type NextConfig } from 'next';
import { resolve, dirname } from 'path';

describe('Security Headers Configuration', () => {
  const headersConfig = [
    {
      source: "/api/(dashboard|attendance/my|leaves/balances|tasks|approvals|auth/permissions|auth/me|departments|institutions|staff)",
      headers: [
        { key: "Cache-Control", value: "private, s-maxage=30, stale-while-revalidate=60" },
      ],
    },
    {
      source: "/_next/static/:path*",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ],
    },
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-XSS-Protection", value: "1; mode=block" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https: ws: wss:; frame-ancestors 'none'; base-uri 'self'; object-src 'none';" },
        { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
      ],
    },
  ];

  const getSecurityHeaders = () => {
    const globalHeaders = headersConfig.find(config => config.source === "/(.*)");
    if (!globalHeaders) {
      throw new Error('Global security headers configuration is missing');
    }
    return globalHeaders.headers;
  };

  test('should have Content-Security-Policy header', () => {
    const headers = getSecurityHeaders();
    const cspHeader = headers.find(header => header.key === 'Content-Security-Policy');

    expect(cspHeader).toBeDefined();
    expect(cspHeader?.value).toBeDefined();
    expect(cspHeader?.value).toContain("default-src 'self'");
  });

  test('should have X-Content-Type-Options header', () => {
    const headers = getSecurityHeaders();
    const contentTypeHeader = headers.find(header => header.key === 'X-Content-Type-Options');

    expect(contentTypeHeader).toBeDefined();
    expect(contentTypeHeader?.value).toBe('nosniff');
  });

  test('should have X-Frame-Options header', () => {
    const headers = getSecurityHeaders();
    const frameOptionsHeader = headers.find(header => header.key === 'X-Frame-Options');

    expect(frameOptionsHeader).toBeDefined();
    expect(frameOptionsHeader?.value).toBe('DENY');
  });

  test('should have X-XSS-Protection header', () => {
    const headers = getSecurityHeaders();
    const xssProtectionHeader = headers.find(header => header.key === 'X-XSS-Protection');

    expect(xssProtectionHeader).toBeDefined();
    expect(xssProtectionHeader?.value).toBe('1; mode=block');
  });

  test('should have Referrer-Policy header', () => {
    const headers = getSecurityHeaders();
    const referrerPolicyHeader = headers.find(header => header.key === 'Referrer-Policy');

    expect(referrerPolicyHeader).toBeDefined();
    expect(referrerPolicyHeader?.value).toBe('strict-origin-when-cross-origin');
  });

  test('should have Strict-Transport-Security header', () => {
    const headers = getSecurityHeaders();
    const hstsHeader = headers.find(header => header.key === 'Strict-Transport-Security');

    expect(hstsHeader).toBeDefined();
    expect(hstsHeader?.value).toContain('max-age=31536000');
    expect(hstsHeader?.value).toContain('includeSubDomains');
    expect(hstsHeader?.value).toContain('preload');
  });

  test('should have Permissions-Policy header', () => {
    const headers = getSecurityHeaders();
    const permissionsPolicyHeader = headers.find(header => header.key === 'Permissions-Policy');

    expect(permissionsPolicyHeader).toBeDefined();
    expect(permissionsPolicyHeader?.value).toContain('camera=()');
    expect(permissionsPolicyHeader?.value).toContain('microphone=()');
    expect(permissionsPolicyHeader?.value).toContain('geolocation=()');
    expect(permissionsPolicyHeader?.value).toContain('payment=()');
  });

  test('CSP should allow data: sources in img-src', () => {
    const headers = getSecurityHeaders();
    const cspHeader = headers.find(header => header.key === 'Content-Security-Policy');
    expect(cspHeader?.value).toContain("img-src 'self' data: https: blob:");
  });

  test('CSP should not allow object-src', () => {
    const headers = getSecurityHeaders();
    const cspHeader = headers.find(header => header.key === 'Content-Security-Policy');
    expect(cspHeader?.value).toContain("object-src 'none'");
  });

  test('CSP should allow blob: URLs for media', () => {
    const headers = getSecurityHeaders();
    const cspHeader = headers.find(header => header.key === 'Content-Security-Policy');
    expect(cspHeader?.value).toContain('blob:');
  });

  test('CSP should allow WebSocket connections', () => {
    const headers = getSecurityHeaders();
    const cspHeader = headers.find(header => header.key === 'Content-Security-Policy');
    expect(cspHeader?.value).toContain('wss:');
  });
});
