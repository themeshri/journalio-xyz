'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSpring, useMotionValueEvent, type SpringOptions } from 'motion/react'

// ─── SVG Definitions (place inside <defs> of a chart) ─────────────

/** Dotted background pattern for chart areas */
export function DottedBackgroundPattern({
  id = 'dotted-bg',
  color = 'currentColor',
  opacity = 0.15,
  radius = 0.5,
  spacing = 8,
}: {
  id?: string
  color?: string
  opacity?: number
  radius?: number
  spacing?: number
}) {
  return (
    <pattern id={id} x="0" y="0" width={spacing} height={spacing} patternUnits="userSpaceOnUse">
      <circle cx={spacing / 2} cy={spacing / 2} r={radius} fill={color} fillOpacity={opacity} />
    </pattern>
  )
}

/** Glow filter for lines and areas */
export function GlowFilter({
  id = 'glow',
  color = 'oklch(0.527 0.154 163.225)',
  stdDeviation = 3.5,
}: {
  id?: string
  color?: string
  stdDeviation?: number
}) {
  return (
    <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceGraphic" stdDeviation={stdDeviation} result="blur" />
      <feFlood floodColor={color} floodOpacity="0.4" result="color" />
      <feComposite in="color" in2="blur" operator="in" result="glow" />
      <feMerge>
        <feMergeNode in="glow" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  )
}

/** Gradient for bar fills — vertical fade with a solid top line */
export function GradientBarDefs({
  id = 'gradient-bar',
  color = 'oklch(0.527 0.154 163.225)',
  topOpacity = 0.9,
  bottomOpacity = 0.2,
}: {
  id?: string
  color?: string
  topOpacity?: number
  bottomOpacity?: number
}) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={topOpacity} />
      <stop offset="100%" stopColor={color} stopOpacity={bottomOpacity} />
    </linearGradient>
  )
}

/** Hatched pattern fill for bars */
export function HatchPatternDefs({
  id = 'hatch-pattern',
  color = 'oklch(0.577 0.245 27.325)',
  bgOpacity = 0.15,
  lineOpacity = 0.5,
  spacing = 6,
}: {
  id?: string
  color?: string
  bgOpacity?: number
  lineOpacity?: number
  spacing?: number
}) {
  return (
    <>
      <pattern id={id} x="0" y="0" width={spacing} height={spacing} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width={spacing} height={spacing} fill={color} fillOpacity={bgOpacity} />
        <line x1="0" y1="0" x2="0" y2={spacing} stroke={color} strokeWidth="1.5" strokeOpacity={lineOpacity} />
      </pattern>
    </>
  )
}

// ─── Custom Bar Shapes ──────────────────────────────────────────

interface BarShapeProps {
  x?: number
  y?: number
  width?: number
  height?: number
  fill?: string
  [key: string]: any
}

/** Gradient bar with solid top border line */
export function CustomGradientBar(props: BarShapeProps & { gradientId?: string; borderColor?: string }) {
  const { x = 0, y = 0, width = 0, height = 0, gradientId = 'gradient-bar', borderColor } = props
  if (height <= 0 || width <= 0) return null
  const r = Math.min(4, width / 2)
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={`url(#${gradientId})`} rx={r} ry={r} />
      {borderColor && (
        <line x1={x} y1={y} x2={x + width} y2={y} stroke={borderColor} strokeWidth={2} strokeLinecap="round" />
      )}
    </g>
  )
}

/** Hatched pattern bar */
export function CustomHatchedBar(props: BarShapeProps & { patternId?: string }) {
  const { x = 0, y = 0, width = 0, height = 0, patternId = 'hatch-pattern' } = props
  if (height <= 0 || width <= 0) return null
  const r = Math.min(4, width / 2)
  return (
    <rect x={x} y={y} width={width} height={height} fill={`url(#${patternId})`} rx={r} ry={r} />
  )
}

/** Duotone bar — 50/50 split gradient */
export function CustomDuotoneBar(props: BarShapeProps & { topColor?: string; bottomColor?: string }) {
  const { x = 0, y = 0, width = 0, height = 0, topColor = 'oklch(0.527 0.154 163.225)', bottomColor = 'oklch(0.577 0.245 27.325)' } = props
  if (height <= 0 || width <= 0) return null
  const r = Math.min(4, width / 2)
  const duoId = `duotone-${x}-${y}`
  return (
    <g>
      <defs>
        <linearGradient id={duoId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={topColor} stopOpacity={0.85} />
          <stop offset="50%" stopColor={topColor} stopOpacity={0.5} />
          <stop offset="50%" stopColor={bottomColor} stopOpacity={0.5} />
          <stop offset="100%" stopColor={bottomColor} stopOpacity={0.25} />
        </linearGradient>
      </defs>
      <rect x={x} y={y} width={width} height={height} fill={`url(#${duoId})`} rx={r} ry={r} />
    </g>
  )
}

// ─── Animated Bar (Motion Spring) ────────────────────────────────

const springConfig: SpringOptions = { stiffness: 300, damping: 30, mass: 0.8 }

export function AnimatedBar(props: BarShapeProps & { isActive?: boolean }) {
  const { x = 0, y = 0, width = 0, height = 0, fill = 'var(--chart-1)', isActive = false } = props
  if (height <= 0 || width <= 0) return null

  const targetHeight = isActive ? height + 6 : height
  const targetY = isActive ? y - 6 : y
  const targetOpacity = isActive ? 1 : 0.7

  const springHeight = useSpring(height, springConfig)
  const springY = useSpring(y, springConfig)
  const springOpacity = useSpring(0.7, springConfig)
  const [vals, setVals] = useState({ h: height, vy: y, op: 0.7 })

  useEffect(() => {
    springHeight.set(targetHeight)
    springY.set(targetY)
    springOpacity.set(targetOpacity)
  }, [targetHeight, targetY, targetOpacity, springHeight, springY, springOpacity])

  useMotionValueEvent(springHeight, 'change', (v) => setVals((prev) => ({ ...prev, h: v })))
  useMotionValueEvent(springY, 'change', (v) => setVals((prev) => ({ ...prev, vy: v })))
  useMotionValueEvent(springOpacity, 'change', (v) => setVals((prev) => ({ ...prev, op: v })))

  const r = Math.min(4, width / 2)
  return (
    <rect
      x={x}
      y={vals.vy}
      width={width}
      height={Math.max(0, vals.h)}
      fill={fill}
      fillOpacity={vals.op}
      rx={r}
      ry={r}
    />
  )
}

// ─── Pinging Dot (for active data points on line/scatter charts) ──

export function PingingDot({
  cx,
  cy,
  fill = 'oklch(0.527 0.154 163.225)',
  r = 4,
}: {
  cx: number
  cy: number
  fill?: string
  r?: number
}) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={fill} />
      <circle cx={cx} cy={cy} r={r} fill={fill} opacity={0.4}>
        <animate attributeName="r" from={`${r}`} to={`${r * 3}`} dur="1.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.4" to="0" dur="1.5s" repeatCount="indefinite" />
      </circle>
    </g>
  )
}

// ─── Active Dot for Recharts (renders PingingDot on hover) ────────

export function ActivePingingDot(props: any) {
  const { cx, cy, fill, payload } = props
  if (cx == null || cy == null) return null
  return <PingingDot cx={cx} cy={cy} fill={fill || 'oklch(0.527 0.154 163.225)'} />
}

// ─── Chart hover index tracker ───────────────────────────────────

/** Hook to track which bar index is hovered in a Recharts chart */
export function useChartHoverIndex() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const handleMouseMove = useCallback((state: any) => {
    if (state?.activeTooltipIndex != null) {
      setActiveIndex(state.activeTooltipIndex)
    }
  }, [])
  const handleMouseLeave = useCallback(() => setActiveIndex(null), [])
  return { activeIndex, handleMouseMove, handleMouseLeave }
}

// ─── Glow area gradient defs ─────────────────────────────────────

export function GlowAreaGradient({
  id = 'glow-area',
  color = 'oklch(0.527 0.154 163.225)',
  topOpacity = 0.25,
  bottomOpacity = 0,
}: {
  id?: string
  color?: string
  topOpacity?: number
  bottomOpacity?: number
}) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={topOpacity} />
      <stop offset="100%" stopColor={color} stopOpacity={bottomOpacity} />
    </linearGradient>
  )
}
