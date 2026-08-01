import { Chain } from '@/lib/chains'

interface ChainIconProps {
  chain: Chain
  size?: number
  className?: string
}

export function ChainIcon({ chain, size = 14, className = '' }: ChainIconProps) {
  switch (chain) {
    case 'solana':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          className={className}
          aria-label="Solana"
        >
          <circle cx="12" cy="12" r="12" fill="#9945FF" />
          <path
            d="M7 15.5h8.5l1.5-1.5H8.5L7 15.5ZM7 10l1.5-1.5H17L15.5 10H7ZM8.5 13H17l-1.5-1.5H7L8.5 13Z"
            fill="white"
          />
        </svg>
      )
    case 'base':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          className={className}
          aria-label="Base"
        >
          <circle cx="12" cy="12" r="12" fill="#0052FF" />
          <text
            x="12"
            y="12"
            dominantBaseline="central"
            textAnchor="middle"
            fill="white"
            fontSize="13"
            fontWeight="700"
            fontFamily="system-ui, sans-serif"
          >
            B
          </text>
        </svg>
      )
    case 'bnb':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          className={className}
          aria-label="BNB"
        >
          <circle cx="12" cy="12" r="12" fill="#F0B90B" />
          <path
            d="M12 6l2 2-3.5 3.5L12 13l3.5-3.5L12 6ZM8.5 9.5L6 12l2.5 2.5 2.5-2.5-2.5-2.5ZM15.5 9.5L13 12l2.5 2.5L18 12l-2.5-2.5ZM12 14.5L9.5 17 12 19.5l2.5-2.5L12 14.5Z"
            fill="white"
            fillRule="evenodd"
          />
        </svg>
      )
    case 'ethereum':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          className={className}
          aria-label="Ethereum"
        >
          <circle cx="12" cy="12" r="12" fill="#627EEA" />
          <path d="M12 4.5v5.6l4.7 2.1L12 4.5Z" fill="white" fillOpacity="0.6" />
          <path d="M12 4.5 7.3 12.2l4.7-2.1V4.5Z" fill="white" />
          <path d="M12 16.1v3.4l4.7-6.4L12 16.1Z" fill="white" fillOpacity="0.6" />
          <path d="M12 19.5v-3.4l-4.7-3L12 19.5Z" fill="white" />
          <path d="m12 15.2 4.7-3-4.7-2.1v5.1Z" fill="white" fillOpacity="0.2" />
          <path d="m7.3 12.2 4.7 3v-5.1l-4.7 2.1Z" fill="white" fillOpacity="0.6" />
        </svg>
      )
    case 'robinhood':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          className={className}
          aria-label="Robinhood"
        >
          <circle cx="12" cy="12" r="12" fill="#CCFF00" />
          <path
            d="M8 17V7.5h4.2c1.9 0 3.1 1 3.1 2.7 0 1.2-.6 2.1-1.7 2.5L15.8 17h-2.2l-1.9-3.9h-1.6V17H8Zm2.1-5.6h1.9c.8 0 1.3-.4 1.3-1.1s-.5-1.1-1.3-1.1h-1.9v2.2Z"
            fill="#111"
          />
        </svg>
      )
    default: {
      // Unknown chain — render a neutral badge rather than nothing, so a new
      // chain can never produce an invisible circle in the UI.
      const label = String(chain)
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          className={className}
          aria-label={label}
        >
          <circle cx="12" cy="12" r="12" fill="#71717a" />
          <text
            x="12"
            y="16.5"
            textAnchor="middle"
            fontSize="12"
            fontWeight="bold"
            fill="white"
            fontFamily="sans-serif"
          >
            {label.charAt(0).toUpperCase()}
          </text>
        </svg>
      )
    }
  }
}

interface TokenWithBadgeProps {
  chain: Chain
  size?: 'sm' | 'md'
  children: React.ReactNode
}

export function TokenWithBadge({ chain, size = 'sm', children }: TokenWithBadgeProps) {
  const badgeSize = size === 'sm' ? 10 : 14

  return (
    <span className="relative inline-flex shrink-0">
      {children}
      <span className="absolute bottom-0 left-0 translate-y-[2px] -translate-x-[2px] rounded-full ring-1 ring-background">
        <ChainIcon chain={chain} size={badgeSize} />
      </span>
    </span>
  )
}
