/**
 * Automated SBOM Generator
 * Sprint-041 (ZASM)
 */

import crypto from 'crypto';
import { SbomDocument, SbomPackage, SbomFormat } from './sbom-types';
import { CycloneDxParser } from './cyclonedx-parser';
import { SpdxParser } from './spdx-parser';

export class SbomGenerator {
  /**
   * Generates an SBOM document from an array of package manifests or dependencies
   */
  public static generateSbom(options: {
    projectName?: string;
    version?: string;
    dependencies: { name: string; version: string; license?: string; isDirect?: boolean }[];
    format?: SbomFormat;
  }): { document: SbomDocument; rawOutput: string } {
    const projectName = options.projectName || 'ThaibaHive';
    const version = options.version || '3.25.0';
    const format = options.format || 'CycloneDX_JSON';
    const serialNumber = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    const packages: SbomPackage[] = options.dependencies.map((dep) => {
      const purl = `pkg:npm/${dep.name}@${dep.version.replace(/^\^|~/, '')}`;
      const sha256 = crypto
        .createHash('sha256')
        .update(`${dep.name}@${dep.version}`)
        .digest('hex');

      return {
        name: dep.name,
        version: dep.version,
        purl,
        license: dep.license || 'MIT',
        sha256,
        isDirectDependency: dep.isDirect ?? true,
      };
    });

    const document: SbomDocument = {
      format,
      specVersion: format === 'CycloneDX_JSON' ? '1.5' : 'SPDX-2.3',
      serialNumber,
      timestamp,
      component: {
        name: projectName,
        version,
        type: 'application',
      },
      packages,
    };

    const rawOutput =
      format === 'CycloneDX_JSON'
        ? CycloneDxParser.serialize(document)
        : SpdxParser.serialize(document);

    return { document, rawOutput };
  }
}
