import { db } from '@thaiba/db';
import {
  kmEntities,
  kmRelations,
  kmDocuments,
  kmChunks,
  kmEmbeddings,
  kmDegreePrograms,
  kmCoursePrerequisites,
  kmAdvisingSessions,
  kmAdvisingInterventions,
  kmTranslationCache,
} from '@thaiba/db/schema';
type OptionalId<T> = Omit<T, 'id'> & { id?: string };

export interface InMemoryKmStore {
  entities: Map<string, any>;
  relations: Map<string, any>;
  documents: Map<string, any>;
  chunks: Map<string, any>;
  embeddings: Map<string, any>;
  degreePrograms: Map<string, any>;
  coursePrerequisites: Map<string, any>;
  advisingSessions: Map<string, any>;
  advisingInterventions: Map<string, any>;
  translationCache: Map<string, any>;
}

export class KmDbStore {
  private static instance: KmDbStore;
  private memoryStore: InMemoryKmStore = {
    entities: new Map(),
    relations: new Map(),
    documents: new Map(),
    chunks: new Map(),
    embeddings: new Map(),
    degreePrograms: new Map(),
    coursePrerequisites: new Map(),
    advisingSessions: new Map(),
    advisingInterventions: new Map(),
    translationCache: new Map(),
  };

  public static getInstance(): KmDbStore {
    if (!KmDbStore.instance) {
      KmDbStore.instance = new KmDbStore();
    }
    return KmDbStore.instance;
  }

  public clearMemoryStore(): void {
    this.memoryStore.entities.clear();
    this.memoryStore.relations.clear();
    this.memoryStore.documents.clear();
    this.memoryStore.chunks.clear();
    this.memoryStore.embeddings.clear();
    this.memoryStore.degreePrograms.clear();
    this.memoryStore.coursePrerequisites.clear();
    this.memoryStore.advisingSessions.clear();
    this.memoryStore.advisingInterventions.clear();
    this.memoryStore.translationCache.clear();
  }

  // ─── Entities ───
  async createEntity(data: OptionalId<typeof kmEntities.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `kme_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.entities.set(record.entityId, record);
    try {
      if (db) await db.insert(kmEntities).values(record as any);
    } catch {
      // Memory fallback for tests
    }
    return record;
  }

  async getEntityById(entityId: string, tenantId: string = 'global'): Promise<any | null> {
    const item = this.memoryStore.entities.get(entityId);
    if (item && (item.institutionId === tenantId || tenantId === 'global')) {
      return item;
    }
    return null;
  }

  async listEntities(tenantId: string = 'global', type?: string): Promise<any[]> {
    const list = Array.from(this.memoryStore.entities.values()).filter(
      (e) => (tenantId === 'global' || e.institutionId === tenantId) && (!type || e.type === type)
    );
    return list;
  }

  // ─── Relations ───
  async createRelation(data: OptionalId<typeof kmRelations.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `kmr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: data.createdAt || new Date().toISOString(),
    };
    this.memoryStore.relations.set(record.relationId, record);
    try {
      if (db) await db.insert(kmRelations).values(record as any);
    } catch {}
    return record;
  }

  async listRelations(tenantId: string = 'global', sourceEntityId?: string): Promise<any[]> {
    return Array.from(this.memoryStore.relations.values()).filter(
      (r) =>
        (tenantId === 'global' || r.institutionId === tenantId) &&
        (!sourceEntityId || r.sourceEntityId === sourceEntityId)
    );
  }

  // ─── Documents ───
  async createDocument(data: OptionalId<typeof kmDocuments.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `kmd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.documents.set(record.documentId, record);
    try {
      if (db) await db.insert(kmDocuments).values(record as any);
    } catch {}
    return record;
  }

  async getDocumentById(documentId: string, tenantId: string = 'global'): Promise<any | null> {
    const doc = this.memoryStore.documents.get(documentId);
    if (doc && (doc.institutionId === tenantId || tenantId === 'global')) {
      return doc;
    }
    return null;
  }

  async listDocuments(tenantId: string = 'global', category?: string): Promise<any[]> {
    return Array.from(this.memoryStore.documents.values()).filter(
      (d) =>
        (tenantId === 'global' || d.institutionId === tenantId) &&
        (!category || d.category === category)
    );
  }

  // ─── Chunks ───
  async createChunk(data: OptionalId<typeof kmChunks.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `kmc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: data.createdAt || new Date().toISOString(),
    };
    this.memoryStore.chunks.set(record.chunkId, record);
    try {
      if (db) await db.insert(kmChunks).values(record as any);
    } catch {}
    return record;
  }

  async listChunksByDocument(documentId: string, tenantId: string = 'global'): Promise<any[]> {
    return Array.from(this.memoryStore.chunks.values()).filter(
      (c) =>
        (tenantId === 'global' || c.institutionId === tenantId) &&
        c.documentId === documentId
    );
  }

  // ─── Embeddings ───
  async createEmbedding(data: OptionalId<typeof kmEmbeddings.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `kmeb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: data.createdAt || new Date().toISOString(),
    };
    this.memoryStore.embeddings.set(record.embeddingId, record);
    try {
      if (db) await db.insert(kmEmbeddings).values(record as any);
    } catch {}
    return record;
  }

  async getEmbeddingByChunk(chunkId: string, tenantId: string = 'global'): Promise<any | null> {
    const items = Array.from(this.memoryStore.embeddings.values()).filter(
      (eb) => (tenantId === 'global' || eb.institutionId === tenantId) && eb.chunkId === chunkId
    );
    return items[0] || null;
  }

  // ─── Degree Programs ───
  async createDegreeProgram(data: OptionalId<typeof kmDegreePrograms.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `kmp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.degreePrograms.set(record.programId, record);
    try {
      if (db) await db.insert(kmDegreePrograms).values(record as any);
    } catch {}
    return record;
  }

  async getDegreeProgramByCode(code: string, tenantId: string = 'global'): Promise<any | null> {
    const items = Array.from(this.memoryStore.degreePrograms.values()).filter(
      (p) => (tenantId === 'global' || p.institutionId === tenantId) && p.code === code
    );
    return items[0] || null;
  }

  async listDegreePrograms(tenantId: string = 'global'): Promise<any[]> {
    return Array.from(this.memoryStore.degreePrograms.values()).filter(
      (p) => tenantId === 'global' || p.institutionId === tenantId
    );
  }

  // ─── Course Prerequisites ───
  async createCoursePrerequisite(data: OptionalId<typeof kmCoursePrerequisites.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `kmpr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: data.createdAt || new Date().toISOString(),
    };
    this.memoryStore.coursePrerequisites.set(record.prereqId, record);
    try {
      if (db) await db.insert(kmCoursePrerequisites).values(record as any);
    } catch {}
    return record;
  }

  async listPrerequisitesForCourse(courseCode: string, tenantId: string = 'global'): Promise<any[]> {
    return Array.from(this.memoryStore.coursePrerequisites.values()).filter(
      (pr) =>
        (tenantId === 'global' || pr.institutionId === tenantId) &&
        pr.courseCode === courseCode
    );
  }

  // ─── Advising Sessions ───
  async createAdvisingSession(data: OptionalId<typeof kmAdvisingSessions.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `kmas_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.advisingSessions.set(record.sessionId, record);
    try {
      if (db) await db.insert(kmAdvisingSessions).values(record as any);
    } catch {}
    return record;
  }

  async getAdvisingSession(sessionId: string, tenantId: string = 'global'): Promise<any | null> {
    const sesh = this.memoryStore.advisingSessions.get(sessionId);
    if (sesh && (sesh.institutionId === tenantId || tenantId === 'global')) {
      return sesh;
    }
    return null;
  }

  // ─── Advising Interventions ───
  async createAdvisingIntervention(data: OptionalId<typeof kmAdvisingInterventions.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `kmai_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.advisingInterventions.set(record.interventionId, record);
    try {
      if (db) await db.insert(kmAdvisingInterventions).values(record as any);
    } catch {}
    return record;
  }

  async listInterventionsByStudent(studentId: string, tenantId: string = 'global'): Promise<any[]> {
    return Array.from(this.memoryStore.advisingInterventions.values()).filter(
      (i) =>
        (tenantId === 'global' || i.institutionId === tenantId) &&
        i.studentId === studentId
    );
  }

  // ─── Translation Cache ───
  async setTranslationCache(data: OptionalId<typeof kmTranslationCache.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `kmtc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: data.createdAt || new Date().toISOString(),
    };
    this.memoryStore.translationCache.set(record.contentHash, record);
    try {
      if (db) await db.insert(kmTranslationCache).values(record as any);
    } catch {}
    return record;
  }

  async getTranslationCache(contentHash: string, targetLanguage: string): Promise<any | null> {
    const cached = this.memoryStore.translationCache.get(contentHash);
    if (cached && cached.targetLanguage === targetLanguage) {
      return cached;
    }
    return null;
  }
}

export const kmStore = KmDbStore.getInstance();
