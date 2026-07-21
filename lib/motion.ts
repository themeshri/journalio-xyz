import type { Transition, Variants } from 'motion/react'

/**
 * Shared motion presets so animations across the app read as one system
 * (SmoothUI-style spring physics). Set once on <MotionConfig> in Providers,
 * and reused by individual components.
 */

/** Default spring — snappy but soft. Tune stiffness/damping to taste. */
export const spring: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 26,
}

/** Fade + slide up. Use as `variants` with a parent `staggerContainer`. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
}

/** Parent container that staggers its `fadeUp` children on mount. */
export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.02 },
  },
}
