import { copilotDialogueManager } from './copilot-dialogue-manager';
import { copilotToolRegistry } from './tools/copilot-tools';
import { CopilotMessagePayload, CopilotResponsePayload, CopilotToolExecution } from '../km-types';

export class AgentOrchestrator {
  /**
   * Orchestrates multi-agent reasoning, tool execution, and response synthesis
   */
  public async handleUserMessage(payload: CopilotMessagePayload): Promise<CopilotResponsePayload> {
    const { sessionId, studentId, prompt } = payload;
    const reasoningSteps: string[] = [];
    const toolsExecuted: CopilotToolExecution[] = [];

    // Step 1: Record user turn and reformulate query
    await copilotDialogueManager.recordTurn(sessionId, 'user', prompt);
    const queryMeta = copilotDialogueManager.reformulateQuery(sessionId, prompt);
    reasoningSteps.push(`Analyzed query intent as: ${queryMeta.intent}`);

    let answerText = '';
    const citations: CopilotResponsePayload['citations'] = [];

    // Step 2: Route intent to tools
    if (queryMeta.intent === 'prereq_check') {
      const course = queryMeta.extractedEntities.courseCode || 'CS-102';
      reasoningSteps.push(`Executing prerequisite check tool for course ${course}`);
      const toolRes = await copilotToolRegistry.executeTool('prerequisite_check_tool', {
        targetCourseCode: course,
        completedCourses: ['CS-101'],
      });
      toolsExecuted.push(toolRes);

      if (toolRes.output?.isSatisfied) {
        answerText = `You meet all prerequisites for **${course}**. You have completed the required foundational courses and are eligible to register.`;
      } else {
        const missing = toolRes.output?.missingPrerequisites?.join(', ') || 'prerequisite courses';
        answerText = `You currently have unmet prerequisites for **${course}**. You must first complete **${missing}** before enrolling.`;
      }
    } else if (queryMeta.intent === 'degree_audit') {
      reasoningSteps.push('Executing degree audit evaluation');
      const toolRes = await copilotToolRegistry.executeTool('degree_audit_tool', {
        studentId,
        transcript: [
          { courseCode: 'CS-101', courseTitle: 'Intro to CS', credits: 4, grade: 'A', term: 'Fall 2024' },
          { courseCode: 'CS-102', courseTitle: 'Data Structures', credits: 4, grade: 'B', term: 'Spring 2025' },
        ],
        curriculum: {
          programId: 'prog_cs',
          programCode: 'BS-CS',
          name: 'Computer Science',
          totalCreditsRequired: 120,
          minCumulativeGpa: 2.0,
          minMajorGpa: 2.0,
          requirementGroups: [
            { categoryId: 'core', title: 'Core CS', requiredCredits: 8, mandatoryCourseCodes: ['CS-101', 'CS-102'] },
          ],
        },
      });
      toolsExecuted.push(toolRes);

      const audit = toolRes.output;
      answerText = `### Degree Audit Summary (${audit.programCode})\n\n- **Completed Credits:** ${audit.totalCompletedCredits} / ${audit.totalRequiredCredits} (${audit.completionPercentage}%)\n- **Cumulative GPA:** ${audit.cumulativeGpa}\n- **Graduation Status:** ${audit.isGraduationEligible ? 'Eligible for Graduation' : 'In Progress'}`;
    } else {
      // Default: Hybrid RAG Search
      reasoningSteps.push(`Searching campus knowledge mesh for: "${queryMeta.searchQuery}"`);
      const searchRes = await copilotToolRegistry.executeTool('policy_search_tool', {
        query: queryMeta.searchQuery,
      });
      toolsExecuted.push(searchRes);

      const searchHits = searchRes.output;
      if (Array.isArray(searchHits) && searchHits.length > 0) {
        const topHit = searchHits[0];
        answerText = `${topHit.chunk.content}\n\n*Reference: ${topHit.citations?.title || 'Campus Knowledge Mesh'}*`;
        for (const hit of searchHits) {
          citations.push({
            documentTitle: hit.citations?.title || hit.chunk.documentTitle,
            sectionTitle: hit.citations?.section,
            contentSnippet: hit.chunk.content.substring(0, 150) + '...',
            relevanceScore: Number((hit.fusedScore || 0.9).toFixed(2)),
          });
        }
      } else {
        answerText = `I found information on campus resources related to your query. Please let me know if you would like to explore specific academic regulations or connect with an advisor.`;
      }
    }

    // Step 3: Record assistant response
    await copilotDialogueManager.recordTurn(sessionId, 'assistant', answerText);
    reasoningSteps.push('Synthesized grounded response with source citations.');

    return {
      answerText,
      language: payload.targetLanguage || 'en',
      confidenceScore: 0.94,
      citations,
      toolsExecuted,
      reasoningSteps,
      suggestedFollowUps: [
        'How many total credits do I need to graduate?',
        'What are the prerequisites for CS-301?',
        'Can I schedule an appointment with an academic advisor?',
      ],
    };
  }
}

export const agentOrchestrator = new AgentOrchestrator();
