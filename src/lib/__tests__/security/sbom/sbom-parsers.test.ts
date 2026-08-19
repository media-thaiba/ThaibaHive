import { CycloneDxParser } from '@/lib/security/sbom/cyclonedx-parser';
import { SpdxParser } from '@/lib/security/sbom/spdx-parser';
import { SbomDocument } from '@/lib/security/sbom/sbom-types';

describe('CycloneDxParser & SpdxParser', () => {
  const sampleDoc: SbomDocument = {
    format: 'CycloneDX_JSON',
    specVersion: '1.5',
    serialNumber: '11223344-5566-7788-9900-aabbccddeeff',
    timestamp: new Date().toISOString(),
    component: { name: 'TestApp', version: '1.0.0', type: 'application' },
    packages: [
      {
        name: 'test-lib',
        version: '1.2.3',
        purl: 'pkg:npm/test-lib@1.2.3',
        license: 'MIT',
        isDirectDependency: true,
      },
    ],
  };

  it('serializes and parses CycloneDX format round-trip', () => {
    const json = CycloneDxParser.serialize(sampleDoc);
    const parsed = CycloneDxParser.parse(json);

    expect(parsed.format).toBe('CycloneDX_JSON');
    expect(parsed.packages).toHaveLength(1);
    expect(parsed.packages[0].name).toBe('test-lib');
    expect(parsed.packages[0].version).toBe('1.2.3');
  });

  it('serializes and parses SPDX format round-trip', () => {
    const json = SpdxParser.serialize(sampleDoc);
    const parsed = SpdxParser.parse(json);

    expect(parsed.format).toBe('SPDX_JSON');
    expect(parsed.packages).toHaveLength(1);
    expect(parsed.packages[0].name).toBe('test-lib');
  });
});
