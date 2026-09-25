import { PaymentCrypto } from '../../operations/finance/security/payment-crypto';

describe('PaymentCrypto & PCI-DSS Security (Sprint-057 - FEE-007)', () => {
  it('should encrypt and decrypt merchant API keys using AES-256-GCM', () => {
    const rawSecret = 'rzp_live_secret_key_super_confidential_999';
    const encrypted = PaymentCrypto.encryptSecret(rawSecret);

    expect(encrypted).not.toBe(rawSecret);
    expect(encrypted.split(':').length).toBe(3); // iv:authTag:ciphertext

    const decrypted = PaymentCrypto.decryptSecret(encrypted);
    expect(decrypted).toBe(rawSecret);
  });

  it('should mask card and bank account numbers to PCI-DSS standards', () => {
    const card = '4111222233334444';
    const maskedCard = PaymentCrypto.maskCardNumber(card);
    expect(maskedCard).toBe('•••• •••• •••• 4444');

    const account = '001234567890';
    const maskedAccount = PaymentCrypto.maskAccountNumber(account);
    expect(maskedAccount).toBe('XXXXXX7890');
  });

  it('should redact sensitive keys from logging payloads', () => {
    const rawPayload = {
      orderId: 'ord_123',
      amount: 5000,
      customer: {
        name: 'Ahmad Khan',
        card_number: '4111222233334444',
        cvv: '123',
        secret_token: 'tok_abc',
      },
    };

    const sanitized = PaymentCrypto.sanitizePayload(rawPayload);

    expect(sanitized.orderId).toBe('ord_123');
    expect(sanitized.amount).toBe(5000);
    expect(sanitized.customer.name).toBe('Ahmad Khan');
    expect(sanitized.customer.card_number).toBe('[REDACTED]');
    expect(sanitized.customer.cvv).toBe('[REDACTED]');
    expect(sanitized.customer.secret_token).toBe('[REDACTED]');
  });
});
