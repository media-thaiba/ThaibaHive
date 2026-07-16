import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  leaveRequests,
  leaveBalances,
  expenseClaims,
  purchaseRequests,
  bookings,
  staff,
  departments,
  staffDepartments,
  staffInstitutions,
  approvalDelegations,
} from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, desc, or, and, inArray } from "drizzle-orm";

export const GET = requireAuth(async (request, session) => {
  const { staffId, role } = session;
  if (role === "staff") {
    return NextResponse.json({ approvals: [] });
  }
  const canApproveAll = role === "super_admin" || role === "admin";
  const isPrincipal = role === "principal";

  let principalStaffIds: Set<string> | null = null;
  if (isPrincipal) {
    const instRow = await db
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, staffId))
      .limit(1);
    const instId = instRow[0]?.institutionId;
    if (instId) {
      const instStaff = await db
        .select({ sid: staffInstitutions.staffId })
        .from(staffInstitutions)
        .where(eq(staffInstitutions.institutionId, instId))
        .all();
      principalStaffIds = new Set(instStaff.map((s) => s.sid));
    } else {
      principalStaffIds = new Set();
    }
  }

  const approvals: Array<{
    id: string;
    type: string;
    title: string;
    submittedBy: string;
    submittedAt: string;
    amount: number | null;
    status: string;
    link: string;
    actionUrl: string;
  }> = [];

  if (canApproveAll || role === "hod" || isPrincipal) {
    let leaves = await db
      .select({
        id: leaveRequests.id,
        staffId: leaveRequests.staffId,
        firstName: staff.firstName,
        lastName: staff.lastName,
        reason: leaveRequests.reason,
        status: leaveRequests.status,
        createdAt: leaveRequests.createdAt,
      })
      .from(leaveRequests)
      .leftJoin(staff, eq(leaveRequests.staffId, staff.id))
      .where(
        role === "admin" || role === "super_admin"
          ? inArray(leaveRequests.status, ["pending", "hod_approved"])
          : eq(leaveRequests.status, "pending")
      )
      .orderBy(desc(leaveRequests.createdAt))
      .all();

    if (role === "hod") {
      const depts = await db
        .select({ id: departments.id })
        .from(departments)
        .where(eq(departments.headUserId, staffId))
        .all();
      if (depts.length > 0) {
        const deptStaff = await db
          .select({ sid: staffDepartments.staffId })
          .from(staffDepartments)
          .where(
            inArray(
              staffDepartments.departmentId,
              depts.map((d) => d.id)
            )
          )
          .all();
        const deptStaffIds = new Set(deptStaff.map((s) => s.sid));
        leaves = leaves.filter((l) => deptStaffIds.has(l.staffId));
      } else {
        leaves = [];
      }
    } else if (isPrincipal && principalStaffIds) {
      leaves = leaves.filter((l) => principalStaffIds!.has(l.staffId));
    }

    for (const l of leaves) {
      approvals.push({
        id: l.id,
        type: "leave",
        title: l.reason || "Leave Request",
        submittedBy:
          l.firstName && l.lastName
            ? `${l.firstName} ${l.lastName}`
            : "Unknown",
        submittedAt: l.createdAt,
        amount: null,
        status: l.status,
        link: "/leaves",
        actionUrl: "/api/approvals",
      });
    }
  }

  if (canApproveAll || role === "hod" || isPrincipal) {
    const claims = await db
      .select({
        id: expenseClaims.id,
        staffId: expenseClaims.staffId,
        firstName: staff.firstName,
        lastName: staff.lastName,
        description: expenseClaims.description,
        amount: expenseClaims.amount,
        category: expenseClaims.category,
        status: expenseClaims.status,
        createdAt: expenseClaims.createdAt,
      })
      .from(expenseClaims)
      .leftJoin(staff, eq(expenseClaims.staffId, staff.id))
      .where(eq(expenseClaims.status, "pending"))
      .orderBy(desc(expenseClaims.createdAt))
      .all();

    const filteredClaims =
      isPrincipal && principalStaffIds
        ? claims.filter((c) => principalStaffIds!.has(c.staffId))
        : claims;

    for (const c of filteredClaims) {
      approvals.push({
        id: c.id,
        type: "expense",
        title: c.description || `${c.category} Claim`,
        submittedBy:
          c.firstName && c.lastName
            ? `${c.firstName} ${c.lastName}`
            : "Unknown",
        submittedAt: c.createdAt,
        amount: c.amount,
        status: c.status,
        link: "/expenses",
        actionUrl: "/api/approvals",
      });
    }
  }

  if (canApproveAll) {
    const purchases = await db
      .select({
        id: purchaseRequests.id,
        staffId: purchaseRequests.requesterId,
        firstName: staff.firstName,
        lastName: staff.lastName,
        itemName: purchaseRequests.itemName,
        estimatedCost: purchaseRequests.estimatedCost,
        status: purchaseRequests.status,
        createdAt: purchaseRequests.createdAt,
      })
      .from(purchaseRequests)
      .leftJoin(staff, eq(purchaseRequests.requesterId, staff.id))
      .where(
        or(
          eq(purchaseRequests.status, "pending_hod"),
          eq(purchaseRequests.status, "pending_accounts"),
          eq(purchaseRequests.status, "pending_purchase")
        )
      )
      .orderBy(desc(purchaseRequests.createdAt))
      .all();
    for (const p of purchases) {
      approvals.push({
        id: p.id,
        type: "purchase",
        title: p.itemName,
        submittedBy:
          p.firstName && p.lastName
            ? `${p.firstName} ${p.lastName}`
            : "Unknown",
        submittedAt: p.createdAt,
        amount: p.estimatedCost,
        status: p.status,
        link: "/purchases",
        actionUrl: "/api/approvals",
      });
    }
  } else if (role === "hod") {
    const purchases = await db
      .select({
        id: purchaseRequests.id,
        staffId: purchaseRequests.requesterId,
        firstName: staff.firstName,
        lastName: staff.lastName,
        itemName: purchaseRequests.itemName,
        estimatedCost: purchaseRequests.estimatedCost,
        status: purchaseRequests.status,
        createdAt: purchaseRequests.createdAt,
      })
      .from(purchaseRequests)
      .leftJoin(staff, eq(purchaseRequests.requesterId, staff.id))
      .where(eq(purchaseRequests.status, "pending_hod"))
      .orderBy(desc(purchaseRequests.createdAt))
      .all();
    for (const p of purchases) {
      approvals.push({
        id: p.id,
        type: "purchase",
        title: p.itemName,
        submittedBy:
          p.firstName && p.lastName
            ? `${p.firstName} ${p.lastName}`
            : "Unknown",
        submittedAt: p.createdAt,
        amount: p.estimatedCost,
        status: p.status,
        link: "/purchases",
        actionUrl: "/api/approvals",
      });
    }
  }

  if (canApproveAll || role === "hod" || isPrincipal) {
    const bookItems = await db
      .select({
        id: bookings.id,
        staffId: bookings.bookerId,
        firstName: staff.firstName,
        lastName: staff.lastName,
        title: bookings.title,
        status: bookings.status,
        createdAt: bookings.createdAt,
      })
      .from(bookings)
      .leftJoin(staff, eq(bookings.bookerId, staff.id))
      .where(eq(bookings.status, "pending"))
      .orderBy(desc(bookings.createdAt))
      .all();
    const filteredBookings =
      isPrincipal && principalStaffIds
        ? bookItems.filter((b) => principalStaffIds!.has(b.staffId))
        : bookItems;
    for (const b of filteredBookings) {
      approvals.push({
        id: b.id,
        type: "booking",
        title: b.title,
        submittedBy:
          b.firstName && b.lastName
            ? `${b.firstName} ${b.lastName}`
            : "Unknown",
        submittedAt: b.createdAt,
        amount: null,
        status: b.status,
        link: "/bookings",
        actionUrl: "/api/approvals",
      });
    }
  }

  const seen = new Set(approvals.map((a) => `${a.type}:${a.id}`));

  const activeDelegations = await db
    .select()
    .from(approvalDelegations)
    .where(
      and(
        eq(approvalDelegations.delegateId, staffId),
        eq(approvalDelegations.isActive, true)
      )
    )
    .all();

  if (activeDelegations.length > 0) {
    const delegatedFromIds = activeDelegations.map((d) => d.delegatorId);
    const delegatorRoles = await db
      .select({ id: staff.id, role: staff.role })
      .from(staff)
      .where(inArray(staff.id, delegatedFromIds))
      .all();

    const adminIds = delegatorRoles
      .filter((d) => d.role === "super_admin" || d.role === "admin")
      .map((d) => d.id);
    const hodIds = delegatorRoles
      .filter((d) => d.role === "hod")
      .map((d) => d.id);
    const principalIds = delegatorRoles
      .filter((d) => d.role === "principal")
      .map((d) => d.id);

    async function pushApproval(item: (typeof approvals)[number]) {
      const key = `${item.type}:${item.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        approvals.push(item);
      }
    }

    if (adminIds.length > 0) {
      const delLeaves = await db
        .select({
          id: leaveRequests.id,
          staffId: leaveRequests.staffId,
          firstName: staff.firstName,
          lastName: staff.lastName,
          reason: leaveRequests.reason,
          status: leaveRequests.status,
          createdAt: leaveRequests.createdAt,
        })
        .from(leaveRequests)
        .leftJoin(staff, eq(leaveRequests.staffId, staff.id))
        .where(eq(leaveRequests.status, "pending"))
        .orderBy(desc(leaveRequests.createdAt))
        .all();
      for (const l of delLeaves) {
        await pushApproval({
          id: l.id,
          type: "leave",
          title: l.reason || "Leave Request",
          submittedBy:
            l.firstName && l.lastName
              ? `${l.firstName} ${l.lastName}`
              : "Unknown",
          submittedAt: l.createdAt,
          amount: null,
          status: l.status,
          link: "/leaves",
          actionUrl: "/api/approvals",
        });
      }

      const delClaims = await db
        .select({
          id: expenseClaims.id,
          staffId: expenseClaims.staffId,
          firstName: staff.firstName,
          lastName: staff.lastName,
          description: expenseClaims.description,
          amount: expenseClaims.amount,
          category: expenseClaims.category,
          status: expenseClaims.status,
          createdAt: expenseClaims.createdAt,
        })
        .from(expenseClaims)
        .leftJoin(staff, eq(expenseClaims.staffId, staff.id))
        .where(eq(expenseClaims.status, "pending"))
        .orderBy(desc(expenseClaims.createdAt))
        .all();
      for (const c of delClaims) {
        await pushApproval({
          id: c.id,
          type: "expense",
          title: c.description || `${c.category} Claim`,
          submittedBy:
            c.firstName && c.lastName
              ? `${c.firstName} ${c.lastName}`
              : "Unknown",
          submittedAt: c.createdAt,
          amount: c.amount,
          status: c.status,
          link: "/expenses",
          actionUrl: "/api/approvals",
        });
      }

      const delPurchases = await db
        .select({
          id: purchaseRequests.id,
          staffId: purchaseRequests.requesterId,
          firstName: staff.firstName,
          lastName: staff.lastName,
          itemName: purchaseRequests.itemName,
          estimatedCost: purchaseRequests.estimatedCost,
          status: purchaseRequests.status,
          createdAt: purchaseRequests.createdAt,
        })
        .from(purchaseRequests)
        .leftJoin(staff, eq(purchaseRequests.requesterId, staff.id))
        .where(
          or(
            eq(purchaseRequests.status, "pending_hod"),
            eq(purchaseRequests.status, "pending_accounts"),
            eq(purchaseRequests.status, "pending_purchase")
          )
        )
        .orderBy(desc(purchaseRequests.createdAt))
        .all();
      for (const p of delPurchases) {
        await pushApproval({
          id: p.id,
          type: "purchase",
          title: p.itemName,
          submittedBy:
            p.firstName && p.lastName
              ? `${p.firstName} ${p.lastName}`
              : "Unknown",
          submittedAt: p.createdAt,
          amount: p.estimatedCost,
          status: p.status,
          link: "/purchases",
          actionUrl: "/api/approvals",
        });
      }

      const delBookings = await db
        .select({
          id: bookings.id,
          staffId: bookings.bookerId,
          firstName: staff.firstName,
          lastName: staff.lastName,
          title: bookings.title,
          status: bookings.status,
          createdAt: bookings.createdAt,
        })
        .from(bookings)
        .leftJoin(staff, eq(bookings.bookerId, staff.id))
        .where(eq(bookings.status, "pending"))
        .orderBy(desc(bookings.createdAt))
        .all();
      for (const b of delBookings) {
        await pushApproval({
          id: b.id,
          type: "booking",
          title: b.title,
          submittedBy:
            b.firstName && b.lastName
              ? `${b.firstName} ${b.lastName}`
              : "Unknown",
          submittedAt: b.createdAt,
          amount: null,
          status: b.status,
          link: "/bookings",
          actionUrl: "/api/approvals",
        });
      }
    }

    if (hodIds.length > 0) {
      const hodDepts = await db
        .select({ id: departments.id })
        .from(departments)
        .where(inArray(departments.headUserId, hodIds))
        .all();
      if (hodDepts.length > 0) {
        const deptStaff = await db
          .select({ sid: staffDepartments.staffId })
          .from(staffDepartments)
          .where(
            inArray(
              staffDepartments.departmentId,
              hodDepts.map((d) => d.id)
            )
          )
          .all();
        const deptStaffIds = new Set(deptStaff.map((s) => s.sid));

        const delLeaves = await db
          .select({
            id: leaveRequests.id,
            staffId: leaveRequests.staffId,
            firstName: staff.firstName,
            lastName: staff.lastName,
            reason: leaveRequests.reason,
            status: leaveRequests.status,
            createdAt: leaveRequests.createdAt,
          })
          .from(leaveRequests)
          .leftJoin(staff, eq(leaveRequests.staffId, staff.id))
          .where(eq(leaveRequests.status, "pending"))
          .orderBy(desc(leaveRequests.createdAt))
          .all();
        for (const l of delLeaves) {
          if (!deptStaffIds.has(l.staffId)) continue;
          await pushApproval({
            id: l.id,
            type: "leave",
            title: l.reason || "Leave Request",
            submittedBy:
              l.firstName && l.lastName
                ? `${l.firstName} ${l.lastName}`
                : "Unknown",
            submittedAt: l.createdAt,
            amount: null,
            status: l.status,
            link: "/leaves",
            actionUrl: "/api/approvals",
          });
        }

        const delClaims = await db
          .select({
            id: expenseClaims.id,
            staffId: expenseClaims.staffId,
            firstName: staff.firstName,
            lastName: staff.lastName,
            description: expenseClaims.description,
            amount: expenseClaims.amount,
            category: expenseClaims.category,
            status: expenseClaims.status,
            createdAt: expenseClaims.createdAt,
          })
          .from(expenseClaims)
          .leftJoin(staff, eq(expenseClaims.staffId, staff.id))
          .where(eq(expenseClaims.status, "pending"))
          .orderBy(desc(expenseClaims.createdAt))
          .all();
        for (const c of delClaims) {
          if (!deptStaffIds.has(c.staffId)) continue;
          await pushApproval({
            id: c.id,
            type: "expense",
            title: c.description || `${c.category} Claim`,
            submittedBy:
              c.firstName && c.lastName
                ? `${c.firstName} ${c.lastName}`
                : "Unknown",
            submittedAt: c.createdAt,
            amount: c.amount,
            status: c.status,
            link: "/expenses",
            actionUrl: "/api/approvals",
          });
        }
      }
    }

    if (principalIds.length > 0) {
      const principalInstRows = await db
        .select({ institutionId: staffInstitutions.institutionId })
        .from(staffInstitutions)
        .where(inArray(staffInstitutions.staffId, principalIds))
        .all();
      const principalInstIds = [
        ...new Set(principalInstRows.map((r) => r.institutionId)),
      ];
      if (principalInstIds.length > 0) {
        const instStaff = await db
          .select({ sid: staffInstitutions.staffId })
          .from(staffInstitutions)
          .where(
            inArray(staffInstitutions.institutionId, principalInstIds)
          )
          .all();
        const instStaffIds = new Set(instStaff.map((s) => s.sid));

        const delLeaves = await db
          .select({
            id: leaveRequests.id,
            staffId: leaveRequests.staffId,
            firstName: staff.firstName,
            lastName: staff.lastName,
            reason: leaveRequests.reason,
            status: leaveRequests.status,
            createdAt: leaveRequests.createdAt,
          })
          .from(leaveRequests)
          .leftJoin(staff, eq(leaveRequests.staffId, staff.id))
          .where(eq(leaveRequests.status, "pending"))
          .orderBy(desc(leaveRequests.createdAt))
          .all();
        for (const l of delLeaves) {
          if (!instStaffIds.has(l.staffId)) continue;
          await pushApproval({
            id: l.id,
            type: "leave",
            title: l.reason || "Leave Request",
            submittedBy:
              l.firstName && l.lastName
                ? `${l.firstName} ${l.lastName}`
                : "Unknown",
            submittedAt: l.createdAt,
            amount: null,
            status: l.status,
            link: "/leaves",
            actionUrl: "/api/approvals",
          });
        }

        const delClaims = await db
          .select({
            id: expenseClaims.id,
            staffId: expenseClaims.staffId,
            firstName: staff.firstName,
            lastName: staff.lastName,
            description: expenseClaims.description,
            amount: expenseClaims.amount,
            category: expenseClaims.category,
            status: expenseClaims.status,
            createdAt: expenseClaims.createdAt,
          })
          .from(expenseClaims)
          .leftJoin(staff, eq(expenseClaims.staffId, staff.id))
          .where(eq(expenseClaims.status, "pending"))
          .orderBy(desc(expenseClaims.createdAt))
          .all();
        for (const c of delClaims) {
          if (!instStaffIds.has(c.staffId)) continue;
          await pushApproval({
            id: c.id,
            type: "expense",
            title: c.description || `${c.category} Claim`,
            submittedBy:
              c.firstName && c.lastName
                ? `${c.firstName} ${c.lastName}`
                : "Unknown",
            submittedAt: c.createdAt,
            amount: c.amount,
            status: c.status,
            link: "/expenses",
            actionUrl: "/api/approvals",
          });
        }
      }
    }
  }

  approvals.sort(
    (a, b) =>
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );

  return NextResponse.json({ approvals });
}, "leaves:approve");

export const PATCH = requireAuth(async (request, session) => {
  const { staffId } = session;
  const body = await request.json();
  const { type, id, action, notes } = body;

  if (!type || !id || !action) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const now = new Date().toISOString();

  try {
    if (type === "leave") {
      const leave = await db
        .select()
        .from(leaveRequests)
        .where(eq(leaveRequests.id, id))
        .get();

      if (!leave) {
        return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
      }

      let nextStatus = action === "approve" ? "approved" : "rejected";
      if (action === "approve" && (session.role === "hod" || session.role === "principal")) {
        nextStatus = "hod_approved";
      }

      await db
        .update(leaveRequests)
        .set({
          status: nextStatus,
          reviewedById: staffId,
          reviewedAt: now,
          reviewNotes: notes || null,
          updatedAt: now,
        })
        .where(eq(leaveRequests.id, id))
        .run();

      if (nextStatus === "approved") {
        const existing = await db
          .select()
          .from(leaveBalances)
          .where(
            and(
              eq(leaveBalances.staffId, leave.staffId),
              eq(leaveBalances.leaveTypeId, leave.leaveTypeId),
              eq(leaveBalances.year, new Date().getFullYear())
            )
          )
          .get();

        if (existing) {
          await db
            .update(leaveBalances)
            .set({ usedDays: existing.usedDays + leave.daysCount })
            .where(eq(leaveBalances.id, existing.id))
            .run();
        }
      }
    } else if (type === "expense") {
      await db
        .update(expenseClaims)
        .set({
          status: action === "approve" ? "approved" : "rejected",
          reviewedById: staffId,
          reviewedAt: now,
          reviewNotes: notes || null,
          updatedAt: now,
        })
        .where(eq(expenseClaims.id, id))
        .run();
    } else if (type === "purchase") {
      if (action === "reject") {
        await db
          .update(purchaseRequests)
          .set({
            status: "rejected",
            notes: notes || null,
            updatedAt: now,
          })
          .where(eq(purchaseRequests.id, id))
          .run();
      } else {
        const current = await db
          .select({ status: purchaseRequests.status })
          .from(purchaseRequests)
          .where(eq(purchaseRequests.id, id))
          .get();
        if (!current) {
          return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        const updates: Record<string, unknown> = { updatedAt: now };
        switch (current.status) {
          case "pending_hod":
            updates.status = "pending_accounts";
            updates.approvedByHodId = staffId;
            break;
          case "pending_accounts":
            updates.status = "pending_purchase";
            updates.approvedByAccountsId = staffId;
            break;
          case "pending_purchase":
            updates.status = "approved";
            updates.approvedByPurchaseId = staffId;
            updates.approvedAt = now;
            break;
          default:
            return NextResponse.json(
              { error: "Cannot approve in current status" },
              { status: 400 }
            );
        }
        if (notes) updates.notes = notes;
        await db
          .update(purchaseRequests)
          .set(updates)
          .where(eq(purchaseRequests.id, id))
          .run();
      }
    } else if (type === "booking") {
      await db
        .update(bookings)
        .set({
          status: action === "approve" ? "approved" : "rejected",
          approvedById: staffId,
          notes: notes || null,
          updatedAt: now,
        })
        .where(eq(bookings.id, id))
        .run();
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}, "leaves:approve");
