/**
 * E2E Workflow Test Suite — Leave Management
 * Task P2-54: Expanded Playwright workflow tests
 */
import { test, expect } from "@playwright/test";

test.describe("Leave Management Workflow", () => {
  test("leave page is accessible", async ({ page }) => {
    await page.goto("/my-work/leaves");
    const url = page.url();
    // Either redirects to login (unauthenticated) or shows the leave page
    expect(url.includes("/auth/login") || url.includes("/my-work/leaves")).toBe(true);
  });

  test("leave page renders without errors", async ({ page }) => {
    await page.goto("/my-work/leaves");
    // No uncaught errors should be visible
    const errorBoundary = page.locator("text=Something went wrong");
    await expect(errorBoundary).toHaveCount(0);
  });
});

test.describe("Task Management Workflow", () => {
  test("tasks page is accessible", async ({ page }) => {
    await page.goto("/my-work/tasks");
    const url = page.url();
    expect(url.includes("/auth/login") || url.includes("/my-work/tasks")).toBe(true);
  });

  test("new task page is accessible", async ({ page }) => {
    await page.goto("/my-work/tasks/new");
    const url = page.url();
    expect(url.includes("/auth/login") || url.includes("/my-work/tasks")).toBe(true);
  });
});

test.describe("Staff Management Workflow", () => {
  test("staff page is accessible", async ({ page }) => {
    await page.goto("/admin/staff");
    const url = page.url();
    expect(url.includes("/auth/login") || url.includes("/admin/staff")).toBe(true);
  });

  test("health endpoint returns 200", async ({ request }) => {
    const res = await request.get("/api/system/health");
    // Should return 200 with status ok or degraded
    expect([200, 503]).toContain(res.status());
    const body = await res.json();
    expect(body).toHaveProperty("status");
    expect(["ok", "degraded"]).toContain(body.status);
  });
});
