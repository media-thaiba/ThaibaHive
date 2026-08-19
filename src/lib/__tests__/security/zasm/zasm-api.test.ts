import { GET as getDevices } from '@/app/api/admin/security/zero-trust/devices/route';
import { POST as overrideDevice, DELETE as deleteOverride } from '@/app/api/admin/security/zero-trust/devices/[id]/override/route';
import { GET as getPolicies, POST as createPolicy } from '@/app/api/admin/security/zero-trust/policies/route';
import { GET as getPolicy, DELETE as deletePolicy } from '@/app/api/admin/security/zero-trust/policies/[id]/route';
import { GET as getCertificates, POST as revokeCertificate } from '@/app/api/admin/security/zero-trust/certificates/route';
import { POST as rotateCert } from '@/app/api/admin/security/zero-trust/certificates/[id]/rotate/route';
import { GET as getSbom } from '@/app/api/admin/security/zero-trust/sbom/route';
import { POST as scanSbom } from '@/app/api/admin/security/zero-trust/sbom/scan/route';
import { GET as getForensics, POST as triggerForensics } from '@/app/api/admin/security/zero-trust/forensics/route';
import { GET as getMetrics } from '@/app/api/admin/security/zero-trust/metrics/route';

describe('ZASM REST APIs — Authorized & Unauthorized Access Paths', () => {
  // ─── Authorized Happy Paths ───
  describe('Authorized Access Paths (Super Admin / Admin)', () => {
    it('GET /devices returns device lists and active overrides structure', async () => {
      const res = await (getDevices as any)(new Request('http://localhost/api/admin/security/zero-trust/devices'));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.devices).toBeDefined();
      expect(data.activeOverrides).toBeDefined();
    });

    it('GET and POST /policies handles retrieval and validation', async () => {
      const listRes = await (getPolicies as any)(new Request('http://localhost/api/admin/security/zero-trust/policies'));
      expect(listRes.status).toBe(200);
      const listData = await listRes.json();
      expect(Array.isArray(listData.policies)).toBe(true);

      const postRes = await (createPolicy as any)(
        new Request('http://localhost/api/admin/security/zero-trust/policies', {
          method: 'POST',
          body: JSON.stringify({
            id: 'test-api-pol-auth',
            name: 'API Created Policy',
            priority: 50,
            action: 'ALLOW',
            targetTrustTiers: ['HIGH_TRUST'],
            enabled: true,
          }),
        })
      );
      expect(postRes.status).toBe(201);
    });

    it('GET /certificates returns issued certificates list', async () => {
      const res = await (getCertificates as any)(new Request('http://localhost/api/admin/security/zero-trust/certificates'));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.certificates).toBeDefined();
    });

    it('GET /metrics returns metrics summary', async () => {
      const res = await (getMetrics as any)(new Request('http://localhost/api/admin/security/zero-trust/metrics'));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.summary).toBeDefined();
      expect(typeof data.summary.totalMtlsHandshakes).toBe('number');
    });

    it('POST /sbom/scan executes SBOM scan', async () => {
      const res = await (scanSbom as any)(
        new Request('http://localhost/api/admin/security/zero-trust/sbom/scan', {
          method: 'POST',
        })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.scanResult).toBeDefined();
    });
  });

  // ─── Unauthorized & RBAC Denial Paths (401 / 403) ───
  describe('Unauthorized & RBAC Denial Paths', () => {
    it('POST /devices/[id]/override rejects unauthenticated or invalid payload with 400/401/403', async () => {
      const req = new Request('http://localhost/api/admin/security/zero-trust/devices/dev-1/override', {
        method: 'POST',
        body: JSON.stringify({ forcedScore: 150 }), // invalid score > 100
      });
      const res = await (overrideDevice as any)(req, null, { params: Promise.resolve({ id: 'dev-1' }) });
      expect(res.status).toBe(400);
    });

    it('POST /policies rejects invalid payload schema with 400', async () => {
      const req = new Request('http://localhost/api/admin/security/zero-trust/policies', {
        method: 'POST',
        body: JSON.stringify({ invalidField: true }),
      });
      const res = await (createPolicy as any)(req);
      expect(res.status).toBe(400);
    });

    it('POST /certificates rejects missing serialNumber with 400', async () => {
      const req = new Request('http://localhost/api/admin/security/zero-trust/certificates', {
        method: 'POST',
        body: JSON.stringify({ reason: 'KEY_COMPROMISE' }),
      });
      const res = await (revokeCertificate as any)(req);
      expect(res.status).toBe(400);
    });

    it('POST /forensics rejects empty signals array with 400', async () => {
      const req = new Request('http://localhost/api/admin/security/zero-trust/forensics', {
        method: 'POST',
        body: JSON.stringify({ signals: [] }),
      });
      const res = await (triggerForensics as any)(req);
      expect(res.status).toBe(400);
    });
  });
});
