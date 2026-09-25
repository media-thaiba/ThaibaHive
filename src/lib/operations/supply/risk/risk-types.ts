/**
 * Vendor Risk Screening & Sanctions Types
 * SUPPLY-HIVE / ProcurementOS (Sprint-054)
 */

export interface SanctionsWatchlistEntry {
  id: string;
  entityName: string;
  aliases: string[];
  registry: 'OFAC_SDN' | 'UN_CONSOLIDATED' | 'EU_FINANCIAL' | 'PEP_GLOBAL';
  country: string;
  reason: string;
  listedDate: string;
}

export interface SanctionsMatchResult {
  hasMatch: boolean;
  highestSimilarity: number;
  matchedEntity?: SanctionsWatchlistEntry;
  searchedTerm: string;
  registryChecked: string;
  checkedAt: string;
}

export interface VendorRiskInput {
  vendorId: string;
  vendorName: string;
  taxId: string;
  country: string;
  yearsInBusiness: number;
  creditScore: number; // 300 to 850
  priorDiscrepancyRate: number; // 0.0 to 1.0
  activeLawsuitsCount: number;
  certificationsCount: number;
}
