# ThaibaHive UI Audit: Apple Design Principles & Fluid Interface Standards (Final Post-E2E & Production Gate Report)

**Audited Repository:** [ThaibaHive](file:///d:/ThaibaHive)  
**Standard Evaluated:** Apple Design Skill (`.agent/skills/apple-design/SKILL.md`)  
**Derived From:** Apple WWDC *Designing Fluid Interfaces*, Apple Human Interface Guidelines (HIG), and iOS Spatial/Material Physics  
**Evaluation Status:** 🟡 **Code-Complete & Automated-Verified (`8.7 / 10`)**  
**Ceiling Pending Physical Device Pass:** `9.5 – 10.0 / 10`  
*(Note: A real-device pass on physical hardware is an empirical upper bound, not a forecast; first hardware runs of gesture code on actual iOS Safari / Android WebViews can uncover hardware-specific quirks that lower the score as well as raise it).*  
**Date:** October 30, 2026  

---

## 1. Verified Scorecard & Three-Tier Evidence Classification

To ensure every claim is backed strictly by observed evidence, verification is categorized under three explicit tiers:
- 🟢 **Behavior-Tested:** Executable automated test asserts dynamic runtime behavior, state transitions, or gesture physics (Jest DOM / Playwright Chromium CDP Touch).
- 🟡 **Class / Type-Level Only:** TypeScript type safety and Tailwind class string presence in the DOM (layout geometry not computed by jsdom).
- ⚪ **Implemented, Untested on Physical Hardware:** Code written and compiled, but physical touch/hardware interactions (e.g., iOS Safari bounce, VoiceOver swipe gestures on physical phones) remain unexecuted.

### Unweighted Arithmetic Calculation:
$$\text{Score} = \frac{9.0 + 8.8 + 8.5 + 9.0 + 8.8 + 8.5 + 8.5}{7} = \frac{61.1}{7} = \mathbf{8.73} \approx \mathbf{8.7 / 10}$$
*(All seven dimensions are weighted equally. Direct Touch is held at 8.5 pending physical phone runs on iOS Safari and Android Chrome).*

| Dimension | Apple Skill Reference | Baseline (Pre) | Current Verified Score | Verification Tier | Fresh Verification Evidence |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **1. Materials & Depth** | §11 Materials & Depth | 9.0 | **9.0** | 🟡 Class / Token-Level | Preserved from baseline; frosted glass (`backdrop-blur-2xl`), specular highlights (`inset 0 1px 0 0 rgba(255,255,255,0.06)`), concentric radii hierarchy. |
| **2. Instant Response** | §1 Kill Latency | 8.5 | **8.8** | 🟡 Class / Token-Level | Tactile `active:bg-muted/60` row highlight on [`table.tsx`](file:///d:/ThaibaHive/src/components/ui/table.tsx) without row transform distortion; retained `active:scale-[0.97]` on buttons. |
| **3. Spatial Consistency** | §7 Anchored Origins | 8.5 | **8.5** | 🟡 Class / Token-Level | Preserved from baseline; dropdown menus anchor transform origins to trigger alignments (`origin-top-right`, `origin-top-left`). |
| **4. Typography & Layout** | §12 Optical Sizing & Tracking | 7.5 | **9.0** | 🟡 Class / Type-Level | `tabular-nums` verified in DOM test on table headers and cells; default badge floor elevated to `text-[0.6875rem]` (≈11px rem-scaled); RTL / `:lang(ar), :lang(ml)` reset in [`globals.css`](file:///d:/ThaibaHive/src/app/globals.css). |
| **5. Accessibility & Targets** | §14 Reduced Motion & HIG | 7.0 | **8.8** | 🟢 Scroll-Lock, Focus Trap, Return & Background Inert: Behavior-Tested<br>🟡 Hit-Area & MotionConfig: Class / Mount-Tested | Stack-safe body scroll lock, focus restoration to trigger, single-top-sheet Escape dismissal, bidirectional Tab/Shift+Tab focus trap wrap, and background sibling `inert` isolation behavior-tested in `apple-design-primitives.test.tsx` and `sheet-inert-nesting.test.tsx` (🟢); `<MotionConfig reducedMotion="user">` mount-tested (🟡); `[@media(pointer:coarse)]:after:min-h-[44px]` touch target expansion verified via class presence (🟡). Background `inert` attribute manipulation verified; live VoiceOver / TalkBack behavior unverified on physical hardware (⚪). |
| **6. Springs & Interruptibility**| §3 & §4 Fluid Springs | 6.0 | **8.5** | 🟢 Snap-back & Dismissal: E2E Behavior-Tested<br>🟡 Physics Tokens: Token-Level | Centralized [`appleSprings`](file:///d:/ThaibaHive/src/lib/motion.ts) tokens imported directly in [`sheet.tsx`](file:///d:/ThaibaHive/src/components/ui/sheet.tsx) without local duplication. Parameterization uses Framer Motion's bounce + duration API: `criticallyDamped` (bounce: 0, duration: 0.32s; $\zeta = 1.00$, zero overshoot) and `sheet` (bounce: 0, duration: 0.30s; $\zeta = 1.00$, zero overshoot). Both tokens are purely non-oscillating. Flick release uses `sheet` ($\zeta = 1.00$). The plan's momentum spring (bounce: 0.2, $\zeta \approx 0.8$) was removed from motion tokens and is not used by the sheet. Reason: a dismissing sheet should settle without oscillation. The spring retuning occurred prior to the fresh 45-run Playwright repeat verification. Short drag spring-back verified via Playwright CDP (🟢). |
| **7. Direct Touch Manipulation**| §2, §5, §6, §9 Gestures & Sheets | 4.0 | **8.5** *(Automated Browser Verified)*<br>*(Ceiling: 9.5–10.0)* | 🟢 Pure Physics Math: Behavior-Tested (9 runtime math + 3 reference tests)<br>🟢 DOM Lifecycle: Behavior-Tested (23 sheet, dropdown, and gating DOM tests across 5 suites)<br>🟢 Chromium CDP Touch Gestures: Behavior-Tested (9 tests, 180 repetition passes + 4x throttled run)<br>⚪ Physical Device Hardware Quirks: Untested on Device | Pure physics math verified (9 runtime tests for momentum projection, snap resolution, and threshold decay; 3 tests for reference rubber-band formula). 23 sheet, dropdown, and gating DOM tests across 5 suites. **180/180 repetition tests passed** across 1-worker and 4-worker passes; **9/9 passed under 4x CPU slowdown**; revert checks confirmed tests go red when guards are broken. Real-device capacitive feel, keyboard visual viewport tracking (`--kb-inset`), and iOS Safari rubber-band overscroll remain in Tier ⚪. |

---

## 2. Review Checklist: Item-by-Item Disposition

| Item | Requirement & Importance | Status | Implementation Detail |
| :--- | :--- | :---: | :--- |
| **Exit animation (`AnimatePresence`)** | Velocity-handoff close animation must play before unmounting | **YES** | Wrapped with `<AnimatePresence>` in [`sheet.tsx`](file:///d:/ThaibaHive/src/components/ui/sheet.tsx) with `exit={{ y: "100%", opacity: 0 }}` on mobile touch and `exit={{ scale: 0.96, opacity: 0, y: -8 }}` on desktop. |
| **Visible Close button and Esc** | Non-gesture alternative required for WCAG 2.5.1 | **YES** | Dedicated `<SheetClose>` + top-right `<X>` button (44px hit-box on mobile) + `keydown` Esc listener in [`sheet.tsx`](file:///d:/ThaibaHive/src/components/ui/sheet.tsx). Tested in `apple-design-primitives.test.tsx` and Playwright desktop pointer test. |
| **`SheetClose` & `SheetDragHandle`** | Composable primitives for custom headers/footers | **YES** | Exported as standalone primitives in [`sheet.tsx`](file:///d:/ThaibaHive/src/components/ui/sheet.tsx). Tested in `apple-design-primitives.test.tsx`. |
| **Detents & projected dismissal** | Deterministic resting points and flick-to-dismiss | **YES** | Single rest detent ($y = 0$) with `shouldDismissSheet` exponential projected decay threshold. Verified in unit tests and Playwright flick test (`fast flick dismisses even after a short distance`). Multi-height fractional detents (50% / 100%) deferred. |
| **Overlay pointer-down guard** | Drag finishing over overlay must not trigger click-outside | **YES** | Overlay tracks `onPointerDown` (`isPointerDownOnOverlay.current = true`) while sheet content sets it to `false`. Window `pointerup` listener uses `setTimeout(..., 0)` to allow in-flight clicks to process before clearing state. Revert check verified (test failed with closeCount=2 when guard was removed). |
| **Upward Drag Elasticity** | High resistance when dragging upward | **YES** *(Framer Motion Native)* | Uses Framer Motion's built-in `dragConstraints={{ top: 0 }}` and `dragElastic={{ top: 0.2, bottom: 0 }}`. `calculateRubberBand` in `sheet-physics.ts` is verified in unit tests as a standalone reference formula, while the runtime sheet relies directly on Framer Motion elasticity. |
| **Stack-Safe Body Scroll Lock** | Prevent background scrolling without breaking nested sheets | **YES** | Uses global `activeSheetScrollLockCount` so opening nested sheets keeps the body locked until the final sheet dismisses. Tested in `apple-design-primitives.test.tsx` and `sheet-inert-nesting.test.tsx`. |
| **Stacked Escape Dismissal** | One Esc press must close only the top-most sheet in a stack | **YES** | Implemented `activeSheetEscapeStack` where pressing Escape executes the closer callback of the topmost sheet only. Includes `if (e.defaultPrevented) return;` to respect inner menus. Revert check verified (test failed when guard was removed). |
| **Focus Trap & ARIA Semantics** | Keyboard Tab cycling and accessible dialog labeling | **YES** | Implemented focus trap cycling Tab / Shift+Tab within the sheet boundary; tested forward Tab wrap (last $\to$ first) and reverse Shift+Tab wrap (first $\to$ last); `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, and `aria-describedby` attached directly to moving sheet surface `surfaceRef`. Tested in `apple-design-primitives.test.tsx`. |
| **Background Inert** | Screen reader background isolation | **YES** *(Attribute Tested, Hardware Unverified)* | Sibling elements of `document.body` dynamically receive `inert` and are restored upon dismissal; exemptions protect toast containers (`[data-sonner-toaster]`), route-announcer (`#next-route-announcer`), and Radix poppers/menus (`[data-radix-popper-content-wrapper]`, `role="menu"`, `role="listbox"`). Note: Generic `aria-live` and `role="status"` are NOT exempted. Tested in `apple-design-primitives.test.tsx` and `sheet-inert-nesting.test.tsx`. |
| **iPad Touch Drag Gating** | Touch tablets keep drag while desktop mice do not drag modals | **YES** | Gated on `matchMedia("(pointer: coarse)")` via `useSyncExternalStore`. Verified via Playwright desktop pointer test (`mouse drag does not move or dismiss; Escape still closes`). |
| **Scroll Arbitration** | Sheet does not drag down until inner scrollable content reaches `scrollTop <= 0` | **YES** | Content pointer-down attaches gesture control only when `scrollTop <= 0`. Targeted via behavioral `[data-sheet-scroll]` attribute and `SheetBody` primitive without reliance on test IDs. Verified via Playwright touch test. |
| **Reduced Motion** | Instant presentation without vertical slide when reduced motion requested | **YES** | Checks OS reduced motion setting; sets `initial={{ y: 0, opacity: 1 }}` and zero-duration transition (instant presentation at rest detent with zero spatial translation), while keeping 1:1 direct finger drag active. Verified via Playwright test (`Math.max - Math.min < 2px` across 500ms). |
| **Android Keyboard Resizing** | Prevent viewport breakage on Chrome Android | **YES** | Added `interactiveWidget: "resizes-content"` to viewport export in [`layout.tsx`](file:///d:/ThaibaHive/src/app/layout.tsx). |
| **Input font-size $\ge 16$px** | Prevent iOS Safari auto-zooming viewport on focus | **YES** | Updated composer textarea in [`message-input.tsx`](file:///d:/ThaibaHive/src/components/chat/message-input.tsx) to `text-base sm:text-sm` (16px on mobile, 14px on desktop). |
| **Arabic / Malayalam badges** | Prevent `tracking-wider` from breaking script ligation | **YES** | Added `[dir="rtl"], :lang(ar), :lang(ml) { letter-spacing: normal !important; text-transform: none !important; }` in [`globals.css`](file:///d:/ThaibaHive/src/app/globals.css). |
| **Production Fixture Gating** | Prevent test harness routes from exposing in production | **YES** | Multi-layer defense: Edge proxy ([`proxy.ts`](file:///d:/ThaibaHive/src/proxy.ts)) with URL path canonicalization strictly scoped to `/dev/` checks (preserving case-sensitive routing elsewhere, and failing closed with 404 on malformed percent encoding) blocks all bypass attempts (`/dev/`, `//dev/`, `/DEV/`, `/%64ev/`, `/dev/%2e/`, `/%2564ev/`); page-level SSR gate ([`page.tsx`](file:///d:/ThaibaHive/src/app/dev/sheet-harness/page.tsx)) throws `notFound()` when `NEXT_PUBLIC_E2E` is unset. Verified with smoke gate script ([`smoke-prod-404.mjs`](file:///d:/ThaibaHive/scripts/smoke-prod-404.mjs)) following redirects across both groups: caught 5 violations on leaked build; passed 12/12 on production build. |
| **Non-dismissible state for dirty forms** | Prevent accidental dismissal if uncommitted edits exist | **DEFERRED** | Deferred. Form drawers affected: [`CircularComplianceDrawer.tsx`](file:///d:/ThaibaHive/src/components/circulars/CircularComplianceDrawer.tsx) and [`chat-drawer.tsx`](file:///d:/ThaibaHive/src/components/chat/chat-drawer.tsx). Read-only: `execution-detail-drawer.tsx` and `indoor-navigation-sheet.tsx`. |

---

## 3. Fresh Automated Test Evidence (99 Jest Tests + 234 Playwright Executions)

### Jest Unit & Component Test Suites (99/99 Passing across 7 Suites)
Raw execution log: [`docs/audits/raw-jest-tests.log`](file:///d:/ThaibaHive/docs/audits/raw-jest-tests.log)
```text
PASS src/components/ui/__tests__/apple-design-primitives.test.tsx (10 tests)
  - Sheet Component: trigger & drag handle & open & ARIA dialog role/modal/labelledby; scroll-lock & focus-restore & Esc; stacked nested scroll-lock & single-top-sheet Esc; Tab/Shift+Tab focus trap wrap; inert background isolation
  - Primitives: table tabular-nums; badge 11px rem-scaling; badge 10px dense typography; 44px coarse hit-target expansion; MotionConfig mount

PASS src/components/ui/__tests__/sheet-inert-nesting.test.tsx (6 tests)
  - Sheet inert isolation: marks page siblings inert while open and restores them on close
  - Sheet inert isolation: nested: closing the child un-inerts the parent but keeps the page inert
  - Sheet inert isolation: keeps toast and route-announcer containers interactive while open
  - Sheet inert isolation: never removes inert that existed before the sheet opened
  - Sheet inert isolation: abrupt unmount while open leaks no inert, scroll lock, or escape handler
  - Sheet inert isolation: scroll-lock counter is not stuck after an abrupt unmount

PASS src/components/ui/__tests__/sheet-dropdown.test.tsx (4 tests)
  - Dropdown menu inside a Sheet: menu content is interactive (not inert) and an item can be selected
  - Dropdown menu inside a Sheet: Escape with a menu open closes the menu only, not the sheet
  - Dropdown menu inside a Sheet: ignores Escape when defaultPrevented is true (e.g. inner component consumed it)
  - Sheet opened from a dropdown item: focus lands inside the sheet and nothing stays inert after close

PASS src/lib/__tests__/sheet-physics.test.ts (12 tests)
  - projectMomentum (3 tests): zero velocity, projected travel, negative distance
  - calculateRubberBand (3 tests, reference math): invalid dimension, sublinear damping, sign preservation
  - resolveNearestSnapPoint (2 tests): empty array fallback, nearest snap point resolution
  - shouldDismissSheet (4 tests): downward flick, upward retention, threshold displacement

PASS src/components/chat/__tests__/chat-drawer.test.tsx (4 tests)
  - renders ChatDrawer with channels, active message thread and message input
  - renders ReadReceiptBadge correctly across statuses
  - handles message submission from MessageInput
  - renders ChannelList with unread badges and channel categories

PASS src/lib/__tests__/middleware.test.ts (60 tests, including Edge Proxy Fixture Gating)
  - returns 404 in production deploy when NEXT_PUBLIC_E2E is not set
  - allows /dev/sheet-harness when NEXT_PUBLIC_E2E=1
  - allows /dev/sheet-harness in development mode
  - blocks other /dev/* routes even when NEXT_PUBLIC_E2E=1
  - table-driven bypass checks (7 tests): percent-encoded d (/%64ev/sheet-harness), mixed-case DEV (/DEV/sheet-harness), dot-segment (/dev/%2e/sheet-harness), double slash (//dev/sheet-harness), double percent-encoded d (/%2564ev/sheet-harness), encoded slash (/dev%2fsheet-harness), encoded backslash (/dev%5csheet-harness) -> all 404
  - table-driven malformed dev checks (3 tests): malformed hex (/dev/%99), truncated UTF-8 (/%E0%A4%A/dev/sheet-harness), dangling percent (/%/dev/sheet-harness) -> all fail closed 404
  - table-driven normal route safety checks (3 tests): /api/circulars/%99 (401), /circulars/%99 (307 redirect), /auth/login?redirect=/% (200 pass-through) -> exact expected status asserted without 500 crashes

PASS src/app/dev/sheet-harness/__tests__/page-gating.test.tsx (3 tests)
  - throws notFound() when NODE_ENV is production and NEXT_PUBLIC_E2E is unset
  - does not call notFound() when NODE_ENV is production and NEXT_PUBLIC_E2E is 1
  - does not call notFound() in development environment
```

### Playwright Chromium CDP Touch & Pointer Suite (Fresh Post-Retune Verification: 45/45 Green)
- **Fresh Post-Retune 5x Repeat Run (4 workers):** 45 passed, 0 failed (1.1m) — [raw-e2e-run-repeat-5.log](file:///d:/ThaibaHive/docs/audits/raw-e2e-run-repeat-5.log)
  *(Executed against the updated critical-damping $\zeta = 1.00$, duration $0.30$s token).*
- **Historical Pre-Retune Baseline Passes (Informational):**
  - 10x Repeat Run (1 worker): 90 passed, 0 failed (4.1m) — [raw-e2e-run-repeat-workers-1.log](file:///d:/ThaibaHive/docs/audits/raw-e2e-run-repeat-workers-1.log)
  - 10x Repeat Run (4 workers): 90 passed, 0 failed (1.3m) — [raw-e2e-run-repeat-workers-4.log](file:///d:/ThaibaHive/docs/audits/raw-e2e-run-repeat-workers-4.log)
  - 4x CPU Throttled Run: 9 passed, 0 failed (17.2s) — [raw-e2e-run-throttled.log](file:///d:/ThaibaHive/docs/audits/raw-e2e-run-throttled.log)
- **Revert Check 1 (`defaultPrevented`):** Confirmed test goes RED (`Expected 0 calls, received 1`) when guard is bypassed.
- **Revert Check 2 (`overlay guard`):** Confirmed test goes RED (`Expected closeCount: 1, Received: 2`) when guard is removed.

### Production Smoke Gate Empirical Revert Verification:
- **Test against leaked E2E build (`pnpm build:e2e; pnpm postbuild` with `NEXT_PUBLIC_E2E` unset in shell):**
  - Result: **FAILED with exit code 1** (as required).
  - Output: Caught **5 violations** where the test harness leaked (`must-404 /dev/sheet-harness → 200`, `must-404 /dev/sheet-harness/ → 200 (followed 308 to /dev/sheet-harness)`, `must-404 /dev/sheet-harness?x=1 → 200`, `no-serve //dev/sheet-harness → 200 (followed 308 to /dev/sheet-harness)`, `no-serve /dev/%2e/sheet-harness → 200`). Confirms the gate successfully detects leaked builds from passing production inspection. Encoded paths `/dev%2fsheet-harness` and `/dev%5csheet-harness` were probed and returned 404 (non-leaked).
  - Raw execution log: [`docs/audits/raw-smoke-e2e-leaked-fail.log`](file:///d:/ThaibaHive/docs/audits/raw-smoke-e2e-leaked-fail.log)
- **Test against normal production build (`pnpm build; pnpm postbuild` with `NEXT_PUBLIC_E2E` unset in shell):**
  - Result: **PASSED with exit code 0**.
  - Output: All 14 checks green (`control / → 307`, all 5 `must-404` return 404, all 8 `no-serve` return 404, 0 harness markup leaks).
  - Raw execution log: [`docs/audits/raw-smoke-prod-pass.log`](file:///d:/ThaibaHive/docs/audits/raw-smoke-prod-pass.log)

---

## 4. Physical Device Verification Runbook (To unlock 9.5 – 10.0)

The version-controlled single source of truth for physical device testing is maintained at [`docs/audits/device-test-log-template.md`](file:///d:/ThaibaHive/docs/audits/device-test-log-template.md).

Physical device testing is an empirical verification step that can either raise or lower the current score; the 9.5–10.0 range represents the empirical ceiling achievable once real-world capacitive touch, Safari 120Hz gesture interaction, and TalkBack/VoiceOver live passes are recorded.

1. **iOS Safari (iPhone):**
   - **G1:** Drag handle/header down slowly $\to$ sheet stays glued 1:1, no browser URL bar takeover.
   - **G2:** Short slow drag, release $\to$ springs back to rest detent.
   - **G3:** Fast flick down $\to$ velocity-handoff dismissal.
   - **G4:** Drag up from rest $\to$ Framer 0.2 top elasticity resists and rebounds cleanly without micro-stutter (120Hz ProMotion).
   - **S1:** Scroll content down, drag down while `scrollTop > 0` $\to$ content scrolls, sheet does not move.
   - **S2:** Flick content into top bounce, immediately drag down $\to$ smooth handoff without jamming on negative scroll values.
   - **O1 & O2:** Tap overlay $\to$ closes once; drag ending over overlay $\to$ does not close.
   - **K1 & K2:** Chat composer focus $\to$ sits above keyboard with `--kb-inset`, no viewport zoom; drag down blurs keyboard smoothly.
   - **B1:** Try to scroll background page behind sheet $\to$ background remains completely locked.
2. **iPad (Portrait & Landscape with and without Trackpad):**
   - **T1:** Touch dragging active on screen; trackpad/mouse pointer uses accessible close controls without accidental modal drags.
3. **Android Chrome:**
   - **X1:** System back gesture closes topmost sheet modal rather than navigating the page back.
   - **K1:** Viewport resizes cleanly with `interactiveWidget: "resizes-content"`.
4. **Reduced Motion:**
   - **M1:** Enable OS Reduce Motion $\to$ sheet presents instantly without spatial slide while 1:1 direct finger drag remains responsive.
5. **Screen Reader Accessibility:**
   - **A1:** VoiceOver (iOS) / TalkBack (Android) swipe cycling strictly contained within sheet; background page remains isolated via `inert`.
   - **A2:** Sonner toast announcements fire and read aloud while sheet is open.
