import type { Transition } from "framer-motion";

/**
 * Apple Design System Motion Tokens
 * Standardized spring physics derived from Apple's WWDC "Designing Fluid Interfaces"
 * Uses Framer Motion's bounce + duration API (which maps directly to Apple's damping ratio + response time).
 */
export const appleSprings = {
  /**
   * Critically damped default (bounce: 0, duration: 0.32s).
   * Maps to damping ratio 1.0, response 0.32s.
   * Used for repositioning, layout shifts, sidebars, and default transitions. Exactly zero overshoot.
   */
  criticallyDamped: {
    type: "spring",
    bounce: 0,
    duration: 0.32,
  } as const satisfies Transition,

  /**
   * Snappy micro-interaction (bounce: 0, duration: 0.22s).
   * Maps to damping ratio 1.0, response 0.22s.
   * Used for active buttons, badges, popover scale-ins. Exactly zero overshoot.
   */
  snappy: {
    type: "spring",
    bounce: 0,
    duration: 0.22,
  } as const satisfies Transition,

  /**
   * Sheet modal drag settlement (bounce: 0, duration: 0.30s).
   * Maps to damping ratio 1.0, response 0.30s.
   * Exactly zero overshoot (non-oscillating modal dismissal and snap-back).
   */
  sheet: {
    type: "spring",
    bounce: 0,
    duration: 0.3,
  } as const satisfies Transition,
} as const;
