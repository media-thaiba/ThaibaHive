import { contextMemory } from './context-memory';
import { kmStore } from '@/lib/db/km-store';

export interface ReformulatedQuery {
  rawPrompt: string;
  searchQuery: string;
  intent: string; // 'degree_audit' | 'prereq_check' | 'policy_inquiry' | 'general_chat'
  extractedEntities: Record<string, any>;
}

export class CopilotDialogueManager {
  /**
   * Reformulates elliptical/conversational queries based on dialog history and extracts intent.
   */
  public reformulateQuery(sessionId: string, prompt: string): ReformulatedQuery {
    const history = contextMemory.getHistory(sessionId);
    const lastUserTurn = history.slice().reverse().find((t) => t.role === 'user');

    const promptLower = prompt.toLowerCase().trim();
    let intent = 'policy_inquiry';
    let searchQuery = prompt;
    const extractedEntities: Record<string, any> = {};

    // Check course codes
    const courseMatch = prompt.match(/\b([A-Z]{2,5}-\d{3,4})\b/i);
    if (courseMatch) {
      extractedEntities.courseCode = courseMatch[1].toUpperCase();
    } else if (lastUserTurn) {
      const prevCourseMatch = lastUserTurn.content.match(/\b([A-Z]{2,5}-\d{3,4})\b/i);
      if (prevCourseMatch) {
        extractedEntities.courseCode = prevCourseMatch[1].toUpperCase();
        searchQuery = `${prompt} for course ${extractedEntities.courseCode}`;
      }
    }

    if (promptLower.includes('degree') || promptLower.includes('graduate') || promptLower.includes('audit') || promptLower.includes('credit')) {
      intent = 'degree_audit';
    } else if (promptLower.includes('prerequisite') || promptLower.includes('prereq') || promptLower.includes('before taking')) {
      intent = 'prereq_check';
    } else if (promptLower.includes('policy') || promptLower.includes('refund') || promptLower.includes('rule') || promptLower.includes('hours')) {
      intent = 'policy_inquiry';
    } else {
      intent = 'general_chat';
    }

    return {
      rawPrompt: prompt,
      searchQuery,
      intent,
      extractedEntities,
    };
  }

  public async recordTurn(sessionId: string, role: 'user' | 'assistant' | 'system' | 'tool', content: string): Promise<void> {
    contextMemory.addTurn(sessionId, { role, content });
  }
}

export const copilotDialogueManager = new CopilotDialogueManager();
