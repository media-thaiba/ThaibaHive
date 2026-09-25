export type DocCategory = 'report_card' | 'hall_ticket' | 'certificate' | 'fee_receipt' | 'custom';
export type DocTemplateStatus = 'draft' | 'active' | 'archived';
export type DocRecordStatus = 'valid' | 'revoked' | 'expired';
export type RecipientType = 'student' | 'guardian' | 'staff' | 'external';
export type CertificateType = 'merit' | 'completion' | 'transfer' | 'bonafide' | 'conduct';
export type ExportFormat = 'csv' | 'xlsx' | 'json' | 'pdf';
export type ExportJobType = 'students' | 'timetables' | 'attendance' | 'grades' | 'finances' | 'audit_logs' | 'custom';
export type ExportJobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'expired';
export type MobileSyncEventType = 'timetable_updated' | 'substitution_assigned' | 'exam_scheduled' | 'grades_published' | 'hall_ticket_released';
export type MobilePushStatus = 'pending' | 'delivered' | 'failed';
export type MobilePlatform = 'android' | 'ios' | 'web';
export type DocAuditAction =
  | 'template_created'
  | 'template_updated'
  | 'doc_generated'
  | 'doc_revoked'
  | 'export_initiated'
  | 'push_dispatched'
  | 'doc_verified';

export interface DocTemplateItem {
  id: string;
  institutionId: string;
  templateCode: string;
  name: string;
  category: DocCategory;
  layoutConfig?: string | null;
  contentTemplate: string;
  cssStyles?: string | null;
  version: number;
  isDefault: boolean;
  status: DocTemplateStatus;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocGeneratedRecordItem {
  id: string;
  institutionId: string;
  templateId?: string | null;
  documentType: DocCategory;
  recipientType: RecipientType;
  recipientId: string;
  academicYearId?: string | null;
  examId?: string | null;
  documentHash: string;
  serialNumber: string;
  title: string;
  fileUrl?: string | null;
  fileSizeBytes: number;
  status: DocRecordStatus;
  metadataJson?: string | null;
  generatedById?: string | null;
  issuedAt: string;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocVerificationSignatureItem {
  id: string;
  documentRecordId: string;
  documentHash: string;
  signature: string;
  signerPublicKey?: string | null;
  signingAlgorithm: string;
  merkleRoot?: string | null;
  merkleProof?: string | null;
  verificationCount: number;
  lastVerifiedAt?: string | null;
  revoked: boolean;
  revokedReason?: string | null;
  createdAt: string;
}

export interface ExportJobItem {
  id: string;
  institutionId: string;
  userId: string;
  jobType: ExportJobType;
  format: ExportFormat;
  filterParamsJson?: string | null;
  selectedColumnsJson?: string | null;
  status: ExportJobStatus;
  progressPercent: number;
  totalRecords: number;
  processedRecords: number;
  downloadUrl?: string | null;
  fileSizeBytes: number;
  errorMessage?: string | null;
  downloadToken?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

export interface ExportTemplateItem {
  id: string;
  institutionId: string;
  name: string;
  entityType: string;
  columnMappingJson: string;
  defaultFormat: ExportFormat;
  isPublic: boolean;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MobileSyncEventItem {
  id: string;
  institutionId: string;
  eventType: MobileSyncEventType;
  entityType: string;
  entityId: string;
  payloadJson: string;
  targetAudience: string;
  targetId?: string | null;
  version: number;
  createdAt: string;
}

export interface MobileDeviceTokenItem {
  id: string;
  userId: string;
  institutionId: string;
  deviceToken: string;
  platform: MobilePlatform;
  deviceModel?: string | null;
  appVersion?: string | null;
  isActive: boolean;
  lastSeenAt: string;
  createdAt: string;
}

export interface MobilePushLogItem {
  id: string;
  institutionId: string;
  syncEventId?: string | null;
  recipientUserId: string;
  deviceTokenId?: string | null;
  title: string;
  body: string;
  dataPayloadJson?: string | null;
  status: MobilePushStatus;
  errorMessage?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
}

export interface DocAuditLogItem {
  id: string;
  auditId: string;
  institutionId: string;
  actorId: string;
  actorRole: string;
  action: DocAuditAction;
  entityType: string;
  entityId: string;
  payloadHash: string;
  timestamp: string;
  createdAt: string;
}
