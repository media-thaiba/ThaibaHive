import { createHmac } from 'crypto';
import { EngageDbStore } from '../../../db/engage-store';

export class PreferenceService {
  private static instance: PreferenceService;
  private store: EngageDbStore;
  private readonly secretKey: string = process.env.ENGAGE_AUTH_SECRET || 'thaiba_engage_consent_secret_key_2026';

  private constructor() {
    this.store = EngageDbStore.getInstance();
  }

  public static getInstance(): PreferenceService {
    if (!PreferenceService.instance) {
      PreferenceService.instance = new PreferenceService();
    }
    return PreferenceService.instance;
  }

  public generateUnsubscribeToken(recipientId: string, institutionId = 'global'): string {
    const data = `${recipientId}:${institutionId}`;
    const hmac = createHmac('sha256', this.secretKey).update(data).digest('hex');
    return Buffer.from(`${data}:${hmac}`).toString('base64url');
  }

  public verifyUnsubscribeToken(token: string): { valid: boolean; recipientId?: string; institutionId?: string } {
    try {
      const decoded = Buffer.from(token, 'base64url').toString('utf8');
      const [recipientId, institutionId, providedHmac] = decoded.split(':');
      const expectedHmac = createHmac('sha256', this.secretKey).update(`${recipientId}:${institutionId}`).digest('hex');

      if (providedHmac === expectedHmac) {
        return { valid: true, recipientId, institutionId };
      }
      return { valid: false };
    } catch {
      return { valid: false };
    }
  }

  public async setOptOutAll(recipientId: string, isUnsubscribed: boolean, institutionId = 'global'): Promise<void> {
    await this.store.savePreferencesAsync({
      recipientId,
      isUnsubscribedAll: isUnsubscribed,
      institutionId,
    });
  }
}
