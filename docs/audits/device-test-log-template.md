# ThaibaHive Sheet — Physical Device Test Log

**Place at:** `docs/audits/device-test-log-YYYY-MM-DD.md` (one file per session, committed with the code)

| | |
| :--- | :--- |
| **Tester / date** | |
| **Commit SHA** | |
| **Build under test** | ☐ normal build, real screens only (ChatDrawer, Circular drawer) &nbsp; ☐ `build:e2e` harness (**private LAN/staging only, never deployed**) |
| **Reference audit score** | 8.7 / 10 (Direct Touch 8.5) |

**Result codes:** `P` pass · `F` fail (log a bug below) · `N` note (works, but something feels off) · `–` not applicable / not tested

**Rule:** record what you *observed*, not what you expect. Screen-record every `F` and `N` (iOS: Control Center → Record). Retry once before marking `F`, and write "flaky" in the notes if the second try differs.

## 1. Devices

| Col | Device & model | OS version | Browser + version | Input / assistive tech |
| :-: | :--- | :--- | :--- | :--- |
| **iPh** | | iOS | Safari | touch · VoiceOver ☐ |
| **iPad** | | iPadOS | Safari | touch ☐ · +trackpad ☐ |
| **And** | | Android | Chrome | touch · TalkBack ☐ |
| **Win** | | Windows | Chrome | touch + trackpad |

## 2. Checks

| ID | Check (do this → expect this) | iPh | iPad | And | Win | Notes |
| :-: | :--- | :-: | :-: | :-: | :-: | :--- |
| G1 | Drag the handle/header down slowly → sheet stays glued to the finger (1:1), no browser address-bar or tab-bar takeover | | | | | |
| G2 | Short slow drag, release → springs back, no dismiss | | | | | |
| G3 | Fast flick down → dismisses; motion continues the finger's speed (no restart or jump) | | | | | |
| G4 | Drag up from rest, release → resists (rubber-band), rebounds once, no double-bounce or jitter (120 Hz: no micro-stutter) | | | | | |
| S1 | Scroll content down, then drag down while not at top → content scrolls, sheet does **not** move | | | | | |
| S2 | Flick content up into the top bounce, immediately drag down → hands off to sheet drag without jam | | | | | |
| O1 | Tap the dark overlay → closes exactly once | | | | | |
| O2 | Start a drag on the sheet, lift with finger over the overlay → does **not** dismiss | | | | | |
| K1 | Chat composer: tap → sheet and composer sit above keyboard, no page zoom | | | | | |
| K2 | With keyboard open, drag sheet down → keyboard dismisses, no fight | | | | | |
| B1 | Try to scroll the page behind an open sheet (incl. momentum) → page does not move | | | | | |
| R1 | Rotate with sheet open → text typed, scroll position and open state intact | | | | | |
| D1 | Open dropdown/select inside sheet → appears above sheet; Esc/tap-away closes the menu, **not** the sheet | | | | | |
| D2 | Open Chat sheet → Circular sheet → close top → only top closes; page stays locked; close again → page restored | | | | | |
| M1 | OS **Reduce Motion** on → sheet appears with no slide; finger drag still 1:1 | | | | | |
| T1 | iPad/Win: touch-drag works; with trackpad/mouse the close button works and no accidental drags | | | | | |
| A1 | **VoiceOver / TalkBack:** swipe through everything → focus never reaches the page behind the sheet | | | | | |
| A2 | Screen reader on: trigger a toast while sheet is open → it is announced | | | | | |
| X1 | Android only: system back gesture/button with sheet open → closes top sheet (not the page) | – | – | | – | |

## 3. Bugs found

| # | Sev | Check ID | Device | Expected vs actual (one line) | Suspected area | Issue/PR |
| :-: | :-: | :-: | :-: | :--- | :--- | :--- |
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |

**Severity:** **P1** blocks a core gesture or traps/loses user input · **P2** degrades feel or accessibility but is recoverable · **P3** polish

## 4. Re-score (fill in after fixes are retested)

Each bug must be fixed and the failing check re-run on the same device before the score changes.

| Dimension | Before | After | Based on (check IDs) |
| :--- | :-: | :-: | :--- |
| 5. Accessibility & Targets | 8.8 | | A1, A2, D1, M1 |
| 6. Springs & Interruptibility | 8.5 | | G2, G3, G4 |
| 7. Direct Touch Manipulation | 8.5 | | G1–G4, S1–S2, O1–O2, K1–K2, B1 |

**Proposed guardrails (edit to taste, then keep them fixed):**
- Any open `P1` in a dimension's checks → that dimension cannot rise, and drops by about 0.5 if it was a previously "verified" behavior.
- Raise Direct Touch above 9.0 only if every G, S, O, K and B check passes on **both** an iPhone and an Android phone.
- Raise Accessibility only if A1 and A2 pass with a real screen reader on **both** platforms.
- A first pass with zero findings is a reason to test again on a second device model, not to skip the log.

**New overall score:** ______ / 10 &nbsp;&nbsp; **Sign-off:** ______________ &nbsp;&nbsp; **Retest needed on:** ______________
