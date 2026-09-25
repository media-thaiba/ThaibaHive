export function escapeHtml(str: string): string {
  if (typeof str !== 'string') return String(str ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function resolvePath(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  const parts = path.trim().split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}

export interface FormatHelpers {
  [helperName: string]: (val: any, ...args: any[]) => string;
}

export const defaultFormatHelpers: FormatHelpers = {
  formatDate: (val: any) => {
    if (!val) return '';
    try {
      const d = new Date(val);
      return isNaN(d.getTime()) ? String(val) : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
    } catch {
      return String(val);
    }
  },
  formatCurrency: (val: any, currency = 'USD') => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(num);
  },
  formatPercent: (val: any) => {
    const num = Number(val) || 0;
    return `${num.toFixed(1)}%`;
  },
  round: (val: any, decimals = 2) => {
    const num = Number(val) || 0;
    return num.toFixed(Number(decimals) || 0);
  },
  uppercase: (val: any) => String(val ?? '').toUpperCase(),
  lowercase: (val: any) => String(val ?? '').toLowerCase(),
};

export class TokenEvaluator {
  private helpers: FormatHelpers;

  constructor(customHelpers?: FormatHelpers) {
    this.helpers = { ...defaultFormatHelpers, ...(customHelpers || {}) };
  }

  public evaluate(template: string, context: Record<string, any>): string {
    let result = template;

    // 1. Process #if / else / /if blocks
    result = this.processConditionals(result, context);

    // 2. Process #each / /each blocks
    result = this.processLoops(result, context);

    // 3. Process helper tokens: {{helperName path}} e.g. {{formatDate student.dob}}
    result = result.replace(/\{\{([a-zA-Z0-9_]+)\s+([^}]+)\}\}/g, (match, helperName, expr) => {
      const helper = this.helpers[helperName];
      if (!helper) return match; // Not a registered helper, let raw token evaluator handle

      const parts = expr.trim().split(/\s+/);
      const varPath = parts[0];
      const rawVal = resolvePath(context, varPath);
      const extraArgs = parts.slice(1).map((arg: string) => arg.replace(/^['"]|['"]$/g, ''));
      const formatted = helper(rawVal, ...extraArgs);
      return escapeHtml(formatted);
    });

    // 4. Process simple tokens: {{path}} or {{{rawHtmlPath}}}
    // Triple braces for unescaped HTML
    result = result.replace(/\{\{\{([^}]+)\}\}\}/g, (_, path) => {
      const val = resolvePath(context, path.trim());
      return val !== undefined && val !== null ? String(val) : '';
    });

    // Double braces for escaped HTML
    result = result.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
      const val = resolvePath(context, path.trim());
      return val !== undefined && val !== null ? escapeHtml(String(val)) : '';
    });

    return result;
  }

  private processConditionals(template: string, context: Record<string, any>): string {
    const ifRegex = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g;
    return template.replace(ifRegex, (_, conditionExpr, ifBlock, elseBlock = '') => {
      const val = resolvePath(context, conditionExpr.trim());
      const isTruthy = Boolean(val && (Array.isArray(val) ? val.length > 0 : true));
      return isTruthy ? this.evaluate(ifBlock, context) : this.evaluate(elseBlock, context);
    });
  }

  private processLoops(template: string, context: Record<string, any>): string {
    const eachRegex = /\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
    return template.replace(eachRegex, (_, listExpr, loopBlock) => {
      const list = resolvePath(context, listExpr.trim());
      if (!Array.isArray(list) || list.length === 0) {
        return '';
      }

      return list
        .map((item, index) => {
          const itemContext = {
            ...context,
            this: item,
            ...(typeof item === 'object' && item !== null ? item : {}),
            '@index': index,
            '@first': index === 0,
            '@last': index === list.length - 1,
          };
          return this.evaluate(loopBlock, itemContext);
        })
        .join('');
    });
  }
}
