/**
 * O1 — Cross-tenant IDOR denial matrix (fixture-backed).
 *
 * Seeds real rows for tenant A and tenant B in dev.db, then calls curated
 * dynamic [id] routes with tenant B's session:
 *   - cross-tenant access must be denied (404/403) with no tenant-A data leak
 *   - the row must survive mutating requests
 *   - same-tenant positive control proves the fixture is reachable
 *
 * Remaining dynamic routes are reported with an explicit skip reason.
 */
jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
  };
});

jest.mock("uuid", () => ({
  __esModule: true,
  v4: () => "00000000-0000-4000-8000-000000000000",
}));

import { db } from "@/db";
import {
  institutions,
  staff,
  staffInstitutions,
  tasks,
  helpDeskTickets,
  visitors,
  vehicles,
  mealNotifications,
  mediaAssets,
  mediaFolders,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { hasPermission } from "@thaiba/auth";
import { VALID_STAFF_ROLES } from "@thaiba/auth/roles";
import { buildManifest } from "@/lib/test-helpers/route-matrix";
import { GET as getTask, DELETE as deleteTask } from "@/app/api/tasks/[id]/route";
import { GET as getTicket } from "@/app/api/help-desk/[id]/route";
import { GET as getVisitor } from "@/app/api/visitors/[id]/route";
import { GET as getVehicle } from "@/app/api/vehicles/[id]/route";
import { DELETE as deleteMeal } from "@/app/api/canteen/[id]/route";
import { DELETE as deleteAsset } from "@/app/api/media/assets/[id]/route";
import { DELETE as deleteFolder } from "@/app/api/media/folders/[id]/route";

const { verifySession } = jest.requireMock("@thaiba/auth") as {
  verifySession: jest.Mock;
};

jest.setTimeout(60000);

const ts = Date.now();
const instA = `inst-a-${ts}`;
const instB = `inst-b-${ts}`;
const staffA = `staff-a-${ts}`;
const staffB = `staff-b-${ts}`;

type Handler = (
  req: Request,
  ctx?: { params: Promise<Record<string, string>> }
) => Promise<Response>;

interface Fixture {
  name: string;
  file: string;
  method: "GET" | "DELETE";
  canary: string;
  /** Seed tenant A's row (the protected resource). */
  seedA: () => Promise<void>;
  /** Seed tenant B's equivalent row (positive control). */
  seedB: () => Promise<void>;
  exists: (id: string) => Promise<unknown>;
  handler: Handler;
}

function makeId(name: string, tenant: "a" | "b"): string {
  return `${name}-${tenant}-${ts}`;
}

const fixtures: Fixture[] = [
  {
    name: "task",
    file: "src/app/api/tasks/[id]/route.ts",
    method: "GET",
    canary: "CANARY-A-TASK",
    seedA: () =>
      db
        .insert(tasks)
        .values({
          id: makeId("task", "a"),
          title: "CANARY-A-TASK",
          institutionId: instA,
        })
        .run(),
    seedB: () =>
      db
        .insert(tasks)
        .values({
          id: makeId("task", "b"),
          title: "CANARY-B-TASK",
          institutionId: instB,
        })
        .run(),
    exists: async (id) => db.select().from(tasks).where(eq(tasks.id, id)).get(),
    handler: getTask as Handler,
  },
  {
    name: "taskdel",
    file: "src/app/api/tasks/[id]/route.ts",
    method: "DELETE",
    canary: "CANARY-A-TASKDEL",
    seedA: () =>
      db
        .insert(tasks)
        .values({
          id: makeId("taskdel", "a"),
          title: "CANARY-A-TASKDEL",
          institutionId: instA,
        })
        .run(),
    seedB: () =>
      db
        .insert(tasks)
        .values({
          id: makeId("taskdel", "b"),
          title: "CANARY-B-TASKDEL",
          institutionId: instB,
        })
        .run(),
    exists: async (id) => db.select().from(tasks).where(eq(tasks.id, id)).get(),
    handler: deleteTask as Handler,
  },
  {
    name: "ticket",
    file: "src/app/api/help-desk/[id]/route.ts",
    method: "GET",
    canary: "CANARY-A-TICKET",
    seedA: () =>
      db
        .insert(helpDeskTickets)
        .values({
          id: makeId("ticket", "a"),
          title: "CANARY-A-TICKET",
          description: "tenant A ticket",
          submittedById: staffA,
          institutionId: instA,
        })
        .run(),
    seedB: () =>
      db
        .insert(helpDeskTickets)
        .values({
          id: makeId("ticket", "b"),
          title: "CANARY-B-TICKET",
          description: "tenant B ticket",
          submittedById: staffB,
          institutionId: instB,
        })
        .run(),
    exists: async (id) =>
      db.select().from(helpDeskTickets).where(eq(helpDeskTickets.id, id)).get(),
    handler: getTicket as Handler,
  },
  {
    name: "visitor",
    file: "src/app/api/visitors/[id]/route.ts",
    method: "GET",
    canary: "CANARY-A-VISITOR",
    seedA: () =>
      db
        .insert(visitors)
        .values({
          id: makeId("visitor", "a"),
          name: "CANARY-A-VISITOR",
          purpose: "audit probe",
          checkIn: "2026-10-03T09:00:00.000Z",
          institutionId: instA,
        })
        .run(),
    seedB: () =>
      db
        .insert(visitors)
        .values({
          id: makeId("visitor", "b"),
          name: "CANARY-B-VISITOR",
          purpose: "audit probe",
          checkIn: "2026-10-03T09:00:00.000Z",
          institutionId: instB,
        })
        .run(),
    exists: async (id) => db.select().from(visitors).where(eq(visitors.id, id)).get(),
    handler: getVisitor as Handler,
  },
  {
    name: "vehicle",
    file: "src/app/api/vehicles/[id]/route.ts",
    method: "GET",
    canary: "CANARY-A-VEHICLE",
    seedA: () =>
      db
        .insert(vehicles)
        .values({
          id: makeId("vehicle", "a"),
          registrationNumber: `KA-A-${ts}`,
          model: "CANARY-A-VEHICLE",
          type: "car",
          institutionId: instA,
        })
        .run(),
    seedB: () =>
      db
        .insert(vehicles)
        .values({
          id: makeId("vehicle", "b"),
          registrationNumber: `KA-B-${ts}`,
          model: "CANARY-B-VEHICLE",
          type: "car",
          institutionId: instB,
        })
        .run(),
    exists: async (id) => db.select().from(vehicles).where(eq(vehicles.id, id)).get(),
    handler: getVehicle as Handler,
  },
  {
    name: "meal",
    file: "src/app/api/canteen/[id]/route.ts",
    method: "DELETE",
    canary: "CANARY-A-MEAL",
    seedA: () =>
      db
        .insert(mealNotifications)
        .values({
          id: makeId("meal", "a"),
          staffId: staffA,
          date: "2026-10-05",
          mealType: "lunch",
          notes: "CANARY-A-MEAL",
          institutionId: instA,
        })
        .run(),
    seedB: () =>
      db
        .insert(mealNotifications)
        .values({
          id: makeId("meal", "b"),
          staffId: staffB,
          date: "2026-10-05",
          mealType: "lunch",
          notes: "CANARY-B-MEAL",
          institutionId: instB,
        })
        .run(),
    exists: async (id) =>
      db.select().from(mealNotifications).where(eq(mealNotifications.id, id)).get(),
    handler: deleteMeal as Handler,
  },
  {
    name: "asset",
    file: "src/app/api/media/assets/[id]/route.ts",
    method: "DELETE",
    canary: "CANARY-A-ASSET",
    seedA: () =>
      db
        .insert(mediaAssets)
        .values({
          id: makeId("asset", "a"),
          name: "CANARY-A-ASSET",
          fileUrl: "https://files.test/a.png",
          fileSize: 1024,
          mimeType: "image/png",
          fileType: "image",
          createdById: staffA,
          institutionId: instA,
        })
        .run(),
    seedB: () =>
      db
        .insert(mediaAssets)
        .values({
          id: makeId("asset", "b"),
          name: "CANARY-B-ASSET",
          fileUrl: "https://files.test/b.png",
          fileSize: 1024,
          mimeType: "image/png",
          fileType: "image",
          createdById: staffB,
          institutionId: instB,
        })
        .run(),
    exists: async (id) =>
      db.select().from(mediaAssets).where(eq(mediaAssets.id, id)).get(),
    handler: deleteAsset as Handler,
  },
  {
    name: "folder",
    file: "src/app/api/media/folders/[id]/route.ts",
    method: "DELETE",
    canary: "CANARY-A-FOLDER",
    seedA: () =>
      db
        .insert(mediaFolders)
        .values({
          id: makeId("folder", "a"),
          name: "CANARY-A-FOLDER",
          createdById: staffA,
          institutionId: instA,
        })
        .run(),
    seedB: () =>
      db
        .insert(mediaFolders)
        .values({
          id: makeId("folder", "b"),
          name: "CANARY-B-FOLDER",
          createdById: staffB,
          institutionId: instB,
        })
        .run(),
    exists: async (id) =>
      db.select().from(mediaFolders).where(eq(mediaFolders.id, id)).get(),
    handler: deleteFolder as Handler,
  },
];

const manifest = buildManifest();

function permissionFor(f: Fixture): string {
  const entry = manifest.find((e) => e.file === f.file && e.method === f.method);
  if (!entry?.permission) {
    throw new Error(`No permission discovered for ${f.file}#${f.method}`);
  }
  return entry.permission;
}

/** Roles with sanctioned unscoped ("global") access — never tenant-filtered. */
const TENANT_WIDE = new Set(["super_admin", "admin", "system"]);

function roleWithPermission(perm: string): string | null {
  return (
    VALID_STAFF_ROLES.find(
      (r) =>
        !TENANT_WIDE.has(r) &&
        hasPermission(r, perm as Parameters<typeof hasPermission>[1])
    ) ?? null
  );
}

function roleWithoutPermission(perm: string): string {
  const role = VALID_STAFF_ROLES.find(
    (r) =>
      !TENANT_WIDE.has(r) &&
      !hasPermission(r, perm as Parameters<typeof hasPermission>[1])
  );
  if (!role) throw new Error(`Every tenant-scoped role holds ${perm}`);
  return role;
}

function tenantBSession(perm: string, role: string) {
  return {
    staffId: staffB,
    email: `b-${ts}@tenant.test`,
    role,
    employeeId: `EMP-B-${ts}`,
    name: "Tenant B Probe",
    tokenVersion: 1,
    institutionId: instB,
  };
}

function call(f: Fixture, id: string): Promise<Response> {
  return f.handler(
    new Request(`http://localhost${f.file.replace("src/app", "").replace(/\/route\.ts$/, "")}/${id}`, {
      method: f.method,
    }),
    { params: Promise.resolve({ id }) }
  );
}

beforeAll(async () => {
  process.env.APM_TELEMETRY_ENABLED = "false";
  jest.spyOn(console, "warn").mockImplementation(() => {});

  await db
    .insert(institutions)
    .values([
      { id: instA, name: "Tenant Alpha", code: `ALPHA_${ts}` },
      { id: instB, name: "Tenant Beta", code: `BETA_${ts}` },
    ])
    .run();
  await db
    .insert(staff)
    .values([
      {
        id: staffA,
        email: `a-${ts}@tenant.test`,
        employeeId: `EMP-A-${ts}`,
        firstName: "Alpha",
        lastName: "Probe",
        role: "principal",
      },
      {
        id: staffB,
        email: `b-${ts}@tenant.test`,
        employeeId: `EMP-B-${ts}`,
        firstName: "Beta",
        lastName: "Probe",
        role: "principal",
      },
    ])
    .run();
  await db
    .insert(staffInstitutions)
    .values([
      { id: `si-a-${ts}`, staffId: staffA, institutionId: instA },
      { id: `si-b-${ts}`, staffId: staffB, institutionId: instB },
    ])
    .run();

  for (const f of fixtures) {
    await f.seedA();
    await f.seedB();
  }
});

afterAll(async () => {
  jest.restoreAllMocks();
  await db.delete(tasks).where(eq(tasks.id, makeId("task", "a"))).run();
  await db.delete(tasks).where(eq(tasks.id, makeId("task", "b"))).run();
  await db.delete(tasks).where(eq(tasks.id, makeId("taskdel", "a"))).run();
  await db.delete(tasks).where(eq(tasks.id, makeId("taskdel", "b"))).run();
  await db.delete(helpDeskTickets).where(eq(helpDeskTickets.id, makeId("ticket", "a"))).run();
  await db.delete(helpDeskTickets).where(eq(helpDeskTickets.id, makeId("ticket", "b"))).run();
  await db.delete(visitors).where(eq(visitors.id, makeId("visitor", "a"))).run();
  await db.delete(visitors).where(eq(visitors.id, makeId("visitor", "b"))).run();
  await db.delete(vehicles).where(eq(vehicles.id, makeId("vehicle", "a"))).run();
  await db.delete(vehicles).where(eq(vehicles.id, makeId("vehicle", "b"))).run();
  await db.delete(mealNotifications).where(eq(mealNotifications.id, makeId("meal", "a"))).run();
  await db.delete(mealNotifications).where(eq(mealNotifications.id, makeId("meal", "b"))).run();
  await db.delete(mediaAssets).where(eq(mediaAssets.id, makeId("asset", "a"))).run();
  await db.delete(mediaAssets).where(eq(mediaAssets.id, makeId("asset", "b"))).run();
  await db.delete(mediaFolders).where(eq(mediaFolders.id, makeId("folder", "a"))).run();
  await db.delete(mediaFolders).where(eq(mediaFolders.id, makeId("folder", "b"))).run();
  await db.delete(staffInstitutions).where(eq(staffInstitutions.staffId, staffA)).run();
  await db.delete(staffInstitutions).where(eq(staffInstitutions.staffId, staffB)).run();
  await db.delete(staff).where(eq(staff.id, staffA)).run();
  await db.delete(staff).where(eq(staff.id, staffB)).run();
  await db.delete(institutions).where(eq(institutions.id, instA)).run();
  await db.delete(institutions).where(eq(institutions.id, instB)).run();

  const dynamicEntries = manifest.filter((e) => e.routePath.includes("[")).length;
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        dynamicHandlers: dynamicEntries,
        fixtureCovered: fixtures.length,
        fixtureRoutes: fixtures.map((f) => `${f.method} ${f.file}`),
        remainingSkipped:
          "not fixture-mapped: covered by scripts/security/tenant-isolation-scan (Rules A-D), row-level [id] read routes without institution-scoped tables, or dedicated suites (leaves-tenant-isolation, canteen-tenant-isolation)",
      },
      null,
      2
    )
  );
});

describe("cross-tenant IDOR denial (fixture-backed)", () => {
  for (const f of fixtures) {
    const perm = permissionFor(f);
    const scopedRole = roleWithPermission(perm);

    if (!scopedRole) {
      // Admin-only permission: no tenant-scoped role may invoke the route at
      // all. The tenant barrier is the guard's 403, so assert that instead.
      it(`${f.method} ${f.file} admin-only (${perm}): tenant-scoped user blocked at guard`, async () => {
        verifySession.mockResolvedValue(tenantBSession(perm, roleWithoutPermission(perm)));
        const rowAId = makeId(f.name, "a");
        const res = await call(f, rowAId);
        expect(res.status).toBe(403);
        const row = await f.exists(rowAId);
        expect(row).toBeTruthy();
      });
      continue;
    }

    it(`${f.method} ${f.file} denies tenant B accessing tenant A row`, async () => {
      verifySession.mockResolvedValue(tenantBSession(perm, scopedRole));
      const rowAId = makeId(f.name, "a");
      const res = await call(f, rowAId);
      expect([403, 404]).toContain(res.status);
      const text = await res.text();
      expect(text).not.toContain(f.canary);
      expect(text).not.toContain(rowAId);
      const row = await f.exists(rowAId);
      expect(row).toBeTruthy();
    });

    it(`${f.method} ${f.file} positive control: tenant B reaches tenant B row (role ${scopedRole})`, async () => {
      verifySession.mockResolvedValue(tenantBSession(perm, scopedRole));
      const res = await call(f, makeId(f.name, "b"));
      expect(res.status).not.toBe(404);
    });
  }
});
