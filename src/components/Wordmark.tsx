import type { CSSProperties } from 'react'

type Props = {
  /** height of the wordmark in px, letters scale from this */
  size?: number
  className?: string
  style?: CSSProperties
  /** show the green ring around the O */
  ring?: boolean
  /** give the ring a slow atmospheric pulse */
  pulse?: boolean
}

/**
 * VOID wordmark — thin geometric letters with a green accent ring around the O.
 * Rendered as text so it stays crisp and selectable.
 */
export function Wordmark({ size = 28, className = '', ring = true, pulse = false, style }: Props) {
  const gap = size * 0.34
  return (
    <span
      className={`inline-flex items-center font-display text-void-ink ${className}`}
      style={{ fontSize: size, lineHeight: 1, fontWeight: 300, gap, ...style }}
      aria-label="VOID"
    >
      <span>V</span>
      <span className="relative inline-flex items-center justify-center">
        <span className="relative z-10">O</span>
        {ring && (
          <span
            aria-hidden
            className="absolute rounded-full"
            style={{
              width: size * 0.92,
              height: size * 0.92,
              border: `${Math.max(1.2, size * 0.028)}px solid var(--color-void-green)`,
              boxShadow: `0 0 ${size * 0.5}px rgba(47,125,84,0.28)`,
              animation: pulse ? 'void-ring-pulse 5.5s ease-in-out infinite' : undefined,
            }}
          />
        )}
      </span>
      <span>I</span>
      <span>D</span>
    </span>
  )
}
