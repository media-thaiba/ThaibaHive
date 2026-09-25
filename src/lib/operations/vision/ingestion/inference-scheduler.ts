export interface InferenceScheduleState {
  cameraId: string;
  currentFps: number;
  idleFps: number;
  anomalyFps: number;
  isHighPriority: boolean;
  lastAnomalyTrigger: number | null;
}

export class InferenceScheduler {
  private schedules: Map<string, InferenceScheduleState> = new Map();
  private readonly ANOMALY_BURST_DURATION_MS = 60000; // 1 minute burst at 30 FPS

  public registerCamera(
    cameraId: string,
    idleFps: number = 5,
    anomalyFps: number = 30
  ): InferenceScheduleState {
    const state: InferenceScheduleState = {
      cameraId,
      currentFps: idleFps,
      idleFps,
      anomalyFps,
      isHighPriority: false,
      lastAnomalyTrigger: null,
    };
    this.schedules.set(cameraId, state);
    return state;
  }

  public triggerAnomalyBurst(cameraId: string): InferenceScheduleState {
    let state = this.schedules.get(cameraId);
    if (!state) {
      state = this.registerCamera(cameraId);
    }
    state.currentFps = state.anomalyFps;
    state.isHighPriority = true;
    state.lastAnomalyTrigger = Date.now();
    return state;
  }

  public evaluateSchedule(cameraId: string): InferenceScheduleState | null {
    const state = this.schedules.get(cameraId);
    if (!state) return null;

    if (state.isHighPriority && state.lastAnomalyTrigger) {
      const elapsed = Date.now() - state.lastAnomalyTrigger;
      if (elapsed > this.ANOMALY_BURST_DURATION_MS) {
        state.currentFps = state.idleFps;
        state.isHighPriority = false;
      }
    }
    return state;
  }

  public getSchedule(cameraId: string): InferenceScheduleState | null {
    return this.schedules.get(cameraId) || null;
  }
}
