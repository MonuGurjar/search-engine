import { useEffect, useRef, useState } from 'react'
import { ChevronDown, GearIcon } from './icons'
import { SearchBar } from './SearchBar'
import { Wordmark } from './Wordmark'

import { getSphereMetrics } from '../lib/sphereMetrics'

type Props = {
  query: string
  mode: string
  onMode: (id: string) => void
  onSearch: (q: string) => void
  onHome: () => void
}

const prefersReduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

function smoothstep(min: number, max: number, value: number) {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)))
  return x * x * (3 - 2 * x)
}

function calculateMetrics() {
  if (typeof window === 'undefined') {
    return {
      transitionDistance: 800,
      heroMark: 104,
      markScaleRatio: 0.25,
      heroWordmarkY: 270,
      dxAt1: -618,
      dyAt1: 37,
      heroTaglineY: 338,
      heroSearchY: 510,
      targetSearchY: 16,
      targetSearchScale: 0.9,
      sphereD: 300,
      sphereTop: 72,
      sphereCenterY: 222,
      targetWidth: 800,
      targetHeight: 58,
      targetCenterY: 37,
    }
  }

  const w = window.innerWidth
  const h = window.innerHeight
  const sm = getSphereMetrics(w, h)

  const transitionDistance = h
  const isMobile = sm.isMobile
  const isLg = sm.isLg

  const heroMark = isMobile ? 64 : 104
  const targetMark = isMobile ? 22 : 26
  const markScaleRatio = targetMark / heroMark

  // On desktop: sits on the top-left of the header!
  const targetLeft = isMobile ? 20 : isLg ? 56 : 40
  const targetMarkCenterX = targetLeft + 46
  const targetMarkCenterY = 37

  const heroCenterX = w / 2
  const heroWordmarkY = sm.sphereCenterY
  const dxAt1 = targetMarkCenterX - heroCenterX
  const dyAt1 = targetMarkCenterY

  // Tagline sits directly under hero wordmark within the sphere core
  const heroTaglineY = heroWordmarkY + heroMark / 2 + (isMobile ? 12 : 16)

  // SearchBar is positioned downward just below the sphere bottom, keeping the sphere 100% visible
  const heroSearchY = sm.sphereBottom + (isMobile ? 18 : 20)

  // In final state: SearchBar aligns horizontally in the top bar row on desktop and mobile
  const targetSearchY = isMobile ? 10 : 16
  const targetSearchScale = isMobile ? 0.94 : 0.9

  return {
    transitionDistance,
    heroMark,
    markScaleRatio,
    heroWordmarkY,
    dxAt1,
    dyAt1,
    heroTaglineY,
    heroSearchY,
    targetSearchY,
    targetSearchScale,
    sphereD: sm.sphereD,
    sphereTop: sm.sphereTop,
    sphereCenterY: sm.sphereCenterY,
    targetWidth: sm.targetWidth,
    targetHeight: sm.targetHeight,
    targetCenterY: sm.targetCenterY,
  }
}

export function ScrollHero({ query, mode, onMode, onSearch, onHome }: Props) {
  const [value, setValue] = useState(query)
  const [isMobile, setIsMobile] = useState(false)
  const [pulse, setPulse] = useState(true)
  const [markSize, setMarkSize] = useState(104)
  const [compact, setCompact] = useState(false)

  const wordmarkRef = useRef<HTMLDivElement>(null)
  const vRef = useRef<HTMLSpanElement>(null)
  const oRef = useRef<HTMLSpanElement>(null)
  const idRef = useRef<HTMLSpanElement>(null)
  const taglineRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const scrollIndicatorRef = useRef<HTMLDivElement>(null)
  const headerBgRef = useRef<HTMLDivElement>(null)

  // Keep local search input in sync with query prop
  useEffect(() => {
    setValue(query)
  }, [query])

  // Responsive mark size and mobile state
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const updateSize = () => {
      setIsMobile(mq.matches)
      setMarkSize(mq.matches ? 64 : 104)
    }
    updateSize()
    mq.addEventListener('change', updateSize)
    return () => mq.removeEventListener('change', updateSize)
  }, [])

  // Continuous rAF animation loop driven by scroll
  useEffect(() => {
    let rafId = 0

    const tick = () => {
      try {
        const w = window.innerWidth
        const h = window.innerHeight
        const isMobileNow = w <= 640
        const m = calculateMetrics()
        const sy = window.scrollY
        const rawT = Math.min(1, Math.max(0, sy / m.transitionDistance))
        const t = prefersReduced() ? (rawT >= 0.5 ? 1 : 0) : smoothstep(0, 1, rawT)

        // Turn off pulse when leaving hero
        const shouldPulse = rawT < 0.25
        setPulse((prev) => (prev !== shouldPulse ? shouldPulse : prev))

        // Compact state for pills and searchbar
        const isCompact = rawT > 0.45
        setCompact((prev) => (prev !== isCompact ? isCompact : prev))

        // 0. Frosted Glass Header Bar: morphs cleanly from the exact perimeter of the 3D sphere into the top rounded bar
        if (headerBgRef.current) {
          const morphT = prefersReduced()
            ? (rawT >= 0.5 ? 1 : 0)
            : smoothstep(0.04, 0.94, rawT)

          if (morphT <= 0.001) {
            headerBgRef.current.style.opacity = '0'
            headerBgRef.current.style.visibility = 'hidden'
            headerBgRef.current.style.pointerEvents = 'none'
          } else {
            headerBgRef.current.style.visibility = 'visible'
            const op = smoothstep(0.04, 0.35, rawT)
            headerBgRef.current.style.opacity = op.toFixed(3)
            headerBgRef.current.style.pointerEvents = morphT >= 0.85 ? 'auto' : 'none'

            // Starts exactly matching the 3D sphere (same center, same diameter, 50% circle radius)
            const currentCenterY = m.sphereCenterY + (m.targetCenterY - m.sphereCenterY) * morphT
            const currentWidth = m.sphereD + (m.targetWidth - m.sphereD) * morphT
            const currentHeight = m.sphereD + (m.targetHeight - m.sphereD) * morphT
            const currentLeft = (w - currentWidth) / 2
            const currentTop = currentCenterY - currentHeight / 2

            // Radius interpolates from circle (sphereD / 2) to capsule (targetHeight / 2)
            const targetRadius = m.targetHeight / 2
            const currentRadius = m.sphereD / 2 + (targetRadius - m.sphereD / 2) * morphT

            // Border smoothly fades in
            const borderOp = smoothstep(0.08, 0.55, rawT)
            headerBgRef.current.style.borderColor = `rgba(216, 222, 224, ${borderOp.toFixed(3)})`

            headerBgRef.current.style.left = `${currentLeft.toFixed(1)}px`
            headerBgRef.current.style.top = `${currentTop.toFixed(1)}px`
            headerBgRef.current.style.width = `${currentWidth.toFixed(1)}px`
            headerBgRef.current.style.height = `${currentHeight.toFixed(1)}px`
            headerBgRef.current.style.borderRadius = `${currentRadius.toFixed(1)}px`
          }
        }

        // 1. VOID Wordmark transform (fades away on mobile; scales & translates to top-left header on desktop)
        if (wordmarkRef.current) {
          if (isMobileNow) {
            // On mobile: Full VOID wordmark stays centered in hero and fades away smoothly as search bar moves to top
            const op = prefersReduced()
              ? (rawT >= 0.2 ? 0 : 1)
              : Math.max(0, 1 - rawT / 0.35)
            const ty = -24 * (1 - op)
            wordmarkRef.current.style.transform = `translate3d(0, ${(m.heroWordmarkY + ty).toFixed(2)}px, 0) scale(${(1 - 0.04 * (1 - op)).toFixed(3)})`
            wordmarkRef.current.style.opacity = op.toFixed(3)
            wordmarkRef.current.style.visibility = op <= 0.001 ? 'hidden' : 'visible'
            wordmarkRef.current.style.pointerEvents = op <= 0.2 ? 'none' : 'auto'
          } else {
            // Desktop: full wordmark translates and scales to top-left of header capsule
            const dx = m.dxAt1 * t
            const dy = m.heroWordmarkY + (m.dyAt1 - m.heroWordmarkY) * t
            const scale = 1.0 + (m.markScaleRatio - 1.0) * t
            wordmarkRef.current.style.transform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`
            wordmarkRef.current.style.opacity = '1'
            wordmarkRef.current.style.visibility = 'visible'
            wordmarkRef.current.style.pointerEvents = 'auto'
          }
        }

        // 2. Tagline (fades out and shifts gently upward)
        if (taglineRef.current) {
          const op = Math.max(0, 1 - rawT / 0.22)
          const ty = -14 * (1 - op)
          taglineRef.current.style.opacity = op.toFixed(3)
          taglineRef.current.style.transform = `translate3d(0, ${(m.heroTaglineY + ty).toFixed(2)}px, 0)`
          taglineRef.current.style.visibility = op <= 0.001 ? 'hidden' : 'visible'
        }

        // 3. SearchBar (hero center -> fixed top bar, perfectly centered)
        if (searchRef.current) {
          const dy = m.heroSearchY + (m.targetSearchY - m.heroSearchY) * t
          const scale = 1.0 + (m.targetSearchScale - 1.0) * t
          searchRef.current.style.transform = `translate3d(0, ${dy.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`
        }

        // 4. Scroll indicator (fades out quickly)
        if (scrollIndicatorRef.current) {
          const op = Math.max(0, 1 - rawT / 0.12)
          scrollIndicatorRef.current.style.opacity = op.toFixed(3)
          scrollIndicatorRef.current.style.visibility = op <= 0.001 ? 'hidden' : 'visible'
        }
      } catch (err) {
        console.error('ScrollHero tick error:', err)
      }

      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  function handleSubmit(q: string) {
    onSearch(q)
    const transitionDistance = typeof window !== 'undefined' ? window.innerHeight : 800
    if (typeof window !== 'undefined' && window.scrollY < transitionDistance) {
      window.scrollTo({ top: transitionDistance, behavior: 'smooth' })
    }
  }

  function handleHomeClick() {
    onHome()
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function handleScrollDown() {
    const transitionDistance = typeof window !== 'undefined' ? window.innerHeight : 800
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: transitionDistance, behavior: 'smooth' })
    }
  }

  const initialMetrics = calculateMetrics()

  return (
    <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      {/* Frosted Glass Header Bar: morphs directly from central sphere to top rounded capsule */}
      <div
        ref={headerBgRef}
        aria-hidden
        className="pointer-events-none fixed z-20"
        style={{
          opacity: 0,
          visibility: 'hidden',
          background:
            'linear-gradient(to bottom, rgba(247, 249, 250, 0.86) 0%, rgba(238, 242, 243, 0.80) 75%, rgba(238, 242, 243, 0.74) 100%)',
          backdropFilter: 'blur(40px) saturate(160%)',
          WebkitBackdropFilter: 'blur(40px) saturate(160%)',
          border: '1px solid rgba(216, 222, 224, 0.85)',
          boxShadow: '0 10px 30px -8px rgba(37, 54, 60, 0.10)',
        }}
      />

      {/* Top navigation row */}
      <header className="relative z-40 flex items-center justify-between px-4 py-3 sm:px-10 sm:py-3.5 lg:px-14">
        {/* Spacer matching compact Wordmark width in header on desktop */}
        <div className="hidden sm:block h-[26px] w-[95px]" aria-hidden />

        <nav className="pointer-events-auto flex items-center">
          <button
            aria-label="Settings"
            title="Settings"
            className="hidden sm:flex group size-9 sm:size-10 items-center justify-center rounded-full bg-void-glass text-void-ink backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-void-green/45 hover:bg-white cursor-pointer"
            style={{
              border: '1px solid rgba(214,222,224,0.95)',
              boxShadow: '0 8px 22px -16px rgba(37,54,60,0.4)',
            }}
          >
            <GearIcon className="size-4 sm:size-[18px] text-void-muted transition-all duration-300 group-hover:rotate-45 group-hover:text-void-green" />
          </button>
        </nav>
      </header>

      {/* Hero Wordmark (SINGLE element that translates & scales to header logo / docks into search bar on mobile) */}
      <div className="absolute left-1/2 top-0 z-40 -translate-x-1/2 -translate-y-1/2">
        <div
          ref={wordmarkRef}
          style={{
            transformOrigin: 'center center',
            transform: `translate3d(0, ${initialMetrics.heroWordmarkY}px, 0) scale(1)`,
          }}
          className="relative inline-flex items-center justify-center"
        >
          <button
            onClick={handleHomeClick}
            aria-label="VOID home"
            className="pointer-events-auto select-none cursor-pointer transition-opacity hover:opacity-80 active:opacity-60"
          >
            <Wordmark
              size={markSize}
              pulse={pulse}
              vRef={vRef}
              oRef={oRef}
              idRef={idRef}
            />
          </button>
        </div>
      </div>

      {/* Hero Tagline */}
      <div className="absolute left-1/2 top-0 z-30 -translate-x-1/2">
        <div
          ref={taglineRef}
          style={{
            transformOrigin: 'center top',
            transform: `translate3d(0, ${initialMetrics.heroTaglineY}px, 0)`,
          }}
        >
          <p className="void-label whitespace-nowrap text-center text-[12px] text-void-muted/90 select-none sm:text-sm">
            A Quieter Way to Search
          </p>
        </div>
      </div>

      {/* SearchBar Container — horizontally centered at left-1/2, perfectly aligned */}
      <div className="absolute left-1/2 top-0 z-30 w-full max-w-xl sm:max-w-2xl -translate-x-1/2 px-4 sm:px-6">
        <div
          ref={searchRef}
          style={{
            transformOrigin: 'center top',
            transform: `translate3d(0, ${initialMetrics.heroSearchY}px, 0) scale(1)`,
          }}
        >
          <div className="pointer-events-auto">
            <SearchBar
              value={value}
              onChange={setValue}
              onSubmit={handleSubmit}
              compact={compact}
              showMobileLogo={isMobile && compact}
              onHome={handleHomeClick}
            />
          </div>
        </div>
      </div>

      {/* Scroll indicator (bouncing chevron) */}
      <div
        ref={scrollIndicatorRef}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 sm:bottom-4"
      >
        <button
          onClick={handleScrollDown}
          className="pointer-events-auto flex flex-col items-center gap-1 text-void-muted transition-colors hover:text-void-ink cursor-pointer sm:gap-1.5"
          aria-label="Scroll to explore"
        >
          <ChevronDown className="size-4 animate-bounce" style={{ animationDuration: '2.4s' }} />
          <span className="void-label text-[10px]">Scroll to Explore</span>
        </button>
      </div>
    </div>
  )
}
