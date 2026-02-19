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
