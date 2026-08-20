import { factVerifier } from '@/lib/operations/km/governance/fact-verifier';
import { citationGenerator } from '@/lib/operations/km/governance/citation-generator';
import { DocumentChunk } from '@/lib/operations/km/km-types';

describe('Citation Generator & Fact Verifier (KM-017)', () => {
  const sourceChunks: DocumentChunk[] = [
    {
      chunkId: 'chk_refund_pol',
      documentId: 'doc_finance',
      documentTitle: 'Refund Policy',
      category: 'policy',
      chunkIndex: 0,
      content: 'Tuition refunds are disbursed within 14 calendar days of withdrawal approval. Full refunds apply before week 2.',
      tokenCount: 18,
      metadata: { section: 'Section 4: Withdrawals' },
    },
  ];

  it('should verify factual claims supported by source context', () => {
    const answer = 'Tuition refunds are disbursed within 14 calendar days of withdrawal.';
    const verification = factVerifier.verifyAnswerAgainstContext(answer, sourceChunks);

    expect(verification.isVerified).toBe(true);
    expect(verification.entailmentScore).toBeGreaterThanOrEqual(0.7);
    expect(verification.flaggedHallucinations.length).toBe(0);
  });

  it('should flag hallucinated numbers and unsupported claims', () => {
    const hallucinatedAnswer = 'Tuition refunds are processed within 90 days with a 50 percent penalty.';
    const verification = factVerifier.verifyAnswerAgainstContext(hallucinatedAnswer, sourceChunks);

    expect(verification.isVerified).toBe(false);
    expect(verification.flaggedHallucinations.length).toBeGreaterThan(0);
  });

  it('should generate structured clickable citations', () => {
    const citations = citationGenerator.generateCitations(sourceChunks);
    expect(citations.length).toBe(1);
    expect(citations[0].documentTitle).toBe('Refund Policy');
    expect(citations[0].section).toBe('Section 4: Withdrawals');
  });
});
