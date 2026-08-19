/**
 * In-Memory Bloom Filter for Quarantine Fast-Path Lookups
 * Sprint-038 / AGS-007
 */

export class QuarantineBloomFilter {
  private size: number;
  private bits: Uint8Array;

  constructor(size = 20000) {
    this.size = size;
    this.bits = new Uint8Array(Math.ceil(size / 8));
  }

  private getHashes(key: string): [number, number, number] {
    let h1 = 0x811c9dc5;
    for (let i = 0; i < key.length; i++) {
      h1 ^= key.charCodeAt(i);
      h1 = Math.imul(h1, 0x01000193);
    }
    const h2 = (h1 ^ (h1 >>> 16)) >>> 0;
    const h3 = (h1 + (h2 << 5)) >>> 0;
    return [Math.abs(h1) % this.size, Math.abs(h2) % this.size, Math.abs(h3) % this.size];
  }

  public add(key: string): void {
    const hashes = this.getHashes(key);
    for (const h of hashes) {
      const byteIndex = Math.floor(h / 8);
      const bitIndex = h % 8;
      this.bits[byteIndex] |= 1 << bitIndex;
    }
  }

  public mightContain(key: string): boolean {
    const hashes = this.getHashes(key);
    for (const h of hashes) {
      const byteIndex = Math.floor(h / 8);
      const bitIndex = h % 8;
      if ((this.bits[byteIndex] & (1 << bitIndex)) === 0) {
        return false;
      }
    }
    return true;
  }

  public getSizeBytes(): number {
    return this.bits.byteLength;
  }

  public clear(): void {
    this.bits.fill(0);
  }
}
