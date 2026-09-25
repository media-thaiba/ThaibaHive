/**
 * SUPPLY-HIVE / ProcurementOS Domain Types
 * Sprint-054 — Autonomous Institutional Procurement, Vendor Contracts & Supply Chain Intelligence
 */

export type VendorCategory =
  | 'hardware'
  | 'facilities_maintenance'
  | 'lab_supplies'
  | 'office_consumables'
  | 'software_services'
  | 'logistics';

export type PaymentTerms = 'NET_15' | 'NET_30' | 'NET_60' | 'IMMEDIATE';

export type VendorOnboardingStatus = 'pending_verification' | 'approved' | 'restricted' | 'blocked';

export type VendorRiskTier = 'low' | 'medium' | 'high' | 'critical';

export type EsgRatingGrade = 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'CCC';

export type VendorCertType =
  | 'ISO_9001'
  | 'ISO_14001'
  | 'ISO_27001'
  | 'SOC2'
  | 'FAIR_LABOR'
  | 'CARBON_NEUTRAL'
  | 'MINORITY_OWNED';

export type CertVerificationStatus = 'pending' | 'verified' | 'expired' | 'revoked';

export type RequisitionSourceType =
  | 'manual'
  | 'facility_work_order'
  | 'neuro_hpc_compute'
  | 'predictive_reorder';

export type RequisitionUrgency = 'standard' | 'expedited' | 'emergency';

export type ApprovalTier = 'auto' | 'hod' | 'principal' | 'cfo_board' | 'approved' | 'rejected';

export type RequisitionStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'converted_to_po'
  | 'cancelled';

export type PoStatus = 'issued' | 'acknowledged' | 'partially_shipped' | 'fulfilled' | 'cancelled';

export type PoLineStatus = 'pending' | 'partially_received' | 'fully_received' | 'cancelled';

export type GoodsReceiptStatus = 'verified' | 'quarantined' | 'rejected';

export type PackageCondition = 'good' | 'damaged' | 'tampered';

export type InvoiceStatus =
  | 'submitted'
  | 'under_match'
  | 'matched'
  | 'discrepancy'
  | 'approved_for_payment'
  | 'paid'
  | 'rejected';

export type ThreeWayMatchStatus =
  | 'matched'
  | 'price_variance'
  | 'quantity_variance'
  | 'missing_receipt'
  | 'override_approved';

export type ContractType = 'MSA' | 'SOW' | 'SLA_SERVICE' | 'EQUIPMENT_LEASE' | 'SOFTWARE_LICENSE';

export type ContractStatus = 'draft' | 'active' | 'expiring_soon' | 'renewed' | 'expired' | 'terminated';

export type MilestoneStatus = 'pending' | 'submitted' | 'approved' | 'paid' | 'delayed';

export type EncumbranceStatus = 'active' | 'partially_liquidated' | 'fully_liquidated' | 'released';

export type SupplyAuditAction =
  | 'requisition_created'
  | 'requisition_approved'
  | 'po_issued'
  | 'goods_received'
  | 'three_way_matched'
  | 'discrepancy_overridden'
  | 'encumbrance_locked'
  | 'contract_signed';

// ─── Entity Interfaces ───

export interface SupplyVendorItem {
  id: string;
  vendorCode: string;
  name: string;
  legalEntityName?: string | null;
  category: VendorCategory;
  taxId: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string | null;
  address?: string | null;
  city?: string | null;
  country: string;
  paymentTerms: PaymentTerms;
  onboardingStatus: VendorOnboardingStatus;
  riskTier: VendorRiskTier;
  riskScore: number;
  esgRating: EsgRatingGrade;
  esgScore: number;
  isSanctionsClean: boolean;
  institutionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplyVendorCertificationItem {
  id: string;
  vendorId: string;
  certType: VendorCertType;
  certNumber: string;
  issuingAuthority: string;
  issuedDate: string;
  expiryDate: string;
  documentUrl?: string | null;
  verificationStatus: CertVerificationStatus;
  institutionId: string;
  createdAt: string;
}

export interface SupplyVendorRiskAssessmentItem {
  id: string;
  assessmentId: string;
  vendorId: string;
  overallRiskScore: number;
  financialRiskScore: number;
  complianceRiskScore: number;
  operationalRiskScore: number;
  sanctionsRegistryChecked: string;
  sanctionsMatched: boolean;
  pepMatched: boolean;
  adverseMediaFindings?: string | null;
  recommendedAction: 'approve' | 'flag_for_review' | 'reject';
  assessedByUserId?: string | null;
  institutionId: string;
  createdAt: string;
}

export interface SupplyVendorEsgScoreItem {
  id: string;
  scoreId: string;
  vendorId: string;
  compositeEsgScore: number;
  environmentalScore: number;
  socialScore: number;
  governanceScore: number;
  scope3CarbonIntensityKgPerUsd: number;
  recycledMaterialPercentage: number;
  fairLaborCertified: boolean;
  ratingGrade: EsgRatingGrade;
  auditYear: number;
  institutionId: string;
  createdAt: string;
}

export interface SupplyPurchaseRequisitionItem {
  id: string;
  requisitionNumber: string;
  departmentId: string;
  requesterId: string;
  sourceType: RequisitionSourceType;
  sourceReferenceId?: string | null;
  title: string;
  urgency: RequisitionUrgency;
  estimatedTotalUsd: number;
  budgetCode: string;
  requiredByDate?: string | null;
  currentApprovalTier: ApprovalTier;
  status: RequisitionStatus;
  rejectionReason?: string | null;
  approvedByUserId?: string | null;
  approvedAt?: string | null;
  notes?: string | null;
  institutionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplyPurchaseOrderItem {
  id: string;
  poNumber: string;
  requisitionId?: string | null;
  vendorId: string;
  departmentId: string;
  orderDate: string;
  expectedDeliveryDate?: string | null;
  subtotalUsd: number;
  taxAmountUsd: number;
  shippingAmountUsd: number;
  totalAmountUsd: number;
  currency: string;
  paymentTerms: PaymentTerms;
  shippingAddress: string;
  shippingDock: string;
  status: PoStatus;
  isEncumbered: boolean;
  encumbranceId?: string | null;
  merkleLeafHash: string;
  institutionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplyPoLineItemItem {
  id: string;
  poId: string;
  lineNumber: number;
  itemSku: string;
  description: string;
  category: string;
  unitPriceUsd: number;
  quantityOrdered: number;
  quantityReceived: number;
  quantityInvoiced: number;
  unitOfMeasure: string;
  lineTotalUsd: number;
  status: PoLineStatus;
  institutionId: string;
  createdAt: string;
}

export interface SupplyGoodsReceiptItem {
  id: string;
  receiptNumber: string;
  poId: string;
  vendorId: string;
  receivedDate: string;
  receivedByUserId: string;
  warehouseBay: string;
  dockTag: string;
  carrierName?: string | null;
  trackingNumber?: string | null;
  packageCondition: PackageCondition;
  inspectionNotes?: string | null;
  receiverSignature: string;
  status: GoodsReceiptStatus;
  institutionId: string;
  createdAt: string;
}

export interface SupplyVendorInvoiceItem {
  id: string;
  invoiceNumber: string;
  vendorId: string;
  poId?: string | null;
  invoiceDate: string;
  dueDate: string;
  subtotalUsd: number;
  taxAmountUsd: number;
  totalAmountUsd: number;
  currency: string;
  documentUrl?: string | null;
  status: InvoiceStatus;
  voucherNumber?: string | null;
  institutionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplyThreeWayMatchItem {
  id: string;
  matchId: string;
  invoiceId: string;
  poId: string;
  receiptId?: string | null;
  matchStatus: ThreeWayMatchStatus;
  priceVariancePercent: number;
  quantityVarianceUnits: number;
  dollarVarianceUsd: number;
  isToleranceCompliant: boolean;
  overrideApprovedByUserId?: string | null;
  overrideJustification?: string | null;
  debitMemoGenerated: boolean;
  debitMemoAmountUsd: number;
  paymentVoucherCode?: string | null;
  institutionId: string;
  createdAt: string;
}

export interface SupplyContractItem {
  id: string;
  contractCode: string;
  vendorId: string;
  title: string;
  contractType: ContractType;
  totalValueUsd: number;
  effectiveStartDate: string;
  effectiveEndDate: string;
  renewalNoticeDays: number;
  slaUptimeTargetPercent: number;
  slaPenaltyRatePerOutageHourUsd: number;
  status: ContractStatus;
  institutionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplyContractMilestoneItem {
  id: string;
  milestoneId: string;
  contractId: string;
  milestoneNumber: number;
  title: string;
  deliverableDescription: string;
  amountUsd: number;
  dueDate: string;
  completionDate?: string | null;
  deliverableEvidenceUrl?: string | null;
  approvedByUserId?: string | null;
  status: MilestoneStatus;
  institutionId: string;
  createdAt: string;
}

export interface SupplyBudgetEncumbranceItem {
  id: string;
  encumbranceNumber: string;
  departmentId: string;
  budgetCode: string;
  poId: string;
  encumberedAmountUsd: number;
  liquidatedAmountUsd: number;
  remainingEncumberedUsd: number;
  status: EncumbranceStatus;
  debitAccountCode: string;
  creditAccountCode: string;
  institutionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplyAuditLogItem {
  id: string;
  auditId: string;
  actorId: string;
  actorRole: string;
  action: SupplyAuditAction | string;
  entityType: string;
  entityId: string;
  payloadHash: string;
  prevMerkleRoot: string;
  merkleRoot: string;
  timestamp: string;
  institutionId: string;
  createdAt: string;
}
