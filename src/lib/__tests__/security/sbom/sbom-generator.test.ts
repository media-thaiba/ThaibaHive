import { SbomGenerator } from '@/lib/security/sbom/sbom-generator';

describe('SbomGenerator', () => {
  it('generates a valid CycloneDX SBOM document from dependency list', () => {
    const { document, rawOutput } = SbomGenerator.generateSbom({
      projectName: 'ThaibaHive-Core',
      version: '3.25.0',
      dependencies: [
        { name: 'jose', version: '5.9.6', license: 'MIT', isDirect: true },
        { name: 'drizzle-orm', version: '0.33.0', license: 'Apache-2.0', isDirect: true },
      ],
      format: 'CycloneDX_JSON',
    });

    expect(document.format).toBe('CycloneDX_JSON');
    expect(document.packages).toHaveLength(2);
    expect(document.packages[0].purl).toBe('pkg:npm/jose@5.9.6');
    expect(document.packages[0].sha256).toHaveLength(64);

    expect(rawOutput).toContain('CycloneDX');
    expect(rawOutput).toContain('ThaibaHive-Core');
  });

  it('generates a valid SPDX SBOM document from dependency list', () => {
    const { document, rawOutput } = SbomGenerator.generateSbom({
      projectName: 'ThaibaHive-Auth',
      version: '3.25.0',
      dependencies: [{ name: 'zod', version: '3.23.8', license: 'MIT' }],
      format: 'SPDX_JSON',
    });

    expect(document.format).toBe('SPDX_JSON');
    expect(rawOutput).toContain('SPDX-2.3');
    expect(rawOutput).toContain('SPDXRef-Package-1');
  });
});
