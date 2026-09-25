import { SupplyDbStore } from '../../db/supply-store';
import { vendorCreateSchema, requisitionCreateSchema, purchaseOrderCreateSchema, invoiceMatchSchema } from '../../validation/supply-schemas';

describe('SUPPLY-HIVE API Route Handlers & Zod Validation (SUPPLY-014, 015, 016)', () => {
  let store: SupplyDbStore;

  beforeEach(() => {
    store = SupplyDbStore.getInstance();
    store.clearMemoryStore();
  });

  it('should validate vendor creation schema correctly', () => {
    const validVendor = {
      vendorCode: 'VEND-001',
      name: 'Apex Scientific Inc.',
      category: 'hardware',
      taxId: 'US-998877',
      contactName: 'Sarah Connor',
      contactEmail: 'sarah@apex.com',
      paymentTerms: 'NET_30',
      institutionId: 'inst-1',
    };
    const parsed = vendorCreateSchema.safeParse(validVendor);
    expect(parsed.success).toBe(true);

    const invalidVendor = {
      vendorCode: 'V',
      name: '',
      contactEmail: 'invalid-email',
    };
    const parsedInvalid = vendorCreateSchema.safeParse(invalidVendor);
    expect(parsedInvalid.success).toBe(false);
  });

  it('should validate requisition create schema correctly', () => {
    const validReq = {
      departmentId: 'dept-chem',
      title: 'Centrifuge Tubes & Gloves',
      urgency: 'standard',
      estimatedTotalUsd: 1200.0,
      budgetCode: 'BUDGET-CHEM-2026',
    };
    const parsed = requisitionCreateSchema.safeParse(validReq);
    expect(parsed.success).toBe(true);
  });

  it('should validate purchase order create schema with line items', () => {
    const validPo = {
      vendorId: 'ven-1',
      departmentId: 'dept-eng',
      orderDate: '2026-08-21',
      subtotalUsd: 5000.0,
      totalAmountUsd: 5000.0,
      shippingAddress: '100 University Ave, Gate 4',
      lineItems: [
        {
          itemSku: 'SRV-RAM-32G',
          description: '32GB DDR4 ECC Memory',
          category: 'hardware',
          unitPriceUsd: 100.0,
          quantityOrdered: 50,
        },
      ],
    };
    const parsed = purchaseOrderCreateSchema.safeParse(validPo);
    expect(parsed.success).toBe(true);
  });

  it('should validate 3-way match request payload', () => {
    const validMatch = {
      invoiceId: 'inv-100',
      poId: 'po-100',
      lines: [
        {
          itemSku: 'PART-A',
          description: 'Industrial Valve',
          poUnitPriceUsd: 50.0,
          poQuantityOrdered: 10,
          grnQuantityReceived: 10,
          invoiceUnitPriceUsd: 50.0,
          invoiceQuantityBilled: 10,
        },
      ],
    };
    const parsed = invoiceMatchSchema.safeParse(validMatch);
    expect(parsed.success).toBe(true);
  });
});
