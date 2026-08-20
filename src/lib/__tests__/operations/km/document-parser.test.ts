import { documentParser } from '@/lib/operations/km/ingestion/document-parser';
import { semanticChunker } from '@/lib/operations/km/ingestion/semantic-chunker';

describe('Document Ingestion & Semantic Chunker (KM-006)', () => {
  it('should parse markdown document with hierarchical sections', () => {
    const rawMarkdown = `
# Academic Catalog 2026

## Overview
This catalog describes the academic programs and graduation rules.

## Computer Science Major
The BS in CS requires 120 credit hours including core courses and electives.
`;

    const parsed = documentParser.parseDocument(rawMarkdown, {
      title: 'Academic Catalog 2026',
      category: 'academic',
      fileType: 'md',
    });

    expect(parsed.title).toBe('Academic Catalog 2026');
    expect(parsed.sections.length).toBe(3);
    expect(parsed.contentHash).toBeDefined();
  });

  it('should chunk parsed document preserving section tags and metadata', () => {
    const rawText = `
# Faculty Handbook

## Office Hours Policy
All full-time faculty members must hold at least 4 scheduled office hours per week.
Office hours may be conducted in-person or virtually via campus conferencing systems.
`;

    const parsed = documentParser.parseDocument(rawText, {
      title: 'Faculty Handbook',
      category: 'faculty',
      fileType: 'md',
      metadata: { department: 'Academic Affairs' },
    });

    const chunks = semanticChunker.chunkDocument(parsed, { maxTokensPerChunk: 100 });
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].content).toContain('[Section:');
    expect(chunks[0].metadata?.department).toBe('Academic Affairs');
  });
});
