import type { CSSProperties, Ref } from 'react'
import logoImg from '../assets/logo.webp'

type Props = {
  /** height of the wordmark in px, letters scale from this */
  size?: number
  className?: string
  style?: CSSProperties
  /** optional ring prop retained for API compatibility */
  ring?: boolean
  /** give the logo a slow atmospheric pulse */
  pulse?: boolean
  vRef?: Ref<HTMLSpanElement>
  oRef?: Ref<HTMLSpanElement>
  idRef?: Ref<HTMLSpanElement>
}

/**
 * VOID wordmark — thin geometric letters with celestial planet ring logo as the O.
 */
export function Wordmark({
  size = 28,
  className = '',
  pulse = false,
  vRef,
  oRef,
  idRef,
  style,
}: Props) {
  const gap = size * 0.28
  const logoSize = Math.round(size * 1.1)

  return (
    <span
      className={`inline-flex items-center font-display text-void-ink ${className}`}
      style={{ fontSize: size, lineHeight: 1, fontWeight: 300, gap, ...style }}
      aria-label="VOID"
    >
      <span ref={vRef} className="inline-block shrink-0 will-change-transform">
        V
      </span>
      <span
        ref={oRef}
        className="relative inline-flex items-center justify-center shrink-0 will-change-transform select-none"
        style={{ width: logoSize, height: logoSize }}
      >
        <img
          src={logoImg}
          alt="O"
          width={logoSize}
          height={logoSize}
          draggable={false}
          className={`size-full object-contain pointer-events-none drop-shadow-[0_2px_10px_rgba(56,189,248,0.45)] transition-all ${
            pulse ? 'animate-pulse' : ''
          }`}
        />
      </span>
      <span
        ref={idRef}
        className="inline-flex items-center shrink-0 will-change-transform"
        style={{ gap }}
      >
        <span>I</span>
        <span>D</span>
      </span>
    </span>
  )
}


