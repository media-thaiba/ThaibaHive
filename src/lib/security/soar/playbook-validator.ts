/**
 * SOAR Playbook Validation Engine
 * Sprint-040 — Structural, Semantic, and Dependency Validation
 */

import { SecurityPlaybook } from './soar-types';
import { SecurityPlaybookSchema } from '../../validation/soar-schemas';
import { actionRegistry } from './action-registry';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class PlaybookValidator {
  /**
   * Validate a security playbook for schema compliance, semantic consistency, and action availability
   */
  public static validate(playbook: SecurityPlaybook, checkRegisteredActions = false): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Zod Schema validation
    const parsed = SecurityPlaybookSchema.safeParse(playbook);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push(`[${issue.path.join('.')}] ${issue.message}`);
      }
      return { valid: false, errors, warnings };
    }

    // 2. Step ID uniqueness
    const seenStepIds = new Set<string>();
    for (const step of playbook.steps) {
      if (seenStepIds.has(step.id)) {
        errors.push(`Duplicate step ID '${step.id}' detected in playbook`);
      }
      seenStepIds.add(step.id);

      // Check registered action handler if requested
      if (checkRegisteredActions && !actionRegistry.hasAction(step.action)) {
        warnings.push(`Step '${step.id}' references unregistered action '${step.action}'`);
      }
    }

    // 3. Rollback strategy consistency
    if (playbook.rollback_strategy === 'COMPENSATE') {
      const uncompensableSteps: string[] = [];
      for (const step of playbook.steps) {
        const action = actionRegistry.getAction(step.action);
        if (action && typeof action.compensate !== 'function') {
          uncompensableSteps.push(step.id);
        }
      }
      if (uncompensableSteps.length > 0) {
        warnings.push(
          `Playbook specifies COMPENSATE rollback strategy but steps [${uncompensableSteps.join(', ')}] have no compensation handlers`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
