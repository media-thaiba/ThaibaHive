import { SecretSharing } from '@/lib/operations/crypto/secret-sharing';

describe('SecretSharing (Shamir (t, n)-Threshold over Prime Field)', () => {
  it('should split secret and reconstruct with any t shares', () => {
    const secret = BigInt('428957192837491823749182374');
    const threshold = 3;
    const totalShares = 5;

    const shares = SecretSharing.split(secret, threshold, totalShares);
    expect(shares.length).toBe(5);

    // Test reconstruction with exact threshold (3 shares)
    const subset1 = [shares[0], shares[1], shares[2]];
    const rec1 = SecretSharing.reconstruct(subset1);
    expect(rec1).toBe(secret);

    // Test reconstruction with different subset of 3 shares
    const subset2 = [shares[1], shares[3], shares[4]];
    const rec2 = SecretSharing.reconstruct(subset2);
    expect(rec2).toBe(secret);
  });

  it('should throw error when threshold exceeds total shares or is non-positive', () => {
    expect(() => SecretSharing.split(BigInt(100), 6, 5)).toThrow();
    expect(() => SecretSharing.split(BigInt(100), 0, 5)).toThrow();
  });
});
