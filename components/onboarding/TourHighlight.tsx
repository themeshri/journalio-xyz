'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'

interface TourHighlightProps {
  targetSelector?: string // data-tour selector, e.g. "[data-tour='sidebar']"
  title: string
  description: string
  stepNumber: number
  totalSteps: number
  onNext: () => void
  onSkip: () => void
}

interface Position {
  top: number
  left: number
  width: number
  height: number
}

export function TourHighlight({
  targetSelector,
  title,
  description,
  stepNumber,
  totalSteps,
  onNext,
  onSkip,
}: TourHighlightProps) {
  const [targetRect, setTargetRect] = useState<Position | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const tooltipRef = useRef<HTMLDivElement>(null)
  const isLast = stepNumber === totalSteps - 1

  const measure = useCallback(() => {
    if (!targetSelector) {
      // Centered mode (no target)
      setTargetRect(null)
      setTooltipPos({
        top: window.innerHeight / 2 - 100,
        left: window.innerWidth / 2 - 175,
      })
      return
    }

    const el = document.querySelector(targetSelector)
    if (!el) {
      setTargetRect(null)
      return
    }

    const rect = el.getBoundingClientRect()
    const pos = {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    }
    setTargetRect(pos)

    // Position tooltip adjacent to target
    const tooltipWidth = 350
    const tooltipHeight = 160
    const padding = 12

    let tTop = pos.top + pos.height / 2 - tooltipHeight / 2
    let tLeft = pos.left + pos.width + padding

    // If tooltip goes off right edge, put it to the left
    if (tLeft + tooltipWidth > window.innerWidth - padding) {
      tLeft = pos.left - tooltipWidth - padding
    }
    // If tooltip goes off left edge, put it below
    if (tLeft < padding) {
      tLeft = pos.left + pos.width / 2 - tooltipWidth / 2
      tTop = pos.top + pos.height + padding
    }
    // Keep within viewport vertically
    tTop = Math.max(padding, Math.min(tTop, window.innerHeight - tooltipHeight - padding))
    tLeft = Math.max(padding, tLeft)

    setTooltipPos({ top: tTop, left: tLeft })
  }, [targetSelector])

  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)

    const observer = new ResizeObserver(measure)
    if (targetSelector) {
      const el = document.querySelector(targetSelector)
      if (el) observer.observe(el)
    }

    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
      observer.disconnect()
    }
  }, [measure, targetSelector])

  const cutoutPadding = 8

  return createPortal(
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop with cutout */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - cutoutPadding}
                y={targetRect.top - cutoutPadding}
                width={targetRect.width + cutoutPadding * 2}
                height={targetRect.height + cutoutPadding * 2}
                rx={8}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.6)"
          mask="url(#tour-mask)"
          style={{ pointerEvents: 'auto' }}
        />
      </svg>

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        className="absolute z-[61] w-[350px] rounded-xl border bg-card p-5 shadow-lg"
        style={{ top: tooltipPos.top, left: tooltipPos.left }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted-foreground">
            {stepNumber + 1} of {totalSteps}
          </span>
          <button
            onClick={onSkip}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip tour
          </button>
        </div>
        <h3 className="text-sm font-semibold mb-1">{title}</h3>
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{description}</p>
        <Button size="sm" onClick={onNext}>
          {isLast ? 'Finish' : 'Next'}
        </Button>
      </div>
    </div>,
    document.body
  )
}
