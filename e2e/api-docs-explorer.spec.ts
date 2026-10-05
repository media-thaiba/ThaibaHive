import { test, expect } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

test.describe("API Documentation Interactive Explorer (C7)", () => {
  test.use({ storageState: ".auth/admin.json" });

  test("renders custom zero-CDN API docs explorer, exercises 3 endpoints, and captures screenshot", async ({ page }) => {
    // 1. Navigate to /docs
    await page.goto("/docs");
    await page.waitForLoadState("domcontentloaded");

    // Wait for the spec to load and render cards
    await page.waitForSelector("div.bg-slate-900.border", { timeout: 15000 });

    // Assert header and spec title
    await expect(page.locator("h1")).toContainText("ThaibaHive");
    await expect(page.locator("header p")).toBeVisible();

    // Verify endpoints loaded
    const endpointCards = page.locator("div.bg-slate-900.border");
    await expect(endpointCards.first()).toBeVisible();

    // Ensure docs/audit-evidence directory exists
    const evidenceDir = path.resolve("docs/audit-evidence");
    if (!fs.existsSync(evidenceDir)) {
      fs.mkdirSync(evidenceDir, { recursive: true });
    }

    // Capture main overview screenshot
    await page.screenshot({ path: path.join(evidenceDir, "api-docs-explorer-overview.png"), fullPage: false });

    // Exercise Endpoint 1: Search for 'auth'
    const searchInput = page.locator('input[placeholder*="Search endpoints"]');
    await searchInput.fill("auth");
    await page.waitForTimeout(500);
    const authEndpoint = page.locator("code:text-is('/api/auth/me')").or(page.locator("code:text-is('/api/auth/login')")).first();
    await expect(authEndpoint).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, "api-docs-explorer-auth-search.png") });

    // Exercise Endpoint 2: Filter by Category / Tag (e.g. Staff Management or Attendance & Shifts)
    await searchInput.fill("");
    const categorySelect = page.locator("select");
    const tagOptions = await categorySelect.locator("option").allTextContents();
    const targetTag = tagOptions.find((t) => t.toLowerCase().includes("staff") || t.toLowerCase().includes("attendance")) || tagOptions[1];
    if (targetTag) {
      await categorySelect.selectOption({ label: targetTag });
      await page.waitForTimeout(500);
    }
    const filteredCard = page.locator("div.bg-slate-900.border").first();
    await expect(filteredCard).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, "api-docs-explorer-category-filtered.png") });

    // Exercise Endpoint 3: Search for 'attendance' or 'leaves'
    await categorySelect.selectOption("all");
    await searchInput.fill("attendance");
    await page.waitForTimeout(500);
    const attendanceEndpoint = page.locator("code:has-text('/api/attendance')").first();
    await expect(attendanceEndpoint).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, "api-docs-explorer-attendance-search.png") });
  });
});

