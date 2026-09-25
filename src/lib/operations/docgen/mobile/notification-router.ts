import { AcademicPushPayload } from './mobile-types';

export class NotificationRouter {
  public static resolveRecipients(
    payload: AcademicPushPayload,
    registeredTokens: Array<{ userId: string; deviceToken: string }>
  ): Array<{ userId: string; deviceToken: string }> {
    if (payload.targetAudience === 'user' && payload.targetId) {
      return registeredTokens.filter((t) => t.userId === payload.targetId);
    }

    // By default, match all tokens belonging to the audience target
    return registeredTokens;
  }
}
