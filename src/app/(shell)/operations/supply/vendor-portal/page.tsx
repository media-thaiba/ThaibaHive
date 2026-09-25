"use client";

import { PageHeader } from "@/components/ui/page-header";
import { VendorPortalView, VendorPortalContract } from "@/components/operations/supply/vendor-portal-view";

export default function VendorPortalPage() {
  const mockContracts: VendorPortalContract[] = [
    {
      id: "cnt-apex-01",
      contractCode: "MSA-2026-APEX",
      title: "Campus Compute Hardware & HPC Expansion MSA",
      totalValueUsd: 150000,
      effectiveEndDate: "2026-12-31",
      status: "active",
      milestones: [
        {
          id: "m-1",
          milestoneNumber: 1,
          title: "Phase 1 GPU Server Delivery & Rack Mount",
          amountUsd: 50000,
          dueDate: "2026-08-30",
          status: "approved",
          evidenceUrl: "https://docs.institution.edu/signoffs/phase1-delivery.pdf",
        },
        {
          id: "m-2",
          milestoneNumber: 2,
          title: "InfiniBand Fabric Interconnect Testing & Burn-in",
          amountUsd: 60000,
          dueDate: "2026-09-30",
          status: "pending",
        },
        {
          id: "m-3",
          milestoneNumber: 3,
          title: "Final Cluster Acceptance & Training Handover",
          amountUsd: 40000,
          dueDate: "2026-11-15",
          status: "pending",
        },
      ],
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Supplier Self-Service Portal"
        description="Vendor contract milestone deliverables, invoice submission, and compliance certificates"
      />

      <VendorPortalView
        vendorName="Apex Scientific & Hardware Corp"
        vendorCode="VEND-001"
        esgRating="AAA"
        riskTier="Low"
        contracts={mockContracts}
      />
    </div>
  );
}
