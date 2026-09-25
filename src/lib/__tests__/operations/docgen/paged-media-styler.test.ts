import { PagedMediaStyler } from '../../../operations/docgen/templates/paged-media-styler';

describe('PagedMediaStyler Print CSS & Layouts (Sprint-056)', () => {
  it('should generate print CSS with standard page size and margins', () => {
    const css = PagedMediaStyler.generatePrintCss({
      pageSize: 'A4',
      orientation: 'portrait',
      marginTopMm: 20,
      watermarkText: 'CONFIDENTIAL DRAFT',
    });

    expect(css).toContain('size: A4 portrait');
    expect(css).toContain('margin-top: 20mm');
    expect(css).toContain('.paged-watermark');
    expect(css).toContain('page-break-inside: avoid');
  });

  it('should wrap body HTML into a styled paged container', () => {
    const bodyHtml = '<h1>Official Academic Transcript</h1><p>Student: Bilal</p>';
    const output = PagedMediaStyler.wrapInPagedContainer(bodyHtml, {
      pageSize: 'A4',
      orientation: 'landscape',
      watermarkText: 'VERIFIED',
      footerText: 'Official College Record',
    });

    expect(output).toContain('<div class="paged-document">');
    expect(output).toContain('<div class="paged-watermark">VERIFIED</div>');
    expect(output).toContain('<h1>Official Academic Transcript</h1>');
    expect(output).toContain('Official College Record');
  });
});
