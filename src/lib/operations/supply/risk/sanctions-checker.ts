import { SanctionsWatchlistEntry, SanctionsMatchResult } from './risk-types';

export class SanctionsChecker {
  private static instance: SanctionsChecker;

  private watchlist: SanctionsWatchlistEntry[] = [
    {
      id: 'SANC-001',
      entityName: 'Vanguard Shadow Maritime LLC',
      aliases: ['Vanguard Shadow Shipping', 'Vanguard Maritime'],
      registry: 'OFAC_SDN',
      country: 'Panama',
      reason: 'Sanctions evasion and illicit dual-use transshipment',
      listedDate: '2024-03-15',
    },
    {
      id: 'SANC-002',
      entityName: 'Global Microelectronics Logistics Ltd',
      aliases: ['GML Micro', 'Global Microtech'],
      registry: 'EU_FINANCIAL',
      country: 'Cyprus',
      reason: 'Unauthorized military electronics procurement',
      listedDate: '2023-11-20',
    },
    {
      id: 'SANC-003',
      entityName: 'Kestrel Petrochemical Trading',
      aliases: ['Kestrel Energy', 'KPT Group'],
      registry: 'UN_CONSOLIDATED',
      country: 'UAE',
      reason: 'Restricted petroleum and chemical trade',
      listedDate: '2025-01-10',
    },
  ];

  public static getInstance(): SanctionsChecker {
    if (!SanctionsChecker.instance) {
      SanctionsChecker.instance = new SanctionsChecker();
    }
    return SanctionsChecker.instance;
  }

  public registerSanctionsEntry(entry: SanctionsWatchlistEntry): void {
    this.watchlist.push(entry);
  }

  /**
   * Jaro-Winkler string similarity computation
   */
  public calculateStringSimilarity(s1: string, s2: string): number {
    const a = s1.toLowerCase().trim();
    const b = s2.toLowerCase().trim();

    if (a === b) return 1.0;
    if (a.length === 0 || b.length === 0) return 0.0;

    const matchDistance = Math.floor(Math.max(a.length, b.length) / 2) - 1;
    const aMatches = new Array(a.length).fill(false);
    const bMatches = new Array(b.length).fill(false);

    let matches = 0;
    for (let i = 0; i < a.length; i++) {
      const start = Math.max(0, i - matchDistance);
      const end = Math.min(i + matchDistance + 1, b.length);

      for (let j = start; j < end; j++) {
        if (!bMatches[j] && a[i] === b[j]) {
          aMatches[i] = true;
          bMatches[j] = true;
          matches++;
          break;
        }
      }
    }

    if (matches === 0) return 0.0;

    let transpositions = 0;
    let k = 0;
    for (let i = 0; i < a.length; i++) {
      if (aMatches[i]) {
        while (!bMatches[k]) k++;
        if (a[i] !== b[k]) transpositions++;
        k++;
      }
    }

    const jaro =
      (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3;

    // Common prefix bonus (up to 4 chars)
    let prefix = 0;
    for (let i = 0; i < Math.min(4, Math.min(a.length, b.length)); i++) {
      if (a[i] === b[i]) prefix++;
      else break;
    }

    return jaro + prefix * 0.1 * (1 - jaro);
  }

  public checkEntity(name: string, threshold = 0.85): SanctionsMatchResult {
    let highestSim = 0.0;
    let matchedEntity: SanctionsWatchlistEntry | undefined = undefined;

    for (const entry of this.watchlist) {
      const directSim = this.calculateStringSimilarity(name, entry.entityName);
      if (directSim > highestSim) {
        highestSim = directSim;
        matchedEntity = entry;
      }

      for (const alias of entry.aliases) {
        const aliasSim = this.calculateStringSimilarity(name, alias);
        if (aliasSim > highestSim) {
          highestSim = aliasSim;
          matchedEntity = entry;
        }
      }
    }

    const hasMatch = highestSim >= threshold;

    return {
      hasMatch,
      highestSimilarity: Number(highestSim.toFixed(4)),
      matchedEntity: hasMatch ? matchedEntity : undefined,
      searchedTerm: name,
      registryChecked: 'OFAC_SDN, UN_CONSOLIDATED, EU_FINANCIAL',
      checkedAt: new Date().toISOString(),
    };
  }
}
