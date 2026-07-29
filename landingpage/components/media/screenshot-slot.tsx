'use client'

import { useState } from 'react'
import { ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DeviceFrame } from './device-frame'

/**
 * A swappable product-screenshot slot.
 *
 * Drop a real PNG at `public/screenshots/<name>.png` and pass its path as
 * `src` — it renders inside a device frame. Until then (or if the file is
 * missing), it shows a tasteful captioned placeholder so the layout looks
 * intentional with zero assets. Fixed aspect ratio keeps things stable
 * whether or not the image exists.
 */
export function ScreenshotSlot({
  src,
  caption,
  framed = true,
  className,
}: {
  src?: string
  caption: string
  framed?: boolean
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const showImage = src && !failed

  const inner = showImage ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={caption}
      onError={() => setFailed(true)}
      className="aspect-[16/10] w-full object-cover"
    />
  ) : (
    <div className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-muted/60 to-primary/5 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
        <ImageIcon className="h-5 w-5 text-primary" />
      </div>
      <p className="max-w-[80%] text-xs text-muted-foreground">{caption}</p>
    </div>
  )

  if (!framed) {
    return (
      <div className={cn('overflow-hidden rounded-xl border', className)}>
        {inner}
      </div>
    )
  }

  return <DeviceFrame className={className}>{inner}</DeviceFrame>
}
