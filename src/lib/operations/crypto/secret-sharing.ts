import { SecretShare } from './smpc-types';
import * as crypto from 'crypto';

/**
 * Shamir's (t, n)-Threshold Secret Sharing over Finite Prime Field F_p
 */
export class SecretSharing {
  // 127-bit Mersenne Prime: 2^127 - 1
  public static readonly FIELD_PRIME = (BigInt(1) << BigInt(127)) - BigInt(1);

  /**
   * Modular addition (a + b) mod p
   */
  public static modAdd(a: bigint, b: bigint, p: bigint = this.FIELD_PRIME): bigint {
    return (((a + b) % p) + p) % p;
  }

  /**
   * Modular subtraction (a - b) mod p
   */
  public static modSub(a: bigint, b: bigint, p: bigint = this.FIELD_PRIME): bigint {
    return (((a - b) % p) + p) % p;
  }

  /**
   * Modular multiplication (a * b) mod p
   */
  public static modMul(a: bigint, b: bigint, p: bigint = this.FIELD_PRIME): bigint {
    return (((a * b) % p) + p) % p;
  }

  /**
   * Modular exponentiation (base^exp) mod p
   */
  public static modPow(base: bigint, exp: bigint, p: bigint = this.FIELD_PRIME): bigint {
    let res = BigInt(1);
    let b = base % p;
    let e = exp;
    while (e > BigInt(0)) {
      if (e % BigInt(2) === BigInt(1)) res = this.modMul(res, b, p);
      b = this.modMul(b, b, p);
      e = e / BigInt(2);
    }
    return res;
  }

  /**
   * Modular inverse using Fermat's Little Theorem (p is prime): inv(a) = a^(p-2) mod p
   */
  public static modInverse(a: bigint, p: bigint = this.FIELD_PRIME): bigint {
    const val = ((a % p) + p) % p;
    if (val === BigInt(0)) throw new Error('Division by zero in finite field');
    return this.modPow(val, p - BigInt(2), p);
  }

  /**
   * Split secret into n shares with threshold t
   */
  public static split(
    secret: bigint,
    threshold: number,
    totalShares: number,
    p: bigint = this.FIELD_PRIME
  ): SecretShare[] {
    if (threshold > totalShares) throw new Error('Threshold cannot exceed total shares');
    if (threshold <= 0) throw new Error('Threshold must be positive');

    const coefficients: bigint[] = [secret % p];
    for (let i = 1; i < threshold; i++) {
      const randBuf = crypto.randomBytes(16);
      const randVal = BigInt('0x' + randBuf.toString('hex')) % p;
      coefficients.push(randVal);
    }

    const shares: SecretShare[] = [];
    for (let x = 1; x <= totalShares; x++) {
      const xBig = BigInt(x);
      let y = BigInt(0);
      let xPower = BigInt(1);

      for (let i = 0; i < threshold; i++) {
        const term = this.modMul(coefficients[i], xPower, p);
        y = this.modAdd(y, term, p);
        xPower = this.modMul(xPower, xBig, p);
      }

      shares.push({ shareIndex: x, shareValue: y });
    }

    return shares;
  }

  /**
   * Reconstruct secret from any t shares using Lagrange Polynomial Interpolation at x = 0
   */
  public static reconstruct(shares: SecretShare[], p: bigint = this.FIELD_PRIME): bigint {
    if (!shares || shares.length === 0) throw new Error('Shares list cannot be empty');

    let secret = BigInt(0);

    for (let j = 0; j < shares.length; j++) {
      const xj = BigInt(shares[j].shareIndex);
      const yj = shares[j].shareValue;

      let numerator = BigInt(1);
      let denominator = BigInt(1);

      for (let m = 0; m < shares.length; m++) {
        if (m !== j) {
          const xm = BigInt(shares[m].shareIndex);
          numerator = this.modMul(numerator, this.modSub(BigInt(0), xm, p), p);
          denominator = this.modMul(denominator, this.modSub(xj, xm, p), p);
        }
      }

      const lagrangeCoeff = this.modMul(numerator, this.modInverse(denominator, p), p);
      const term = this.modMul(yj, lagrangeCoeff, p);
      secret = this.modAdd(secret, term, p);
    }

    return secret;
  }
}
