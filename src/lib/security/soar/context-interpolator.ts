/**
 * SOAR Context Parameter Interpolator
 * Sprint-040 — Dynamic Context Template Substitution
 */

import { ConditionEvaluator } from './condition-evaluator';

export class ContextInterpolator {
  private static readonly TEMPLATE_REGEX = /\{\{([^}]+)\}\}/g;

  /**
   * Interpolate all {{path}} references within a parameter structure
   */
  public static interpolate<T = any>(params: T, context: Record<string, any>): T {
    if (params === null || params === undefined) return params;

    if (typeof params === 'string') {
      return this.interpolateString(params, context) as unknown as T;
    }

    if (Array.isArray(params)) {
      return params.map(item => this.interpolate(item, context)) as unknown as T;
    }

    if (typeof params === 'object') {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(params)) {
        result[key] = this.interpolate(value, context);
      }
      return result as unknown as T;
    }

    return params;
  }

  private static interpolateString(template: string, context: Record<string, any>): any {
    // If the string is EXACTLY a single placeholder like "{{trigger.user_id}}", return the raw type (number, boolean, obj)
    const exactMatch = template.match(/^\{\{([^}]+)\}\}$/);
    if (exactMatch) {
      const path = exactMatch[1].trim();
      const resolved = ConditionEvaluator.resolvePath(path, context);
      return resolved !== undefined ? resolved : template;
    }

    // Otherwise replace substrings
    return template.replace(this.TEMPLATE_REGEX, (_, path) => {
      const resolved = ConditionEvaluator.resolvePath(path.trim(), context);
      if (resolved === undefined || resolved === null) return '';
      if (typeof resolved === 'object') return JSON.stringify(resolved);
      return String(resolved);
    });
  }
}
