import type { CSSProperties, Ref } from "react"
import voidOIconWebp from "../assets/void-o-icon.webp"
import voidOIconPng from "../assets/void-o-icon.png"

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
 * Minimalist VOID wordmark — clean geometric letters with celestial singularity ring as the O.
 */
export function Wordmark({
  size = 28,
  className = "",
  pulse = false,
  style,
  onClick,
  vRef,
  oRef,
  idRef,
}: Props) {
  const fontSize = size
  const ringSize = Math.round(size * 1.05)
  const letterGap = Math.round(size * 0.22)

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

      {/* Cosmic Singularity O */}
      <span
        ref={oRef}
        className="relative inline-flex items-center justify-center shrink-0"
        style={{ width: ringSize, height: ringSize }}
      >
        <picture className="w-full h-full flex items-center justify-center">
          <source srcSet={voidOIconWebp} type="image/webp" />
          <img
            src={voidOIconPng}
            alt="O"
            className={`w-full h-full object-contain pointer-events-none select-none transition-transform duration-300 hover:scale-105 ${
              pulse ? "animate-pulse" : ""
            }`}
            draggable={false}
          />
        </picture>
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
