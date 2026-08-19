/**
 * SPDX JSON Parser and Serializer
 * Sprint-041 (ZASM)
 */

import { SbomDocument, SbomPackage } from './sbom-types';

export class SpdxParser {
  /**
   * Formats internal SbomDocument into SPDX v2.3 JSON schema
   */
  public static serialize(doc: SbomDocument): string {
    const spdx = {
      spdxVersion: 'SPDX-2.3',
      dataLicense: 'CC0-1.0',
      SPDXID: 'SPDXRef-DOCUMENT',
      name: doc.component.name,
      documentNamespace: `https://thaiba.internal/spdxdocs/${doc.component.name}-${doc.serialNumber}`,
      creationInfo: {
        created: doc.timestamp,
        creators: ['Tool: ThaibaHive-ZASM-3.25.0'],
      },
      packages: doc.packages.map((pkg, idx) => ({
        SPDXID: `SPDXRef-Package-${idx + 1}`,
        name: pkg.name,
        versionInfo: pkg.version,
        packageFileName: `${pkg.name}-${pkg.version}.tgz`,
        downloadLocation: `NOASSERTION`,
        licenseConcluded: pkg.license || 'NOASSERTION',
        licenseDeclared: pkg.license || 'NOASSERTION',
        checksums: pkg.sha256 ? [{ algorithm: 'SHA256', checksumValue: pkg.sha256 }] : [],
        externalRefs: [
          {
            referenceCategory: 'PACKAGE-MANAGER',
            referenceType: 'purl',
            referenceLocator: pkg.purl,
          },
        ],
      })),
    };

    return JSON.stringify(spdx, null, 2);
  }

  /**
   * Parses an SPDX JSON document into standard SbomDocument
   */
  public static parse(jsonString: string): SbomDocument {
    const raw = JSON.parse(jsonString);
    const packages: SbomPackage[] = (raw.packages || []).map((p: any) => ({
      name: p.name,
      version: p.versionInfo,
      purl: p.externalRefs?.find((r: any) => r.referenceType === 'purl')?.referenceLocator || `pkg:npm/${p.name}@${p.versionInfo}`,
      license: p.licenseDeclared !== 'NOASSERTION' ? p.licenseDeclared : 'UNKNOWN',
      sha256: p.checksums?.find((c: any) => c.algorithm === 'SHA256')?.checksumValue,
      isDirectDependency: true,
    }));

    return {
      format: 'SPDX_JSON',
      specVersion: raw.spdxVersion || 'SPDX-2.3',
      serialNumber: raw.SPDXID || 'serial-unknown',
      timestamp: raw.creationInfo?.created || new Date().toISOString(),
      component: {
        name: raw.name || 'root',
        version: '1.0.0',
        type: 'application',
      },
      packages,
    };
  }
}
