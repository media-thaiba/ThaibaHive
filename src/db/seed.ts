import bcrypt from "bcryptjs";
import { db } from "./index";
import { institutions, departments, staff, staffDepartments, staffInstitutions, marketplaceApps, appDefaultRoles } from "./schema";
import { eq } from "drizzle-orm";

const MAIN_CAMPUS = "TPS – Majhikhanda";

const institutionData = [
  { name: "TPS – Majhikhanda", code: "TPS-MAJHI", type: "campus" },
  { name: "TPS – Godda", code: "TPS-GODDA", type: "campus" },
  { name: "TPS – Antla", code: "TPS-ANTLA", type: "campus" },
  { name: "TPS – Baleshwar", code: "TPS-BALES", type: "campus" },
  { name: "TPS – Kosbagolla", code: "TPS-KOSBA", type: "campus" },
  { name: "TPS – Mallikpur", code: "TPS-MALLI", type: "campus" },
  { name: "TPS – Raiganj", code: "TPS-RAIGA", type: "campus" },
  { name: "TPS – Manipur", code: "TPS-MANIP", type: "campus" },
  { name: "New Katak Public School – Cuttack", code: "NKPS-CUTT", type: "campus" },
  { name: "Model School – Baghait", code: "MS-BAGHA", type: "campus" },
  { name: "Orphan Home – Baghait", code: "OH-BAGHA", type: "campus" },
  { name: "Spark Academy", code: "SPARK", type: "campus" },
  { name: "Edu Berry – UAE", code: "EB-UAE", type: "campus" },
  { name: "CIS Boys – Majhikhanda", code: "CIS-BM", type: "campus" },
  { name: "CIS Banath – Baghait", code: "CIS-BANA", type: "campus" },
  { name: "CIS Da'awra – Majhikhanda", code: "CIS-DM", type: "campus" },
  { name: "School Of Quran – Baghait", code: "SOQ-BAGH", type: "campus" },
  { name: "School Of Quran – Mallikpur", code: "SOQ-MALL", type: "campus" },
  { name: "CIS Junior Boys – Choumini", code: "CIS-JRC", type: "campus" },
  { name: "CIS Junior Boys – Bisfi", code: "CIS-JRB", type: "campus" },
  { name: "Model Academy – Samsi", code: "MA-SAMSI", type: "campus" },
  { name: "Model Academy – Konar", code: "MA-KONAR", type: "campus" },
  { name: "Model Academy – Chakolia", code: "MA-CHAKO", type: "campus" },
];

const departmentData = [
  { name: "Media & IT Department", code: "MEDIA-IT", sub: null },
  { name: "Director Office", code: "DIR-OFF", sub: null },
  { name: "Joint Director Office", code: "JD-OFF", sub: null },
  { name: "Project Department", code: "PROJECT", sub: null },
  { name: "Accounts Department", code: "ACCTS", sub: null },
  { name: "Vehicle Department", code: "VEHICLE", sub: null },
  { name: "Maintenance Department", code: "MAINT", sub: null },
  { name: "PR Department", code: "PR", sub: null },
  { name: "Feed The Needy", code: "FTN", sub: null },
  { name: "Candle Of Hope International", code: "COHI", sub: null },
  { name: "Al Siddiqia Trust", code: "AST", sub: null },
  { name: "Kahani From Thaiba", code: "KAHANI", sub: "MEDIA-IT" },
  { name: "Amar Thaiba", code: "AMAR", sub: "MEDIA-IT" },
  { name: "Group Of Schools", code: "GOS", sub: null },
  { name: "Moral Academy", code: "MORAL", sub: null },
  { name: "Islamic Studies Department", code: "ISLAMIC", sub: null },
  { name: "Thaiba Sweet Water", code: "TSW", sub: null },
  { name: "Central Canteen", code: "CANTEEN", sub: null },
];

interface SeedStaff {
  email: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  designation: string;
  role: string;
  departmentCode: string;
}

  const managementStaff: SeedStaff[] = [
    { email: "director@thaibahive.local", employeeId: "DIR-001", firstName: "Director", lastName: "", designation: "Director", role: "super_admin", departmentCode: "DIR-OFF" },
    { email: "jointdirector@thaibahive.local", employeeId: "JD-001", firstName: "Joint Director", lastName: "", designation: "Joint Director / HR Manager", role: "admin", departmentCode: "JD-OFF" },
    { email: "generalmanager@thaibahive.local", employeeId: "GM-001", firstName: "General Manager", lastName: "", designation: "General Manager", role: "admin", departmentCode: "DIR-OFF" },
    { email: "mediamanager@thaibahive.local", employeeId: "MEDIA-001", firstName: "Media Manager", lastName: "", designation: "Media Manager", role: "admin", departmentCode: "MEDIA-IT" },
    { email: "accountsmanager@thaibahive.local", employeeId: "ACCTS-001", firstName: "Accounts Manager", lastName: "", designation: "Accounts Manager", role: "admin", departmentCode: "ACCTS" },
    { email: "projectmanager@thaibahive.local", employeeId: "PROJ-001", firstName: "Project Manager", lastName: "", designation: "Project Manager", role: "admin", departmentCode: "PROJECT" },
    { email: "moralhead@thaibahive.local", employeeId: "MORAL-001", firstName: "Head of Moral Education", lastName: "", designation: "Head of Moral Education", role: "admin", departmentCode: "MORAL" },
  ];

function uuid(): string {
  return crypto.randomUUID();
}

async function seed() {
  console.log("Seeding Thaiba Garden org structure...");

  const existingInstitutions = await db.select().from(institutions).limit(1).all();
  if (existingInstitutions.length > 0) {
    console.log("Seed already run. Skipping.");
    process.exit(0);
  }

  const mainCampusId = uuid();

  const institutionIdMap: Record<string, string> = {};
  for (const inst of institutionData) {
    const id = inst.code === "TPS-MAJHI" ? mainCampusId : uuid();
    institutionIdMap[inst.code] = id;
    await db.insert(institutions).values({
      id,
      name: inst.name,
      code: inst.code,
      type: inst.type,
      isActive: true,
    }).run();
  }
  console.log(`Created ${institutionData.length} institutions.`);

  const departmentIdMap: Record<string, string> = {};
  for (const dept of departmentData) {
    const id = uuid();
    departmentIdMap[dept.code] = id;
    await db.insert(departments).values({
      id,
      institutionId: mainCampusId,
      name: dept.name,
      code: dept.code,
      isActive: true,
    }).run();
  }
  console.log(`Created ${departmentData.length} departments.`);

  const seedPassword = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const passwordHashMgmt = await bcrypt.hash(seedPassword, 10);
  for (const s of managementStaff) {
    const existingStaff = await db.select().from(staff).where(eq(staff.email, s.email)).get();
    if (existingStaff) {
      console.log(`  ${s.email} already exists, skipping.`);
      continue;
    }

    const staffId = uuid();
    await db.insert(staff).values({
      id: staffId,
      email: s.email,
      employeeId: s.employeeId,
      firstName: s.firstName,
      lastName: s.lastName,
      designation: s.designation,
      role: s.role,
      passwordHash: passwordHashMgmt,
      isActive: true,
    }).run();

    const deptId = departmentIdMap[s.departmentCode];
    if (deptId) {
      await db.insert(staffDepartments).values({
        id: uuid(),
        staffId,
        departmentId: deptId,
        isPrimary: true,
      }).run();
    }

    await db.insert(staffInstitutions).values({
      id: uuid(),
      staffId,
      institutionId: mainCampusId,
    }).run();
  }
  console.log(`Created ${managementStaff.length} management accounts.`);

  console.log("\n--- Seed Complete ---");
  console.log("Management accounts (change these passwords immediately):");
  for (const s of managementStaff) {
    console.log(`  ${s.designation}: ${s.email} / ${seedPassword}`);
  }
  process.exit(0);
}

// ─── Marketplace Seed ───

async function seedMarketplace() {
  const existing = await db.select().from(marketplaceApps).limit(1).get();
  if (existing) {
    console.log("Marketplace already seeded.");
    return;
  }

  const uuid = () => crypto.randomUUID();

  // Instant Utility Extensions — auto-activated on first login
  const instantApps = [
    { id: uuid(), name: "Digital Profile",    slug: "profile",       category: "instant", routePrefix: "/staff",        icon: "User",        sortOrder: 0, description: "Your personal staff profile" },
    { id: uuid(), name: "Attendance",          slug: "attendance",    category: "instant", routePrefix: "/attendance",   icon: "Clock",       sortOrder: 1, description: "Daily check-in and check-out" },
    { id: uuid(), name: "Leave Management",    slug: "leaves",        category: "instant", routePrefix: "/leaves",       icon: "Calendar",    sortOrder: 2, description: "Apply for leaves and track status" },
    { id: uuid(), name: "Task Management",     slug: "tasks",         category: "instant", routePrefix: "/tasks",        icon: "CheckSquare", sortOrder: 3, description: "View and manage assigned tasks" },
    { id: uuid(), name: "Daily Reports",       slug: "reports",       category: "instant", routePrefix: "/reports",      icon: "FileText",    sortOrder: 4, description: "Submit daily work reports" },
    { id: uuid(), name: "Approvals",           slug: "approvals",     category: "instant", routePrefix: "/approvals",    icon: "ThumbsUp",    sortOrder: 5, description: "Review and approve requests" },
    { id: uuid(), name: "Notifications",       slug: "notifications", category: "instant", routePrefix: "/notifications",icon: "Bell",        sortOrder: 6, description: "View notifications and alerts" },
    { id: uuid(), name: "Staff Directory",     slug: "staff-directory",category: "instant", routePrefix: "/staff",       icon: "Users",       sortOrder: 7, description: "Browse employee profiles" },
    { id: uuid(), name: "Help Desk",           slug: "help-desk",     category: "instant", routePrefix: "/help-desk",    icon: "HelpCircle",  sortOrder: 8, description: "IT support tickets" },
    { id: uuid(), name: "Canteen",             slug: "canteen",       category: "instant", routePrefix: "/canteen",      icon: "Coffee",      sortOrder: 9, description: "Daily menu and meal preferences" },
  ];

  // Restricted Department Portals — require approval
  const restrictedApps = [
    { id: uuid(), name: "Accounts",      slug: "accounts",   category: "restricted", routePrefix: "/accounts",   icon: "DollarSign", sortOrder: 10, description: "Financial records, expense tracking, and budget management" },
    { id: uuid(), name: "Vehicles",      slug: "vehicles",   category: "restricted", routePrefix: "/vehicles",   icon: "Truck",      sortOrder: 11, description: "Vehicle fleet management, bookings, and fuel logs" },
    { id: uuid(), name: "Assets",        slug: "assets",     category: "restricted", routePrefix: "/assets",     icon: "Briefcase",  sortOrder: 12, description: "Institutional asset tracking and assignment" },
    { id: uuid(), name: "Purchases",     slug: "purchases",  category: "restricted", routePrefix: "/purchases",  icon: "ShoppingCart",sortOrder: 13, description: "Purchase requests and procurement tracking" },
  ];

  const allApps = [...instantApps, ...restrictedApps];

  for (const app of allApps) {
    await db.insert(marketplaceApps).values({
      ...app,
      isActive: true,
      description: app.description || `${app.name} module`,
    }).run();

    // Create default "contributor" role for each app
    await db.insert(appDefaultRoles).values({
      id: uuid(),
      appId: app.id,
      roleName: "contributor",
      permissions: JSON.stringify([`${app.slug}:view`, `${app.slug}:create`]),
      isDefault: true,
    }).run();
  }

  console.log(`Seeded ${allApps.length} marketplace apps (${instantApps.length} instant, ${restrictedApps.length} restricted).`);
}

const arg = process.argv[2];

if (arg === "marketplace") {
  seedMarketplace().catch((e) => {
    console.error("Marketplace seed failed:", e);
    process.exit(1);
  });
} else {
  seed().catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  });
}
