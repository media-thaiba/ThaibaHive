import { db } from '@thaiba/db';
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
  EncumbranceStatus,
} from '../operations/supply/supply-types';

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
    try {
      if (db && typeof (db as any).insert === 'function') {
        await (db as any).insert(supplyVendors).values(vendor).onConflictDoNothing();
      }
    } catch {
      // Fall back to memoryStore
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
    return vendor;
  }

  // ─── Certifications ───

  public async createCertification(cert: SupplyVendorCertificationItem): Promise<SupplyVendorCertificationItem> {
    this.memoryStore.certifications.set(cert.id, { ...cert });
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
    return req;
  }

  // ─── Purchase Orders ───

  public async createPurchaseOrder(po: SupplyPurchaseOrderItem): Promise<SupplyPurchaseOrderItem> {
    this.memoryStore.purchaseOrders.set(po.id, { ...po });
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
    return po;
  }

  // ─── Line Items ───

  public async createLineItem(item: SupplyPoLineItemItem): Promise<SupplyPoLineItemItem> {
    this.memoryStore.lineItems.set(item.id, { ...item });
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
    institutionId = 'global'
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
    return item;
  }

  // ─── Goods Receipts ───

  public async createGoodsReceipt(grn: SupplyGoodsReceiptItem): Promise<SupplyGoodsReceiptItem> {
    this.memoryStore.goodsReceipts.set(grn.id, { ...grn });
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
    return inv;
  }

  // ─── 3-Way Matches ───

  public async createThreeWayMatch(match: SupplyThreeWayMatchItem): Promise<SupplyThreeWayMatchItem> {
    this.memoryStore.threeWayMatches.set(match.id, { ...match });
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
    return match;
  }

  // ─── Contracts ───

  public async createContract(contract: SupplyContractItem): Promise<SupplyContractItem> {
    this.memoryStore.contracts.set(contract.id, { ...contract });
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
    return contract;
  }

  // ─── Milestones ───

  public async createMilestone(milestone: SupplyContractMilestoneItem): Promise<SupplyContractMilestoneItem> {
    this.memoryStore.milestones.set(milestone.id, { ...milestone });
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
    institutionId = 'global'
  ): Promise<SupplyContractMilestoneItem | null> {
    const item = this.memoryStore.milestones.get(id);
    if (!item) return null;
    item.status = status;
    if (approvedByUserId) item.approvedByUserId = approvedByUserId;
    if (status === 'approved' || status === 'paid') {
      item.completionDate = new Date().toISOString();
    }
    this.memoryStore.milestones.set(id, item);
    return item;
  }

  // ─── Budget Encumbrances ───

  public async createEncumbrance(enc: SupplyBudgetEncumbranceItem): Promise<SupplyBudgetEncumbranceItem> {
    this.memoryStore.encumbrances.set(enc.id, { ...enc });
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
    return enc;
  }

  // ─── Audit Logs ───

  private auditLogList: SupplyAuditLogItem[] = [];

  public async createAuditLog(log: SupplyAuditLogItem): Promise<SupplyAuditLogItem> {
    this.memoryStore.auditLogs.set(log.id, { ...log });
    this.auditLogList.push({ ...log });
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
