import { CloudSpotQuote } from './cloud-types';

export class SpotPriceAggregator {
  /**
   * Generates or fetches normalized spot quotes across AWS, GCP, RunPod, and On-Premise.
   */
  public static getQuotes(targetGpuModel: string = 'NVIDIA-H100'): CloudSpotQuote[] {
    const now = new Date().toISOString();

    const quotes: CloudSpotQuote[] = [
      {
        provider: 'on_prem',
        region: 'local-dc-1',
        gpuModel: 'NVIDIA-H100-SXM5-80GB',
        instanceType: 'on-prem-node',
        gpuCount: 8,
        spotPriceUsdPerHour: 1.80, // Amortized power + hardware
        onDemandPriceUsdPerHour: 1.80,
        savingsPercent: 0,
        interruptionRiskScore: 0.01,
        lastUpdated: now,
      },
      {
        provider: 'runpod',
        region: 'us-central-community',
        gpuModel: 'NVIDIA-H100-SXM5-80GB',
        instanceType: 'runpod-1x-h100',
        gpuCount: 1,
        spotPriceUsdPerHour: 2.19,
        onDemandPriceUsdPerHour: 3.89,
        savingsPercent: 43.7,
        interruptionRiskScore: 0.15,
        lastUpdated: now,
      },
      {
        provider: 'aws',
        region: 'us-east-1',
        gpuModel: 'NVIDIA-H100-SXM5-80GB',
        instanceType: 'p5.48xlarge',
        gpuCount: 8,
        spotPriceUsdPerHour: 24.50, // ~$3.06/GPU-hr
        onDemandPriceUsdPerHour: 98.32, // ~$12.29/GPU-hr
        savingsPercent: 75.1,
        interruptionRiskScore: 0.22,
        lastUpdated: now,
      },
      {
        provider: 'gcp',
        region: 'us-central1',
        gpuModel: 'NVIDIA-H100-SXM5-80GB',
        instanceType: 'a3-highgpu-8g',
        gpuCount: 8,
        spotPriceUsdPerHour: 26.20, // ~$3.27/GPU-hr
        onDemandPriceUsdPerHour: 92.50,
        savingsPercent: 71.7,
        interruptionRiskScore: 0.18,
        lastUpdated: now,
      },
    ];

    if (targetGpuModel === 'ANY') return quotes;
    return quotes.filter((q) => q.gpuModel.toLowerCase().includes(targetGpuModel.toLowerCase()));
  }
}
