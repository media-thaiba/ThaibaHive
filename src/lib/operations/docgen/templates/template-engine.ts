import { TokenEvaluator, FormatHelpers } from './token-evaluator';
import { builtInTemplates, StandardTemplateDefinition } from './built-in-templates';
import { DocDbStore } from '../../../db/docgen-store';

export interface RenderTemplateOptions {
  customHelpers?: FormatHelpers;
  wrapInHtmlDocument?: boolean;
}

export interface RenderResult {
  html: string;
  templateCode: string;
  pageSize: string;
  orientation: string;
  compiledAt: string;
}

export class TemplateEngine {
  private static instance: TemplateEngine;
  private tokenEvaluator: TokenEvaluator;
  private store: DocDbStore;

  private constructor() {
    this.tokenEvaluator = new TokenEvaluator();
    this.store = DocDbStore.getInstance();
  }

  public static getInstance(): TemplateEngine {
    if (!TemplateEngine.instance) {
      TemplateEngine.instance = new TemplateEngine();
    }
    return TemplateEngine.instance;
  }

  public async getBuiltInTemplate(templateCode: string): Promise<StandardTemplateDefinition | null> {
    const found = builtInTemplates.find((t) => t.templateCode === templateCode);
    return found || null;
  }

  public async listAllTemplates(institutionId: string): Promise<Array<{ templateCode: string; name: string; category: string; isBuiltIn: boolean }>> {
    const dbTemplates = await this.store.listTemplates(institutionId);
    const result = builtInTemplates.map((t) => ({
      templateCode: t.templateCode,
      name: t.name,
      category: t.category,
      isBuiltIn: true,
    }));

    for (const dbTpl of dbTemplates) {
      if (!result.some((r) => r.templateCode === dbTpl.templateCode)) {
        result.push({
          templateCode: dbTpl.templateCode,
          name: dbTpl.name,
          category: dbTpl.category,
          isBuiltIn: false,
        });
      }
    }

    return result;
  }

  public async render(
    templateCode: string,
    context: Record<string, any>,
    institutionId = 'global',
    options?: RenderTemplateOptions
  ): Promise<RenderResult> {
    // 1. Check database templates first, then fallback to built-ins
    let contentTemplate = '';
    let cssStyles = '';
    let pageSize = 'A4';
    let orientation = 'portrait';

    const dbTemplate = await this.store.getTemplateByCode(templateCode, institutionId);
    if (dbTemplate) {
      contentTemplate = dbTemplate.contentTemplate;
      cssStyles = dbTemplate.cssStyles || '';
      if (dbTemplate.layoutConfig) {
        try {
          const cfg = JSON.parse(dbTemplate.layoutConfig);
          pageSize = cfg.pageSize || 'A4';
          orientation = cfg.orientation || 'portrait';
        } catch {
          // default
        }
      }
    } else {
      const builtIn = builtInTemplates.find((t) => t.templateCode === templateCode);
      if (!builtIn) {
        throw new Error(`Template with code '${templateCode}' not found`);
      }
      contentTemplate = builtIn.contentTemplate;
      cssStyles = builtIn.cssStyles;
      pageSize = builtIn.layoutConfig.pageSize;
      orientation = builtIn.layoutConfig.orientation;
    }

    // 2. Evaluate tokens in body template
    const renderedBody = this.tokenEvaluator.evaluate(contentTemplate, context);

    // 3. Assemble document wrapper if requested
    let finalHtml = renderedBody;
    if (options?.wrapInHtmlDocument !== false) {
      finalHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${context.title || 'Document'}</title>
  <style>
    @page {
      size: ${pageSize} ${orientation};
      margin: 15mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      color: #0f172a;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    * { box-sizing: border-box; }
    ${cssStyles}
  </style>
</head>
<body>
  ${renderedBody}
</body>
</html>
      `.trim();
    }

    return {
      html: finalHtml,
      templateCode,
      pageSize,
      orientation,
      compiledAt: new Date().toISOString(),
    };
  }
}
