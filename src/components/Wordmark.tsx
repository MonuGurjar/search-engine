import type { CSSProperties, Ref } from 'react'

type Props = {
  /** height of the wordmark in px */
  size?: number
  className?: string
  style?: CSSProperties
  pulse?: boolean
  onClick?: () => void
  vRef?: Ref<HTMLSpanElement>
  oRef?: Ref<HTMLSpanElement>
  idRef?: Ref<HTMLSpanElement>
}

/**
 * Minimalist VOID wordmark — clean geometric letters with cyan-to-blue gradient ring and accent dot as the O.
 * Matches Minimalist VOID Search Homepage aesthetic.
 */
export function Wordmark({
  size = 28,
  className = '',
  pulse = false,
  style,
  onClick,
  vRef,
  oRef,
  idRef,
}: Props) {
  const fontSize = size
  const ringSize = Math.round(size * 0.90)
  const letterGap = Math.round(size * 0.28)

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center select-none ${className}`}
      style={{
        gap: letterGap,
        lineHeight: 1,
        fontFamily: "'Outfit', sans-serif",
        fontWeight: 300,
        ...style,
      }}
      aria-label="VOID"
    >
      <span
        ref={vRef}
        style={{ fontSize }}
        className="text-slate-900 dark:text-white transition-colors tracking-tight font-light"
      >
        V
      </span>

      {/* Radiant Gradient O with accent dot */}
      <span
        ref={oRef}
        className="relative inline-flex items-center justify-center shrink-0"
        style={{ width: ringSize, height: ringSize }}
      >
        <svg
          viewBox="0 0 100 100"
          className={`size-full ${pulse ? 'animate-pulse' : ''}`}
          style={{ overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="voidGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
            <filter id="voidGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3.5" floodColor="#38bdf8" floodOpacity="0.35" />
            </filter>
          </defs>
          {/* Main Gradient Ring */}
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="none"
            stroke="url(#voidGradient)"
            strokeWidth="8.5"
            filter="url(#voidGlow)"
          />
          {/* Little Floating Accent Dot at ~1:30 position */}
          <circle
            cx="84"
            cy="16"
            r="5.5"
            fill="#2563eb"
          />
        </svg>
      </span>

      <span
        ref={idRef}
        className="inline-flex items-center"
        style={{ gap: letterGap }}
      >
        <span
          style={{ fontSize }}
          className="text-slate-900 dark:text-white transition-colors tracking-tight font-light"
        >
          I
        </span>
        <span
          style={{ fontSize }}
          className="text-slate-900 dark:text-white transition-colors tracking-tight font-light"
        >
          D
        </span>
      </span>
    </span>
  )
}
