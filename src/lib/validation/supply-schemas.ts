import { z } from 'zod';

export const vendorCreateSchema = z.object({
  vendorCode: z.string().min(2),
  name: z.string().min(2),
  legalEntityName: z.string().optional().nullable(),
  category: z.enum([
    'hardware',
    'facilities_maintenance',
    'lab_supplies',
    'office_consumables',
    'software_services',
    'logistics',
  ]),
  taxId: z.string().min(3),
  contactName: z.string().min(2),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().default('USA'),
  paymentTerms: z.enum(['NET_15', 'NET_30', 'NET_60', 'IMMEDIATE']).default('NET_30'),
  institutionId: z.string().default('global'),
});

export const requisitionCreateSchema = z.object({
  departmentId: z.string().min(1),
  sourceType: z.enum(['manual', 'facility_work_order', 'neuro_hpc_compute', 'predictive_reorder']).default('manual'),
  sourceReferenceId: z.string().optional().nullable(),
  title: z.string().min(3),
  urgency: z.enum(['standard', 'expedited', 'emergency']).default('standard'),
  estimatedTotalUsd: z.number().positive(),
  budgetCode: z.string().min(2),
  requiredByDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  institutionId: z.string().default('global'),
});

export const purchaseOrderCreateSchema = z.object({
  requisitionId: z.string().optional().nullable(),
  vendorId: z.string().min(1),
  departmentId: z.string().min(1),
  orderDate: z.string().min(10),
  expectedDeliveryDate: z.string().optional().nullable(),
  subtotalUsd: z.number().positive(),
  taxAmountUsd: z.number().nonnegative().default(0.0),
  shippingAmountUsd: z.number().nonnegative().default(0.0),
  totalAmountUsd: z.number().positive(),
  currency: z.string().default('USD'),
  paymentTerms: z.enum(['NET_15', 'NET_30', 'NET_60', 'IMMEDIATE']).default('NET_30'),
  shippingAddress: z.string().min(5),
  shippingDock: z.string().default('DOCK_A_CENTRAL'),
  institutionId: z.string().default('global'),
  lineItems: z
    .array(
      z.object({
        itemSku: z.string().min(1),
        description: z.string().min(1),
        category: z.string().default('general'),
        unitPriceUsd: z.number().positive(),
        quantityOrdered: z.number().positive(),
        unitOfMeasure: z.string().default('EA'),
      })
    )
    .optional(),
});

export const orderApprovalSchema = z.object({
  action: z.enum(['approve', 'reject', 'escalate']),
  comments: z.string().optional(),
});

export const goodsReceiptCreateSchema = z.object({
  poId: z.string().min(1),
  vendorId: z.string().min(1),
  receivedDate: z.string().min(10),
  warehouseBay: z.string().default('BAY_1'),
  dockTag: z.string().default('DOCK_A'),
  carrierName: z.string().optional().nullable(),
  trackingNumber: z.string().optional().nullable(),
  packageCondition: z.enum(['good', 'damaged', 'tampered']).default('good'),
  inspectionNotes: z.string().optional().nullable(),
  institutionId: z.string().default('global'),
});

export const invoiceCreateSchema = z.object({
  invoiceNumber: z.string().min(1),
  vendorId: z.string().min(1),
  poId: z.string().optional().nullable(),
  invoiceDate: z.string().min(10),
  dueDate: z.string().min(10),
  subtotalUsd: z.number().positive(),
  taxAmountUsd: z.number().nonnegative().default(0.0),
  totalAmountUsd: z.number().positive(),
  currency: z.string().default('USD'),
  documentUrl: z.string().optional().nullable(),
  institutionId: z.string().default('global'),
});

export const invoiceMatchSchema = z.object({
  invoiceId: z.string().min(1),
  poId: z.string().min(1),
  receiptId: z.string().optional().nullable(),
  lines: z.array(
    z.object({
      itemSku: z.string().min(1),
      description: z.string().min(1),
      poUnitPriceUsd: z.number().positive(),
      poQuantityOrdered: z.number().positive(),
      grnQuantityReceived: z.number().nonnegative(),
      invoiceUnitPriceUsd: z.number().positive(),
      invoiceQuantityBilled: z.number().positive(),
    })
  ),
  institutionId: z.string().default('global'),
});

export const contractCreateSchema = z.object({
  contractCode: z.string().min(2),
  vendorId: z.string().min(1),
  title: z.string().min(3),
  contractType: z.enum(['MSA', 'SOW', 'SLA_SERVICE', 'EQUIPMENT_LEASE', 'SOFTWARE_LICENSE']).default('MSA'),
  totalValueUsd: z.number().positive(),
  effectiveStartDate: z.string().min(10),
  effectiveEndDate: z.string().min(10),
  renewalNoticeDays: z.number().int().positive().default(60),
  slaUptimeTargetPercent: z.number().min(0).max(100).default(99.9),
  slaPenaltyRatePerOutageHourUsd: z.number().nonnegative().default(500.0),
  institutionId: z.string().default('global'),
});

export const milestoneCreateSchema = z.object({
  contractId: z.string().min(1),
  milestoneNumber: z.number().int().positive(),
  title: z.string().min(3),
  deliverableDescription: z.string().min(5),
  amountUsd: z.number().positive(),
  dueDate: z.string().min(10),
  deliverableEvidenceUrl: z.string().optional().nullable(),
  institutionId: z.string().default('global'),
});
