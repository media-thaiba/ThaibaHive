import { test, expect } from "@playwright/test";

test.describe("Admin Compliance & Governance Radar", () => {
  test("loads compliance governance page and displays telemetry cards", async ({ page }) => {
    // Intercept compliance telemetry endpoints
    await page.route("**/api/system/compliance/telemetry", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "HEALTHY",
          overallScore: 98,
          activeViolationsCount: 0,
          violationsBySeverity: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
          activeRulesCount: 5,
          lastEvaluatedAt: new Date().toISOString(),
          recentViolations: [],
        }),
      });
    });

    await page.route("**/api/system/compliance/violations", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ violations: [], total: 0 }),
      });
    });

    await page.route("**/api/system/compliance/snapshots", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          snapshots: [
            {
              id: "snp-e2e-1",
              tenantId: "default",
              snapshotType: "SCHEDULED",
              storageUri: "file://./snap.json.gz",
              checksumSha256: "0".repeat(64),
              retentionTier: "HOT",
              createdAt: new Date().toISOString(),
            },
          ],
          total: 1,
        }),
      });
    });

    await page.goto("/admin/compliance");

    // Verify main header and KPI cards are visible
    await expect(page.getByText("Enterprise Compliance & Forensic Governance")).toBeVisible();
    await expect(page.getByText("Compliance Health Radar")).toBeVisible();
    await expect(page.getByText("Cryptographic Audit Integrity")).toBeVisible();
    await expect(page.getByText("Forensic State Snapshots")).toBeVisible();

    // Verify Export Dossier button opens modal
    const exportBtn = page.getByRole("button", { name: /Export Dossier/i });
    await expect(exportBtn).toBeVisible();
    await exportBtn.click();

    await expect(page.getByText("Generate Regulatory Compliance Dossier")).toBeVisible();
  });
});
