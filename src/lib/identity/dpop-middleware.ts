/**
 * DPoP Verification Middleware with Strict Legacy Token Deprecation
 * Sprint-037 & Sprint-039 / TIF-008 & TIF-017 (TD-012)
 */

import { NextResponse } from 'next/server';
import { verifyDPoPProof } from './dpop-engine';
import { LegacyTokenDeprecationEngine } from './legacy-token-deprecation';
import { GatewayMetricsTracker } from '../security/gateway-metrics';
import { logIdentityEvent } from './identity-audit-events';

export interface WithDPoPOptions {
  required?: boolean;
}

type AnyHandler = (request: Request, ...args: any[]) => Promise<Response>;

function injectHeadersSafely(response: Response, headersToInject: Record<string, string>): Response {
  if (!response || !response.headers) return response;
  try {
    for (const [k, v] of Object.entries(headersToInject)) {
      if (typeof response.headers.set === 'function') {
        response.headers.set(k, v);
      } else if ((response.headers as any)[k] !== undefined) {
        (response.headers as any)[k] = v;
      }
    }
  } catch {
    // Non-blocking header injection
  }
  return response;
}

export function withDPoP(
  handler: AnyHandler,
  options: WithDPoPOptions = { required: true }
) {
  return async (request: Request, ...args: any[]) => {
    const dpopHeader = request.headers.get('dpop');
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
    const { isDPoPToken } = await import('./migration-layer');
    const tokenIsDPoP = token ? isDPoPToken(token) : false;

    // Strict Legacy Token Deprecation Evaluation (TIF-008)
    const deprecationEngine = LegacyTokenDeprecationEngine.getInstance();
    let deprecationHeaders: Record<string, string> = {};

    if (token) {
      const depResult = deprecationEngine.evaluate(token, request.method);
      if (depResult.isRejected) {
        // Increment Prometheus rejection counter (TIF-017)
        GatewayMetricsTracker.getInstance().recordLegacyTokenRejection();

        // Emit audit event
        logIdentityEvent({
          eventType: 'dpop.proof.rejected',
          userId: 'anonymous-or-token-holder',
          riskScore: 85,
          reason: `Legacy non-DPoP Bearer token rejected under ${deprecationEngine.getMode()} mode`,
        }).catch(() => {});

        return NextResponse.json(
          depResult.problemDetails || {
            error: 'Legacy Bearer token rejected under deprecation policy',
          },
          {
            status: 401,
            headers: depResult.headers,
          }
        );
      }
      if (depResult.isLegacy) {
        deprecationHeaders = depResult.headers;

        // Emit audit event for legacy access
        logIdentityEvent({
          eventType: 'migration.token.legacy',
          userId: 'legacy-token-holder',
          riskScore: 20,
          reason: `Legacy non-DPoP token accessed endpoint under ${deprecationEngine.getMode()} mode`,
        }).catch(() => {});
      }
    }

    if (!dpopHeader) {
      if (options.required || tokenIsDPoP) {
        return NextResponse.json({ error: 'DPoP proof required' }, { status: 401 });
      }
      const response = await handler(request, ...args);
      return injectHeadersSafely(response, deprecationHeaders);
    }

    const htm = request.method;
    const htu = request.url.split('?')[0]; // URL without query string for DPoP validation

    const result = await verifyDPoPProof(dpopHeader, htm, htu);

    if (!result.valid) {
      return NextResponse.json({ error: 'DPoP proof invalid' }, { status: 401 });
    }

    // Attach thumbprint via a custom header
    const newHeaders = new Headers(request.headers);
    newHeaders.set('x-dpop-thumbprint', result.thumbprint!);

    const newRequest = new Request(request.url, {
      method: request.method,
      headers: newHeaders,
      body: ['GET', 'HEAD'].includes(request.method) ? null : request.body,
    } as RequestInit & { duplex?: string });

    const response = await handler(newRequest, ...args);
    return injectHeadersSafely(response, deprecationHeaders);
  };
}
