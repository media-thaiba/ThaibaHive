import { db } from "@/db";
import { mealNotifications, staff, staffMealPreferences, staffAvailability } from "@/db/schema";
import { autoSkipMealsForLeave, revertAutoSkippedMealsForLeave } from "@/lib/canteen/leave-integration";
import { eq, and } from "drizzle-orm";

describe("Canteen & Availability Feedback Features", () => {
  const testStaffId = "staff_feedback_test_" + Math.random().toString(36).slice(2, 7);

  beforeEach(async () => {
    // Insert a test staff member if needed
    const existing = await db.select().from(staff).where(eq(staff.id, testStaffId)).get();
    if (!existing) {
      await db.insert(staff).values({
        id: testStaffId,
        employeeId: "EMP_" + testStaffId.slice(-6),
        firstName: "Test",
        lastName: "FeedbackStaff",
        email: `feedback_${testStaffId}@example.com`,
        role: "staff",
        isActive: true,
      }).run();
    }
  });

  describe("Canteen Leave Auto-Skip Integration", () => {
    it("auto-skips breakfast, lunch, and dinner for the approved date window", async () => {
      const startDate = "2026-11-01";
      const endDate = "2026-11-03"; // 3 days * 3 meals = 9 meals

      const count = await autoSkipMealsForLeave(db, {
        staffId: testStaffId,
        startDate,
        endDate,
      });

      expect(count).toBe(9);

      const records = await db
        .select()
        .from(mealNotifications)
        .where(
          and(
            eq(mealNotifications.staffId, testStaffId),
            eq(mealNotifications.date, "2026-11-02")
          )
        )
        .all();

      expect(records.length).toBe(3);
      for (const r of records) {
        expect(r.status).toBe("skip");
        expect(r.notes).toBe("Auto-skipped: On Approved Leave");
      }
    });

    it("reverts auto-skipped meals when leave is deleted without touching other manual entries", async () => {
      const startDate = "2026-11-01";
      const endDate = "2026-11-03";

      // Insert a manual entry that should NOT be deleted
      await db.insert(mealNotifications).values({
        id: "manual_meal_test_" + Math.random().toString(36).slice(2, 7),
        staffId: testStaffId,
        date: "2026-11-02",
        mealType: "snacks",
        status: "skip",
        notes: "I am not eating snacks manually",
      }).run();

      await revertAutoSkippedMealsForLeave(db, {
        staffId: testStaffId,
        startDate,
        endDate,
      });

      const remaining = await db
        .select()
        .from(mealNotifications)
        .where(eq(mealNotifications.staffId, testStaffId))
        .all();

      const autoSkipped = remaining.filter((r) => r.notes === "Auto-skipped: On Approved Leave");
      expect(autoSkipped.length).toBe(0);

      const manual = remaining.filter((r) => r.notes === "I am not eating snacks manually");
      expect(manual.length).toBe(1);

      // Clean up manual
      await db.delete(mealNotifications).where(eq(mealNotifications.id, manual[0].id)).run();
    });
  });

  describe("Canteen Preferences & Default Resolution", () => {
    it("stores and updates staff meal preferences", async () => {
      await db.insert(staffMealPreferences).values({
        id: "pref_" + testStaffId,
        staffId: testStaffId,
        defaultBreakfast: "skip",
        defaultLunch: "eating",
        defaultDinner: "skip",
        skipStartDate: "2026-11-10",
        skipEndDate: "2026-11-15",
        recurringSkipDays: JSON.stringify([5]), // Friday
      }).run();

      const pref = await db
        .select()
        .from(staffMealPreferences)
        .where(eq(staffMealPreferences.staffId, testStaffId))
        .get();

      expect(pref).toBeDefined();
      expect(pref?.defaultBreakfast).toBe("skip");
      expect(pref?.defaultLunch).toBe("eating");
      expect(pref?.defaultDinner).toBe("skip");
      expect(pref?.skipStartDate).toBe("2026-11-10");
      expect(JSON.parse(pref?.recurringSkipDays || "[]")).toEqual([5]);

      // Cleanup
      await db.delete(staffMealPreferences).where(eq(staffMealPreferences.id, "pref_" + testStaffId)).run();
    });
  });

  describe("Availability Auto-Clear Duration", () => {
    it("persists expiresAt and detects expired duration", async () => {
      const pastTime = new Date(Date.now() - 5000).toISOString();

      await db.insert(staffAvailability).values({
        id: "avail_" + testStaffId,
        staffId: testStaffId,
        status: "busy",
        expiresAt: pastTime,
      }).run();

      const record = await db
        .select()
        .from(staffAvailability)
        .where(eq(staffAvailability.staffId, testStaffId))
        .get();

      expect(record?.status).toBe("busy");
      expect(record?.expiresAt).toBe(pastTime);

      // Verify expiration evaluation
      const isExpired = Boolean(record?.expiresAt && new Date(record.expiresAt).getTime() <= Date.now());
      expect(isExpired).toBe(true);

      // Cleanup
      await db.delete(staffAvailability).where(eq(staffAvailability.id, "avail_" + testStaffId)).run();
    });
  });
});
