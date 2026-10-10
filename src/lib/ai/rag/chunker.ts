import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document as LangchainDocument } from "@langchain/core/documents";

export interface ChunkMetadata {
  sourceType: "policy" | "circular" | "academic" | "hr" | "fee" | "general";
  sourceId: string;
  institutionId: string;
  title: string;
  chunkIndex: number;
  totalChunks: number;
  headingPath: string[];
  tableContext?: {
    tableIndex: number;
    rowIndex: number;
    headers: string[];
  };
}

export interface Chunk {
  content: string;
  metadata: ChunkMetadata;
  tokenCount: number;
}

function countTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function extractHeadingPath(markdown: string, chunkStart: number, chunkContent: string): string[] {
  // First, try to extract headings from the chunk content itself
  const chunkLines = chunkContent.split("\n");
  const headings: string[] = [];
  
  for (const line of chunkLines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      headings.splice(level - 1);
      headings.push(text);
    }
  }
  
  // If no headings in chunk, fall back to looking at content before chunk
  if (headings.length === 0 && chunkStart > 0) {
    const lines = markdown.slice(0, chunkStart).split("\n");
    for (const line of lines) {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        headings.splice(level - 1);
        headings.push(text);
      }
    }
  }
  
  return headings;
}

function extractTables(markdown: string): Array<{ start: number; end: number; headers: string[]; rows: string[][] }> {
  const tables: Array<{ start: number; end: number; headers: string[]; rows: string[][] }> = [];
  const lines = markdown.split("\n");
  let inTable = false;
  let tableStart = -1;
  let headers: string[] = [];
  let rows: string[][] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("|") && line.endsWith("|")) {
      if (!inTable) {
        inTable = true;
        tableStart = i;
        headers = line.slice(1, -1).split("|").map(h => h.trim());
      } else if (line.match(/^\|[\s\-:|]+\|$/)) {
        continue;
      } else {
        const row = line.slice(1, -1).split("|").map(c => c.trim());
        rows.push(row);
      }
    } else if (inTable) {
      tables.push({ start: tableStart, end: i - 1, headers, rows });
      inTable = false;
      headers = [];
      rows = [];
    }
  }
  if (inTable) {
    tables.push({ start: tableStart, end: lines.length - 1, headers, rows });
  }
  return tables;
}

export class StructureAwareChunker {
  private splitter: RecursiveCharacterTextSplitter;

  constructor(
    chunkSize: number = 512,
    chunkOverlap: number = 50
  ) {
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
      separators: ["\n\n", "\n", ". ", " ", ""],
      keepSeparator: true,
    });
  }

  async chunkDocument(
    content: string,
    metadata: Omit<ChunkMetadata, "chunkIndex" | "totalChunks" | "headingPath" | "tableContext">
  ): Promise<Chunk[]> {
    console.log("[Chunker] Input content length:", content.length);
    
    const tables = extractTables(content);
    const langchainDoc = new LangchainDocument({ pageContent: content, metadata: {} });
    const chunks = await this.splitter.splitDocuments([langchainDoc]);

    console.log("[Chunker] Splitter returned chunks:", chunks.length);

    const results: Chunk[] = [];
    let chunkIndex = 0;

    for (const chunk of chunks) {
      console.log("[Chunker] Chunk content length:", chunk.pageContent.length);
      const chunkStart = content.indexOf(chunk.pageContent);
      const headingPath = extractHeadingPath(content, chunkStart, chunk.pageContent);

      let tableContext: ChunkMetadata["tableContext"] = undefined;
      for (const table of tables) {
        if (chunkStart >= table.start && chunkStart <= table.end) {
          const linesBefore = content.slice(table.start, chunkStart).split("\n").length;
          tableContext = {
            tableIndex: tables.indexOf(table),
            rowIndex: Math.max(0, linesBefore - 2),
            headers: table.headers,
          };
          break;
        }
      }

      results.push({
        content: chunk.pageContent.trim(),
        metadata: {
          ...metadata,
          chunkIndex,
          totalChunks: 0,
          headingPath,
          tableContext,
        },
        tokenCount: countTokens(chunk.pageContent),
      });
      chunkIndex++;
    }

    results.forEach(r => { r.metadata.totalChunks = results.length; });
    console.log("[Chunker] Final results count:", results.length);
    return results;
  }

  async chunkPolicyDocument(
    content: string,
    institutionId: string,
    sourceId: string,
    title: string
  ): Promise<Chunk[]> {
    return this.chunkDocument(content, {
      sourceType: "policy",
      sourceId,
      institutionId,
      title,
    });
  }

  async chunkCircularDocument(
    content: string,
    institutionId: string,
    sourceId: string,
    title: string
  ): Promise<Chunk[]> {
    return this.chunkDocument(content, {
      sourceType: "circular",
      sourceId,
      institutionId,
      title,
    });
  }

  async chunkAcademicDocument(
    content: string,
    institutionId: string,
    sourceId: string,
    title: string
  ): Promise<Chunk[]> {
    return this.chunkDocument(content, {
      sourceType: "academic",
      sourceId,
      institutionId,
      title,
    });
  }
}

export const structureAwareChunker = new StructureAwareChunker();