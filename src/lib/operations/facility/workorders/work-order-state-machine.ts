import { WorkOrderStatus } from '../facility-types';
import { WorkOrderTransitionRequest, WorkOrderStateTransitionResult } from './work-order-types';

export class WorkOrderStateMachine {
  private static readonly VALID_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
    draft: ['scheduled', 'assigned', 'cancelled'],
    scheduled: ['assigned', 'cancelled'],
    assigned: ['in_progress', 'pending_parts', 'cancelled'],
    in_progress: ['pending_parts', 'completed', 'cancelled'],
    pending_parts: ['assigned', 'in_progress', 'cancelled'],
    completed: ['verified', 'in_progress'],
    verified: [],
    cancelled: [],
  };

  public static canTransition(from: WorkOrderStatus, to: WorkOrderStatus): boolean {
    const allowed = this.VALID_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
  }

  public static validateTransition(req: WorkOrderTransitionRequest): { valid: boolean; error?: string } {
    if (!this.canTransition(req.fromStatus, req.toStatus)) {
      return {
        valid: false,
        error: `Illegal state transition from '${req.fromStatus}' to '${req.toStatus}'`,
      };
    }

    // Completion guards: requires notes or technician signature
    if (req.toStatus === 'completed') {
      if (!req.technicianSignature && !req.notes) {
        return {
          valid: false,
          error: 'Work order completion requires technician sign-off signature or completion notes',
        };
      }
    }

    // Verification guards: requires verifier actor role
    if (req.toStatus === 'verified') {
      if (req.actorRole !== 'admin' && req.actorRole !== 'super_admin' && req.actorRole !== 'principal') {
        return {
          valid: false,
          error: 'Work order verification must be conducted by an authorized administrator or facilities lead',
        };
      }
    }

    return { valid: true };
  }
}
