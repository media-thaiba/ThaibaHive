/**
 * Place at: e2e/sheet-touch.spec.ts
 *
 * Real-gesture tests for the sheet. Chromium only: touch is injected through
 * CDP Input.dispatchTouchEvent so the browser produces genuine pointer events
 * with timestamps (framer-motion derives release velocity from these).
 */
import {
  test,
  expect,
  type CDPSession,
  type Locator,
  type Page,
} from "@playwright/test";

test.skip(
  ({ browserName }) => browserName !== "chromium",
  "CDP touch events require Chromium"
);

test.use({ storageState: ".auth/admin.json" });

const HARNESS = "/dev/sheet-harness";

type Pt = { x: number; y: number };

/* ----------------------------- helpers ----------------------------- */

async function center(loc: Locator): Promise<Pt> {
  const box = await loc.boundingBox();
  if (!box) throw new Error("element has no bounding box");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Wait until the element stops moving (spring settled). */
async function settle(loc: Locator) {
  let last = Number.NaN;
  let stable = 0;
  for (let i = 0; i < 40 && stable < 3; i++) {
    const y = (await loc.boundingBox())?.y ?? Number.NaN;
    stable = Math.abs(y - last) < 0.5 ? stable + 1 : 0;
    last = y;
    await loc.page().waitForTimeout(50);
  }
}

const topOf = async (loc: Locator) => (await loc.boundingBox())!.y;
const closeCount = async (page: Page) =>
  Number(await page.getByTestId("close-count").textContent());

class Finger {
  constructor(private cdp: CDPSession, private page: Page) {}

  private touch(type: "touchStart" | "touchMove" | "touchEnd", p?: Pt) {
    return this.cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: p ? [{ x: p.x, y: p.y, id: 0 }] : [],
    });
  }
  down(p: Pt) {
    return this.touch("touchStart", p);
  }
  move(p: Pt) {
    return this.touch("touchMove", p);
  }
  up() {
    return this.touch("touchEnd");
  }

  /**
   * Straight-line drag. totalMs controls speed (and therefore release velocity);
   * holdMs pauses before lift-off to zero the velocity. release:false leaves the
   * finger down so the test can measure mid-gesture state.
   */
  async drag(
    from: Pt,
    to: Pt,
    o: { steps?: number; totalMs?: number; holdMs?: number; release?: boolean } = {}
  ) {
    const { steps = 12, totalMs = 300, holdMs = 0, release = true } = o;
    await this.down(from);
    for (let i = 1; i <= steps; i++) {
      await this.move({
        x: from.x + ((to.x - from.x) * i) / steps,
        y: from.y + ((to.y - from.y) * i) / steps,
      });
      await this.page.waitForTimeout(totalMs / steps);
    }
    if (holdMs) await this.page.waitForTimeout(holdMs);
    if (release) await this.up();
  }
}

async function openSheet(page: Page) {
  await page.goto(HARNESS);
  await page.getByTestId("open-sheet").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await settle(dialog);
  return dialog;
}

async function expectOneToOneTracking(page: Page, finger: Finger, dialog: Locator) {
  const handle = await center(page.getByTestId("sheet-drag-handle"));
  const top0 = await topOf(dialog);
  const DY = 90;

  await finger.drag(handle, { x: handle.x, y: handle.y + DY }, {
    steps: 15,
    totalMs: 500,
    release: false,
  });
  const delta = (await topOf(dialog)) - top0;
  // 1:1 within a few px (sub-pixel rounding and the first-move threshold)
  expect(Math.abs(delta - DY)).toBeLessThanOrEqual(6);
  await finger.up();
}

/* ------------------------------ touch ------------------------------ */

test.describe("touch gestures", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 412, height: 915 },
  });

  let finger: Finger;
  test.beforeEach(async ({ page }) => {
    const cdp = await page.context().newCDPSession(page);
    const throttleRate = process.env.THROTTLE_CPU ? Number(process.env.THROTTLE_CPU) : 1;
    if (throttleRate > 1) {
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttleRate });
    }
    finger = new Finger(cdp, page);
  });

  test("sheet follows the finger 1:1 while dragging down", async ({ page }) => {
    const dialog = await openSheet(page);
    await expectOneToOneTracking(page, finger, dialog);
  });

  test("short slow drag springs back and does not dismiss", async ({ page }) => {
    const dialog = await openSheet(page);
    const top0 = await topOf(dialog);
    const handle = await center(page.getByTestId("sheet-drag-handle"));

    await finger.drag(handle, { x: handle.x, y: handle.y + 40 }, {
      steps: 15,
      totalMs: 600,
      holdMs: 150,
    });
    await settle(dialog);

    await expect(dialog).toBeVisible();
    expect(Math.abs((await topOf(dialog)) - top0)).toBeLessThan(2);
    expect(await closeCount(page)).toBe(0);
  });

  test("slow drag past the threshold dismisses exactly once", async ({ page }) => {
    const dialog = await openSheet(page);
    const box = (await dialog.boundingBox())!;
    const handle = await center(page.getByTestId("sheet-drag-handle"));

    await finger.drag(handle, { x: handle.x, y: handle.y + box.height * 0.6 }, {
      steps: 20,
      totalMs: 900,
      holdMs: 250, // zero velocity at release: only position decides
    });

    await expect(dialog).toBeHidden({ timeout: 3000 });
    expect(await closeCount(page)).toBe(1);
  });

  test("fast flick dismisses even after a short distance (velocity projection)", async ({
    page,
  }) => {
    const dialog = await openSheet(page);
    const handle = await center(page.getByTestId("sheet-drag-handle"));

    // ~140px in ~70ms is about 2000 px/s.
    await finger.drag(handle, { x: handle.x, y: handle.y + 140 }, {
      steps: 6,
      totalMs: 70,
    });

    await expect(dialog).toBeHidden({ timeout: 3000 });
    expect(await closeCount(page)).toBe(1); // overlay guard: no second close
  });

  test("dragging upward resists (rubber-band) and springs back", async ({ page }) => {
    const dialog = await openSheet(page);
    const top0 = await topOf(dialog);
    const handle = await center(page.getByTestId("sheet-drag-handle"));
    const UP = 300;

    await finger.drag(handle, { x: handle.x, y: handle.y - UP }, {
      steps: 15,
      totalMs: 500,
      release: false,
    });
    const moved = top0 - (await topOf(dialog)); // positive = moved up
    // Sub-linear resistance, not exact numbers (those are unit-tested in sheet-physics)
    expect(moved).toBeLessThan(UP * 0.6);

    await finger.up();
    await settle(dialog);
    await expect(dialog).toBeVisible();
    expect(Math.abs((await topOf(dialog)) - top0)).toBeLessThan(2);
  });

  test("scroll arbitration: no sheet drag until content is at scrollTop 0", async ({
    page,
  }) => {
    const dialog = await openSheet(page);
    const scroll = page.locator('[data-sheet-scroll]').first();
    const top0 = await topOf(dialog);
    const p = await center(scroll);

    // Scrolled down: dragging down must scroll content, not move the sheet
    await scroll.evaluate((el) => {
      el.scrollTop = 150;
    });
    await finger.drag(p, { x: p.x, y: p.y + 80 }, {
      steps: 10,
      totalMs: 250,
      release: false,
    });
    expect(Math.abs((await topOf(dialog)) - top0)).toBeLessThan(2);
    await finger.up();

    // At the top: the same gesture now drags the sheet
    await scroll.evaluate((el) => {
      el.scrollTop = 0;
    });
    await finger.drag(p, { x: p.x, y: p.y + 80 }, {
      steps: 10,
      totalMs: 250,
      release: false,
    });
    expect((await topOf(dialog)) - top0).toBeGreaterThan(60);
    await finger.up();
  });

  test("overlay guard: drag that ENDS over the overlay does not dismiss; a tap on it does", async ({
    page,
  }) => {
    const dialog = await openSheet(page);
    const handle = await center(page.getByTestId("sheet-drag-handle"));

    // Start on the sheet, release over the backdrop area near the top of the screen
    await finger.drag(handle, { x: handle.x, y: 20 }, { steps: 15, totalMs: 500, holdMs: 150 });
    await settle(dialog);
    await expect(dialog).toBeVisible();
    expect(await closeCount(page)).toBe(0);

    // Positive control: a genuine tap on the backdrop still dismisses
    await page.touchscreen.tap(handle.x, 20);
    await expect(dialog).toBeHidden({ timeout: 3000 });
    expect(await closeCount(page)).toBe(1);
  });
});

/* ------------------------- reduced motion ------------------------- */

test.describe("reduced motion", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 412, height: 915 },
    reducedMotion: "reduce",
  });

  test("opens without a slide, and finger drag still tracks 1:1", async ({ page }) => {
    const cdp = await page.context().newCDPSession(page);
    const throttleRate = process.env.THROTTLE_CPU ? Number(process.env.THROTTLE_CPU) : 1;
    if (throttleRate > 1) {
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttleRate });
    }
    const finger = new Finger(cdp, page);
    await page.emulateMedia({ reducedMotion: "reduce" });

    await page.goto(HARNESS);

    // Sample the dialog's top edge every frame for 500ms after it first mounts
    await page.evaluate(() => {
      (window as any).__ys = [] as number[];
      const obs = new MutationObserver(() => {
        const d = document.querySelector('[role="dialog"]');
        if (!d) return;
        obs.disconnect();
        const t0 = performance.now();
        const tick = () => {
          (window as any).__ys.push(d.getBoundingClientRect().top);
          if (performance.now() - t0 < 500) requestAnimationFrame(tick);
        };
        tick();
      });
      obs.observe(document.body, { childList: true, subtree: true });
    });

    await page.getByTestId("open-sheet").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.waitForTimeout(700);

    const ys = await page.evaluate(() => (window as any).__ys as number[]);
    expect(ys.length).toBeGreaterThan(3);
    // No spatial slide: top edge is constant from the first frame.
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(2);

    // Direct manipulation must survive reduced motion
    await settle(dialog);
    await expectOneToOneTracking(page, finger, dialog);
  });
});

/* --------------------- desktop pointer (coarse gate) --------------------- */

test.describe("desktop pointer", () => {
  test.use({
    hasTouch: false,
    isMobile: false,
    viewport: { width: 1280, height: 800 },
  });

  test("mouse drag does not move or dismiss; Escape still closes", async ({ page }) => {
    const dialog = await openSheet(page);
    const top0 = await topOf(dialog);
    // Header, not the handle: the handle may be hidden on desktop layouts
    const c = await center(page.getByTestId("sheet-header"));

    await page.mouse.move(c.x, c.y);
    await page.mouse.down();
    await page.mouse.move(c.x, c.y + 300, { steps: 15 });
    await page.mouse.up();

    await expect(dialog).toBeVisible();
    expect(Math.abs((await topOf(dialog)) - top0)).toBeLessThan(2);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    expect(await closeCount(page)).toBe(1);
  });
});
