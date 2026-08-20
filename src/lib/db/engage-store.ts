import { db } from '@thaiba/db';
import {
  engageTemplates,
  engageMessages,
  engageDeliveries,
  engagePreferences,
  engageWorkflows,
  engageWorkflowRuns,
  engageChatSessions,
  engageChatMessages,
  engageTranslations,
  engageAnalyticsEvents,
} from '@thaiba/db/schema';
import { eq, and } from 'drizzle-orm';

export interface InMemoryEngageStore {
  templates: Map<string, any>;
  messages: Map<string, any>;
  deliveries: Map<string, any>;
  preferences: Map<string, any>;
  workflows: Map<string, any>;
  workflowRuns: Map<string, any>;
  chatSessions: Map<string, any>;
  chatMessages: Map<string, any>;
  translations: Map<string, any>;
  analyticsEvents: Map<string, any>;
}

export class EngageDbStore {
  private static instance: EngageDbStore;
  private memoryStore: InMemoryEngageStore = {
    templates: new Map(),
    messages: new Map(),
    deliveries: new Map(),
    preferences: new Map(),
    workflows: new Map(),
    workflowRuns: new Map(),
    chatSessions: new Map(),
    chatMessages: new Map(),
    translations: new Map(),
    analyticsEvents: new Map(),
  };

  public static getInstance(): EngageDbStore {
    if (!EngageDbStore.instance) {
      EngageDbStore.instance = new EngageDbStore();
    }
    return EngageDbStore.instance;
  }

  public clearMemoryStore(): void {
    this.memoryStore.templates.clear();
    this.memoryStore.messages.clear();
    this.memoryStore.deliveries.clear();
    this.memoryStore.preferences.clear();
    this.memoryStore.workflows.clear();
    this.memoryStore.workflowRuns.clear();
    this.memoryStore.chatSessions.clear();
    this.memoryStore.chatMessages.clear();
    this.memoryStore.translations.clear();
    this.memoryStore.analyticsEvents.clear();
  }

  // ─── Templates ───
  public async saveTemplateAsync(template: any): Promise<void> {
    const id = template.id || `tmpl_${template.templateId}`;
    const payload = {
      id,
      templateId: template.templateId,
      name: template.name,
      category: template.category || 'general',
      channel: template.channel || 'email',
      subjectTemplate: template.subjectTemplate || null,
      bodyTemplate: template.bodyTemplate,
      variablesSchema: typeof template.variablesSchema === 'string' ? template.variablesSchema : JSON.stringify(template.variablesSchema || {}),
      brandRulesData: typeof template.brandRulesData === 'string' ? template.brandRulesData : JSON.stringify(template.brandRulesData || {}),
      isApproved: template.isApproved !== undefined ? Boolean(template.isApproved) : false,
      institutionId: template.institutionId || 'global',
      updatedAt: new Date().toISOString(),
      createdAt: template.createdAt || new Date().toISOString(),
    };

    this.memoryStore.templates.set(id, payload);

    try {
      if (db) {
        const existing = await db.select().from(engageTemplates).where(eq(engageTemplates.templateId, template.templateId));
        if (existing && existing.length > 0) {
          await db.update(engageTemplates).set(payload).where(eq(engageTemplates.templateId, template.templateId));
        } else {
          await db.insert(engageTemplates).values(payload);
        }
      }
    } catch {
      // Memory fallback
    }
  }

  public async getTemplateAsync(templateId: string, institutionId = 'global'): Promise<any | null> {
    try {
      if (db) {
        const rows = await db.select().from(engageTemplates).where(
          and(
            eq(engageTemplates.templateId, templateId),
            eq(engageTemplates.institutionId, institutionId)
          )
        );
        if (rows && rows.length > 0) return rows[0];
      }
    } catch {
      // Memory fallback
    }
    for (const tmpl of this.memoryStore.templates.values()) {
      if (tmpl.templateId === templateId && (tmpl.institutionId === institutionId || institutionId === 'global')) {
        return tmpl;
      }
    }
    return null;
  }

  public async listTemplatesAsync(institutionId = 'global'): Promise<any[]> {
    try {
      if (db) {
        const rows = await db.select().from(engageTemplates).where(eq(engageTemplates.institutionId, institutionId));
        if (rows && rows.length > 0) return rows;
      }
    } catch {
      // Memory fallback
    }
    return Array.from(this.memoryStore.templates.values()).filter(
      (t) => t.institutionId === institutionId || institutionId === 'global'
    );
  }

  // ─── Messages ───
  public async saveMessageAsync(message: any): Promise<void> {
    const id = message.id || `msg_${message.messageId}`;
    const existingMemory = this.memoryStore.messages.get(id) || {};
    const payload = {
      id,
      messageId: message.messageId,
      campaignId: message.campaignId !== undefined ? message.campaignId : existingMemory.campaignId || null,
      templateId: message.templateId !== undefined ? message.templateId : existingMemory.templateId || null,
      recipientId: message.recipientId !== undefined ? message.recipientId : existingMemory.recipientId,
      recipientType: message.recipientType || existingMemory.recipientType || 'student',
      recipientChannelAddress: message.recipientChannelAddress !== undefined ? message.recipientChannelAddress : existingMemory.recipientChannelAddress,
      channel: message.channel || existingMemory.channel || 'email',
      priority: message.priority || existingMemory.priority || 'standard',
      status: message.status || existingMemory.status || 'queued',
      subject: message.subject !== undefined ? message.subject : existingMemory.subject || null,
      body: message.body !== undefined ? message.body : existingMemory.body,
      personalizedData: message.personalizedData !== undefined ? (typeof message.personalizedData === 'string' ? message.personalizedData : JSON.stringify(message.personalizedData || {})) : existingMemory.personalizedData || '{}',
      scheduledAt: message.scheduledAt || existingMemory.scheduledAt || new Date().toISOString(),
      institutionId: message.institutionId || existingMemory.institutionId || 'global',
      createdAt: message.createdAt || existingMemory.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.memoryStore.messages.set(id, payload);

    try {
      if (db) {
        const existing = await db.select().from(engageMessages).where(eq(engageMessages.messageId, message.messageId));
        if (existing && existing.length > 0) {
          await db.update(engageMessages).set(payload).where(eq(engageMessages.messageId, message.messageId));
        } else {
          await db.insert(engageMessages).values(payload);
        }
      }
    } catch {
      // Memory fallback
    }
  }

  public async getMessageAsync(messageId: string, institutionId = 'global'): Promise<any | null> {
    try {
      if (db) {
        const rows = await db.select().from(engageMessages).where(
          and(
            eq(engageMessages.messageId, messageId),
            eq(engageMessages.institutionId, institutionId)
          )
        );
        if (rows && rows.length > 0) return rows[0];
      }
    } catch {
      // Memory fallback
    }
    for (const msg of this.memoryStore.messages.values()) {
      if (msg.messageId === messageId && (msg.institutionId === institutionId || institutionId === 'global')) {
        return msg;
      }
    }
    return null;
  }

  public async listMessagesAsync(institutionId = 'global', limit = 50): Promise<any[]> {
    try {
      if (db) {
        const rows = await db.select().from(engageMessages).where(eq(engageMessages.institutionId, institutionId)).limit(limit);
        if (rows && rows.length > 0) return rows;
      }
    } catch {
      // Memory fallback
    }
    return Array.from(this.memoryStore.messages.values())
      .filter((m) => m.institutionId === institutionId || institutionId === 'global')
      .slice(0, limit);
  }

  // ─── Deliveries ───
  public async saveDeliveryAsync(delivery: any): Promise<void> {
    const id = delivery.id || `deliv_${delivery.deliveryId}`;
    const payload = {
      id,
      deliveryId: delivery.deliveryId,
      messageId: delivery.messageId,
      channel: delivery.channel,
      provider: delivery.provider,
      providerMessageId: delivery.providerMessageId || null,
      status: delivery.status || 'queued',
      failureReason: delivery.failureReason || null,
      retryCount: delivery.retryCount ?? 0,
      costUsd: delivery.costUsd ?? 0,
      dispatchedAt: delivery.dispatchedAt || new Date().toISOString(),
      deliveredAt: delivery.deliveredAt || null,
      openedAt: delivery.openedAt || null,
      clickedAt: delivery.clickedAt || null,
      institutionId: delivery.institutionId || 'global',
      createdAt: delivery.createdAt || new Date().toISOString(),
    };

    this.memoryStore.deliveries.set(id, payload);

    try {
      if (db) {
        const existing = await db.select().from(engageDeliveries).where(eq(engageDeliveries.deliveryId, delivery.deliveryId));
        if (existing && existing.length > 0) {
          await db.update(engageDeliveries).set(payload).where(eq(engageDeliveries.deliveryId, delivery.deliveryId));
        } else {
          await db.insert(engageDeliveries).values(payload);
        }
      }
    } catch {
      // Memory fallback
    }
  }

  public async getDeliveryAsync(deliveryId: string, institutionId = 'global'): Promise<any | null> {
    try {
      if (db) {
        const rows = await db.select().from(engageDeliveries).where(
          and(
            eq(engageDeliveries.deliveryId, deliveryId),
            eq(engageDeliveries.institutionId, institutionId)
          )
        );
        if (rows && rows.length > 0) return rows[0];
      }
    } catch {
      // Memory fallback
    }
    for (const d of this.memoryStore.deliveries.values()) {
      if (d.deliveryId === deliveryId && (d.institutionId === institutionId || institutionId === 'global')) {
        return d;
      }
    }
    return null;
  }

  // ─── Preferences ───
  public async savePreferencesAsync(preferences: any): Promise<void> {
    const id = preferences.id || `pref_${preferences.recipientId}`;
    const payload = {
      id,
      recipientId: preferences.recipientId,
      recipientType: preferences.recipientType || 'student',
      channelPreferences: typeof preferences.channelPreferences === 'string' ? preferences.channelPreferences : JSON.stringify(preferences.channelPreferences || {}),
      categorySubscriptions: typeof preferences.categorySubscriptions === 'string' ? preferences.categorySubscriptions : JSON.stringify(preferences.categorySubscriptions || {}),
      quietHoursStart: preferences.quietHoursStart || '21:00',
      quietHoursEnd: preferences.quietHoursEnd || '07:00',
      timezone: preferences.timezone || 'UTC',
      isUnsubscribedAll: preferences.isUnsubscribedAll !== undefined ? Boolean(preferences.isUnsubscribedAll) : false,
      institutionId: preferences.institutionId || 'global',
      updatedAt: new Date().toISOString(),
      createdAt: preferences.createdAt || new Date().toISOString(),
    };

    this.memoryStore.preferences.set(id, payload);

    try {
      if (db) {
        const existing = await db.select().from(engagePreferences).where(eq(engagePreferences.recipientId, preferences.recipientId));
        if (existing && existing.length > 0) {
          await db.update(engagePreferences).set(payload).where(eq(engagePreferences.recipientId, preferences.recipientId));
        } else {
          await db.insert(engagePreferences).values(payload);
        }
      }
    } catch {
      // Memory fallback
    }
  }

  public async getPreferencesAsync(recipientId: string, institutionId = 'global'): Promise<any | null> {
    try {
      if (db) {
        const rows = await db.select().from(engagePreferences).where(
          and(
            eq(engagePreferences.recipientId, recipientId),
            eq(engagePreferences.institutionId, institutionId)
          )
        );
        if (rows && rows.length > 0) return rows[0];
      }
    } catch {
      // Memory fallback
    }
    for (const p of this.memoryStore.preferences.values()) {
      if (p.recipientId === recipientId && (p.institutionId === institutionId || institutionId === 'global')) {
        return p;
      }
    }
    return null;
  }

  // ─── Workflows & Runs ───
  public async saveWorkflowAsync(workflow: any): Promise<void> {
    const id = workflow.id || `wf_${workflow.workflowId}`;
    const payload = {
      id,
      workflowId: workflow.workflowId,
      name: workflow.name,
      triggerEvent: workflow.triggerEvent,
      triggerConditionData: typeof workflow.triggerConditionData === 'string' ? workflow.triggerConditionData : JSON.stringify(workflow.triggerConditionData || {}),
      stepsData: typeof workflow.stepsData === 'string' ? workflow.stepsData : JSON.stringify(workflow.stepsData || []),
      isActive: workflow.isActive !== undefined ? Boolean(workflow.isActive) : true,
      institutionId: workflow.institutionId || 'global',
      createdAt: workflow.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.memoryStore.workflows.set(id, payload);

    try {
      if (db) {
        const existing = await db.select().from(engageWorkflows).where(eq(engageWorkflows.workflowId, workflow.workflowId));
        if (existing && existing.length > 0) {
          await db.update(engageWorkflows).set(payload).where(eq(engageWorkflows.workflowId, workflow.workflowId));
        } else {
          await db.insert(engageWorkflows).values(payload);
        }
      }
    } catch {
      // Memory fallback
    }
  }

  public async listWorkflowsAsync(institutionId = 'global'): Promise<any[]> {
    try {
      if (db) {
        const rows = await db.select().from(engageWorkflows).where(eq(engageWorkflows.institutionId, institutionId));
        if (rows && rows.length > 0) return rows;
      }
    } catch {
      // Memory fallback
    }
    return Array.from(this.memoryStore.workflows.values()).filter(
      (w) => w.institutionId === institutionId || institutionId === 'global'
    );
  }

  public async saveWorkflowRunAsync(run: any): Promise<void> {
    const id = run.id || `run_${run.runId}`;
    const payload = {
      id,
      runId: run.runId,
      workflowId: run.workflowId,
      recipientId: run.recipientId,
      currentStepIndex: run.currentStepIndex ?? 0,
      status: run.status || 'active',
      stateData: typeof run.stateData === 'string' ? run.stateData : JSON.stringify(run.stateData || {}),
      nextExecutionTime: run.nextExecutionTime || null,
      institutionId: run.institutionId || 'global',
      startedAt: run.startedAt || new Date().toISOString(),
      completedAt: run.completedAt || null,
      createdAt: run.createdAt || new Date().toISOString(),
    };

    this.memoryStore.workflowRuns.set(id, payload);

    try {
      if (db) {
        const existing = await db.select().from(engageWorkflowRuns).where(eq(engageWorkflowRuns.runId, run.runId));
        if (existing && existing.length > 0) {
          await db.update(engageWorkflowRuns).set(payload).where(eq(engageWorkflowRuns.runId, run.runId));
        } else {
          await db.insert(engageWorkflowRuns).values(payload);
        }
      }
    } catch {
      // Memory fallback
    }
  }

  // ─── Chat Sessions & Messages ───
  public async saveChatSessionAsync(session: any): Promise<void> {
    const id = session.id || `sesh_${session.sessionId}`;
    const payload = {
      id,
      sessionId: session.sessionId,
      stakeholderId: session.stakeholderId,
      stakeholderType: session.stakeholderType || 'student',
      channel: session.channel || 'web',
      activeIntent: session.activeIntent || null,
      contextSlotsData: typeof session.contextSlotsData === 'string' ? session.contextSlotsData : JSON.stringify(session.contextSlotsData || {}),
      status: session.status || 'bot_active',
      assignedAgentId: session.assignedAgentId || null,
      institutionId: session.institutionId || 'global',
      lastInteractionAt: session.lastInteractionAt || new Date().toISOString(),
      createdAt: session.createdAt || new Date().toISOString(),
    };

    this.memoryStore.chatSessions.set(id, payload);

    try {
      if (db) {
        const existing = await db.select().from(engageChatSessions).where(eq(engageChatSessions.sessionId, session.sessionId));
        if (existing && existing.length > 0) {
          await db.update(engageChatSessions).set(payload).where(eq(engageChatSessions.sessionId, session.sessionId));
        } else {
          await db.insert(engageChatSessions).values(payload);
        }
      }
    } catch {
      // Memory fallback
    }
  }

  public async getChatSessionAsync(sessionId: string, institutionId = 'global'): Promise<any | null> {
    try {
      if (db) {
        const rows = await db.select().from(engageChatSessions).where(
          and(
            eq(engageChatSessions.sessionId, sessionId),
            eq(engageChatSessions.institutionId, institutionId)
          )
        );
        if (rows && rows.length > 0) return rows[0];
      }
    } catch {
      // Memory fallback
    }
    for (const s of this.memoryStore.chatSessions.values()) {
      if (s.sessionId === sessionId && (s.institutionId === institutionId || institutionId === 'global')) {
        return s;
      }
    }
    return null;
  }

  public async saveChatMessageAsync(chatMsg: any): Promise<void> {
    const id = chatMsg.id || `cmsg_${chatMsg.messageId}`;
    const payload = {
      id,
      messageId: chatMsg.messageId,
      sessionId: chatMsg.sessionId,
      senderType: chatMsg.senderType || 'stakeholder',
      text: chatMsg.text,
      richPayloadData: typeof chatMsg.richPayloadData === 'string' ? chatMsg.richPayloadData : JSON.stringify(chatMsg.richPayloadData || {}),
      intentConfidence: chatMsg.intentConfidence ?? 1.0,
      sentimentScore: chatMsg.sentimentScore ?? 0,
      institutionId: chatMsg.institutionId || 'global',
      createdAt: chatMsg.createdAt || new Date().toISOString(),
    };

    this.memoryStore.chatMessages.set(id, payload);

    try {
      if (db) {
        await db.insert(engageChatMessages).values(payload);
      }
    } catch {
      // Memory fallback
    }
  }

  public async listChatMessagesAsync(sessionId: string, institutionId = 'global'): Promise<any[]> {
    try {
      if (db) {
        const rows = await db.select().from(engageChatMessages).where(
          and(
            eq(engageChatMessages.sessionId, sessionId),
            eq(engageChatMessages.institutionId, institutionId)
          )
        );
        if (rows && rows.length > 0) return rows;
      }
    } catch {
      // Memory fallback
    }
    return Array.from(this.memoryStore.chatMessages.values()).filter(
      (m) => m.sessionId === sessionId && (m.institutionId === institutionId || institutionId === 'global')
    );
  }

  // ─── Translations ───
  public async saveTranslationAsync(translation: any): Promise<void> {
    const id = translation.id || `trans_${translation.contentHash}`;
    const payload = {
      id,
      contentHash: translation.contentHash,
      sourceLanguage: translation.sourceLanguage || 'en',
      targetLanguage: translation.targetLanguage,
      sourceText: translation.sourceText,
      translatedText: translation.translatedText,
      isHumanVerified: translation.isHumanVerified !== undefined ? Boolean(translation.isHumanVerified) : false,
      verifiedBy: translation.verifiedBy || null,
      institutionId: translation.institutionId || 'global',
      createdAt: translation.createdAt || new Date().toISOString(),
    };

    this.memoryStore.translations.set(id, payload);

    try {
      if (db) {
        const existing = await db.select().from(engageTranslations).where(eq(engageTranslations.contentHash, translation.contentHash));
        if (existing && existing.length > 0) {
          await db.update(engageTranslations).set(payload).where(eq(engageTranslations.contentHash, translation.contentHash));
        } else {
          await db.insert(engageTranslations).values(payload);
        }
      }
    } catch {
      // Memory fallback
    }
  }

  public async getTranslationAsync(contentHash: string, institutionId = 'global'): Promise<any | null> {
    try {
      if (db) {
        const rows = await db.select().from(engageTranslations).where(
          and(
            eq(engageTranslations.contentHash, contentHash),
            eq(engageTranslations.institutionId, institutionId)
          )
        );
        if (rows && rows.length > 0) return rows[0];
      }
    } catch {
      // Memory fallback
    }
    for (const t of this.memoryStore.translations.values()) {
      if (t.contentHash === contentHash && (t.institutionId === institutionId || institutionId === 'global')) {
        return t;
      }
    }
    return null;
  }

  // ─── Analytics Events ───
  public async recordAnalyticsEventAsync(event: any): Promise<void> {
    const id = event.id || `evt_${event.eventId}`;
    const payload = {
      id,
      eventId: event.eventId,
      campaignId: event.campaignId || null,
      messageId: event.messageId || null,
      deliveryId: event.deliveryId || null,
      recipientId: event.recipientId || null,
      eventType: event.eventType,
      channel: event.channel || 'email',
      metadata: typeof event.metadata === 'string' ? event.metadata : JSON.stringify(event.metadata || {}),
      institutionId: event.institutionId || 'global',
      timestamp: event.timestamp || new Date().toISOString(),
      createdAt: event.createdAt || new Date().toISOString(),
    };

    this.memoryStore.analyticsEvents.set(id, payload);

    try {
      if (db) {
        await db.insert(engageAnalyticsEvents).values(payload);
      }
    } catch {
      // Memory fallback
    }
  }

  public async listAnalyticsEventsAsync(institutionId = 'global', limit = 500): Promise<any[]> {
    try {
      if (db) {
        const rows = await db.select().from(engageAnalyticsEvents).where(eq(engageAnalyticsEvents.institutionId, institutionId)).limit(limit);
        if (rows && rows.length > 0) return rows;
      }
    } catch {
      // Memory fallback
    }
    return Array.from(this.memoryStore.analyticsEvents.values())
      .filter((e) => e.institutionId === institutionId || institutionId === 'global')
      .slice(0, limit);
  }
}
