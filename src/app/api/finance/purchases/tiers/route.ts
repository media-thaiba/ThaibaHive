import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { purchaseApprovalTierCreateSchema } from "@/lib/validation/schemas";
import { purchaseApprovalEngine } from "@/lib/finance/purchases/purchase-approval-engine";
import { resolveScopedInstitutionId } from "@/lib/finance/institution-context";

export const GET = requireAuth(async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url);
    const institutionId = await resolveScopedInstitutionId(searchParams.get("institutionId"));

    const tiers = await purchaseApprovalEngine.getTiers(institutionId);
    return NextResponse.json({ tiers });
  } catch (error: any) {
    const status = error.message?.includes("scope mismatch") ? 403 : 500;
    return NextResponse.json({ error: error.message || "Failed to fetch purchase tiers" }, { status });
  }
}, "finance:purchases:create");

export const POST = requireAuth(async (request: Request) => {
  try {
    const body = await request.json();
    const parsed = purchaseApprovalTierCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
    }

    const institutionId = await resolveScopedInstitutionId(parsed.data.institutionId);
    const tier = await purchaseApprovalEngine.createTier({ ...parsed.data, institutionId });
    return NextResponse.json({ tier }, { status: 201 });
  } catch (error: any) {
    const status = error.message?.includes("scope mismatch") ? 403 : 500;
    return NextResponse.json({ error: error.message || "Failed to create purchase tier" }, { status });
  }
}, "finance:purchases:approve:final");
