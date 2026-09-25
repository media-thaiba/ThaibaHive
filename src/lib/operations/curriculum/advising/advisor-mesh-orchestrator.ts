import { AdvisingDomain } from '../curriculum-types';
import {
  BaseAdvisorAgent,
  AdvisorAgentResponse,
  StudentAcademicProfile,
} from './advising-types';
import { AdvisingIntentRouter } from './intent-router';
import { DegreePlannerAgent } from './agents/degree-planner-agent';
import { CareerAlignmentAgent } from './agents/career-alignment-agent';
import { TransferArticulationAgent } from './agents/transfer-articulation-agent';
import { FinancialAidLoadAgent } from './agents/financial-aid-load-agent';
import { AcademicRecoveryAgent } from './agents/academic-recovery-agent';

export class AdvisorMeshOrchestrator {
  private static instance: AdvisorMeshOrchestrator;
  private router: AdvisingIntentRouter;
  private agents: Map<AdvisingDomain, BaseAdvisorAgent> = new Map();

  constructor() {
    this.router = new AdvisingIntentRouter();
    this.registerAgent(new DegreePlannerAgent());
    this.registerAgent(new CareerAlignmentAgent());
    this.registerAgent(new TransferArticulationAgent());
    this.registerAgent(new FinancialAidLoadAgent());
    this.registerAgent(new AcademicRecoveryAgent());
  }

  public static getInstance(): AdvisorMeshOrchestrator {
    if (!AdvisorMeshOrchestrator.instance) {
      AdvisorMeshOrchestrator.instance = new AdvisorMeshOrchestrator();
    }
    return AdvisorMeshOrchestrator.instance;
  }

  public registerAgent(agent: BaseAdvisorAgent): void {
    this.agents.set(agent.domain, agent);
  }

  /**
   * Evaluates student prompt, identifies intent domain, and executes specialist advisor agent
   */
  public async handleDialogue(
    prompt: string,
    profile: StudentAcademicProfile,
    forcedDomain?: AdvisingDomain
  ): Promise<AdvisorAgentResponse> {
    const intent = this.router.routeIntent(prompt);
    const targetDomain = forcedDomain || intent.domain;

    const agent = this.agents.get(targetDomain) || this.agents.get('degree_planner')!;
    return agent.evaluate(prompt, profile, intent);
  }

  public getRegisteredDomains(): AdvisingDomain[] {
    return Array.from(this.agents.keys());
  }

  public getAgent(domain: AdvisingDomain): BaseAdvisorAgent | undefined {
    return this.agents.get(domain);
  }
}

export const advisorMesh = AdvisorMeshOrchestrator.getInstance();
