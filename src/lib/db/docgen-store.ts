import { db } from '@thaiba/db';
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
  ExportJobStatus,
} from '../operations/docgen/docgen-types';

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
    for (const item of this.memoryStore.signatures.values()) {
      if (item.documentHash === documentHash) {
        item.verificationCount += 1;
        item.lastVerifiedAt = new Date().toISOString();
        return;
      }
    }
  }

  // ─── Export Jobs ───

  public async createExportJob(item: ExportJobItem): Promise<ExportJobItem> {
    this.memoryStore.exportJobs.set(item.id, { ...item });
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

  // ─── Mobile Sync & Tokens ───

  public async registerDeviceToken(item: MobileDeviceTokenItem): Promise<MobileDeviceTokenItem> {
    this.memoryStore.deviceTokens.set(item.id, { ...item });
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
    return item;
  }

  // ─── Audit Logs ───

  public async logAudit(item: DocAuditLogItem): Promise<DocAuditLogItem> {
    this.memoryStore.auditLogs.set(item.id, { ...item });
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
