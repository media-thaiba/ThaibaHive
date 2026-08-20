/**
 * Chaos Mesh Core Engine
 * Sprint-042 (ARES) — ARES-005
 */

import { ScenarioRegistry } from './scenario-registry';
import { ExperimentController } from './experiment-controller';
import { ChaosExecutionRecord, ChaosScenario } from './chaos-types';
import { ChaosKillSwitch } from './kill-switch';

export class ChaosEngine {
  private static instance: ChaosEngine | null = null;
  private scenarioRegistry: ScenarioRegistry;
  private controller: ExperimentController;
  private executionHistory: ChaosExecutionRecord[] = [];

  private constructor(scenarioRegistry?: ScenarioRegistry, controller?: ExperimentController) {
    this.scenarioRegistry = scenarioRegistry || ScenarioRegistry.getInstance();
    this.controller = controller || ExperimentController.getInstance();
  }

  public static getInstance(scenarioRegistry?: ScenarioRegistry, controller?: ExperimentController): ChaosEngine {
    if (!ChaosEngine.instance) {
      ChaosEngine.instance = new ChaosEngine(scenarioRegistry, controller);
    }
    return ChaosEngine.instance;
  }

  public static resetInstance(): void {
    ChaosEngine.instance = null;
  }

  public async runScenario(scenarioId: string): Promise<ChaosExecutionRecord> {
    const scenario = this.scenarioRegistry.getScenario(scenarioId);
    if (!scenario) {
      throw new Error(`Chaos scenario not found: ${scenarioId}`);
    }

    const record = await this.controller.executeScenario(scenario);
    this.executionHistory.push(record);
    return record;
  }

  public async runAllCanonicalScenarios(): Promise<ChaosExecutionRecord[]> {
    const scenarios = this.scenarioRegistry.listScenarios();
    const results: ChaosExecutionRecord[] = [];

    for (const sc of scenarios) {
      const record = await this.controller.executeScenario(sc);
      this.executionHistory.push(record);
      results.push(record);
    }

    return results;
  }

  public async emergencyAbortAll(reason: string = 'Manual administrative kill-switch'): Promise<void> {
    await ChaosKillSwitch.getInstance().trip(reason, 'ADMIN_MANUAL');
  }

  public getExecutionHistory(): ChaosExecutionRecord[] {
    return [...this.executionHistory];
  }

  public getAvailableScenarios(): ChaosScenario[] {
    return this.scenarioRegistry.listScenarios();
  }
}
