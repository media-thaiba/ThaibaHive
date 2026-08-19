/**
 * SOAR Condition Evaluation Engine
 * Sprint-040 — Rule & Filter Expression Evaluation
 */

import {
  PlaybookCondition,
  PlaybookConditionLeaf,
  PlaybookConditionGroup,
} from './soar-types';

export class ConditionEvaluator {
  /**
   * Evaluate a condition against a context dictionary
   */
  public static evaluate(condition: PlaybookCondition, context: Record<string, any>): boolean {
    if (!condition) return true;

    // Check if it's a group
    if ('and' in condition || 'or' in condition || 'not' in condition) {
      return this.evaluateGroup(condition as PlaybookConditionGroup, context);
    }

    // Otherwise evaluate leaf
    return this.evaluateLeaf(condition as PlaybookConditionLeaf, context);
  }

  private static evaluateGroup(group: PlaybookConditionGroup, context: Record<string, any>): boolean {
    if (group.and && Array.isArray(group.and)) {
      for (const cond of group.and) {
        if (!this.evaluate(cond, context)) return false;
      }
      return true;
    }

    if (group.or && Array.isArray(group.or)) {
      if (group.or.length === 0) return true;
      for (const cond of group.or) {
        if (this.evaluate(cond, context)) return true;
      }
      return false;
    }

    if (group.not) {
      return !this.evaluate(group.not, context);
    }

    return true;
  }

  private static evaluateLeaf(leaf: PlaybookConditionLeaf, context: Record<string, any>): boolean {
    const actualValue = this.resolvePath(leaf.field, context);
    const expectedValue = leaf.value;

    switch (leaf.operator) {
      case '==':
        return actualValue === expectedValue;
      case '!=':
        return actualValue !== expectedValue;
      case '>':
        return typeof actualValue === 'number' && actualValue > expectedValue;
      case '>=':
        return typeof actualValue === 'number' && actualValue >= expectedValue;
      case '<':
        return typeof actualValue === 'number' && actualValue < expectedValue;
      case '<=':
        return typeof actualValue === 'number' && actualValue <= expectedValue;
      case 'in':
        if (Array.isArray(expectedValue)) {
          return expectedValue.includes(actualValue);
        }
        if (typeof expectedValue === 'string' && typeof actualValue === 'string') {
          return expectedValue.includes(actualValue);
        }
        return false;
      case 'not_in':
        if (Array.isArray(expectedValue)) {
          return !expectedValue.includes(actualValue);
        }
        return true;
      case 'contains':
        if (Array.isArray(actualValue)) {
          return actualValue.includes(expectedValue);
        }
        if (typeof actualValue === 'string' && typeof expectedValue === 'string') {
          return actualValue.toLowerCase().includes(expectedValue.toLowerCase());
        }
        return false;
      case 'regex_match':
        if (typeof actualValue !== 'string') return false;
        try {
          const regex = new RegExp(expectedValue);
          return regex.test(actualValue);
        } catch {
          return false;
        }
      case 'cidr_match':
        if (typeof actualValue !== 'string' || typeof expectedValue !== 'string') return false;
        return this.isIpInCidr(actualValue, expectedValue);
      default:
        return false;
    }
  }

  /**
   * Safely resolve dot-notated path in an object
   */
  public static resolvePath(path: string, obj: Record<string, any>): any {
    if (!path || !obj) return undefined;
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      current = current[part];
    }
    return current;
  }

  /**
   * Check if an IPv4 address is within a CIDR subnet
   */
  public static isIpInCidr(ip: string, cidr: string): boolean {
    try {
      const [range, bitsStr = '32'] = cidr.split('/');
      const bits = parseInt(bitsStr, 10);
      if (isNaN(bits) || bits < 0 || bits > 32) return false;

      const ipNum = this.ipToNumber(ip);
      const rangeNum = this.ipToNumber(range);
      if (ipNum === null || rangeNum === null) return false;

      if (bits === 0) return true;
      const mask = ~((1 << (32 - bits)) - 1) >>> 0;
      return (ipNum & mask) === (rangeNum & mask);
    } catch {
      return false;
    }
  }

  private static ipToNumber(ip: string): number | null {
    const parts = ip.trim().split('.');
    if (parts.length !== 4) return null;
    let num = 0;
    for (const part of parts) {
      const byte = parseInt(part, 10);
      if (isNaN(byte) || byte < 0 || byte > 255) return null;
      num = (num << 8) + byte;
    }
    return num >>> 0;
  }
}
