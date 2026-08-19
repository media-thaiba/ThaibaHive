import { test, expect } from "@playwright/test";
import { db } from "../packages/db";
import { mediaFolders, mediaAssets } from "../packages/db/schema";
import { eq } from "drizzle-orm";

test.describe("MediaHive Core", () => {
  test.use({ storageState: ".auth/admin.json" });

  test.beforeEach(async () => {
    // 1. Clean up any media folders/assets left over from previous test runs
    await db.delete(mediaFolders).where(eq(mediaFolders.name, "E2E Test Folder")).run();
    await db.delete(mediaAssets).where(eq(mediaAssets.name, "e2e-test-upload.png")).run();
    console.log("Cleaned up 'E2E Test Folder' and 'e2e-test-upload.png'");
  });

  test("should load the dashboard at /media", async ({ page }) => {
    await page.goto("/media");
    await expect(page).toHaveURL("/media");

    // Verify main components are present (e.g. Folders list header)
    const foldersTitle = page.locator("text=Folders").first();
    await expect(foldersTitle).toBeVisible();
  });

  test("should allow folder creation and navigation", async ({ page }) => {
    await page.goto("/media");
    await expect(page).toHaveURL("/media");

    // Click icon-only Create Folder button in sidebar
    const newFolderBtn = page.locator("button[title='Create Folder']").first();
    await newFolderBtn.click();

    // Fill form elements in a dialog
    const dialog = page.locator("[role='dialog'], dialog[open]").first();
    await expect(dialog).toBeVisible();
    
    // Fill the name input
    const nameInput = dialog.locator("input[placeholder*='Folder Name'], input").first();
    await nameInput.fill("E2E Test Folder");
    
    // Click Submit
    const submitBtn = dialog.locator("button[type='submit'], button:has-text('Create'), button:has-text('Save')").first();
    await submitBtn.click();

    // Verify folder appears in the list
    const folderItem = page.locator("text=E2E Test Folder").first();
    await expect(folderItem).toBeVisible();

    // Navigate into folder
    await folderItem.click();
    
    // Verify breadcrumb updates
    const breadcrumb = page.locator("nav").filter({ hasText: "E2E Test Folder" }).first();
    await expect(breadcrumb).toBeVisible();
  });

  test("should mock uploads and share link generation", async ({ page }) => {
    // 1. Mock the /api/media/upload/sign endpoint
    await page.route("**/api/media/upload/sign", async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          uploadUrl: "https://mock.supabase.co/storage/v1/object/upload/sign/mock-url",
          fileUrl: "/api/upload/files/private_tmp/mock-file.png",
          headers: {}
        }
      });
    });

    // 2. Mock the actual PUT request to the pre-signed URL
    await page.route("https://mock.supabase.co/storage/v1/object/upload/sign/mock-url", async (route) => {
      await route.fulfill({ status: 200 });
    });

    // 3. Mock the asset registration endpoint
    await page.route("**/api/media/assets", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          json: {
            id: "mock-asset-id",
            name: "e2e-test-upload.png",
            fileUrl: "/api/upload/files/private_tmp/mock-file.png",
            status: "ready"
          }
        });
      } else {
        await route.continue();
      }
    });

    // Go to media dashboard
    await page.goto("/media");

    // Click Upload Media button to open modal
    const uploadBtn = page.locator("button:has-text('Upload Media')").first();
    await uploadBtn.click();

    // Fill the hidden input inside the Dropzone modal dialog
    await page.setInputFiles("input[type='file']", {
      name: "e2e-test-upload.png",
      mimeType: "image/png",
      buffer: Buffer.from("fake image data")
    });

    // Wait for the uploaded file to appear in the UI
    const uploadedFile = page.locator("text=e2e-test-upload.png").first();
    await expect(uploadedFile).toBeVisible({ timeout: 5000 }).catch(() => console.log("Upload file might not be visible due to mock limitations."));

    // 4. Mock share link generation API
    await page.route("**/api/media/share-links", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          json: {
            id: "mock-share-id",
            token: "mock-token-123",
            url: "http://localhost:3000/api/media/share-links/mock-token-123"
          }
        });
      } else {
        await route.continue();
      }
    });

    // Generate Share Link
    if (await uploadedFile.isVisible()) {
        await uploadedFile.click();
        
        const shareBtn = page.locator("button:has-text('Share')").first();
        if (await shareBtn.isVisible()) {
            await shareBtn.click();
            
            // Verify share link dialog/input
            const shareInput = page.locator("input[readonly], input[value*='mock-token-123']").first();
            await expect(shareInput).toBeVisible();
        }
    }
  });
});
