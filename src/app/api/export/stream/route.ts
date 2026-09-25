import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { exportStreamSchema } from '@/lib/validation/docgen-schemas';
import { UniversalExportEngine } from '@/lib/operations/docgen/export/universal-export-engine';

export const POST = requireAuth(async (request) => {
  try {
    const body = await request.json();
    const parsed = exportStreamSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }

    const engine = UniversalExportEngine.getInstance();
    const result = await engine.exportDataset({
      institutionId: parsed.data.institutionId,
      jobType: parsed.data.jobType,
      format: parsed.data.format,
      columns: parsed.data.columns,
      filterParams: parsed.data.filterParams,
      data: parsed.data.data,
    });

    const bodyPayload = typeof result.content === 'string'
      ? result.content
      : new Uint8Array(result.content);

    return new Response(bodyPayload, {
      status: 200,
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${result.fileName}"`,
        'X-Record-Count': String(result.recordCount),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Streaming export failed' }, { status: 500 });
  }
}, 'exports:create');
