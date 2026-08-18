import { test, expect } from "@playwright/test";
import { db } from "../packages/db";
import { presence, staff } from "../packages/db/schema";
import { eq } from "drizzle-orm";

test("Verify real-time status synchronization and timeline logging", async ({ browser, browserName }) => {
  test.skip(browserName === "webkit", "WebKit lacks full SSE streaming support in automated test harness");

  // 0. Clean up / reset presence for test-staff in DB
  console.log("Resetting presence record for test-staff...");
  const staffMember = await db.select().from(staff).where(eq(staff.email, "test-staff@thaibahive.local")).get();
  if (staffMember) {
    await db.delete(presence).where(eq(presence.staffId, staffMember.id)).run();
    console.log("Presence record reset completed.");
  }

  // Create two isolated browser contexts with cached auth sessions
  let staffContext = await browser.newContext({ storageState: ".auth/staff.json" });
  const adminContext = await browser.newContext({ storageState: ".auth/admin.json" });

  let staffPage = await staffContext.newPage();
  const adminPage = await adminContext.newPage();

  try {
    // 1. Staff A navigates directly to dashboard (already logged in)
    console.log("Staff A opening dashboard...");
    await staffPage.goto("/");
    await expect(staffPage).not.toHaveURL(/\/auth\/login/);

    // 2. Admin B navigates directly to dashboard (already logged in)
    console.log("Admin B opening dashboard...");
    await adminPage.goto("/");
    await expect(adminPage).not.toHaveURL(/\/auth\/login/);

    // 3. Admin B goes to availability
    console.log("Admin B navigates to availability page...");
    await adminPage.goto("/availability");
    
    // Verify that Test Staff is shown as Online with a green dot
    console.log("Verifying Test Staff is online (green dot / Online)...");
    const staffCard = adminPage.locator("div.rounded-xl", { hasText: "Test Staff" }).first();
    await expect(staffCard).toBeVisible({ timeout: 15000 });
    
    const onlineBadge = staffCard.locator("span:has-text('Online')");
    await expect(onlineBadge).toBeVisible({ timeout: 15000 });

    // 4. Staff A goes to availability and sets status to Busy with custom text
    console.log("Staff A navigates to availability page and updates status...");
    await staffPage.goto("/availability");
    
    // Select "busy" from status dropdown
    const statusSelect = staffPage.locator("select").first();
    await expect(statusSelect).toBeVisible({ timeout: 15000 });
    await statusSelect.selectOption("busy");
    
    // Enter custom status text
    const messageInput = staffPage.locator("input[placeholder='Status message (optional)']");
    await expect(messageInput).toBeVisible({ timeout: 15000 });
    await messageInput.fill("Focusing on reports");
    
    // Click update button
    const updateBtn = staffPage.locator("button:has-text('Update')").first();
    await expect(updateBtn).toBeVisible({ timeout: 15000 });
    await updateBtn.click();
    
    // Wait for save to complete
    await expect(staffPage.locator("button:has-text('Saving...')")).not.toBeVisible({ timeout: 10000 });
    await expect(staffPage.locator("button:has-text('Update')")).toBeEnabled({ timeout: 10000 });

    // 5. Admin B verifies the update in real-time
    console.log("Admin B verifying real-time status change to Busy...");
    const busyBadge = staffCard.locator("span:has-text('Busy')");
    await expect(busyBadge).toBeVisible({ timeout: 10000 });
    
    const statusText = staffCard.locator("text=Focusing on reports");
    await expect(statusText).toBeVisible({ timeout: 10000 });

    // 6. Test Debounce Race Condition:
    // Staff A disconnects (closes tab/context) and quickly reconnects within 2 seconds.
    // Admin B's screen should NOT show Staff A going offline (stays busy/online).
    console.log("Simulating Staff A quick disconnect...");
    await staffPage.close();
    await staffContext.close();

    console.log("Verifying Staff A is still online in Admin B's view (within debounce window)...");
    const adminOnlineBadge = staffCard.locator("span:has-text('Busy')");
    await expect(adminOnlineBadge).toBeVisible();

    // Now Staff A reconnects
    console.log("Staff A reconnecting...");
    staffContext = await browser.newContext({ storageState: ".auth/staff.json" });
    staffPage = await staffContext.newPage();
    await staffPage.goto("/");
    await expect(staffPage).not.toHaveURL(/\/auth\/login/);

    console.log("Verifying Staff A remains online after reconnection...");
    await expect(adminOnlineBadge).toBeVisible();

    // 7. Full disconnect test
    console.log("Staff A disconnecting permanently...");
    await staffPage.close();
    await staffContext.close();

    // Verify Admin B sees Staff A as Offline after disconnect debounce
    console.log("Verifying Staff A is now Offline...");
    const offlineBadge = staffCard.locator("span:has-text('Offline')");
    await expect(offlineBadge).toBeVisible({ timeout: 10000 });

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
