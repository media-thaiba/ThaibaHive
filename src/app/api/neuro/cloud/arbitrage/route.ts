import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { SpotPriceAggregator } from '@/lib/operations/neuro/cloud/spot-price-aggregator';
import { CloudArbitrageEngine } from '@/lib/operations/neuro/cloud/cloud-arbitrage-engine';
import { arbitrageEvaluateSchema } from '@/lib/validation/neuro-schemas';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const gpuModel = searchParams.get('gpuModel') || 'NVIDIA-H100';

  const quotes = SpotPriceAggregator.getQuotes(gpuModel);
  return NextResponse.json({ quotes });
}, 'neuro:arbitrage:view');

export const POST = requireAuth(async (req: Request, _user: any) => {
  try {
    const body = await req.json();
    const parsed = arbitrageEvaluateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid arbitrage payload' }, { status: 400 });
    }

    const mockJob: any = {
      id: 'JOB_EVAL',
      requestedGpus: parsed.data.requestedGpus,
      gpuModelRequirement: parsed.data.gpuModelRequirement,
      priority: 'normal',
    };

    const decision = CloudArbitrageEngine.evaluateArbitrage(
      mockJob,
      parsed.data.estimatedRuntimeHours,
      parsed.data.onPremiseBusyGpuCount,
      parsed.data.onPremiseTotalGpuCount
    );

    return NextResponse.json({ decision });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'neuro:arbitrage:manage');
