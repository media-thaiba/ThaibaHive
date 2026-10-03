import { createHmac } from 'crypto';
import { EngageDbStore } from '../../../db/engage-store';

export class PreferenceService {
  private static instance: PreferenceService;
  private store: EngageDbStore;
  private readonly customSecretKey?: string;

  private constructor(secretKey?: string) {
    this.store = EngageDbStore.getInstance();
    this.customSecretKey = secretKey;
  }

  private getSecretKey(): string {
    const resolved = this.customSecretKey || process.env.ENGAGE_AUTH_SECRET || process.env.AUTH_JWT_SECRET;
    if (!resolved) {
      if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build') {
        throw new Error('ENGAGE_AUTH_SECRET or AUTH_JWT_SECRET must be configured in environment');
      }
      return process.env.NODE_ENV === 'test' ? 'test-engage-auth-secret-key-32' : 'dev-engage-auth-secret-key-32';
    }
    return resolved;
  }

  public static getInstance(): PreferenceService {
    if (!PreferenceService.instance) {
      PreferenceService.instance = new PreferenceService();
    }
    return PreferenceService.instance;
  }

  public generateUnsubscribeToken(recipientId: string, institutionId = 'global'): string {
    const data = `${recipientId}:${institutionId}`;
    const hmac = createHmac('sha256', this.getSecretKey()).update(data).digest('hex');
    return Buffer.from(`${data}:${hmac}`).toString('base64url');
  }

  public verifyUnsubscribeToken(token: string): { valid: boolean; recipientId?: string; institutionId?: string } {
    try {
      const decoded = Buffer.from(token, 'base64url').toString('utf8');
      const [recipientId, institutionId, providedHmac] = decoded.split(':');
      const expectedHmac = createHmac('sha256', this.getSecretKey()).update(`${recipientId}:${institutionId}`).digest('hex');

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
