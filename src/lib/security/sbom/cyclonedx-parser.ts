/**
 * CycloneDX JSON Parser and Serializer
 * Sprint-041 (ZASM)
 */

import { SbomDocument, SbomPackage } from './sbom-types';

export class CycloneDxParser {
  /**
   * Formats internal SbomDocument into official CycloneDX v1.5 JSON schema
   */
  public static serialize(doc: SbomDocument): string {
    const cycloneDx = {
      bomFormat: 'CycloneDX',
      specVersion: '1.5',
      serialNumber: `urn:uuid:${doc.serialNumber}`,
      version: 1,
      metadata: {
        timestamp: doc.timestamp,
        tools: [{ vendor: 'ThaibaHive', name: 'ZASM-SBOM-Engine', version: '3.25.0' }],
        component: {
          name: doc.component.name,
          version: doc.component.version,
          type: doc.component.type,
        },
      },
      components: doc.packages.map((pkg) => ({
        type: 'library',
        name: pkg.name,
        version: pkg.version,
        purl: pkg.purl,
        description: pkg.description,
        licenses: pkg.license ? [{ license: { id: pkg.license } }] : [],
        hashes: pkg.sha256 ? [{ alg: 'SHA-256', content: pkg.sha256 }] : [],
      })),
    };

    return JSON.stringify(cycloneDx, null, 2);
  }

  /**
   * Parses a CycloneDX JSON document into standard SbomDocument
   */
  public static parse(jsonString: string): SbomDocument {
    const raw = JSON.parse(jsonString);
    const packages: SbomPackage[] = (raw.components || []).map((c: any) => ({
      name: c.name,
      version: c.version,
      purl: c.purl || `pkg:npm/${c.name}@${c.version}`,
      description: c.description,
      license: c.licenses?.[0]?.license?.id || c.licenses?.[0]?.license?.name || 'UNKNOWN',
      sha256: c.hashes?.find((h: any) => h.alg === 'SHA-256')?.content,
      isDirectDependency: true,
    }));

    return {
      format: 'CycloneDX_JSON',
      specVersion: raw.specVersion || '1.5',
      serialNumber: raw.serialNumber?.replace('urn:uuid:', '') || 'serial-unknown',
      timestamp: raw.metadata?.timestamp || new Date().toISOString(),
      component: {
        name: raw.metadata?.component?.name || 'root',
        version: raw.metadata?.component?.version || '1.0.0',
        type: raw.metadata?.component?.type || 'application',
      },
      packages,
    };
  }
}
