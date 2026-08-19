import { test, expect } from "@playwright/test";

test.describe("Workspaces Navigation and API Security", () => {
  test("unauthenticated access to /workspace/principal redirects to login page", async ({ page }) => {
    await page.goto("/workspace/principal");
    await expect(page).toHaveURL(/.*\/auth\/login.*/);
  });

  test("unauthenticated access to /workspace/teacher redirects to login page", async ({ page }) => {
    await page.goto("/workspace/teacher");
    await expect(page).toHaveURL(/.*\/auth\/login.*/);
  });

  test("unauthenticated access to /workspace/cashier redirects to login page", async ({ page }) => {
    await page.goto("/workspace/cashier");
    await expect(page).toHaveURL(/.*\/auth\/login.*/);
  });

  test("unauthenticated access to /workspace/parent redirects to login page", async ({ page }) => {
    await page.goto("/workspace/parent");
    await expect(page).toHaveURL(/.*\/auth\/login.*/);
  });

  test("unauthenticated call to aggregated data API returns 401", async ({ request }) => {
    const response = await request.get("/api/workspaces/data");
    expect(response.status()).toBe(401);
  });

  test("unauthenticated call to workspace preferences API returns 401", async ({ request }) => {
    const response = await request.get("/api/workspaces/preferences?workspaceType=principal");
    expect(response.status()).toBe(401);
  });

  test("unauthenticated call to workspace SSE endpoint returns 401", async ({ request }) => {
    const response = await request.get("/api/workspaces/sse");
    expect(response.status()).toBe(401);
  });
});
