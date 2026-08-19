import { AgentStateStore } from "../agents/core/state-store";

export interface ABRouteResult {
  modelId: string;
  version: string;
}

export class ABTestFramework {
  private agentId = "agent-ab-test";
  private stateStore = AgentStateStore.getInstance();
  
  // Track metrics: modelId -> { predictionsCount, feedbackCount, correctCount }
  private metrics = new Map<string, { predictionsCount: number; feedbackCount: number; correctCount: number }>();

  constructor() {}

  public routePrediction(
    productionModel: { id: string; version: string },
    candidateModel: { id: string; version: string },
    requestId: string
  ): ABRouteResult {
    // 50/50 split based on requestId hash or simple random/alternating.
    // Let's use request ID character code sum to be deterministic per request, or simple math.random()
    const charSum = requestId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const useCandidate = charSum % 2 === 0;

    const selected = useCandidate ? candidateModel : productionModel;

    // Track prediction count
    if (!this.metrics.has(selected.id)) {
      this.metrics.set(selected.id, { predictionsCount: 0, feedbackCount: 0, correctCount: 0 });
    }
    this.metrics.get(selected.id)!.predictionsCount++;

    return {
      modelId: selected.id,
      version: selected.version,
    };
  }

  public recordFeedback(modelId: string, predictedValue: string, actualValue: string): void {
    const modelMetrics = this.metrics.get(modelId);
    if (modelMetrics) {
      modelMetrics.feedbackCount++;
      if (predictedValue === actualValue) {
        modelMetrics.correctCount++;
      }
    }
  }

  public getAccuracy(modelId: string): number {
    const modelMetrics = this.metrics.get(modelId);
    if (!modelMetrics || modelMetrics.feedbackCount === 0) return 0;
    return modelMetrics.correctCount / modelMetrics.feedbackCount;
  }

  public getPredictionsCount(modelId: string): number {
    return this.metrics.get(modelId)?.predictionsCount || 0;
  }

  public clear(): void {
    this.metrics.clear();
  }
}
