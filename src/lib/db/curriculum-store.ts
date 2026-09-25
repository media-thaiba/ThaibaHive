import { db } from '@thaiba/db';
import {
  curriculumPrograms,
  curriculumCourses,
  curriculumPrerequisites,
  curriculumDegreePlans,
  curriculumPlanCourses,
  curriculumTransferArticulations,
  curriculumAdvisingSessions,
  curriculumAdvisingMessages,
  curriculumRetentionAlerts,
  curriculumAuditLogs,
} from '@thaiba/db/schema';
import {
  CurriculumProgramDto,
  CurriculumCourseDto,
  CurriculumPrerequisiteDto,
  CurriculumDegreePlanDto,
  CurriculumPlanCourseDto,
  CurriculumTransferArticulationDto,
  CurriculumAdvisingSessionDto,
  CurriculumAdvisingMessageDto,
  CurriculumRetentionAlertDto,
  CurriculumAuditLogDto,
} from '../operations/curriculum/curriculum-types';

export interface InMemoryCurriculumStore {
  programs: Map<string, CurriculumProgramDto>;
  courses: Map<string, CurriculumCourseDto>;
  prerequisites: Map<string, CurriculumPrerequisiteDto>;
  degreePlans: Map<string, CurriculumDegreePlanDto>;
  planCourses: Map<string, CurriculumPlanCourseDto>;
  transferArticulations: Map<string, CurriculumTransferArticulationDto>;
  advisingSessions: Map<string, CurriculumAdvisingSessionDto>;
  advisingMessages: Map<string, CurriculumAdvisingMessageDto>;
  retentionAlerts: Map<string, CurriculumRetentionAlertDto>;
  auditLogs: Map<string, CurriculumAuditLogDto>;
}

export class CurriculumDbStore {
  private static instance: CurriculumDbStore;
  private memoryStore: InMemoryCurriculumStore = {
    programs: new Map(),
    courses: new Map(),
    prerequisites: new Map(),
    degreePlans: new Map(),
    planCourses: new Map(),
    transferArticulations: new Map(),
    advisingSessions: new Map(),
    advisingMessages: new Map(),
    retentionAlerts: new Map(),
    auditLogs: new Map(),
  };

  public static getInstance(): CurriculumDbStore {
    if (!CurriculumDbStore.instance) {
      CurriculumDbStore.instance = new CurriculumDbStore();
    }
    return CurriculumDbStore.instance;
  }

  public clearMemoryStore(): void {
    this.memoryStore.programs.clear();
    this.memoryStore.courses.clear();
    this.memoryStore.prerequisites.clear();
    this.memoryStore.degreePlans.clear();
    this.memoryStore.planCourses.clear();
    this.memoryStore.transferArticulations.clear();
    this.memoryStore.advisingSessions.clear();
    this.memoryStore.advisingMessages.clear();
    this.memoryStore.retentionAlerts.clear();
    this.memoryStore.auditLogs.clear();
  }

  // ─── Programs ───
  async createProgram(data: Partial<CurriculumProgramDto> & { programCode: string; title: string }): Promise<CurriculumProgramDto> {
    const record: CurriculumProgramDto = {
      id: data.id || `prog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      programCode: data.programCode,
      title: data.title,
      departmentId: data.departmentId || null,
      degreeType: data.degreeType || 'bachelor',
      totalCreditsRequired: data.totalCreditsRequired ?? 120,
      minimumGpa: data.minimumGpa ?? 2.0,
      catalogYear: data.catalogYear || '2026-2027',
      status: data.status || 'active',
      curriculumComplexityIndex: data.curriculumComplexityIndex ?? 0.0,
      institutionId: data.institutionId || 'global',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.programs.set(record.id, record);
    this.memoryStore.programs.set(record.programCode, record);
    try {
      if (db) await db.insert(curriculumPrograms).values(record as any);
    } catch {}
    return record;
  }

  async getProgramById(idOrCode: string, tenantId: string = 'global'): Promise<CurriculumProgramDto | null> {
    const item = this.memoryStore.programs.get(idOrCode);
    if (item && (tenantId === 'global' || item.institutionId === tenantId)) {
      return item;
    }
    return null;
  }

  async listPrograms(tenantId: string = 'global', status?: string): Promise<CurriculumProgramDto[]> {
    const seen = new Set<string>();
    const list: CurriculumProgramDto[] = [];
    for (const prog of this.memoryStore.programs.values()) {
      if (!seen.has(prog.id)) {
        seen.add(prog.id);
        if ((tenantId === 'global' || prog.institutionId === tenantId) && (!status || prog.status === status)) {
          list.push(prog);
        }
      }
    }
    return list;
  }

  // ─── Courses ───
  async createCourse(data: Partial<CurriculumCourseDto> & { courseCode: string; title: string }): Promise<CurriculumCourseDto> {
    const record: CurriculumCourseDto = {
      id: data.id || `crs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      courseCode: data.courseCode,
      title: data.title,
      departmentId: data.departmentId || null,
      credits: data.credits ?? 3,
      level: data.level ?? 100,
      courseType: data.courseType || 'major_core',
      minGrade: data.minGrade || 'D',
      typicalTerm: data.typicalTerm ?? 1,
      historicalPassRate: data.historicalPassRate ?? 0.85,
      blockingFactor: data.blockingFactor ?? 0,
      description: data.description || null,
      syllabusEmbedding: data.syllabusEmbedding || null,
      status: data.status || 'active',
      institutionId: data.institutionId || 'global',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.courses.set(record.id, record);
    this.memoryStore.courses.set(record.courseCode, record);
    try {
      if (db) await db.insert(curriculumCourses).values(record as any);
    } catch {}
    return record;
  }

  async getCourseById(idOrCode: string, tenantId: string = 'global'): Promise<CurriculumCourseDto | null> {
    const item = this.memoryStore.courses.get(idOrCode);
    if (item && (tenantId === 'global' || item.institutionId === tenantId)) {
      return item;
    }
    return null;
  }

  async listCourses(tenantId: string = 'global', departmentId?: string, level?: number): Promise<CurriculumCourseDto[]> {
    const seen = new Set<string>();
    const list: CurriculumCourseDto[] = [];
    for (const crs of this.memoryStore.courses.values()) {
      if (!seen.has(crs.id)) {
        seen.add(crs.id);
        if (
          (tenantId === 'global' || crs.institutionId === tenantId) &&
          (!departmentId || crs.departmentId === departmentId) &&
          (!level || crs.level === level)
        ) {
          list.push(crs);
        }
      }
    }
    return list;
  }

  // ─── Prerequisites ───
  async addPrerequisite(data: Partial<CurriculumPrerequisiteDto> & { courseId: string; prerequisiteCourseId: string }): Promise<CurriculumPrerequisiteDto> {
    const record: CurriculumPrerequisiteDto = {
      id: data.id || `pre_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      courseId: data.courseId,
      prerequisiteCourseId: data.prerequisiteCourseId,
      type: data.type || 'hard_prerequisite',
      minimumGrade: data.minimumGrade || 'C',
      concurrencyAllowed: data.concurrencyAllowed ?? false,
      institutionId: data.institutionId || 'global',
      createdAt: data.createdAt || new Date().toISOString(),
    };
    this.memoryStore.prerequisites.set(record.id, record);
    try {
      if (db) await db.insert(curriculumPrerequisites).values(record as any);
    } catch {}
    return record;
  }

  async getPrerequisitesForCourse(courseId: string, tenantId: string = 'global'): Promise<CurriculumPrerequisiteDto[]> {
    return Array.from(this.memoryStore.prerequisites.values()).filter(
      (p) => p.courseId === courseId && (tenantId === 'global' || p.institutionId === tenantId)
    );
  }

  async listAllPrerequisites(tenantId: string = 'global'): Promise<CurriculumPrerequisiteDto[]> {
    return Array.from(this.memoryStore.prerequisites.values()).filter(
      (p) => tenantId === 'global' || p.institutionId === tenantId
    );
  }

  // ─── Degree Plans ───
  async createDegreePlan(data: Partial<CurriculumDegreePlanDto> & { planId: string; studentId: string; programId: string }): Promise<CurriculumDegreePlanDto> {
    const record: CurriculumDegreePlanDto = {
      id: data.id || `plan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      planId: data.planId,
      studentId: data.studentId,
      programId: data.programId,
      title: data.title || 'Primary Degree Plan',
      targetGraduationTerm: data.targetGraduationTerm || 'Spring 2030',
      totalTerms: data.totalTerms ?? 8,
      status: data.status || 'draft',
      approvedByAdvisorId: data.approvedByAdvisorId || null,
      approvedAt: data.approvedAt || null,
      merkleAuditHash: data.merkleAuditHash || '',
      institutionId: data.institutionId || 'global',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.degreePlans.set(record.planId, record);
    this.memoryStore.degreePlans.set(record.id, record);
    try {
      if (db) await db.insert(curriculumDegreePlans).values(record as any);
    } catch {}
    return record;
  }

  async getDegreePlan(planId: string, tenantId: string = 'global'): Promise<CurriculumDegreePlanDto | null> {
    const item = this.memoryStore.degreePlans.get(planId);
    if (item && (tenantId === 'global' || item.institutionId === tenantId)) {
      const courses = Array.from(this.memoryStore.planCourses.values()).filter((c) => c.planId === item.planId || c.planId === item.id);
      return { ...item, courses };
    }
    return null;
  }

  async listDegreePlansForStudent(studentId: string, tenantId: string = 'global'): Promise<CurriculumDegreePlanDto[]> {
    const seen = new Set<string>();
    const list: CurriculumDegreePlanDto[] = [];
    for (const plan of this.memoryStore.degreePlans.values()) {
      if (!seen.has(plan.planId)) {
        seen.add(plan.planId);
        if (plan.studentId === studentId && (tenantId === 'global' || plan.institutionId === tenantId)) {
          const courses = Array.from(this.memoryStore.planCourses.values()).filter((c) => c.planId === plan.planId || c.planId === plan.id);
          list.push({ ...plan, courses });
        }
      }
    }
    return list;
  }

  async updateDegreePlanStatus(
    planId: string,
    status: CurriculumDegreePlanDto['status'],
    advisorId?: string,
    auditHash?: string,
    tenantId: string = 'global'
  ): Promise<CurriculumDegreePlanDto | null> {
    const existing = await this.getDegreePlan(planId, tenantId);
    if (!existing) return null;
    const updated: CurriculumDegreePlanDto = {
      ...existing,
      status,
      approvedByAdvisorId: advisorId || existing.approvedByAdvisorId,
      approvedAt: status === 'approved' ? new Date().toISOString() : existing.approvedAt,
      merkleAuditHash: auditHash || existing.merkleAuditHash,
      updatedAt: new Date().toISOString(),
    };
    this.memoryStore.degreePlans.set(existing.planId, updated);
    this.memoryStore.degreePlans.set(existing.id, updated);
    return updated;
  }

  // ─── Plan Courses ───
  async addPlanCourse(data: Partial<CurriculumPlanCourseDto> & { planId: string; courseId: string; plannedTermIndex: number; termName: string }): Promise<CurriculumPlanCourseDto> {
    const record: CurriculumPlanCourseDto = {
      id: data.id || `plncrs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      planId: data.planId,
      courseId: data.courseId,
      plannedTermIndex: data.plannedTermIndex,
      termName: data.termName,
      credits: data.credits ?? 3,
      status: data.status || 'planned',
      gradeReceived: data.gradeReceived || null,
      isPrerequisiteSatisfied: data.isPrerequisiteSatisfied ?? true,
      institutionId: data.institutionId || 'global',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.planCourses.set(record.id, record);
    try {
      if (db) await db.insert(curriculumPlanCourses).values(record as any);
    } catch {}
    return record;
  }

  async setPlanCourses(planId: string, courses: Array<{ courseId: string; plannedTermIndex: number; termName: string; credits?: number }>, tenantId: string = 'global'): Promise<CurriculumPlanCourseDto[]> {
    // Remove existing
    for (const [id, pc] of Array.from(this.memoryStore.planCourses.entries())) {
      if (pc.planId === planId) {
        this.memoryStore.planCourses.delete(id);
      }
    }
    const inserted: CurriculumPlanCourseDto[] = [];
    for (const c of courses) {
      const pc = await this.addPlanCourse({
        planId,
        courseId: c.courseId,
        plannedTermIndex: c.plannedTermIndex,
        termName: c.termName,
        credits: c.credits ?? 3,
        institutionId: tenantId,
      });
      inserted.push(pc);
    }
    return inserted;
  }

  // ─── Transfer Articulations ───
  async recordTransferArticulation(data: Partial<CurriculumTransferArticulationDto> & { articulationId: string; studentId: string; sourceInstitution: string; sourceCourseCode: string; sourceCourseTitle: string; sourceGrade: string }): Promise<CurriculumTransferArticulationDto> {
    const record: CurriculumTransferArticulationDto = {
      id: data.id || `art_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      articulationId: data.articulationId,
      studentId: data.studentId,
      sourceInstitution: data.sourceInstitution,
      sourceCourseCode: data.sourceCourseCode,
      sourceCourseTitle: data.sourceCourseTitle,
      sourceCredits: data.sourceCredits ?? 3.0,
      sourceGrade: data.sourceGrade,
      targetCourseId: data.targetCourseId || null,
      semanticMatchScore: data.semanticMatchScore ?? 0.0,
      status: data.status || 'pending',
      reviewedByStaffId: data.reviewedByStaffId || null,
      reviewedAt: data.reviewedAt || null,
      waiverReason: data.waiverReason || null,
      institutionId: data.institutionId || 'global',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.transferArticulations.set(record.articulationId, record);
    try {
      if (db) await db.insert(curriculumTransferArticulations).values(record as any);
    } catch {}
    return record;
  }

  async listTransferArticulationsForStudent(studentId: string, tenantId: string = 'global'): Promise<CurriculumTransferArticulationDto[]> {
    return Array.from(this.memoryStore.transferArticulations.values()).filter(
      (a) => a.studentId === studentId && (tenantId === 'global' || a.institutionId === tenantId)
    );
  }

  // ─── Advising Sessions & Messages ───
  async createAdvisingSession(data: Partial<CurriculumAdvisingSessionDto> & { sessionId: string; studentId: string }): Promise<CurriculumAdvisingSessionDto> {
    const record: CurriculumAdvisingSessionDto = {
      id: data.id || `advsess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sessionId: data.sessionId,
      studentId: data.studentId,
      activeDomain: data.activeDomain || 'degree_planner',
      status: data.status || 'active',
      assignedCounselorId: data.assignedCounselorId || null,
      sessionSummary: data.sessionSummary || null,
      proposedChangesJson: data.proposedChangesJson || null,
      confidenceScore: data.confidenceScore ?? 0.9,
      startedAt: data.startedAt || new Date().toISOString(),
      endedAt: data.endedAt || null,
      institutionId: data.institutionId || 'global',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.advisingSessions.set(record.sessionId, record);
    try {
      if (db) await db.insert(curriculumAdvisingSessions).values(record as any);
    } catch {}
    return record;
  }

  async getAdvisingSession(sessionId: string, tenantId: string = 'global'): Promise<CurriculumAdvisingSessionDto | null> {
    const item = this.memoryStore.advisingSessions.get(sessionId);
    if (item && (tenantId === 'global' || item.institutionId === tenantId)) {
      return item;
    }
    return null;
  }

  async listAdvisingSessions(tenantId: string = 'global', studentId?: string): Promise<CurriculumAdvisingSessionDto[]> {
    return Array.from(this.memoryStore.advisingSessions.values()).filter(
      (s) =>
        (tenantId === 'global' || s.institutionId === tenantId) &&
        (!studentId || s.studentId === studentId)
    );
  }

  async addAdvisingMessage(data: Partial<CurriculumAdvisingMessageDto> & { sessionId: string; senderType: CurriculumAdvisingMessageDto['senderType']; messageContent: string }): Promise<CurriculumAdvisingMessageDto> {
    const record: CurriculumAdvisingMessageDto = {
      id: data.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sessionId: data.sessionId,
      senderType: data.senderType,
      agentDomain: data.agentDomain || null,
      messageContent: data.messageContent,
      citationsJson: data.citationsJson || null,
      roadmapActionJson: data.roadmapActionJson || null,
      tokenCount: data.tokenCount ?? Math.ceil(data.messageContent.length / 4),
      sentAt: data.sentAt || new Date().toISOString(),
      institutionId: data.institutionId || 'global',
      createdAt: data.createdAt || new Date().toISOString(),
    };
    this.memoryStore.advisingMessages.set(record.id, record);
    try {
      if (db) await db.insert(curriculumAdvisingMessages).values(record as any);
    } catch {}
    return record;
  }

  async getAdvisingMessages(sessionId: string, tenantId: string = 'global'): Promise<CurriculumAdvisingMessageDto[]> {
    return Array.from(this.memoryStore.advisingMessages.values())
      .filter((m) => m.sessionId === sessionId && (tenantId === 'global' || m.institutionId === 'global' || m.institutionId === tenantId))
      .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
  }

  // ─── Retention Alerts ───
  async createRetentionAlert(data: Partial<CurriculumRetentionAlertDto> & { alertId: string; studentId: string; contributingFactorsJson: string }): Promise<CurriculumRetentionAlertDto> {
    const record: CurriculumRetentionAlertDto = {
      id: data.id || `ret_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      alertId: data.alertId,
      studentId: data.studentId,
      riskTier: data.riskTier || 'medium',
      riskScore: data.riskScore ?? 0.5,
      contributingFactorsJson: data.contributingFactorsJson,
      recommendedInterventionJson: data.recommendedInterventionJson || null,
      status: data.status || 'open',
      assignedCounselorId: data.assignedCounselorId || null,
      engageOsDispatched: data.engageOsDispatched ?? false,
      lastContactedAt: data.lastContactedAt || null,
      resolvedAt: data.resolvedAt || null,
      resolutionNotes: data.resolutionNotes || null,
      institutionId: data.institutionId || 'global',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.retentionAlerts.set(record.alertId, record);
    try {
      if (db) await db.insert(curriculumRetentionAlerts).values(record as any);
    } catch {}
    return record;
  }

  async listRetentionAlerts(tenantId: string = 'global', riskTier?: string, status?: string): Promise<CurriculumRetentionAlertDto[]> {
    return Array.from(this.memoryStore.retentionAlerts.values()).filter(
      (a) =>
        (tenantId === 'global' || a.institutionId === tenantId) &&
        (!riskTier || a.riskTier === riskTier) &&
        (!status || a.status === status)
    );
  }

  async updateRetentionAlertStatus(
    alertId: string,
    status: CurriculumRetentionAlertDto['status'],
    notes?: string,
    counselorId?: string,
    tenantId: string = 'global'
  ): Promise<CurriculumRetentionAlertDto | null> {
    const existing = this.memoryStore.retentionAlerts.get(alertId);
    if (!existing || (tenantId !== 'global' && existing.institutionId !== 'global' && existing.institutionId !== tenantId)) {
      return null;
    }
    const updated: CurriculumRetentionAlertDto = {
      ...existing,
      status,
      resolutionNotes: notes || existing.resolutionNotes,
      assignedCounselorId: counselorId || existing.assignedCounselorId,
      resolvedAt: status === 'resolved' || status === 'dismissed' ? new Date().toISOString() : existing.resolvedAt,
      updatedAt: new Date().toISOString(),
    };
    this.memoryStore.retentionAlerts.set(alertId, updated);
    return updated;
  }

  // ─── Audit Logs ───
  async appendAuditLog(data: Partial<CurriculumAuditLogDto> & { auditId: string; actionType: CurriculumAuditLogDto['actionType']; performedByUserId: string; actorRole: string }): Promise<CurriculumAuditLogDto> {
    const record: CurriculumAuditLogDto = {
      id: data.id || `clog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      auditId: data.auditId,
      actionType: data.actionType,
      targetStudentId: data.targetStudentId || null,
      planId: data.planId || null,
      performedByUserId: data.performedByUserId,
      actorRole: data.actorRole,
      previousState: data.previousState || null,
      newState: data.newState || null,
      justification: data.justification || null,
      merkleProof: data.merkleProof || '',
      merkleAuditHash: data.merkleAuditHash || '',
      auditTimestamp: data.auditTimestamp || new Date().toISOString(),
      institutionId: data.institutionId || 'global',
      createdAt: data.createdAt || new Date().toISOString(),
    };
    this.memoryStore.auditLogs.set(record.auditId, record);
    try {
      if (db) await db.insert(curriculumAuditLogs).values(record as any);
    } catch {}
    return record;
  }

  async listAuditLogs(tenantId: string = 'global', targetStudentId?: string, actionType?: string): Promise<CurriculumAuditLogDto[]> {
    return Array.from(this.memoryStore.auditLogs.values()).filter(
      (l) =>
        (tenantId === 'global' || l.institutionId === tenantId) &&
        (!targetStudentId || l.targetStudentId === targetStudentId) &&
        (!actionType || l.actionType === actionType)
    );
  }
}

export const curriculumStore = CurriculumDbStore.getInstance();
