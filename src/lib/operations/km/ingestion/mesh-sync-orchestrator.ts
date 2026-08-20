import { documentParser, ParsedDocument } from './document-parser';
import { semanticChunker } from './semantic-chunker';
import { entityExtractor } from './entity-extractor';
import { campusGraph } from '../graph/knowledge-graph-engine';
import { hybridFusionEngine } from '../retrieval/hybrid-fusion-engine';
import { kmStore } from '@/lib/db/km-store';
import { DocumentChunk } from '../km-types';

export interface IngestionResult {
  documentId: string;
  title: string;
  totalChunks: number;
  entitiesExtracted: number;
  relationsExtracted: number;
  contentHash: string;
  status: 'indexed' | 'skipped_duplicate' | 'failed';
}

export class MeshSyncOrchestrator {
  private indexedDocumentHashes: Map<string, string> = new Map(); // docId -> hash

  /**
   * Complete end-to-end ingestion pipeline: Parse -> Chunk -> Extract Entities/Relations -> Index Vector/BM25 -> Graph Sync -> Store
   */
  public async ingestDocument(
    rawText: string,
    options: {
      documentId?: string;
      title: string;
      category?: 'academic' | 'policy' | 'administrative' | 'faculty';
      fileType?: 'pdf' | 'docx' | 'md' | 'html' | 'txt';
      institutionId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<IngestionResult> {
    const institutionId = options.institutionId || 'global';
    const parsedDoc = documentParser.parseDocument(rawText, options);

    // Change detection check
    const previousHash = this.indexedDocumentHashes.get(parsedDoc.documentId);
    if (previousHash === parsedDoc.contentHash) {
      return {
        documentId: parsedDoc.documentId,
        title: parsedDoc.title,
        totalChunks: 0,
        entitiesExtracted: 0,
        relationsExtracted: 0,
        contentHash: parsedDoc.contentHash,
        status: 'skipped_duplicate',
      };
    }

    // 1. Chunk document
    const chunks = semanticChunker.chunkDocument(parsedDoc);

    // 2. Extract entities and relations
    const { nodes, edges } = entityExtractor.extractEntities(parsedDoc.rawText, parsedDoc.documentId);

    // 3. Update Knowledge Graph
    for (const node of nodes) {
      campusGraph.addNode(node);
      await kmStore.createEntity({
        entityId: node.id,
        name: node.name,
        type: node.type,
        code: node.code,
        metadata: JSON.stringify(node.metadata || {}),
        institutionId,
      });
    }

    for (const edge of edges) {
      campusGraph.addEdge(edge);
      await kmStore.createRelation({
        relationId: edge.id,
        sourceEntityId: edge.source,
        targetEntityId: edge.target,
        relationType: edge.relation,
        weight: edge.weight || 1.0,
        properties: JSON.stringify(edge.properties || {}),
        institutionId,
      });
    }

    // 4. Index in Hybrid Retrieval (Vector + BM25)
    await hybridFusionEngine.indexBatch(chunks, institutionId);

    // 5. Persist to DB store
    await kmStore.createDocument({
      documentId: parsedDoc.documentId,
      title: parsedDoc.title,
      category: parsedDoc.category,
      fileType: parsedDoc.fileType,
      contentHash: parsedDoc.contentHash,
      rawText: parsedDoc.rawText,
      status: 'indexed',
      metadata: JSON.stringify(parsedDoc.metadata),
      institutionId,
    });

    for (const chunk of chunks) {
      await kmStore.createChunk({
        chunkId: chunk.chunkId,
        documentId: chunk.documentId,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        tokenCount: chunk.tokenCount,
        metadata: JSON.stringify(chunk.metadata || {}),
        institutionId,
      });
    }

    this.indexedDocumentHashes.set(parsedDoc.documentId, parsedDoc.contentHash);

    return {
      documentId: parsedDoc.documentId,
      title: parsedDoc.title,
      totalChunks: chunks.length,
      entitiesExtracted: nodes.length,
      relationsExtracted: edges.length,
      contentHash: parsedDoc.contentHash,
      status: 'indexed',
    };
  }

  public clear(): void {
    this.indexedDocumentHashes.clear();
  }
}

export const meshSyncOrchestrator = new MeshSyncOrchestrator();
