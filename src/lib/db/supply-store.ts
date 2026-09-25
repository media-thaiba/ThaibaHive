import { db } from '@thaiba/db';
import { eq } from 'drizzle-orm';
import {
  supplyVendors,
  supplyVendorCertifications,
  supplyVendorRiskAssessments,
  supplyVendorEsgScores,
  supplyPurchaseRequisitions,
  supplyPurchaseOrders,
  supplyPoLineItems,
  supplyGoodsReceipts,
  supplyVendorInvoices,
  supplyThreeWayMatches,
  supplyContracts,
  supplyContractMilestones,
  supplyBudgetEncumbrances,
  supplyAuditLogs,
} from '@thaiba/db/schema';
import {
  SupplyVendorItem,
  SupplyVendorCertificationItem,
  SupplyVendorRiskAssessmentItem,
  SupplyVendorEsgScoreItem,
  SupplyPurchaseRequisitionItem,
  SupplyPurchaseOrderItem,
  SupplyPoLineItemItem,
  SupplyGoodsReceiptItem,
  SupplyVendorInvoiceItem,
  SupplyThreeWayMatchItem,
  SupplyContractItem,
  SupplyContractMilestoneItem,
  SupplyBudgetEncumbranceItem,
  SupplyAuditLogItem,
  VendorOnboardingStatus,
  RequisitionStatus,
  PoStatus,
  InvoiceStatus,
  ThreeWayMatchStatus,
  ContractStatus,
  MilestoneStatus,
} from '../operations/supply/supply-types';

function handleWriteError(operation: string, error: unknown): void {
  if (process.env.NODE_ENV === 'production') {
    throw error;
  }
  console.warn(`[SupplyDbStore] DB write fallback on ${operation}:`, error instanceof Error ? error.message : error);
}

export interface InMemorySupplyStore {
  vendors: Map<string, SupplyVendorItem>;
  certifications: Map<string, SupplyVendorCertificationItem>;
  riskAssessments: Map<string, SupplyVendorRiskAssessmentItem>;
  esgScores: Map<string, SupplyVendorEsgScoreItem>;
  requisitions: Map<string, SupplyPurchaseRequisitionItem>;
  purchaseOrders: Map<string, SupplyPurchaseOrderItem>;
  lineItems: Map<string, SupplyPoLineItemItem>;
  goodsReceipts: Map<string, SupplyGoodsReceiptItem>;
  invoices: Map<string, SupplyVendorInvoiceItem>;
  threeWayMatches: Map<string, SupplyThreeWayMatchItem>;
  contracts: Map<string, SupplyContractItem>;
  milestones: Map<string, SupplyContractMilestoneItem>;
  encumbrances: Map<string, SupplyBudgetEncumbranceItem>;
  auditLogs: Map<string, SupplyAuditLogItem>;
}

export class SupplyDbStore {
  private static instance: SupplyDbStore;
  private memoryStore: InMemorySupplyStore = {
    vendors: new Map(),
    certifications: new Map(),
    riskAssessments: new Map(),
    esgScores: new Map(),
    requisitions: new Map(),
    purchaseOrders: new Map(),
    lineItems: new Map(),
    goodsReceipts: new Map(),
    invoices: new Map(),
    threeWayMatches: new Map(),
    contracts: new Map(),
    milestones: new Map(),
    encumbrances: new Map(),
    auditLogs: new Map(),
  };

  public static getInstance(): SupplyDbStore {
    if (!SupplyDbStore.instance) {
      SupplyDbStore.instance = new SupplyDbStore();
    }
    return SupplyDbStore.instance;
  }

  public clearMemoryStore(): void {
    this.memoryStore.vendors.clear();
    this.memoryStore.certifications.clear();
    this.memoryStore.riskAssessments.clear();
    this.memoryStore.esgScores.clear();
    this.memoryStore.requisitions.clear();
    this.memoryStore.purchaseOrders.clear();
    this.memoryStore.lineItems.clear();
    this.memoryStore.goodsReceipts.clear();
    this.memoryStore.invoices.clear();
    this.memoryStore.threeWayMatches.clear();
    this.memoryStore.contracts.clear();
    this.memoryStore.milestones.clear();
    this.memoryStore.encumbrances.clear();
    this.memoryStore.auditLogs.clear();
    this.auditLogList = [];
  }

  // ─── Vendors ───

  public async createVendor(vendor: SupplyVendorItem): Promise<SupplyVendorItem> {
    this.memoryStore.vendors.set(vendor.id, { ...vendor });
    if (db) {
      try {
        await db.insert(supplyVendors).values({
          id: vendor.id,
          vendorCode: vendor.vendorCode,
          name: vendor.name,
          legalEntityName: vendor.legalEntityName ?? null,
          category: vendor.category,
          taxId: vendor.taxId,
          contactName: vendor.contactName,
          contactEmail: vendor.contactEmail,
          contactPhone: vendor.contactPhone ?? null,
          address: vendor.address ?? null,
          city: vendor.city ?? null,
          country: vendor.country,
          paymentTerms: vendor.paymentTerms,
          onboardingStatus: vendor.onboardingStatus,
          riskTier: vendor.riskTier,
          riskScore: vendor.riskScore,
          esgRating: vendor.esgRating,
          esgScore: vendor.esgScore,
          isSanctionsClean: vendor.isSanctionsClean,
          institutionId: vendor.institutionId,
          createdAt: vendor.createdAt,
          updatedAt: vendor.updatedAt,
        }).onConflictDoUpdate({
          target: supplyVendors.id,
          set: {
            name: vendor.name,
            legalEntityName: vendor.legalEntityName ?? null,
            category: vendor.category,
            taxId: vendor.taxId,
            contactName: vendor.contactName,
            contactEmail: vendor.contactEmail,
            contactPhone: vendor.contactPhone ?? null,
            address: vendor.address ?? null,
            city: vendor.city ?? null,
            country: vendor.country,
            paymentTerms: vendor.paymentTerms,
            onboardingStatus: vendor.onboardingStatus,
            riskTier: vendor.riskTier,
            riskScore: vendor.riskScore,
            esgRating: vendor.esgRating,
            esgScore: vendor.esgScore,
            isSanctionsClean: vendor.isSanctionsClean,
            updatedAt: vendor.updatedAt,
          },
        });
      } catch (error) {
        handleWriteError('createVendor', error);
      }
    }
    return vendor;
  }

  public async getVendorById(id: string, institutionId = 'global'): Promise<SupplyVendorItem | null> {
    const item = this.memoryStore.vendors.get(id);
    if (item && (item.institutionId === institutionId || institutionId === 'global' || item.institutionId === 'global')) {
      return item;
    }
    return null;
  }

  public async getVendorByCode(vendorCode: string, institutionId = 'global'): Promise<SupplyVendorItem | null> {
    for (const item of this.memoryStore.vendors.values()) {
      if (
        item.vendorCode === vendorCode &&
        (item.institutionId === institutionId || institutionId === 'global' || item.institutionId === 'global')
      ) {
        return item;
      }
    }
    return null;
  }

  public async listVendors(institutionId = 'global'): Promise<SupplyVendorItem[]> {
    const result: SupplyVendorItem[] = [];
    for (const item of this.memoryStore.vendors.values()) {
      if (item.institutionId === institutionId || institutionId === 'global' || item.institutionId === 'global') {
        result.push(item);
      }
    }
    return result;
  }

  public async updateVendorStatus(
    id: string,
    status: VendorOnboardingStatus,
    institutionId = 'global'
  ): Promise<SupplyVendorItem | null> {
    const vendor = await this.getVendorById(id, institutionId);
    if (!vendor) return null;
    vendor.onboardingStatus = status;
    vendor.updatedAt = new Date().toISOString();
    this.memoryStore.vendors.set(id, vendor);

    if (db) {
      try {
        await db.update(supplyVendors).set({
          onboardingStatus: status,
          updatedAt: vendor.updatedAt,
        }).where(eq(supplyVendors.id, id));
      } catch (error) {
        handleWriteError('updateVendorStatus', error);
      }
    }

    return vendor;
  }

  // ─── Certifications ───

  public async createCertification(cert: SupplyVendorCertificationItem): Promise<SupplyVendorCertificationItem> {
    this.memoryStore.certifications.set(cert.id, { ...cert });
    if (db) {
      try {
        await db.insert(supplyVendorCertifications).values({
          id: cert.id,
          vendorId: cert.vendorId,
          certType: cert.certType,
          certNumber: cert.certNumber,
          issuingAuthority: cert.issuingAuthority,
          issuedDate: cert.issuedDate,
          expiryDate: cert.expiryDate,
          documentUrl: cert.documentUrl ?? null,
          verificationStatus: cert.verificationStatus,
          institutionId: cert.institutionId,
          createdAt: cert.createdAt,
        }).onConflictDoNothing();
      } catch (error) {
        handleWriteError('createCertification', error);
      }
    }
    return cert;
  }

  public async listCertificationsByVendor(vendorId: string, institutionId = 'global'): Promise<SupplyVendorCertificationItem[]> {
    const result: SupplyVendorCertificationItem[] = [];
    for (const item of this.memoryStore.certifications.values()) {
      if (
        item.vendorId === vendorId &&
        (item.institutionId === institutionId || institutionId === 'global' || item.institutionId === 'global')
      ) {
        result.push(item);
      }
    }
    return result;
  }

  // ─── Risk Assessments ───

  public async createRiskAssessment(assessment: SupplyVendorRiskAssessmentItem): Promise<SupplyVendorRiskAssessmentItem> {
    this.memoryStore.riskAssessments.set(assessment.id, { ...assessment });
    if (db) {
      try {
        await db.insert(supplyVendorRiskAssessments).values({
          id: assessment.id,
          assessmentId: assessment.assessmentId,
          vendorId: assessment.vendorId,
          overallRiskScore: assessment.overallRiskScore,
          financialRiskScore: assessment.financialRiskScore,
          complianceRiskScore: assessment.complianceRiskScore,
          operationalRiskScore: assessment.operationalRiskScore,
          sanctionsRegistryChecked: assessment.sanctionsRegistryChecked,
          sanctionsMatched: assessment.sanctionsMatched,
          pepMatched: assessment.pepMatched,
          adverseMediaFindings: assessment.adverseMediaFindings ?? null,
          recommendedAction: assessment.recommendedAction,
          assessedByUserId: assessment.assessedByUserId ?? null,
          institutionId: assessment.institutionId,
          createdAt: assessment.createdAt,
        }).onConflictDoNothing();
      } catch (error) {
        handleWriteError('createRiskAssessment', error);
      }
    }
    return assessment;
  }

  public async getRiskAssessmentByVendor(vendorId: string, institutionId = 'global'): Promise<SupplyVendorRiskAssessmentItem | null> {
    for (const item of this.memoryStore.riskAssessments.values()) {
      if (
        item.vendorId === vendorId &&
        (item.institutionId === institutionId || institutionId === 'global' || item.institutionId === 'global')
      ) {
        return item;
      }
    }
    return null;
  }

  public async listRiskAssessments(institutionId = 'global'): Promise<SupplyVendorRiskAssessmentItem[]> {
    const result: SupplyVendorRiskAssessmentItem[] = [];
    for (const item of this.memoryStore.riskAssessments.values()) {
      if (item.institutionId === institutionId || institutionId === 'global' || item.institutionId === 'global') {
        result.push(item);
      }
    }
    return result;
  }

  // ─── ESG Scores ───

  public async createEsgScore(score: SupplyVendorEsgScoreItem): Promise<SupplyVendorEsgScoreItem> {
    this.memoryStore.esgScores.set(score.id, { ...score });
    if (db) {
      try {
        await db.insert(supplyVendorEsgScores).values({
          id: score.id,
          scoreId: score.scoreId,
          vendorId: score.vendorId,
          compositeEsgScore: score.compositeEsgScore,
          environmentalScore: score.environmentalScore,
          socialScore: score.socialScore,
          governanceScore: score.governanceScore,
          scope3CarbonIntensityKgPerUsd: score.scope3CarbonIntensityKgPerUsd,
          recycledMaterialPercentage: score.recycledMaterialPercentage,
          fairLaborCertified: score.fairLaborCertified,
          ratingGrade: score.ratingGrade,
          auditYear: score.auditYear,
          institutionId: score.institutionId,
          createdAt: score.createdAt,
        }).onConflictDoNothing();
      } catch (error) {
        handleWriteError('createEsgScore', error);
      }
    }
    return score;
  }

  public async getEsgScoreByVendor(vendorId: string, institutionId = 'global'): Promise<SupplyVendorEsgScoreItem | null> {
    for (const item of this.memoryStore.esgScores.values()) {
      if (
        item.vendorId === vendorId &&
        (item.institutionId === institutionId || institutionId === 'global' || item.institutionId === 'global')
      ) {
        return item;
      }
    }
    return null;
  }

  public async listEsgScores(institutionId = 'global'): Promise<SupplyVendorEsgScoreItem[]> {
    const result: SupplyVendorEsgScoreItem[] = [];
    for (const item of this.memoryStore.esgScores.values()) {
      if (item.institutionId === institutionId || institutionId === 'global' || item.institutionId === 'global') {
        result.push(item);
      }
    }
    return result;
  }

  // ─── Requisitions ───

  public async createRequisition(req: SupplyPurchaseRequisitionItem): Promise<SupplyPurchaseRequisitionItem> {
    this.memoryStore.requisitions.set(req.id, { ...req });
    if (db) {
      try {
        await db.insert(supplyPurchaseRequisitions).values({
          id: req.id,
          requisitionNumber: req.requisitionNumber,
          departmentId: req.departmentId,
          requesterId: req.requesterId,
          sourceType: req.sourceType,
          sourceReferenceId: req.sourceReferenceId ?? null,
          title: req.title,
          urgency: req.urgency,
          estimatedTotalUsd: req.estimatedTotalUsd,
          budgetCode: req.budgetCode,
          requiredByDate: req.requiredByDate ?? null,
          currentApprovalTier: req.currentApprovalTier,
          status: req.status,
          rejectionReason: req.rejectionReason ?? null,
          approvedByUserId: req.approvedByUserId ?? null,
          approvedAt: req.approvedAt ?? null,
          notes: req.notes ?? null,
          institutionId: req.institutionId,
          createdAt: req.createdAt,
          updatedAt: req.updatedAt,
        }).onConflictDoNothing();
      } catch (error) {
        handleWriteError('createRequisition', error);
      }
    }
    return req;
  }

  public async getRequisitionById(id: string, institutionId = 'global'): Promise<SupplyPurchaseRequisitionItem | null> {
    const item = this.memoryStore.requisitions.get(id);
    if (item && (item.institutionId === institutionId || institutionId === 'global' || item.institutionId === 'global')) {
      return item;
    }
    return null;
  }

  public async getRequisitionByNumber(requisitionNumber: string, institutionId = 'global'): Promise<SupplyPurchaseRequisitionItem | null> {
    for (const item of this.memoryStore.requisitions.values()) {
      if (
        item.requisitionNumber === requisitionNumber &&
        (item.institutionId === institutionId || institutionId === 'global' || item.institutionId === 'global')
      ) {
        return item;
      }
    }
    return null;
  }

  public async listRequisitions(institutionId = 'global'): Promise<SupplyPurchaseRequisitionItem[]> {
    const result: SupplyPurchaseRequisitionItem[] = [];
    for (const item of this.memoryStore.requisitions.values()) {
      if (item.institutionId === institutionId || institutionId === 'global' || item.institutionId === 'global') {
        result.push(item);
      }
    }
    return result;
  }

  public async updateRequisitionStatus(
    id: string,
    status: RequisitionStatus,
    approvedByUserId?: string,
    rejectionReason?: string,
    institutionId = 'global'
  ): Promise<SupplyPurchaseRequisitionItem | null> {
    const req = await this.getRequisitionById(id, institutionId);
    if (!req) return null;
    req.status = status;
    if (approvedByUserId) {
      req.approvedByUserId = approvedByUserId;
      req.approvedAt = new Date().toISOString();
    }
    if (rejectionReason) {
      req.rejectionReason = rejectionReason;
    }
    req.updatedAt = new Date().toISOString();
    this.memoryStore.requisitions.set(id, req);

    if (db) {
      try {
        const dbUpdates: Record<string, unknown> = {
          status: req.status,
          updatedAt: req.updatedAt,
        };
        if (req.approvedByUserId) {
          dbUpdates.approvedByUserId = req.approvedByUserId;
          dbUpdates.approvedAt = req.approvedAt;
        }
        if (req.rejectionReason) {
          dbUpdates.rejectionReason = req.rejectionReason;
        }
        await db.update(supplyPurchaseRequisitions).set(dbUpdates).where(eq(supplyPurchaseRequisitions.id, id));
      } catch (error) {
        handleWriteError('updateRequisitionStatus', error);
      }
    }

    return req;
  }

  // ─── Purchase Orders ───

  public async createPurchaseOrder(po: SupplyPurchaseOrderItem): Promise<SupplyPurchaseOrderItem> {
    this.memoryStore.purchaseOrders.set(po.id, { ...po });
    if (db) {
      try {
        await db.insert(supplyPurchaseOrders).values({
          id: po.id,
          poNumber: po.poNumber,
          requisitionId: po.requisitionId ?? null,
          vendorId: po.vendorId,
          departmentId: po.departmentId,
          orderDate: po.orderDate,
          expectedDeliveryDate: po.expectedDeliveryDate ?? null,
          subtotalUsd: po.subtotalUsd,
          taxAmountUsd: po.taxAmountUsd,
          shippingAmountUsd: po.shippingAmountUsd,
          totalAmountUsd: po.totalAmountUsd,
          currency: po.currency,
          paymentTerms: po.paymentTerms,
          shippingAddress: po.shippingAddress,
          shippingDock: po.shippingDock,
          status: po.status,
          isEncumbered: po.isEncumbered,
          encumbranceId: po.encumbranceId ?? null,
          merkleLeafHash: po.merkleLeafHash,
          institutionId: po.institutionId,
          createdAt: po.createdAt,
          updatedAt: po.updatedAt,
        }).onConflictDoNothing();
      } catch (error) {
        handleWriteError('createPurchaseOrder', error);
      }
    }
    return po;
  }

  public async getPurchaseOrderById(id: string, institutionId = 'global'): Promise<SupplyPurchaseOrderItem | null> {
    const item = this.memoryStore.purchaseOrders.get(id);
    if (item && (item.institutionId === institutionId || institutionId === 'global' || item.institutionId === 'global')) {
      return item;
    }
    return null;
  }

  public async getPurchaseOrderByNumber(poNumber: string, institutionId = 'global'): Promise<SupplyPurchaseOrderItem | null> {
    for (const item of this.memoryStore.purchaseOrders.values()) {
      if (
        item.poNumber === poNumber &&
        (item.institutionId === institutionId || institutionId === 'global' || item.institutionId === 'global')
      ) {
        return item;
      }
    }
    return null;
  }

  public async listPurchaseOrders(institutionId = 'global'): Promise<SupplyPurchaseOrderItem[]> {
    const result: SupplyPurchaseOrderItem[] = [];
    for (const item of this.memoryStore.purchaseOrders.values()) {
      if (item.institutionId === institutionId || institutionId === 'global' || item.institutionId === 'global') {
        result.push(item);
      }
    }
    return result;
  }

  public async updatePurchaseOrderStatus(
    id: string,
    status: PoStatus,
    institutionId = 'global'
  ): Promise<SupplyPurchaseOrderItem | null> {
    const po = await this.getPurchaseOrderById(id, institutionId);
    if (!po) return null;
    po.status = status;
    po.updatedAt = new Date().toISOString();
    this.memoryStore.purchaseOrders.set(id, po);

    if (db) {
      try {
        await db.update(supplyPurchaseOrders).set({
          status: po.status,
          updatedAt: po.updatedAt,
        }).where(eq(supplyPurchaseOrders.id, id));
      } catch (error) {
        handleWriteError('updatePurchaseOrderStatus', error);
      }
    }

    return po;
  }

  // ─── Line Items ───

  public async createLineItem(item: SupplyPoLineItemItem): Promise<SupplyPoLineItemItem> {
    this.memoryStore.lineItems.set(item.id, { ...item });
    if (db) {
      try {
        await db.insert(supplyPoLineItems).values({
          id: item.id,
          poId: item.poId,
          lineNumber: item.lineNumber,
          itemSku: item.itemSku,
          description: item.description,
          category: item.category,
          unitPriceUsd: item.unitPriceUsd,
          quantityOrdered: item.quantityOrdered,
          quantityReceived: item.quantityReceived,
          quantityInvoiced: item.quantityInvoiced,
          unitOfMeasure: item.unitOfMeasure,
          lineTotalUsd: item.lineTotalUsd,
          status: item.status,
          institutionId: item.institutionId,
          createdAt: item.createdAt,
        }).onConflictDoNothing();
      } catch (error) {
        handleWriteError('createLineItem', error);
      }
    }
    return item;
  }

  public async listLineItemsByPo(poId: string, institutionId = 'global'): Promise<SupplyPoLineItemItem[]> {
    const result: SupplyPoLineItemItem[] = [];
    for (const item of this.memoryStore.lineItems.values()) {
      if (
        item.poId === poId &&
        (item.institutionId === institutionId || institutionId === 'global' || item.institutionId === 'global')
      ) {
        result.push(item);
      }
    }
    return result.sort((a, b) => a.lineNumber - b.lineNumber);
  }

  public async updateLineItemQuantities(
    id: string,
    qtyReceivedDelta: number,
    qtyInvoicedDelta: number,
    _institutionId = 'global'
  ): Promise<SupplyPoLineItemItem | null> {
    const item = this.memoryStore.lineItems.get(id);
    if (!item) return null;
    item.quantityReceived += qtyReceivedDelta;
    item.quantityInvoiced += qtyInvoicedDelta;
    if (item.quantityReceived >= item.quantityOrdered) {
      item.status = 'fully_received';
    } else if (item.quantityReceived > 0) {
      item.status = 'partially_received';
    }
    this.memoryStore.lineItems.set(id, item);

    if (db) {
      try {
        await db.update(supplyPoLineItems).set({
          quantityReceived: item.quantityReceived,
          quantityInvoiced: item.quantityInvoiced,
          status: item.status,
        }).where(eq(supplyPoLineItems.id, id));
      } catch (error) {
        handleWriteError('updateLineItemQuantities', error);
      }
    }

    return item;
  }

  // ─── Goods Receipts ───

  public async createGoodsReceipt(grn: SupplyGoodsReceiptItem): Promise<SupplyGoodsReceiptItem> {
    this.memoryStore.goodsReceipts.set(grn.id, { ...grn });
    if (db) {
      try {
        await db.insert(supplyGoodsReceipts).values({
          id: grn.id,
          receiptNumber: grn.receiptNumber,
          poId: grn.poId,
          vendorId: grn.vendorId,
          receivedDate: grn.receivedDate,
          receivedByUserId: grn.receivedByUserId,
          warehouseBay: grn.warehouseBay,
          dockTag: grn.dockTag,
          carrierName: grn.carrierName ?? null,
          trackingNumber: grn.trackingNumber ?? null,
          packageCondition: grn.packageCondition,
          inspectionNotes: grn.inspectionNotes ?? null,
          receiverSignature: grn.receiverSignature,
          status: grn.status,
          institutionId: grn.institutionId,
          createdAt: grn.createdAt,
        }).onConflictDoNothing();
      } catch (error) {
        handleWriteError('createGoodsReceipt', error);
      }
    }
    return grn;
  }

  public async getGoodsReceiptById(id: string, institutionId = 'global'): Promise<SupplyGoodsReceiptItem | null> {
    const item = this.memoryStore.goodsReceipts.get(id);
    if (item && (item.institutionId === institutionId || institutionId === 'global' || item.institutionId === 'global')) {
      return item;
    }
    return null;
  }

  public async listGoodsReceiptsByPo(poId: string, institutionId = 'global'): Promise<SupplyGoodsReceiptItem[]> {
    const result: SupplyGoodsReceiptItem[] = [];
    for (const item of this.memoryStore.goodsReceipts.values()) {
      if (
        item.poId === poId &&
        (item.institutionId === institutionId || institutionId === 'global' || item.institutionId === 'global')
      ) {
        result.push(item);
      }
    }
    return result;
  }

  public async listGoodsReceipts(institutionId = 'global'): Promise<SupplyGoodsReceiptItem[]> {
    const result: SupplyGoodsReceiptItem[] = [];
    for (const item of this.memoryStore.goodsReceipts.values()) {
      if (item.institutionId === institutionId || institutionId === 'global' || item.institutionId === 'global') {
        result.push(item);
      }
    }
    return result;
  }

  // ─── Invoices ───

  public async createInvoice(invoice: SupplyVendorInvoiceItem): Promise<SupplyVendorInvoiceItem> {
    this.memoryStore.invoices.set(invoice.id, { ...invoice });
    if (db) {
      try {
        await db.insert(supplyVendorInvoices).values({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          vendorId: invoice.vendorId,
          poId: invoice.poId ?? null,
          invoiceDate: invoice.invoiceDate,
          dueDate: invoice.dueDate,
          subtotalUsd: invoice.subtotalUsd,
          taxAmountUsd: invoice.taxAmountUsd,
          totalAmountUsd: invoice.totalAmountUsd,
          currency: invoice.currency,
          documentUrl: invoice.documentUrl ?? null,
          status: invoice.status,
          voucherNumber: invoice.voucherNumber ?? null,
          institutionId: invoice.institutionId,
          createdAt: invoice.createdAt,
          updatedAt: invoice.updatedAt,
        }).onConflictDoNothing();
      } catch (error) {
        handleWriteError('createInvoice', error);
      }
    }
    return invoice;
  }

  public async getInvoiceById(id: string, institutionId = 'global'): Promise<SupplyVendorInvoiceItem | null> {
    const item = this.memoryStore.invoices.get(id);
    if (item && (item.institutionId === institutionId || institutionId === 'global' || item.institutionId === 'global')) {
      return item;
    }
    return null;
  }

  public async listInvoicesByVendor(vendorId: string, institutionId = 'global'): Promise<SupplyVendorInvoiceItem[]> {
    const result: SupplyVendorInvoiceItem[] = [];
    for (const item of this.memoryStore.invoices.values()) {
      if (
        item.vendorId === vendorId &&
        (item.institutionId === institutionId || institutionId === 'global' || item.institutionId === 'global')
      ) {
        result.push(item);
      }
    }
    return result;
  }

  public async listInvoices(institutionId = 'global'): Promise<SupplyVendorInvoiceItem[]> {
    const result: SupplyVendorInvoiceItem[] = [];
    for (const item of this.memoryStore.invoices.values()) {
      if (item.institutionId === institutionId || institutionId === 'global' || item.institutionId === 'global') {
        result.push(item);
      }
    }
    return result;
  }

  public async updateInvoiceStatus(
    id: string,
    status: InvoiceStatus,
    voucherNumber?: string,
    institutionId = 'global'
  ): Promise<SupplyVendorInvoiceItem | null> {
    const inv = await this.getInvoiceById(id, institutionId);
    if (!inv) return null;
    inv.status = status;
    if (voucherNumber) inv.voucherNumber = voucherNumber;
    inv.updatedAt = new Date().toISOString();
    this.memoryStore.invoices.set(id, inv);

    if (db) {
      try {
        const dbUpdates: Record<string, unknown> = {
          status: inv.status,
          updatedAt: inv.updatedAt,
        };
        if (voucherNumber) {
          dbUpdates.voucherNumber = voucherNumber;
        }
        await db.update(supplyVendorInvoices).set(dbUpdates).where(eq(supplyVendorInvoices.id, id));
      } catch (error) {
        handleWriteError('updateInvoiceStatus', error);
      }
    }

    return inv;
  }

  // ─── 3-Way Matches ───

  public async createThreeWayMatch(match: SupplyThreeWayMatchItem): Promise<SupplyThreeWayMatchItem> {
    this.memoryStore.threeWayMatches.set(match.id, { ...match });
    if (db) {
      try {
        await db.insert(supplyThreeWayMatches).values({
          id: match.id,
          matchId: match.matchId,
          invoiceId: match.invoiceId,
          poId: match.poId,
          receiptId: match.receiptId ?? null,
          matchStatus: match.matchStatus,
          priceVariancePercent: match.priceVariancePercent,
          quantityVarianceUnits: match.quantityVarianceUnits,
          dollarVarianceUsd: match.dollarVarianceUsd,
          isToleranceCompliant: match.isToleranceCompliant,
          overrideApprovedByUserId: match.overrideApprovedByUserId ?? null,
          overrideJustification: match.overrideJustification ?? null,
          debitMemoGenerated: match.debitMemoGenerated,
          debitMemoAmountUsd: match.debitMemoAmountUsd,
          paymentVoucherCode: match.paymentVoucherCode ?? null,
          institutionId: match.institutionId,
          createdAt: match.createdAt,
        }).onConflictDoNothing();
      } catch (error) {
        handleWriteError('createThreeWayMatch', error);
      }
    }
    return match;
  }

  public async getThreeWayMatchById(id: string, institutionId = 'global'): Promise<SupplyThreeWayMatchItem | null> {
    const item = this.memoryStore.threeWayMatches.get(id);
    if (item && (item.institutionId === institutionId || institutionId === 'global' || item.institutionId === 'global')) {
      return item;
    }
    return null;
  }

  public async getThreeWayMatchByInvoiceId(invoiceId: string, institutionId = 'global'): Promise<SupplyThreeWayMatchItem | null> {
    for (const item of this.memoryStore.threeWayMatches.values()) {
      if (
        item.invoiceId === invoiceId &&
        (item.institutionId === institutionId || institutionId === 'global' || item.institutionId === 'global')
      ) {
        return item;
      }
    }
    return null;
  }

  public async listThreeWayMatches(institutionId = 'global'): Promise<SupplyThreeWayMatchItem[]> {
    const result: SupplyThreeWayMatchItem[] = [];
    for (const item of this.memoryStore.threeWayMatches.values()) {
      if (item.institutionId === institutionId || institutionId === 'global' || item.institutionId === 'global') {
        result.push(item);
      }
    }
    return result;
  }

  public async updateThreeWayMatch(
    id: string,
    status: ThreeWayMatchStatus,
    overrideUserId?: string,
    justification?: string,
    paymentVoucherCode?: string,
    institutionId = 'global'
  ): Promise<SupplyThreeWayMatchItem | null> {
    const match = await this.getThreeWayMatchById(id, institutionId);
    if (!match) return null;
    match.matchStatus = status;
    if (overrideUserId) match.overrideApprovedByUserId = overrideUserId;
    if (justification) match.overrideJustification = justification;
    if (paymentVoucherCode) match.paymentVoucherCode = paymentVoucherCode;
    this.memoryStore.threeWayMatches.set(id, match);

    if (db) {
      try {
        const dbUpdates: Record<string, unknown> = {
          matchStatus: match.matchStatus,
        };
        if (overrideUserId) dbUpdates.overrideApprovedByUserId = overrideUserId;
        if (justification) dbUpdates.overrideJustification = justification;
        if (paymentVoucherCode) dbUpdates.paymentVoucherCode = paymentVoucherCode;

        await db.update(supplyThreeWayMatches).set(dbUpdates).where(eq(supplyThreeWayMatches.id, id));
      } catch (error) {
        handleWriteError('updateThreeWayMatch', error);
      }
    }

    return match;
  }

  // ─── Contracts ───

  public async createContract(contract: SupplyContractItem): Promise<SupplyContractItem> {
    this.memoryStore.contracts.set(contract.id, { ...contract });
    if (db) {
      try {
        await db.insert(supplyContracts).values({
          id: contract.id,
          contractCode: contract.contractCode,
          vendorId: contract.vendorId,
          title: contract.title,
          contractType: contract.contractType,
          totalValueUsd: contract.totalValueUsd,
          effectiveStartDate: contract.effectiveStartDate,
          effectiveEndDate: contract.effectiveEndDate,
          renewalNoticeDays: contract.renewalNoticeDays,
          slaUptimeTargetPercent: contract.slaUptimeTargetPercent,
          slaPenaltyRatePerOutageHourUsd: contract.slaPenaltyRatePerOutageHourUsd,
          status: contract.status,
          institutionId: contract.institutionId,
          createdAt: contract.createdAt,
          updatedAt: contract.updatedAt,
        }).onConflictDoNothing();
      } catch (error) {
        handleWriteError('createContract', error);
      }
    }
    return contract;
  }

  public async getContractById(id: string, institutionId = 'global'): Promise<SupplyContractItem | null> {
    const item = this.memoryStore.contracts.get(id);
    if (item && (item.institutionId === institutionId || institutionId === 'global' || item.institutionId === 'global')) {
      return item;
    }
    return null;
  }

  public async getContractByCode(contractCode: string, institutionId = 'global'): Promise<SupplyContractItem | null> {
    for (const item of this.memoryStore.contracts.values()) {
      if (
        item.contractCode === contractCode &&
        (item.institutionId === institutionId || institutionId === 'global' || item.institutionId === 'global')
      ) {
        return item;
      }
    }
    return null;
  }

  public async listContracts(institutionId = 'global'): Promise<SupplyContractItem[]> {
    const result: SupplyContractItem[] = [];
    for (const item of this.memoryStore.contracts.values()) {
      if (item.institutionId === institutionId || institutionId === 'global' || item.institutionId === 'global') {
        result.push(item);
      }
    }
    return result;
  }

  public async updateContractStatus(
    id: string,
    status: ContractStatus,
    institutionId = 'global'
  ): Promise<SupplyContractItem | null> {
    const contract = await this.getContractById(id, institutionId);
    if (!contract) return null;
    contract.status = status;
    contract.updatedAt = new Date().toISOString();
    this.memoryStore.contracts.set(id, contract);

    if (db) {
      try {
        await db.update(supplyContracts).set({
          status: contract.status,
          updatedAt: contract.updatedAt,
        }).where(eq(supplyContracts.id, id));
      } catch (error) {
        handleWriteError('updateContractStatus', error);
      }
    }

    return contract;
  }

  // ─── Milestones ───

  public async createMilestone(milestone: SupplyContractMilestoneItem): Promise<SupplyContractMilestoneItem> {
    this.memoryStore.milestones.set(milestone.id, { ...milestone });
    if (db) {
      try {
        await db.insert(supplyContractMilestones).values({
          id: milestone.id,
          milestoneId: milestone.milestoneId,
          contractId: milestone.contractId,
          milestoneNumber: milestone.milestoneNumber,
          title: milestone.title,
          deliverableDescription: milestone.deliverableDescription,
          amountUsd: milestone.amountUsd,
          dueDate: milestone.dueDate,
          completionDate: milestone.completionDate ?? null,
          deliverableEvidenceUrl: milestone.deliverableEvidenceUrl ?? null,
          approvedByUserId: milestone.approvedByUserId ?? null,
          status: milestone.status,
          institutionId: milestone.institutionId,
          createdAt: milestone.createdAt,
        }).onConflictDoNothing();
      } catch (error) {
        handleWriteError('createMilestone', error);
      }
    }
    return milestone;
  }

  public async listMilestonesByContract(contractId: string, institutionId = 'global'): Promise<SupplyContractMilestoneItem[]> {
    const result: SupplyContractMilestoneItem[] = [];
    for (const item of this.memoryStore.milestones.values()) {
      if (
        item.contractId === contractId &&
        (item.institutionId === institutionId || institutionId === 'global' || item.institutionId === 'global')
      ) {
        result.push(item);
      }
    }
    return result.sort((a, b) => a.milestoneNumber - b.milestoneNumber);
  }

  public async updateMilestoneStatus(
    id: string,
    status: MilestoneStatus,
    approvedByUserId?: string,
    _institutionId = 'global'
  ): Promise<SupplyContractMilestoneItem | null> {
    const item = this.memoryStore.milestones.get(id);
    if (!item) return null;
    item.status = status;
    if (approvedByUserId) item.approvedByUserId = approvedByUserId;
    if (status === 'approved' || status === 'paid') {
      item.completionDate = new Date().toISOString();
    }
    this.memoryStore.milestones.set(id, item);

    if (db) {
      try {
        const dbUpdates: Record<string, unknown> = {
          status: item.status,
        };
        if (item.approvedByUserId) dbUpdates.approvedByUserId = item.approvedByUserId;
        if (item.completionDate) dbUpdates.completionDate = item.completionDate;

        await db.update(supplyContractMilestones).set(dbUpdates).where(eq(supplyContractMilestones.id, id));
      } catch (error) {
        handleWriteError('updateMilestoneStatus', error);
      }
    }

    return item;
  }

  // ─── Budget Encumbrances ───

  public async createEncumbrance(enc: SupplyBudgetEncumbranceItem): Promise<SupplyBudgetEncumbranceItem> {
    this.memoryStore.encumbrances.set(enc.id, { ...enc });
    if (db) {
      try {
        await db.insert(supplyBudgetEncumbrances).values({
          id: enc.id,
          encumbranceNumber: enc.encumbranceNumber,
          departmentId: enc.departmentId,
          budgetCode: enc.budgetCode,
          poId: enc.poId,
          encumberedAmountUsd: enc.encumberedAmountUsd,
          liquidatedAmountUsd: enc.liquidatedAmountUsd,
          remainingEncumberedUsd: enc.remainingEncumberedUsd,
          status: enc.status,
          debitAccountCode: enc.debitAccountCode,
          creditAccountCode: enc.creditAccountCode,
          institutionId: enc.institutionId,
          createdAt: enc.createdAt,
          updatedAt: enc.updatedAt,
        }).onConflictDoNothing();
      } catch (error) {
        handleWriteError('createEncumbrance', error);
      }
    }
    return enc;
  }

  public async getEncumbranceByPoId(poId: string, institutionId = 'global'): Promise<SupplyBudgetEncumbranceItem | null> {
    for (const item of this.memoryStore.encumbrances.values()) {
      if (
        item.poId === poId &&
        (item.institutionId === institutionId || institutionId === 'global' || item.institutionId === 'global')
      ) {
        return item;
      }
    }
    return null;
  }

  public async listEncumbrances(institutionId = 'global'): Promise<SupplyBudgetEncumbranceItem[]> {
    const result: SupplyBudgetEncumbranceItem[] = [];
    for (const item of this.memoryStore.encumbrances.values()) {
      if (item.institutionId === institutionId || institutionId === 'global' || item.institutionId === 'global') {
        result.push(item);
      }
    }
    return result;
  }

  public async liquidateEncumbrance(
    poId: string,
    amountToLiquidate: number,
    institutionId = 'global'
  ): Promise<SupplyBudgetEncumbranceItem | null> {
    const enc = await this.getEncumbranceByPoId(poId, institutionId);
    if (!enc) return null;
    enc.liquidatedAmountUsd += amountToLiquidate;
    enc.remainingEncumberedUsd = Math.max(0, enc.encumberedAmountUsd - enc.liquidatedAmountUsd);
    if (enc.remainingEncumberedUsd === 0) {
      enc.status = 'fully_liquidated';
    } else {
      enc.status = 'partially_liquidated';
    }
    enc.updatedAt = new Date().toISOString();
    this.memoryStore.encumbrances.set(enc.id, enc);

    if (db) {
      try {
        await db.update(supplyBudgetEncumbrances).set({
          liquidatedAmountUsd: enc.liquidatedAmountUsd,
          remainingEncumberedUsd: enc.remainingEncumberedUsd,
          status: enc.status,
          updatedAt: enc.updatedAt,
        }).where(eq(supplyBudgetEncumbrances.id, enc.id));
      } catch (error) {
        handleWriteError('liquidateEncumbrance', error);
      }
    }

    return enc;
  }

  // ─── Audit Logs ───

  private auditLogList: SupplyAuditLogItem[] = [];

  public async createAuditLog(log: SupplyAuditLogItem): Promise<SupplyAuditLogItem> {
    this.memoryStore.auditLogs.set(log.id, { ...log });
    this.auditLogList.push({ ...log });
    if (db) {
      try {
        await db.insert(supplyAuditLogs).values({
          id: log.id,
          auditId: log.auditId,
          actorId: log.actorId,
          actorRole: log.actorRole,
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId,
          payloadHash: log.payloadHash,
          prevMerkleRoot: log.prevMerkleRoot,
          merkleRoot: log.merkleRoot,
          timestamp: log.timestamp,
          institutionId: log.institutionId,
          createdAt: log.createdAt,
        }).onConflictDoNothing();
      } catch (error) {
        handleWriteError('createAuditLog', error);
      }
    }
    return log;
  }

  public async listAuditLogs(institutionId = 'global'): Promise<SupplyAuditLogItem[]> {
    const result: SupplyAuditLogItem[] = [];
    for (const item of this.auditLogList) {
      if (item.institutionId === institutionId || institutionId === 'global' || item.institutionId === 'global') {
        result.push(item);
      }
    }
    // Return newest first (reverse of insertion order)
    return [...result].reverse();
  }
}

export const supplyStore = SupplyDbStore.getInstance();
