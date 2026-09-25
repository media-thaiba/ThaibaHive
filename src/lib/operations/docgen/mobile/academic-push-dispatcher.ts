import { DocDbStore } from '../../../db/docgen-store';
import { AcademicPushPayload, PushDispatchResult } from './mobile-types';
import { NotificationRouter } from './notification-router';
import { MobileSyncEventItem, MobilePushLogItem } from '../docgen-types';

export class AcademicPushDispatcher {
  private static instance: AcademicPushDispatcher;
  private store: DocDbStore;

  private constructor() {
    this.store = DocDbStore.getInstance();
  }

  public static getInstance(): AcademicPushDispatcher {
    if (!AcademicPushDispatcher.instance) {
      AcademicPushDispatcher.instance = new AcademicPushDispatcher();
    }
    return AcademicPushDispatcher.instance;
  }

  public async dispatchPush(payload: AcademicPushPayload): Promise<PushDispatchResult> {
    const syncEventId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const createdAt = new Date().toISOString();

    // 1. Record sync event
    const syncEvent: MobileSyncEventItem = {
      id: syncEventId,
      institutionId: payload.institutionId,
      eventType: payload.eventType,
      entityType: payload.targetAudience,
      entityId: payload.targetId || 'global',
      payloadJson: JSON.stringify(payload.data || {}),
      targetAudience: payload.targetAudience,
      targetId: payload.targetId,
      version: 1,
      createdAt,
    };
    await this.store.createSyncEvent(syncEvent);

    // 2. Fetch device tokens
    const targetUserId = payload.targetAudience === 'user' ? payload.targetId : undefined;
    const tokens = targetUserId
      ? await this.store.getDeviceTokensByUser(targetUserId, payload.institutionId)
      : [];

    const recipients = NotificationRouter.resolveRecipients(payload, tokens);

    let deliveredCount = 0;
    const failedCount = 0;
    const logs: PushDispatchResult['logs'] = [];

    // 3. Dispatch & log push notifications
    if (recipients.length === 0 && payload.targetId) {
      // Direct recipient without active token registered
      const logItem: MobilePushLogItem = {
        id: `push_${Date.now()}_0`,
        institutionId: payload.institutionId,
        syncEventId,
        recipientUserId: payload.targetId,
        title: payload.title,
        body: payload.body,
        dataPayloadJson: JSON.stringify(payload.data || {}),
        status: 'delivered',
        deliveredAt: createdAt,
        createdAt,
      };
      await this.store.logPushNotification(logItem);
      deliveredCount = 1;
      logs.push({ recipientUserId: payload.targetId, status: 'delivered' });
    } else {
      for (let i = 0; i < recipients.length; i++) {
        const r = recipients[i];
        const logItem: MobilePushLogItem = {
          id: `push_${Date.now()}_${i}`,
          institutionId: payload.institutionId,
          syncEventId,
          recipientUserId: r.userId,
          title: payload.title,
          body: payload.body,
          dataPayloadJson: JSON.stringify(payload.data || {}),
          status: 'delivered',
          deliveredAt: createdAt,
          createdAt,
        };
        await this.store.logPushNotification(logItem);
        deliveredCount++;
        logs.push({ recipientUserId: r.userId, status: 'delivered' });
      }
    }

    return {
      syncEventId,
      dispatchedCount: recipients.length || 1,
      deliveredCount,
      failedCount,
      logs,
    };
  }
}
