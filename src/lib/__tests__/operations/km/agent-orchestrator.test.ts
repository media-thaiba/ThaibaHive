import { agentOrchestrator } from '@/lib/operations/km/conversational/agent-orchestrator';
import { hybridFusionEngine } from '@/lib/operations/km/retrieval/hybrid-fusion-engine';

describe('Multi-Agent Tool Orchestrator & Reasoning Engine (KM-012)', () => {
  beforeEach(() => {
    hybridFusionEngine.clear();
  });

  it('should handle prerequisite check queries via tool routing', async () => {
    const response = await agentOrchestrator.handleUserMessage({
      sessionId: 'sesh_agent_test',
      studentId: 'std_456',
      prompt: 'What are the prerequisites for CS-102?',
    });

    expect(response.answerText).toContain('CS-102');
    expect(response.toolsExecuted.some((t) => t.toolName === 'prerequisite_check_tool')).toBe(true);
    expect(response.reasoningSteps.length).toBeGreaterThan(0);
  });

  it('should handle degree audit queries via degree audit tool execution', async () => {
    const response = await agentOrchestrator.handleUserMessage({
      sessionId: 'sesh_audit_test',
      studentId: 'std_456',
      prompt: 'Check my degree audit and graduation progress',
    });

    expect(response.answerText).toContain('Degree Audit Summary');
    expect(response.toolsExecuted.some((t) => t.toolName === 'degree_audit_tool')).toBe(true);
  });
});
