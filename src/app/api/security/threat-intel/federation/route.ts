/**
 * Federated Threat Intelligence Sharing API Endpoint
 * Sprint-039 / TIF-012
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { FederationService } from "@/lib/security/threat-intel/federation-service";
import { stixBundleSchema } from "@/lib/validation/threat-intel-schemas";
import crypto from "crypto";

export const GET = requireAuth(
  async (_request: Request) => {
    try {
      const bundle = FederationService.getInstance().exportAnonymizedStixBundle();
      return NextResponse.json(bundle, {
        headers: {
          "Content-Type": "application/vnd.oasis.stix+json;version=2.1",
        },
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return NextResponse.json({ error: "Failed to export threat intelligence bundle", details: msg }, { status: 500 });
    }
  },
  "system:threat-intel:federate"
);

export const POST = requireAuth(
  async (request: Request) => {
    try {
      const rawBody = await request.text();
      const federationSecret = process.env.FEDERATION_SHARED_SECRET;
      const signature = request.headers.get("x-federation-signature");

      // Verify HMAC if federation secret is configured
      if (federationSecret && signature) {
        const expectedSig = crypto.createHmac("sha256", federationSecret).update(rawBody).digest("hex");
        const sigBuf = Buffer.from(signature);
        const expBuf = Buffer.from(expectedSig);
        if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
          return NextResponse.json({ error: "Invalid federation peer signature", code: "INVALID_PEER_SIGNATURE" }, { status: 401 });
        }
      }

      const parsedBody = JSON.parse(rawBody);
      const validation = stixBundleSchema.safeParse(parsedBody);

      if (!validation.success) {
        return NextResponse.json(
          { error: "Invalid STIX 2.1 bundle payload", details: validation.error.format() },
          { status: 400 }
        );
      }

      const peerId = request.headers.get("x-peer-institution-id") || "unspecified-peer";
      const summary = await FederationService.getInstance().ingestFederatedBundle(
        validation.data as any,
        peerId
      );

      return NextResponse.json({
        status: "success",
        peerId,
        summary,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return NextResponse.json({ error: "Failed to ingest federated threat bundle", details: msg }, { status: 400 });
    }
  },
  "system:threat-intel:federate"
);
