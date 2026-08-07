import { test, expect } from "@playwright/test";

test.describe("Role-Based Access Control (RBAC) Gating", () => {
  
  test("unauthenticated visitors are immediately redirected to login page", async ({ page }) => {
    // Visit protected route without storageState (guest context)
    await page.goto("/admin/scheduled-jobs");
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 15000 });
  });

  test.describe("Authenticated Staff Restrictions", () => {
    // Use cached staff storageState (restricted user)
    test.use({ storageState: ".auth/staff.json" });

    test("staff role is denied access to admin-only operations and shown restriction badge", async ({ page }) => {
      await page.goto("/admin/scheduled-jobs");
      
      // Page should show Access Restricted container
      const restrictionMessage = page.locator("text=Access Restricted");
      await expect(restrictionMessage).toBeVisible({ timeout: 15000 });
      await expect(page.locator("text=super_admin").first()).toBeVisible();
    });
  });

  test.describe("Authenticated Principal Rights", () => {
    // Use cached principal storageState (scoped supervisor)
    test.use({ storageState: ".auth/principal.json" });

    test("principal is denied access to admin scheduled-jobs but can view team overview on attendance", async ({ page }) => {
      // 1. Check access restriction on scheduled-jobs page
      await page.goto("/admin/scheduled-jobs");
      const restrictionMessage = page.locator("text=Access Restricted");
      await expect(restrictionMessage).toBeVisible({ timeout: 15000 });

      // 2. Check view permissions on attendance team overview tab
      await page.goto("/attendance");
      const teamTab = page.locator("button:has-text('Team Overview')");
      await expect(teamTab).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe("Authenticated Super Admin Rights", () => {
    // Use cached super admin storageState (authorized user)
    test.use({ storageState: ".auth/super_admin.json" });

    test("super_admin has full access to administrative portals", async ({ page }) => {
      await page.goto("/admin/scheduled-jobs");
      await expect(page.locator("text=Access Restricted")).not.toBeVisible();
      await expect(page.locator("text=Scheduled Jobs Management").first()).toBeVisible({ timeout: 15000 });
    });
  });
});
