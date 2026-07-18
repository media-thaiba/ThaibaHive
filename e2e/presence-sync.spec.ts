import { test, expect } from "@playwright/test";
import { db } from "../packages/db";
import { presence, staff } from "../packages/db/schema";
import { eq } from "drizzle-orm";

test("Verify real-time status synchronization and timeline logging", async ({ browser }) => {
  // 0. Clean up / reset presence for Accounts Manager in DB
  console.log("Resetting presence record for Accounts Manager...");
  const staffMember = await db.select().from(staff).where(eq(staff.email, "accountsmanager@thaibahive.local")).get();
  if (staffMember) {
    await db.delete(presence).where(eq(presence.staffId, staffMember.id)).run();
    console.log("Presence record reset completed.");
  }

  // Create two isolated browser contexts
  let staffContext = await browser.newContext();
  const adminContext = await browser.newContext();

  let staffPage = await staffContext.newPage();
  const adminPage = await adminContext.newPage();

  try {
    // 1. Staff A logs in
    console.log("Logging in Staff A (Accounts Manager)...");
    await staffPage.goto("/auth/login");
    await staffPage.fill("#email", "accountsmanager@thaibahive.local");
    await staffPage.fill("#password", "Password123");
    await staffPage.click("button[type='submit']");
    await expect(staffPage).toHaveURL("/");

    // 2. Admin B logs in
    console.log("Logging in Admin B (Media Manager)...");
    await adminPage.goto("/auth/login");
    await adminPage.fill("#email", "mediamanager@thaibahive.local");
    await adminPage.fill("#password", "Password123");
    await adminPage.click("button[type='submit']");
    await expect(adminPage).toHaveURL("/");

    // 3. Admin B goes to availability
    console.log("Admin B navigates to availability page...");
    await adminPage.goto("/availability");
    
    // Verify that Accounts Manager is shown as Online with a green dot
    console.log("Verifying Accounts Manager is online (green dot / Online)...");
    const accountsManagerCard = adminPage.locator("div.rounded-xl", { hasText: "Accounts Manager" }).first();
    await expect(accountsManagerCard).toBeVisible();
    
    const onlineBadge = accountsManagerCard.locator("span:has-text('Online')");
    await expect(onlineBadge).toBeVisible();

    // 4. Staff A goes to availability and sets status to Busy with custom text
    console.log("Staff A navigates to availability page and updates status...");
    await staffPage.goto("/availability");
    
    // Select "busy" from status dropdown
    await staffPage.locator("select").selectOption("busy");
    
    // Enter custom status text
    await staffPage.locator("input[placeholder='Status message (optional)']").fill("Focusing on reports");
    
    // Click update button
    const updateBtn = staffPage.locator("button:has-text('Update')").or(staffPage.locator("button:has-text('Saving...')")).first();
    await updateBtn.click();
    
    // Wait for save to complete (e.g. saving state to disappear)
    await expect(staffPage.locator("button:has-text('Update')")).toBeEnabled();

    // 5. Admin B verifies the update in real-time
    console.log("Admin B verifying real-time status change to Busy...");
    const busyBadge = accountsManagerCard.locator("span:has-text('Busy')");
    await expect(busyBadge).toBeVisible({ timeout: 10000 });
    
    const statusText = accountsManagerCard.locator("text=Focusing on reports");
    await expect(statusText).toBeVisible({ timeout: 10000 });

    // 6. Test Debounce Race Condition:
    // Staff A disconnects (closes tab/context) and quickly reconnects within 2 seconds.
    // Admin B's screen should NOT show Staff A going offline (stays online).
    console.log("Simulating Staff A quick disconnect...");
    await staffPage.close();
    await staffContext.close();

    console.log("Waiting 2 seconds (less than 5s debounce)...");
    await adminPage.waitForTimeout(2000);

    // Verify Admin B still sees Staff A as online (as "Busy" status since they are still marked busy)
    console.log("Verifying Staff A is still online in Admin B's view (within debounce window)...");
    const adminOnlineBadge = accountsManagerCard.locator("span:has-text('Busy')");
    await expect(adminOnlineBadge).toBeVisible();

    // Now Staff A reconnects
    console.log("Staff A reconnecting...");
    staffContext = await browser.newContext();
    staffPage = await staffContext.newPage();
    await staffPage.goto("/auth/login");
    await staffPage.fill("#email", "accountsmanager@thaibahive.local");
    await staffPage.fill("#password", "Password123");
    await staffPage.click("button[type='submit']");
    await expect(staffPage).toHaveURL("/");

    // Wait a couple of seconds to establish connection
    await adminPage.waitForTimeout(2000);
    console.log("Verifying Staff A remains online after reconnection...");
    await expect(adminOnlineBadge).toBeVisible();

    // 7. Full disconnect test
    console.log("Staff A disconnecting permanently...");
    await staffPage.close();
    await staffContext.close();

    // Wait 6 seconds (to allow 5s disconnect debounce to trigger)
    console.log("Waiting 6 seconds for permanent disconnect debounce...");
    await adminPage.waitForTimeout(6000);

    // Verify Admin B sees Staff A as Offline
    console.log("Verifying Staff A is now Offline...");
    const offlineBadge = accountsManagerCard.locator("span:has-text('Offline')");
    await expect(offlineBadge).toBeVisible();

    // 8. Admin B checks Timeline page
    console.log("Admin B checking Timeline page...");
    await adminPage.goto("/timeline");
    
    // Verify login, logout, and status change activity log events
    console.log("Verifying timeline events...");
    await expect(adminPage.locator("text=Logged in").first()).toBeVisible();
    await expect(adminPage.locator("text=Updated availability status").first()).toBeVisible();
    await expect(adminPage.locator("text=Logged out").first()).toBeVisible();

    console.log("All verifications, including debounce race condition, passed successfully!");
  } finally {
    // Take screenshots for evidence
    await staffPage.screenshot({ path: "e2e/screenshots/staff_page.png" }).catch(() => {});
    await adminPage.screenshot({ path: "e2e/screenshots/admin_page.png" }).catch(() => {});
    await staffContext.close().catch(() => {});
    await adminContext.close().catch(() => {});
  }
});
