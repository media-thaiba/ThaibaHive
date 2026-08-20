import { IntentClassifier } from '../../../../operations/engage/conversational/intent-classifier';
import { EntityExtractor } from '../../../../operations/engage/conversational/entity-extractor';

describe('EngageOS IntentClassifier & EntityExtractor Tests', () => {
  let classifier: IntentClassifier;
  let extractor: EntityExtractor;

  beforeEach(() => {
    classifier = IntentClassifier.getInstance();
    extractor = EntityExtractor.getInstance();
  });

  it('should accurately classify attendance inquiries', () => {
    const res = classifier.classify('How many classes did I miss this week and what is my attendance percentage?');
    expect(res.intent).toBe('check_attendance');
    expect(res.confidence).toBeGreaterThanOrEqual(0.75);
    expect(res.category).toBe('academics');
  });

  it('should accurately classify fee and tuition balance inquiries', () => {
    const res = classifier.classify('What is my pending tuition fee balance for this semester?');
    expect(res.intent).toBe('fee_balance');
    expect(res.category).toBe('finance');
  });

  it('should classify human escalation requests', () => {
    const res = classifier.classify('I want to speak with a human support agent immediately.');
    expect(res.intent).toBe('human_agent_request');
    expect(res.category).toBe('support');
  });

  it('should extract course codes, amounts, and dates', () => {
    const text = 'I want to pay $450 for my CS101 exam scheduled for tomorrow for student STU-4401 in Room 204.';
    const entities = extractor.extract(text);

    expect(entities.amounts).toContain(450);
    expect(entities.courseCodes).toContain('CS101');
    expect(entities.studentIds).toContain('STU-4401');
    expect(entities.dates).toContain('tomorrow');
    expect(entities.roomNumbers).toContain('204');
  });
});
