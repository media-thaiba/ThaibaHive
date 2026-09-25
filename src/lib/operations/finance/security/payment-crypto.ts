import crypto from 'crypto';

export class PaymentCrypto {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 16;
  private static readonly TAG_LENGTH = 16;

  private static getMasterKey(): Buffer {
    const rawKey = process.env.PAYMENT_ENCRYPTION_KEY || 'thaiba-hive-secure-master-key-32bytes!';
    return crypto.createHash('sha256').update(rawKey).digest();
  }

  /**
   * Encrypts plaintext credentials using AES-256-GCM
   */
  public static encryptSecret(plaintext: string): string {
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const key = this.getMasterKey();
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypts encrypted credentials using AES-256-GCM
   */
  public static decryptSecret(ciphertext: string): string {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted payload format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = parts[2];
    const key = this.getMasterKey();

    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Masks Primary Account Number (PAN / Card Number) to comply with PCI-DSS
   */
  public static maskCardNumber(cardNumber: string): string {
    const clean = cardNumber.replace(/\D/g, '');
    if (clean.length < 12) return '••••';
    const last4 = clean.slice(-4);
    return `•••• •••• •••• ${last4}`;
  }

  /**
   * Masks bank account numbers
   */
  public static maskAccountNumber(accountNumber: string): string {
    if (accountNumber.length <= 4) return '••••';
    const last4 = accountNumber.slice(-4);
    return `XXXXXX${last4}`;
  }

  /**
   * Sanitizes request/response payloads before logging to prevent PII leakage
   */
  public static sanitizePayload(obj: Record<string, any>): Record<string, any> {
    if (!obj || typeof obj !== 'object') return obj;

    const sensitiveKeys = [
      'password',
      'secret',
      'cvv',
      'cvc',
      'card_number',
      'cardnumber',
      'pan',
      'pin',
      'private_key',
      'privatekey',
      'token',
    ];

    const sanitized: Record<string, any> = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveKeys.some((s) => lowerKey.includes(s));

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (value && typeof value === 'object') {
        sanitized[key] = this.sanitizePayload(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}
