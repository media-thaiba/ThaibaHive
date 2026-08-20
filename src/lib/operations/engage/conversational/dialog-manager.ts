import { IntentClassifier } from './intent-classifier';
import { EntityExtractor } from './entity-extractor';
import { KnowledgeRetriever } from './knowledge-retriever';
import { EngageDbStore } from '../../../db/engage-store';

export interface DialogTurnResponse {
  sessionId: string;
  botReplyText: string;
  activeIntent: string;
  intentConfidence: number;
  sessionStatus: 'bot_active' | 'agent_pending' | 'agent_active' | 'closed';
  suggestedActions?: Array<{ label: string; url?: string; payload?: string }>;
}

export class DialogManager {
  private static instance: DialogManager;
  private classifier: IntentClassifier;
  private extractor: EntityExtractor;
  private kb: KnowledgeRetriever;
  private store: EngageDbStore;

  private constructor() {
    this.classifier = IntentClassifier.getInstance();
    this.extractor = EntityExtractor.getInstance();
    this.kb = KnowledgeRetriever.getInstance();
    this.store = EngageDbStore.getInstance();
  }

  public static getInstance(): DialogManager {
    if (!DialogManager.instance) {
      DialogManager.instance = new DialogManager();
    }
    return DialogManager.instance;
  }

  public async processUserMessage(
    sessionId: string,
    stakeholderId: string,
    userText: string,
    institutionId = 'global'
  ): Promise<DialogTurnResponse> {
    // 1. Get or create chat session
    let session = await this.store.getChatSessionAsync(sessionId, institutionId);
    if (!session) {
      session = {
        sessionId,
        stakeholderId,
        channel: 'web',
        status: 'bot_active',
        contextSlotsData: JSON.stringify({}),
        institutionId,
      };
      await this.store.saveChatSessionAsync(session);
    }

    // 2. Record user message in DB
    const userMsgId = `cmsg_u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await this.store.saveChatMessageAsync({
      messageId: userMsgId,
      sessionId,
      senderType: 'stakeholder',
      text: userText,
      institutionId,
    });

    // 3. Classify intent & extract entities
    const intentResult = this.classifier.classify(userText);
    const entities = this.extractor.extract(userText);

    // Merge slots
    let slots: Record<string, any> = {};
    try {
      slots = JSON.parse(session.contextSlotsData || '{}');
    } catch {}
    if (entities.courseCodes.length > 0) slots.courseCode = entities.courseCodes[0];
    if (entities.amounts.length > 0) slots.amount = entities.amounts[0];
    if (entities.dates.length > 0) slots.date = entities.dates[0];
    if (entities.studentIds.length > 0) slots.studentId = entities.studentIds[0];

    let sessionStatus: 'bot_active' | 'agent_pending' | 'agent_active' | 'closed' = session.status || 'bot_active';
    let botReplyText = '';
    let suggestedActions: Array<{ label: string; url?: string; payload?: string }> = [];

    // 4. Handle Human Handoff Intent or low confidence
    if (intentResult.intent === 'human_agent_request' || intentResult.confidence < 0.4) {
      sessionStatus = 'agent_pending';
      botReplyText =
        'I am connecting you with an on-duty staff counselor now. Please hold on while they review our conversation history.';
      suggestedActions = [{ label: 'Cancel Escalation', payload: 'cancel_escalation' }];
    } else if (intentResult.intent === 'check_attendance') {
      botReplyText =
        'Your current overall attendance is 87.4% across all enrolled subjects (Semester 4). You have met the minimum eligibility threshold for all upcoming exams.';
      suggestedActions = [
        { label: 'View Subject Breakdown', url: '/attendance/details' },
        { label: 'Apply for Leave', payload: 'apply_leave' },
      ];
    } else if (intentResult.intent === 'fee_balance') {
      botReplyText =
        'Your tuition fee statement shows an outstanding balance of $350.00 due on September 15, 2026.';
      suggestedActions = [
        { label: 'Pay Now Online', url: '/finance/payments' },
        { label: 'Download Fee Receipt', url: '/finance/receipts' },
      ];
    } else if (intentResult.intent === 'exam_timetable') {
      botReplyText =
        'Midterm exams commence on October 12, 2026. Hall tickets and room allocations will be published on the academic dashboard next week.';
      suggestedActions = [{ label: 'View Exam Calendar', url: '/academics/exams' }];
    } else {
      // Check Knowledge Base
      const kbArticle = this.kb.search(userText);
      if (kbArticle) {
        botReplyText = kbArticle.content;
        if (kbArticle.actionLink) {
          suggestedActions = [{ label: kbArticle.topic, url: kbArticle.actionLink }];
        }
      } else {
        botReplyText =
          'I am here to assist with campus services including attendance, fees, exams, and campus facilities. How can I help you today?';
      }
    }

    // 5. Update session in DB
    await this.store.saveChatSessionAsync({
      sessionId,
      stakeholderId,
      activeIntent: intentResult.intent,
      status: sessionStatus,
      contextSlotsData: JSON.stringify(slots),
      lastInteractionAt: new Date().toISOString(),
      institutionId,
    });

    // 6. Record bot message in DB
    const botMsgId = `cmsg_b_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await this.store.saveChatMessageAsync({
      messageId: botMsgId,
      sessionId,
      senderType: 'bot',
      text: botReplyText,
      intentConfidence: intentResult.confidence,
      richPayloadData: JSON.stringify({ suggestedActions }),
      institutionId,
    });

    return {
      sessionId,
      botReplyText,
      activeIntent: intentResult.intent,
      intentConfidence: intentResult.confidence,
      sessionStatus,
      suggestedActions,
    };
  }
}
