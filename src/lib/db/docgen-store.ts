import { db } from '@thaiba/db';
import { eq } from 'drizzle-orm';
import {
  docTemplates,
  docGeneratedRecords,
  docVerificationSignatures,
  exportJobs,
  exportTemplates,
  mobileSyncEvents,
  mobileDeviceTokens,
  mobilePushLogs,
  docAuditLogs,
} from '@thaiba/db/schema';
import {
  DocTemplateItem,
  DocGeneratedRecordItem,
  DocVerificationSignatureItem,
  ExportJobItem,
  ExportTemplateItem,
  MobileSyncEventItem,
  MobileDeviceTokenItem,
  MobilePushLogItem,
  DocAuditLogItem,
  DocCategory,
  DocRecordStatus,
} from '../operations/docgen/docgen-types';

function handleWriteError(operation: string, error: unknown): void {
  if (process.env.NODE_ENV === 'production') {
    throw error;
  }
  console.warn(`[DocDbStore] DB write fallback on ${operation}:`, error instanceof Error ? error.message : error);
}

export interface InMemoryDocStore {
  templates: Map<string, DocTemplateItem>;
  records: Map<string, DocGeneratedRecordItem>;
  signatures: Map<string, DocVerificationSignatureItem>;
  exportJobs: Map<string, ExportJobItem>;
  exportTemplates: Map<string, ExportTemplateItem>;
  syncEvents: Map<string, MobileSyncEventItem>;
  deviceTokens: Map<string, MobileDeviceTokenItem>;
  pushLogs: Map<string, MobilePushLogItem>;
  auditLogs: Map<string, DocAuditLogItem>;
}

export class DocDbStore {
  private static instance: DocDbStore;
  private memoryStore: InMemoryDocStore = {
    templates: new Map(),
    records: new Map(),
    signatures: new Map(),
    exportJobs: new Map(),
    exportTemplates: new Map(),
    syncEvents: new Map(),
    deviceTokens: new Map(),
    pushLogs: new Map(),
    auditLogs: new Map(),
  };

  public static getInstance(): DocDbStore {
    if (!DocDbStore.instance) {
      DocDbStore.instance = new DocDbStore();
    }
    return DocDbStore.instance;
  }

  public clearMemoryStore(): void {
    this.memoryStore.templates.clear();
    this.memoryStore.records.clear();
    this.memoryStore.signatures.clear();
    this.memoryStore.exportJobs.clear();
    this.memoryStore.exportTemplates.clear();
    this.memoryStore.syncEvents.clear();
    this.memoryStore.deviceTokens.clear();
    this.memoryStore.pushLogs.clear();
    this.memoryStore.auditLogs.clear();
  }

  // ─── Template Operations ───

  public async createTemplate(item: DocTemplateItem): Promise<DocTemplateItem> {
    this.memoryStore.templates.set(item.id, { ...item });
    if (db) {
      try {
        await db.insert(docTemplates).values({
          id: item.id,
          institutionId: item.institutionId,
          templateCode: item.templateCode,
          name: item.name,
          category: item.category,
          layoutConfig: item.layoutConfig ?? null,
          contentTemplate: item.contentTemplate,
          cssStyles: item.cssStyles ?? null,
          version: item.version,
          isDefault: item.isDefault,
          status: item.status,
          createdById: item.createdById ?? null,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        }).onConflictDoUpdate({
          target: docTemplates.id,
          set: {
            name: item.name,
            category: item.category,
            layoutConfig: item.layoutConfig ?? null,
            contentTemplate: item.contentTemplate,
            cssStyles: item.cssStyles ?? null,
            version: item.version,
            isDefault: item.isDefault,
            status: item.status,
            updatedAt: item.updatedAt,
          },
        });
      } catch (error) {
        handleWriteError('createTemplate', error);
      }
    }
    return item;
  }

  public async getTemplateById(id: string, institutionId?: string): Promise<DocTemplateItem | null> {
    const item = this.memoryStore.templates.get(id);
    if (!item) return null;
    if (institutionId && item.institutionId !== institutionId && item.institutionId !== 'global') {
      return null;
    }
    return item;
  }

  public async getTemplateByCode(templateCode: string, institutionId?: string): Promise<DocTemplateItem | null> {
    for (const item of this.memoryStore.templates.values()) {
      if (item.templateCode === templateCode) {
        if (!institutionId || item.institutionId === institutionId || item.institutionId === 'global') {
          return item;
        }
      }
    }
    return null;
  }

  public async listTemplates(institutionId: string, category?: DocCategory): Promise<DocTemplateItem[]> {
    const list: DocTemplateItem[] = [];
    for (const item of this.memoryStore.templates.values()) {
      if (item.institutionId === institutionId || item.institutionId === 'global') {
        if (!category || item.category === category) {
          list.push(item);
        }
      }
    }
    return list;
  }

  // ─── Generated Records Operations ───

  public async createGeneratedRecord(item: DocGeneratedRecordItem): Promise<DocGeneratedRecordItem> {
    this.memoryStore.records.set(item.id, { ...item });
    if (db) {
      try {
        await db.insert(docGeneratedRecords).values({
          id: item.id,
          institutionId: item.institutionId,
          templateId: item.templateId ?? null,
          documentType: item.documentType,
          recipientType: item.recipientType,
          recipientId: item.recipientId,
          academicYearId: item.academicYearId ?? null,
          examId: item.examId ?? null,
          documentHash: item.documentHash,
          serialNumber: item.serialNumber,
          title: item.title,
          fileUrl: item.fileUrl ?? null,
          fileSizeBytes: item.fileSizeBytes,
          status: item.status,
          metadataJson: item.metadataJson ?? null,
          generatedById: item.generatedById ?? null,
          issuedAt: item.issuedAt,
          expiresAt: item.expiresAt ?? null,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        }).onConflictDoUpdate({
          target: docGeneratedRecords.id,
          set: {
            title: item.title,
            fileUrl: item.fileUrl ?? null,
            fileSizeBytes: item.fileSizeBytes,
            status: item.status,
            metadataJson: item.metadataJson ?? null,
            updatedAt: item.updatedAt,
          },
        });
      } catch (error) {
        handleWriteError('createGeneratedRecord', error);
      }
    }
    return item;
  }

  public async getGeneratedRecordById(id: string, institutionId?: string): Promise<DocGeneratedRecordItem | null> {
    const item = this.memoryStore.records.get(id);
    if (!item) return null;
    if (institutionId && item.institutionId !== institutionId) return null;
    return item;
  }

  public async getGeneratedRecordByHash(documentHash: string): Promise<DocGeneratedRecordItem | null> {
    for (const item of this.memoryStore.records.values()) {
      if (item.documentHash === documentHash) {
        return item;
      }
    }
    return null;
  }

  public async listGeneratedRecords(
    institutionId: string,
    filters?: { recipientId?: string; documentType?: DocCategory; status?: DocRecordStatus }
  ): Promise<DocGeneratedRecordItem[]> {
    const list: DocGeneratedRecordItem[] = [];
    for (const item of this.memoryStore.records.values()) {
      if (item.institutionId === institutionId) {
        if (filters?.recipientId && item.recipientId !== filters.recipientId) continue;
        if (filters?.documentType && item.documentType !== filters.documentType) continue;
        if (filters?.status && item.status !== filters.status) continue;
        list.push(item);
      }
    }
    return list;
  }

  // ─── Verification Signatures ───

  public async createVerificationSignature(item: DocVerificationSignatureItem): Promise<DocVerificationSignatureItem> {
    this.memoryStore.signatures.set(item.id, { ...item });
    if (db) {
      try {
        await db.insert(docVerificationSignatures).values({
          id: item.id,
          documentRecordId: item.documentRecordId,
          documentHash: item.documentHash,
          signature: item.signature,
          signerPublicKey: item.signerPublicKey ?? null,
          signingAlgorithm: item.signingAlgorithm,
          merkleRoot: item.merkleRoot ?? null,
          merkleProof: item.merkleProof ?? null,
          verificationCount: item.verificationCount,
          lastVerifiedAt: item.lastVerifiedAt ?? null,
          revoked: item.revoked,
          revokedReason: item.revokedReason ?? null,
          createdAt: item.createdAt,
        }).onConflictDoNothing();
      } catch (error) {
        handleWriteError('createVerificationSignature', error);
      }
    }
    return item;
  }

  public async getVerificationSignatureByHash(documentHash: string): Promise<DocVerificationSignatureItem | null> {
    for (const item of this.memoryStore.signatures.values()) {
      if (item.documentHash === documentHash) {
        return item;
      }
    }
    return null;
  }

  public async incrementVerificationCount(documentHash: string): Promise<void> {
    const now = new Date().toISOString();
    let updatedCount: number | null = null;
    for (const item of this.memoryStore.signatures.values()) {
      if (item.documentHash === documentHash) {
        item.verificationCount += 1;
        item.lastVerifiedAt = now;
        updatedCount = item.verificationCount;
        break;
      }
    }

    if (db && updatedCount !== null) {
      try {
        await db.update(docVerificationSignatures).set({
          verificationCount: updatedCount,
          lastVerifiedAt: now,
        }).where(eq(docVerificationSignatures.documentHash, documentHash));
      } catch (error) {
        handleWriteError('incrementVerificationCount', error);
      }
    }
  }

  // ─── Export Jobs ───

  public async createExportJob(item: ExportJobItem): Promise<ExportJobItem> {
    this.memoryStore.exportJobs.set(item.id, { ...item });
    if (db) {
      try {
        await db.insert(exportJobs).values({
          id: item.id,
          institutionId: item.institutionId,
          userId: item.userId,
          jobType: item.jobType,
          format: item.format,
          filterParamsJson: item.filterParamsJson ?? null,
          selectedColumnsJson: item.selectedColumnsJson ?? null,
          status: item.status,
          progressPercent: item.progressPercent,
          totalRecords: item.totalRecords,
          processedRecords: item.processedRecords,
          downloadUrl: item.downloadUrl ?? null,
          fileSizeBytes: item.fileSizeBytes,
          errorMessage: item.errorMessage ?? null,
          downloadToken: item.downloadToken ?? null,
          expiresAt: item.expiresAt ?? null,
          createdAt: item.createdAt,
          completedAt: item.completedAt ?? null,
        }).onConflictDoNothing();
      } catch (error) {
        handleWriteError('createExportJob', error);
      }
    }
    return item;
  }

  public async getExportJobById(id: string, institutionId?: string): Promise<ExportJobItem | null> {
    const item = this.memoryStore.exportJobs.get(id);
    if (!item) return null;
    if (institutionId && item.institutionId !== institutionId) return null;
    return item;
  }

  public async updateExportJobStatus(
    id: string,
    updates: Partial<Pick<ExportJobItem, 'status' | 'progressPercent' | 'processedRecords' | 'totalRecords' | 'downloadUrl' | 'fileSizeBytes' | 'errorMessage' | 'completedAt'>>
  ): Promise<ExportJobItem | null> {
    const item = this.memoryStore.exportJobs.get(id);
    if (!item) return null;
    Object.assign(item, updates);

    if (db) {
      try {
        const dbUpdates: Record<string, unknown> = {};
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.progressPercent !== undefined) dbUpdates.progressPercent = updates.progressPercent;
        if (updates.processedRecords !== undefined) dbUpdates.processedRecords = updates.processedRecords;
        if (updates.totalRecords !== undefined) dbUpdates.totalRecords = updates.totalRecords;
        if (updates.downloadUrl !== undefined) dbUpdates.downloadUrl = updates.downloadUrl ?? null;
        if (updates.fileSizeBytes !== undefined) dbUpdates.fileSizeBytes = updates.fileSizeBytes;
        if (updates.errorMessage !== undefined) dbUpdates.errorMessage = updates.errorMessage ?? null;
        if (updates.completedAt !== undefined) dbUpdates.completedAt = updates.completedAt ?? null;

        if (Object.keys(dbUpdates).length > 0) {
          await db.update(exportJobs).set(dbUpdates).where(eq(exportJobs.id, id));
        }
      } catch (error) {
        handleWriteError('updateExportJobStatus', error);
      }
    }

    return item;
  }

  public async listExportJobs(institutionId: string, userId?: string): Promise<ExportJobItem[]> {
    const list: ExportJobItem[] = [];
    for (const item of this.memoryStore.exportJobs.values()) {
      if (item.institutionId === institutionId) {
        if (!userId || item.userId === userId) {
          list.push(item);
        }
      }
    }
    return list;
  }

  // ─── Export Templates ───

  public async createExportTemplate(item: ExportTemplateItem): Promise<ExportTemplateItem> {
    this.memoryStore.exportTemplates.set(item.id, { ...item });
    if (db) {
      try {
        await db.insert(exportTemplates).values({
          id: item.id,
          institutionId: item.institutionId,
          name: item.name,
          entityType: item.entityType,
          columnMappingJson: item.columnMappingJson,
          defaultFormat: item.defaultFormat,
          isPublic: item.isPublic,
          createdById: item.createdById ?? null,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        }).onConflictDoUpdate({
          target: exportTemplates.id,
          set: {
            name: item.name,
            entityType: item.entityType,
            columnMappingJson: item.columnMappingJson,
            defaultFormat: item.defaultFormat,
            isPublic: item.isPublic,
            updatedAt: item.updatedAt,
          },
        });
      } catch (error) {
        handleWriteError('createExportTemplate', error);
      }
    }
    return item;
  }

  public async getExportTemplateById(id: string, institutionId?: string): Promise<ExportTemplateItem | null> {
    const item = this.memoryStore.exportTemplates.get(id);
    if (!item) return null;
    if (institutionId && item.institutionId !== institutionId) return null;
    return item;
  }

  public async listExportTemplates(institutionId: string): Promise<ExportTemplateItem[]> {
    const list: ExportTemplateItem[] = [];
    for (const item of this.memoryStore.exportTemplates.values()) {
      if (item.institutionId === institutionId || item.isPublic) {
        list.push(item);
      }
    }
    return list;
  }

  // ─── Mobile Sync & Tokens ───

  public async registerDeviceToken(item: MobileDeviceTokenItem): Promise<MobileDeviceTokenItem> {
    this.memoryStore.deviceTokens.set(item.id, { ...item });
    if (db) {
      try {
        await db.insert(mobileDeviceTokens).values({
          id: item.id,
          userId: item.userId,
          institutionId: item.institutionId,
          deviceToken: item.deviceToken,
          platform: item.platform,
          deviceModel: item.deviceModel ?? null,
          appVersion: item.appVersion ?? null,
          isActive: item.isActive,
          lastSeenAt: item.lastSeenAt,
          createdAt: item.createdAt,
        }).onConflictDoUpdate({
          target: mobileDeviceTokens.deviceToken,
          set: {
            userId: item.userId,
            institutionId: item.institutionId,
            platform: item.platform,
            deviceModel: item.deviceModel ?? null,
            appVersion: item.appVersion ?? null,
            isActive: item.isActive,
            lastSeenAt: item.lastSeenAt,
          },
        });
      } catch (error) {
        handleWriteError('registerDeviceToken', error);
      }
    }
    return item;
  }

  public async getDeviceTokensByUser(userId: string, institutionId?: string): Promise<MobileDeviceTokenItem[]> {
    const list: MobileDeviceTokenItem[] = [];
    for (const item of this.memoryStore.deviceTokens.values()) {
      if (item.userId === userId && item.isActive) {
        if (!institutionId || item.institutionId === institutionId) {
          list.push(item);
        }
      }
    }
    return list;
  }

  public async createSyncEvent(item: MobileSyncEventItem): Promise<MobileSyncEventItem> {
    this.memoryStore.syncEvents.set(item.id, { ...item });
    if (db) {
      try {
        await db.insert(mobileSyncEvents).values({
          id: item.id,
          institutionId: item.institutionId,
          eventType: item.eventType,
          entityType: item.entityType,
          entityId: item.entityId,
          payloadJson: item.payloadJson,
          targetAudience: item.targetAudience,
          targetId: item.targetId ?? null,
          version: item.version,
          createdAt: item.createdAt,
        }).onConflictDoNothing();
      } catch (error) {
        handleWriteError('createSyncEvent', error);
      }
    }
    return item;
  }

  public async listSyncEvents(institutionId: string, sinceIso?: string): Promise<MobileSyncEventItem[]> {
    const list: MobileSyncEventItem[] = [];
    for (const item of this.memoryStore.syncEvents.values()) {
      if (item.institutionId === institutionId) {
        if (!sinceIso || item.createdAt >= sinceIso) {
          list.push(item);
        }
      }
    }
    return list;
  }

  public async logPushNotification(item: MobilePushLogItem): Promise<MobilePushLogItem> {
    this.memoryStore.pushLogs.set(item.id, { ...item });
    if (db) {
      try {
        await db.insert(mobilePushLogs).values({
          id: item.id,
          institutionId: item.institutionId,
          syncEventId: item.syncEventId ?? null,
          recipientUserId: item.recipientUserId,
          deviceTokenId: item.deviceTokenId ?? null,
          title: item.title,
          body: item.body,
          dataPayloadJson: item.dataPayloadJson ?? null,
          status: item.status,
          errorMessage: item.errorMessage ?? null,
          deliveredAt: item.deliveredAt ?? null,
          createdAt: item.createdAt,
        }).onConflictDoNothing();
      } catch (error) {
        handleWriteError('logPushNotification', error);
      }
    }
    return item;
  }

  // ─── Audit Logs ───

  public async logAudit(item: DocAuditLogItem): Promise<DocAuditLogItem> {
    this.memoryStore.auditLogs.set(item.id, { ...item });
    if (db) {
      try {
        await db.insert(docAuditLogs).values({
          id: item.id,
          auditId: item.auditId,
          institutionId: item.institutionId,
          actorId: item.actorId,
          actorRole: item.actorRole,
          action: item.action,
          entityType: item.entityType,
          entityId: item.entityId,
          payloadHash: item.payloadHash,
          timestamp: item.timestamp,
          createdAt: item.createdAt,
        }).onConflictDoNothing();
      } catch (error) {
        handleWriteError('logAudit', error);
      }
    }
    return item;
  }

  public async listAuditLogs(institutionId: string): Promise<DocAuditLogItem[]> {
    const list: DocAuditLogItem[] = [];
    for (const item of this.memoryStore.auditLogs.values()) {
      if (item.institutionId === institutionId) {
        list.push(item);
      }
    }
    return list;
  }
}

export const docStore = DocDbStore.getInstance();
