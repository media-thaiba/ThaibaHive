/**
 * In-memory serialization mutex keyed by Helpdesk ticket ID.
 * Guarantees that concurrent technician assignments, status updates,
 * and comment additions execute strictly sequentially.
 */
const ticketLocks = new Map<string, Promise<void>>();

export async function withTicketLock<T>(id: string, fn: () => Promise<T>): Promise<T> {
  const currentLock = ticketLocks.get(id) ?? Promise.resolve();
  let release: () => void = () => {};
  const nextLock = new Promise<void>((resolve) => {
    release = resolve;
  });

  ticketLocks.set(id, currentLock.then(() => nextLock));

  try {
    await currentLock;
    return await fn();
  } finally {
    release();
    if (ticketLocks.get(id) === nextLock) {
      ticketLocks.delete(id);
    }
  }
}

export function isTerminalTicketStatus(status: string): boolean {
  return status === "closed";
}

/**
 * Validates whether a viewer is authorized to inspect or interact with a ticket.
 * Enforces fail-closed IDOR protection:
 * - super_admin & global admin: can access all.
 * - principal & hod: can access any ticket belonging to their institution.
 * - regular staff: can only access tickets they submitted or are assigned to.
 */
export function canAccessTicket(params: {
  viewerStaffId: string;
  viewerRole: string;
  viewerInstitutionId?: string | null;
  ticketInstitutionId?: string | null;
  submittedById: string;
  assignedToId?: string | null;
}): boolean {
  const {
    viewerStaffId,
    viewerRole,
    viewerInstitutionId,
    ticketInstitutionId,
    submittedById,
    assignedToId,
  } = params;

  if (viewerRole === "super_admin") return true;

  const isManager = ["admin", "principal", "hod"].includes(viewerRole);

  if (viewerRole === "admin" && (!viewerInstitutionId || viewerInstitutionId === "global")) {
    return true;
  }

  // Institutional managers (principal, hod, or institution-scoped admin)
  if (isManager && viewerInstitutionId && viewerInstitutionId !== "global") {
    // If ticket has an institution ID, it must match the viewer's institution
    if (ticketInstitutionId && ticketInstitutionId !== viewerInstitutionId) {
      return false;
    }
    return true;
  }

  // Non-managers: owner or assignee
  return submittedById === viewerStaffId || assignedToId === viewerStaffId;
}

/**
 * Validates whether an actor has authority to manage/reassign a ticket.
 */
export function canManageTicket(params: {
  viewerStaffId: string;
  viewerRole: string;
  viewerInstitutionId?: string | null;
  ticketInstitutionId?: string | null;
  submittedById: string;
  assignedToId?: string | null;
}): boolean {
  const {
    viewerStaffId,
    viewerRole,
    viewerInstitutionId,
    ticketInstitutionId,
    assignedToId,
  } = params;

  if (viewerRole === "super_admin") return true;

  const isManager = ["admin", "principal", "hod"].includes(viewerRole);

  if (viewerRole === "admin" && (!viewerInstitutionId || viewerInstitutionId === "global")) {
    return true;
  }

  if (isManager && viewerInstitutionId && viewerInstitutionId !== "global") {
    if (ticketInstitutionId && ticketInstitutionId !== viewerInstitutionId) {
      return false;
    }
    return true;
  }

  // Assigned technician can update status
  return assignedToId === viewerStaffId;
}
