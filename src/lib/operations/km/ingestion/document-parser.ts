import crypto from 'crypto';

export interface ParsedDocument {
  documentId: string;
  title: string;
  category: 'academic' | 'policy' | 'administrative' | 'faculty';
  fileType: 'pdf' | 'docx' | 'md' | 'html' | 'txt';
  contentHash: string;
  rawText: string;
  sections: Array<{
    heading: string;
    level: number;
    body: string;
  }>;
  metadata: Record<string, any>;
}

export class DocumentParser {
  /**
   * Parses raw file content or text buffer into normalized structured document representation.
   */
  public parseDocument(
    rawInput: string,
    options: {
      documentId?: string;
      title: string;
      category?: 'academic' | 'policy' | 'administrative' | 'faculty';
      fileType?: 'pdf' | 'docx' | 'md' | 'html' | 'txt';
      metadata?: Record<string, any>;
    }
  ): ParsedDocument {
    const documentId = options.documentId || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const category = options.category || 'academic';
    const fileType = options.fileType || 'md';
    const normalizedText = this.normalizeText(rawInput, fileType);
    const contentHash = crypto.createHash('sha256').update(normalizedText).digest('hex');
    const sections = this.extractSections(normalizedText);

    return {
      documentId,
      title: options.title,
      category,
      fileType,
      contentHash,
      rawText: normalizedText,
      sections,
      metadata: options.metadata || {},
    };
  }

  private normalizeText(input: string, fileType: string): string {
    if (fileType === 'html') {
      // Strip HTML tags, retain paragraph breaks
      return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n\n# $1\n\n')
        .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n')
        .replace(/<br\s*[\/]?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }

    return input.replace(/\r\n/g, '\n').trim();
  }

  private extractSections(text: string): Array<{ heading: string; level: number; body: string }> {
    const lines = text.split('\n');
    const sections: Array<{ heading: string; level: number; body: string }> = [];

    let currentHeading = 'Introduction';
    let currentLevel = 1;
    let currentBodyLines: string[] = [];

    for (const line of lines) {
      const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headerMatch) {
        if (currentBodyLines.length > 0) {
          sections.push({
            heading: currentHeading,
            level: currentLevel,
            body: currentBodyLines.join('\n').trim(),
          });
          currentBodyLines = [];
        }
        currentLevel = headerMatch[1].length;
        currentHeading = headerMatch[2].trim();
      } else {
        currentBodyLines.push(line);
      }
    }

    if (currentBodyLines.length > 0 || sections.length === 0) {
      sections.push({
        heading: currentHeading,
        level: currentLevel,
        body: currentBodyLines.join('\n').trim(),
      });
    }

    return sections;
  }
}

export const documentParser = new DocumentParser();
