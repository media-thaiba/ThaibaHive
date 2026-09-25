import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { neuroStore } from '@/lib/db/neuro-store';
import { DatasetProvenanceEngine } from '@/lib/operations/neuro/provenance/dataset-provenance-engine';
import { ReproducibilityExporter } from '@/lib/operations/neuro/provenance/reproducibility-exporter';
import { datasetRegisterSchema } from '@/lib/validation/neuro-schemas';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, user: any) => {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId') || user?.institutionId || 'global';
  const datasetId = searchParams.get('datasetId');
  const exportDossier = searchParams.get('export') === 'true';

  if (datasetId && exportDossier) {
    const exporter = new ReproducibilityExporter(neuroStore);
    const dossier = await exporter.exportDossier(datasetId, undefined, tenantId);
    if (!dossier) return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
    return NextResponse.json({ dossier });
  }

  const datasets = await neuroStore.listDatasets(tenantId);
  return NextResponse.json({ datasets });
}, 'neuro:provenance:view');

export const POST = requireAuth(async (req: Request, user: any) => {
  try {
    const body = await req.json();
    const parsed = datasetRegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid dataset payload' }, { status: 400 });
    }

    const tenantId = (parsed.data.institutionId !== 'global' ? parsed.data.institutionId : undefined) || user?.institutionId || 'global';
    const provEngine = new DatasetProvenanceEngine(neuroStore);

    const dataset = await provEngine.registerDataset(
      parsed.data as any,
      parsed.data.nsfNihGrantTagged || null,
      tenantId
    );

    return NextResponse.json({ dataset }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'neuro:provenance:manage');
