import { CrdtWeightEntry } from './crdt-weight-buffer';

/**
 * Weight Reconciliation Engine for Network Partition Recovery
 */
export class WeightReconciliation {
  /**
   * Reconcile divergent branch model weights after network partition healing
   */
  public static reconcile(branchUpdates: CrdtWeightEntry[]): number[] {
    if (!branchUpdates || branchUpdates.length === 0) return [];
    if (branchUpdates.length === 1) return [...branchUpdates[0].weights];

    const dim = branchUpdates[0].weights.length;
    const reconciled = new Array(dim).fill(0);
    const n = branchUpdates.length;

    for (const update of branchUpdates) {
      for (let i = 0; i < dim; i++) {
        reconciled[i] += update.weights[i] || 0;
      }
    }

    for (let i = 0; i < dim; i++) {
      reconciled[i] = Number((reconciled[i] / n).toFixed(6));
    }

    return reconciled;
  }
}
