import { printThemes, PrintTheme } from './print-themes';

export interface PagedMediaOptions {
  pageSize?: 'A4' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  marginTopMm?: number;
  marginRightMm?: number;
  marginBottomMm?: number;
  marginLeftMm?: number;
  theme?: string | PrintTheme;
  watermarkText?: string;
  headerTitle?: string;
  footerText?: string;
  showPageNumbers?: boolean;
}

export class PagedMediaStyler {
  public static generatePrintCss(options: PagedMediaOptions = {}): string {
    const {
      pageSize = 'A4',
      orientation = 'portrait',
      marginTopMm = 15,
      marginRightMm = 15,
      marginBottomMm = 15,
      marginLeftMm = 15,
      theme: themeProp = 'academicNavy',
      watermarkText,
    } = options;

    const theme: PrintTheme =
      typeof themeProp === 'string'
        ? printThemes[themeProp] || printThemes.academicNavy
        : themeProp;

    let watermarkCss = '';
    if (watermarkText) {
      const angle = orientation === 'landscape' ? '-25deg' : '-45deg';
      watermarkCss = `
        .paged-watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(${angle});
          font-size: 64px;
          font-weight: 800;
          color: rgba(15, 23, 42, 0.05);
          text-transform: uppercase;
          letter-spacing: 6px;
          pointer-events: none;
          z-index: 0;
          user-select: none;
          white-space: nowrap;
        }
      `;
    }

    return `
      @page {
        size: ${pageSize} ${orientation};
        margin-top: ${marginTopMm}mm;
        margin-right: ${marginRightMm}mm;
        margin-bottom: ${marginBottomMm}mm;
        margin-left: ${marginLeftMm}mm;
      }

      @media print {
        html, body {
          width: 100%;
          height: 100%;
          background: ${theme.backgroundColor};
          color: ${theme.textColor};
          font-family: ${theme.fontFamily};
        }
        .page-break-before { page-break-before: always; }
        .page-break-after { page-break-after: always; }
        .avoid-break { page-break-inside: avoid; }
        table { page-break-inside: auto; }
        tr { page-break-inside: avoid; page-break-after: auto; }
        thead { display: table-header-group; }
        tfoot { display: table-footer-group; }
      }

      body {
        font-family: ${theme.fontFamily};
        color: ${theme.textColor};
        background: ${theme.backgroundColor};
        line-height: 1.5;
      }

      .paged-document {
        position: relative;
        width: 100%;
        max-width: ${orientation === 'landscape' ? '297mm' : '210mm'};
        margin: 0 auto;
        background: ${theme.backgroundColor};
      }

      .paged-footer {
        margin-top: 24px;
        border-top: 1px solid ${theme.borderColor};
        padding-top: 8px;
        display: flex;
        justify-content: space-between;
        font-size: 10px;
        color: ${theme.secondaryColor};
      }

      ${watermarkCss}
    `.trim();
  }

  public static wrapInPagedContainer(bodyHtml: string, options: PagedMediaOptions = {}): string {
    const css = this.generatePrintCss(options);
    const watermarkTag = options.watermarkText
      ? `<div class="paged-watermark">${options.watermarkText}</div>`
      : '';

    const footerTag = options.footerText
      ? `<div class="paged-footer">
          <span>${options.footerText}</span>
          ${options.showPageNumbers ? `<span>Generated on ${new Date().toISOString().split('T')[0]}</span>` : ''}
        </div>`
      : '';

    return `
      <style>${css}</style>
      <div class="paged-document">
        ${watermarkTag}
        <div class="paged-content">
          ${bodyHtml}
        </div>
        ${footerTag}
      </div>
    `.trim();
  }
}
