/**
 * A-FED Prometheus OpenMetrics Telemetry Tracker
 * Sprint-044 (A-FED / EdgeMesh) — AFED-024
 */

export class AfedMetricsTracker {
  private static instance: AfedMetricsTracker;

  private trainingRoundsTotal = new Map<string, number>();
  private trainingLoss = new Map<string, number>();
  private privacyEpsilonConsumed = new Map<string, number>();
  private participatingNodesActive = new Map<string, number>();
  private driftPsiScore = new Map<string, number>();
  private edgeInferenceDurations: number[] = [];
  private smpcSessionDurations: number[] = [];
  private modelAccuracyRatio = new Map<string, number>();

  private readonly HISTOGRAM_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5];

  private constructor() {}

  public static getInstance(): AfedMetricsTracker {
    if (!AfedMetricsTracker.instance) {
      AfedMetricsTracker.instance = new AfedMetricsTracker();
    }
    return AfedMetricsTracker.instance;
  }

  public static resetInstance(): void {
    AfedMetricsTracker.instance = new AfedMetricsTracker();
  }

  public recordTrainingRound(modelId: string, algorithm: string): void {
    const key = `model_id="${modelId}",algorithm="${algorithm}"`;
    this.trainingRoundsTotal.set(key, (this.trainingRoundsTotal.get(key) || 0) + 1);
  }

  public setTrainingLoss(modelId: string, loss: number): void {
    const key = `model_id="${modelId}"`;
    this.trainingLoss.set(key, loss);
  }

  public recordPrivacyEpsilon(tenantId: string, epsilon: number): void {
    const key = `tenant_id="${tenantId}"`;
    this.privacyEpsilonConsumed.set(key, (this.privacyEpsilonConsumed.get(key) || 0) + epsilon);
  }

  public setActiveNodes(campusId: string, count: number): void {
    const key = `campus_id="${campusId}"`;
    this.participatingNodesActive.set(key, count);
  }

  public setDriftPsiScore(modelId: string, psi: number): void {
    const key = `model_id="${modelId}"`;
    this.driftPsiScore.set(key, psi);
  }

  public recordEdgeInferenceDuration(durationSeconds: number): void {
    this.edgeInferenceDurations.push(durationSeconds);
    if (this.edgeInferenceDurations.length > 500) {
      this.edgeInferenceDurations.shift();
    }
  }

  public recordSmpcSessionDuration(durationSeconds: number): void {
    this.smpcSessionDurations.push(durationSeconds);
    if (this.smpcSessionDurations.length > 500) {
      this.smpcSessionDurations.shift();
    }
  }

  public setModelAccuracy(modelId: string, accuracy: number): void {
    const key = `model_id="${modelId}"`;
    this.modelAccuracyRatio.set(key, accuracy);
  }

  public exportOpenMetrics(): string {
    const lines: string[] = [];

    // 1. Training Rounds Total
    lines.push('# HELP afed_training_rounds_total Total federated training rounds completed');
    lines.push('# TYPE afed_training_rounds_total counter');
    for (const [labels, val] of this.trainingRoundsTotal.entries()) {
      lines.push(`afed_training_rounds_total{${labels}} ${val}`);
    }

    // 2. Training Loss
    lines.push('# HELP afed_training_loss Current global model convergence loss');
    lines.push('# TYPE afed_training_loss gauge');
    for (const [labels, val] of this.trainingLoss.entries()) {
      lines.push(`afed_training_loss{${labels}} ${val}`);
    }

    // 3. Privacy Epsilon Consumed
    lines.push('# HELP afed_privacy_epsilon_consumed Cumulative Differential Privacy epsilon spent');
    lines.push('# TYPE afed_privacy_epsilon_consumed counter');
    for (const [labels, val] of this.privacyEpsilonConsumed.entries()) {
      lines.push(`afed_privacy_epsilon_consumed{${labels}} ${val}`);
    }

    // 4. Active Nodes
    lines.push('# HELP afed_participating_nodes_active Count of active campus edge nodes in federated mesh');
    lines.push('# TYPE afed_participating_nodes_active gauge');
    for (const [labels, val] of this.participatingNodesActive.entries()) {
      lines.push(`afed_participating_nodes_active{${labels}} ${val}`);
    }

    // 5. Drift PSI Score
    lines.push('# HELP afed_drift_psi_score Demographic covariate shift Population Stability Index (PSI)');
    lines.push('# TYPE afed_drift_psi_score gauge');
    for (const [labels, val] of this.driftPsiScore.entries()) {
      lines.push(`afed_drift_psi_score{${labels}} ${val}`);
    }

    // 6. Edge Inference Duration Histogram
    lines.push('# HELP afed_edge_inference_duration_seconds Latency of edge-native forward inference');
    lines.push('# TYPE afed_edge_inference_duration_seconds histogram');
    const infCount = this.edgeInferenceDurations.length;
    const infSum = this.edgeInferenceDurations.reduce((acc, v) => acc + v, 0);
    for (const bucket of this.HISTOGRAM_BUCKETS) {
      const bCount = this.edgeInferenceDurations.filter((d) => d <= bucket).length;
      lines.push(`afed_edge_inference_duration_seconds_bucket{le="${bucket}"} ${bCount}`);
    }
    lines.push(`afed_edge_inference_duration_seconds_bucket{le="+Inf"} ${infCount}`);
    lines.push(`afed_edge_inference_duration_seconds_sum ${infSum}`);
    lines.push(`afed_edge_inference_duration_seconds_count ${infCount}`);

    // 7. SMPC Session Duration Histogram
    lines.push('# HELP afed_smpc_session_duration_seconds Latency of 4-phase SMPC SecAgg session');
    lines.push('# TYPE afed_smpc_session_duration_seconds histogram');
    const smpcCount = this.smpcSessionDurations.length;
    const smpcSum = this.smpcSessionDurations.reduce((acc, v) => acc + v, 0);
    for (const bucket of this.HISTOGRAM_BUCKETS) {
      const bCount = this.smpcSessionDurations.filter((d) => d <= bucket).length;
      lines.push(`afed_smpc_session_duration_seconds_bucket{le="${bucket}"} ${bCount}`);
    }
    lines.push(`afed_smpc_session_duration_seconds_bucket{le="+Inf"} ${smpcCount}`);
    lines.push(`afed_smpc_session_duration_seconds_sum ${smpcSum}`);
    lines.push(`afed_smpc_session_duration_seconds_count ${smpcCount}`);

    // 8. Model Accuracy Ratio
    lines.push('# HELP afed_model_accuracy_ratio Validated prediction accuracy ratio of global federated model');
    lines.push('# TYPE afed_model_accuracy_ratio gauge');
    for (const [labels, val] of this.modelAccuracyRatio.entries()) {
      lines.push(`afed_model_accuracy_ratio{${labels}} ${val}`);
    }

    return lines.join('\n') + '\n';
  }
}
