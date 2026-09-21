import { useEffect, useRef, useState } from 'react'
import { ChevronDown, GearIcon } from './icons'
import { ModePills } from './ModePills'
import { SearchBar } from './SearchBar'
import { Wordmark } from './Wordmark'

type Props = {
  query: string
  mode: string
  onMode: (id: string) => void
  onSearch: (q: string) => void
  onHome: () => void
}

const LINKS = ['About', 'Privacy', 'Features']

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
      dyAt1: 38,
      heroTaglineY: 338,
      heroSearchY: 510,
      heroPillsY: 566,
      targetSearchY: 18,
      targetPillsY: 72,
      targetSearchScale: 0.9,
      targetPillsScale: 1.0,
    }
  }

  const w = window.innerWidth
  const h = window.innerHeight
  const isMobile = w <= 640
  const isLg = w >= 1024

  const transitionDistance = h * (isMobile ? 0.75 : 0.88)

  // Sphere geometry matching Scene.tsx (capped to 48% viewport height)
  const sphereD = Math.min(480, Math.max(230, Math.min(w * 0.44, h * 0.48)))
  const sphereTopRatio = isMobile ? 0.05 : w <= 768 ? 0.06 : 0.07
  const sphereTop = Math.round(h * sphereTopRatio)
  const sphereCenterY = Math.round(sphereTop + sphereD / 2)
  const sphereBottom = sphereTop + sphereD

  const heroMark = isMobile ? 68 : 104
  const targetMark = 26
  const markScaleRatio = targetMark / heroMark

  const targetLeft = isMobile ? 20 : isLg ? 56 : 40
  const targetMarkCenterX = targetLeft + 46
  const targetMarkCenterY = isMobile ? 28 : 38

  const heroCenterX = w / 2
  const heroWordmarkY = sphereCenterY
  const dxAt1 = targetMarkCenterX - heroCenterX
  const dyAt1 = targetMarkCenterY

  // Tagline sits directly under hero wordmark within the sphere core
  const heroTaglineY = heroWordmarkY + heroMark / 2 + (isMobile ? 12 : 16)

  // SearchBar is positioned downward just below the sphere bottom, keeping the sphere 100% visible
  const heroSearchY = sphereBottom + (isMobile ? 14 : 20)
  // Category pills sit comfortably below the thin search bar with 18px gap
  const heroPillsY = heroSearchY + 50 + (isMobile ? 14 : 18)

  // In final state (Panel 4): SearchBar aligns horizontally in the top bar row on desktop
  const targetSearchY = isMobile ? 56 : 18
  // Category pills placed comfortably below SearchBar (at 72px desktop / 106px mobile)
  const targetPillsY = isMobile ? 106 : 72
  const targetSearchScale = isMobile ? 0.92 : 0.9
  // Do NOT squish pills with CSS scale — keep natural 1.0 scale
  const targetPillsScale = 1.0

  return {
    transitionDistance,
    heroMark,
    markScaleRatio,
    heroWordmarkY,
    dxAt1,
    dyAt1,
    heroTaglineY,
    heroSearchY,
    heroPillsY,
    targetSearchY,
    targetPillsY,
    targetSearchScale,
    targetPillsScale,
  }
}

export function ScrollHero({ query, mode, onMode, onSearch, onHome }: Props) {
  const [value, setValue] = useState(query)
  const [pulse, setPulse] = useState(true)
  const [markSize, setMarkSize] = useState(104)
  const [compact, setCompact] = useState(false)

  const wordmarkRef = useRef<HTMLDivElement>(null)
  const taglineRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const pillsRef = useRef<HTMLDivElement>(null)
  const scrollIndicatorRef = useRef<HTMLDivElement>(null)

  // Keep local search input in sync with query prop
  useEffect(() => {
    setValue(query)
  }, [query])

  // Responsive mark size for hero
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const updateSize = () => setMarkSize(mq.matches ? 68 : 104)
    updateSize()
    mq.addEventListener('change', updateSize)
    return () => mq.removeEventListener('change', updateSize)
  }, [])

  // Continuous rAF animation loop driven by scroll
  useEffect(() => {
    let rafId = 0

    const tick = () => {
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

      // 1. VOID Wordmark transform (center hero -> top-left header)
      if (wordmarkRef.current) {
        const dx = m.dxAt1 * t
        const dy = m.heroWordmarkY + (m.dyAt1 - m.heroWordmarkY) * t
        const scale = 1.0 + (m.markScaleRatio - 1.0) * t
        wordmarkRef.current.style.transform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`
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

      // 4. ModePills (hero -> below compact search bar, perfectly centered, scale 1.0)
      if (pillsRef.current) {
        const dy = m.heroPillsY + (m.targetPillsY - m.heroPillsY) * t
        const scale = 1.0 + (m.targetPillsScale - 1.0) * t
        pillsRef.current.style.transform = `translate3d(0, ${dy.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`
      }

      // 5. Scroll indicator (fades out quickly)
      if (scrollIndicatorRef.current) {
        const op = Math.max(0, 1 - rawT / 0.12)
        scrollIndicatorRef.current.style.opacity = op.toFixed(3)
        scrollIndicatorRef.current.style.visibility = op <= 0.001 ? 'hidden' : 'visible'
      }

      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  function handleSubmit(q: string) {
    onSearch(q)
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 640
    const transitionDistance =
      typeof window !== 'undefined' ? window.innerHeight * (isMobile ? 0.75 : 0.88) : 800
    if (typeof window !== 'undefined' && window.scrollY < transitionDistance) {
      window.scrollTo({ top: transitionDistance + 10, behavior: 'smooth' })
    }
  }

  function handleHomeClick() {
    onHome()
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function handleScrollDown() {
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 640
    const transitionDistance =
      typeof window !== 'undefined' ? window.innerHeight * (isMobile ? 0.75 : 0.88) : 800
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: transitionDistance + 10, behavior: 'smooth' })
    }
  }

  const initialMetrics = calculateMetrics()

  return (
    <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      {/* Top navigation row (About, Privacy, Features, Settings) */}
      <header className="relative z-40 flex items-center justify-between px-5 py-4 sm:px-10 sm:py-5 lg:px-14">
        {/* Spacer matching compact Wordmark width in header */}
        <div className="h-[26px] w-[95px]" aria-hidden />

        <nav className="pointer-events-auto flex items-center gap-6 sm:gap-9">
          <div className="hidden items-center gap-7 sm:flex">
            {LINKS.map((l) => (
              <a
                key={l}
                href="#"
                className="text-sm text-void-muted transition-colors hover:text-void-ink"
              >
                {l}
              </a>
            ))}
          </div>
          <button
            className="group flex items-center gap-2 rounded-full bg-void-glass px-4 py-2 text-sm text-void-ink backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-void-green/45 hover:bg-white cursor-pointer"
            style={{
              border: '1px solid rgba(214,222,224,0.95)',
              boxShadow: '0 8px 22px -16px rgba(37,54,60,0.4)',
            }}
          >
            <GearIcon className="size-[18px] text-void-muted transition-all duration-300 group-hover:rotate-45 group-hover:text-void-green" />
            <span>Settings</span>
          </button>
        </nav>
      </header>

      {/* Hero Wordmark (SINGLE element that translates & scales to header logo) */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
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
            <Wordmark size={markSize} pulse={pulse} />
          </button>
        </div>
      </div>

      {/* Hero Tagline */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2">
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
      <div className="absolute left-1/2 top-0 w-full max-w-xl sm:max-w-2xl -translate-x-1/2 px-4 sm:px-6">
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
            />
          </div>
        </div>
      </div>

      {/* ModePills Container — horizontally centered directly below the search bar */}
      <div className="absolute left-1/2 top-0 w-full max-w-xl sm:max-w-2xl -translate-x-1/2 px-2 sm:px-4">
        <div
          ref={pillsRef}
          style={{
            transformOrigin: 'center top',
            transform: `translate3d(0, ${initialMetrics.heroPillsY}px, 0) scale(1)`,
          }}
        >
          <div className="pointer-events-auto flex justify-center">
            <ModePills active={mode} onChange={onMode} compact={compact} />
          </div>
        </div>
      </div>

      {/* Scroll indicator (bouncing chevron) */}
      <div
        ref={scrollIndicatorRef}
        className="absolute bottom-3 left-1/2 -translate-x-1/2 sm:bottom-4"
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
