import { copilotDialogueManager } from '@/lib/operations/km/conversational/copilot-dialogue-manager';
import { contextMemory } from '@/lib/operations/km/conversational/context-memory';

describe('Copilot Dialogue Manager & Context Memory (KM-011)', () => {
  const sessionId = 'sesh_test_dialogue';

  beforeEach(() => {
    contextMemory.clearSession(sessionId);
  });

  it('should maintain conversation history and sliding window', async () => {
    await copilotDialogueManager.recordTurn(sessionId, 'user', 'What are the rules for CS-301?');
    await copilotDialogueManager.recordTurn(sessionId, 'assistant', 'CS-301 requires CS-102.');

    const history = contextMemory.getHistory(sessionId);
    expect(history.length).toBe(2);
    expect(history[0].content).toBe('What are the rules for CS-301?');
  });

  it('should reformulate elliptical queries using prior turn context', async () => {
    await copilotDialogueManager.recordTurn(sessionId, 'user', 'Tell me about CS-301');
    await copilotDialogueManager.recordTurn(sessionId, 'assistant', 'CS-301 is Operating Systems.');

    const reformulated = copilotDialogueManager.reformulateQuery(sessionId, 'What are the prerequisites?');
    expect(reformulated.extractedEntities.courseCode).toBe('CS-301');
    expect(reformulated.intent).toBe('prereq_check');
  });
});
