import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { SupplyDbStore } from '@/lib/db/supply-store';
import { invoiceCreateSchema } from '@/lib/validation/supply-schemas';

export const dynamic = 'force-dynamic';

const store = SupplyDbStore.getInstance();

export const GET = requireAuth(async (req: Request, user: any) => {
  const { searchParams } = new URL(req.url);
  const institutionId = searchParams.get('institutionId') || user?.institutionId || 'global';
  const invoices = await store.listInvoices(institutionId);
  return NextResponse.json({ invoices });
}, 'supply:invoices:match');

export const POST = requireAuth(async (req: Request, user: any) => {
  try {
    const body = await req.json();
    const parsed = invoiceCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid invoice payload' }, { status: 400 });
    }

    const institutionId = (parsed.data.institutionId !== 'global' ? parsed.data.institutionId : undefined) || user?.institutionId || 'global';
    const invoiceId = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const inv = {
      id: invoiceId,
      invoiceNumber: parsed.data.invoiceNumber,
      vendorId: parsed.data.vendorId,
      poId: parsed.data.poId,
      invoiceDate: parsed.data.invoiceDate,
      dueDate: parsed.data.dueDate,
      subtotalUsd: parsed.data.subtotalUsd,
      taxAmountUsd: parsed.data.taxAmountUsd,
      totalAmountUsd: parsed.data.totalAmountUsd,
      currency: parsed.data.currency,
      documentUrl: parsed.data.documentUrl,
      status: 'submitted' as const,
      institutionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await store.createInvoice(inv);
    return NextResponse.json({ invoice: saved }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'supply:invoices:match');
