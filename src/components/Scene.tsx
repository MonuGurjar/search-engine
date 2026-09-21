import { useEffect, useMemo, useRef } from 'react'
import bgWebp from '../assets/bg.webp'
import bgPng from '../assets/bg.png'
import mobileBgWebp from '../assets/mobile-bg.webp'
import mobileBgPng from '../assets/mobile-bg.png'
import sphereWebp from '../assets/middle-sphere.webp'
import spherePng from '../assets/middle-sphere.png'

const prefersReduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

function smoothstep(min: number, max: number, value: number) {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)))
  return x * x * (3 - 2 * x)
}

type Props = {
  hasQuery?: boolean
}

/**
 * Layered, living VOID environment.
 * The responsive artwork serves as the base plate;
 * floating middle sphere, mint halo, drifting clouds, floating particles, light rays
 * and reflection shimmer sit on top. Mouse + scroll drive restrained parallax via smoothed
 * CSS custom properties (--mx / --my / --sy) so every layer stays on the GPU.
 */
export function Scene({ hasQuery = false }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const sphereRef = useRef<HTMLDivElement>(null)
  const haloRef = useRef<HTMLDivElement>(null)

  // Particle field — density scales down on small / touch screens
  const particles = useMemo(() => {
    const wide = typeof window !== 'undefined' && window.innerWidth > 900
    const count = prefersReduced() ? 0 : wide ? 46 : 20
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 82,
      size: 1 + Math.random() * 2.4,
      op: 0.18 + Math.random() * 0.4,
      dur: 7 + Math.random() * 9,
      delay: -Math.random() * 12,
    }))
  }, [])

  useEffect(() => {
    const el = root.current
    if (!el) return

    let tx = 0, ty = 0, cx = 0, cy = 0
    let sy = 0, csy = 0
    let raf = 0

    const onMove = (e: PointerEvent) => {
      tx = e.clientX / window.innerWidth - 0.5
      ty = e.clientY / window.innerHeight - 0.5
    }
    const onScroll = () => {
      sy = window.scrollY
    }

    const tick = () => {
      const isReduced = prefersReduced()
      if (!isReduced) {
        cx += (tx - cx) * 0.06
        cy += (ty - cy) * 0.06
        csy += (sy - csy) * 0.1
      } else {
        cx = 0
        cy = 0
        csy = sy
      }

      el.style.setProperty('--mx', cx.toFixed(4))
      el.style.setProperty('--my', cy.toFixed(4))
      el.style.setProperty('--sy', csy.toFixed(2))

      // Scroll-driven sphere co-animation
      const w = window.innerWidth
      const h = window.innerHeight
      const isMobile = w <= 640
      const isLg = w >= 1024

      const transitionDistance = h * (isMobile ? 0.75 : 0.88)
      const rawT = hasQuery ? 1 : Math.min(1, Math.max(0, sy / transitionDistance))
      const t = isReduced ? (rawT >= 0.5 ? 1 : 0) : smoothstep(0, 1, rawT)

      // Initial hero sphere center geometry
      const sphereD = Math.min(520, Math.max(260, w * 0.46))
      const sphereTopRatio = isMobile ? 0.06 : w <= 768 ? 0.07 : 0.08
      const sphereHeroCenterY = h * sphereTopRatio + sphereD / 2

      // Target position behind top-left VOID Wordmark in header
      const targetLeft = isMobile ? 20 : isLg ? 56 : 40
      const targetTop = isMobile ? 20 : 24
      const targetCenterX = targetLeft + 46
      const targetCenterY = targetTop + 13

      // Target scale & opacity
      const targetScale = 0.15
      const targetOpacity = 0.12

      const dx = (targetCenterX - w / 2) * t
      const dy = (targetCenterY - sphereHeroCenterY) * t
      const scale = 1.0 + (targetScale - 1.0) * t
      const op = 1.0 + (targetOpacity - 1.0) * t

      // Restrained parallax fades out as sphere compacts
      const parallaxFactor = 1 - t
      const px = cx * -5 * parallaxFactor
      const py = (cy * -5 - csy * 0.14) * parallaxFactor

      if (sphereRef.current) {
        sphereRef.current.style.transform = `translate3d(calc(-50% + ${(dx + px).toFixed(2)}px), ${(dy + py).toFixed(2)}px, 0) scale(${scale.toFixed(4)})`
        sphereRef.current.style.opacity = op.toFixed(3)
      }

      if (haloRef.current) {
        const haloOp = Math.max(0.2, 1 - 0.75 * t)
        haloRef.current.style.opacity = haloOp.toFixed(3)
      }

      raf = requestAnimationFrame(tick)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('scroll', onScroll)
    }
  }, [hasQuery])

  return (
    <div
      ref={root}
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#e9f0f3]"
      style={{ ['--mx' as string]: 0, ['--my' as string]: 0, ['--sy' as string]: 0 }}
    >
      {/* base landscape plate — responsive desktop vs mobile */}
      <div
        className="absolute inset-[-4%]"
        style={{
          transform:
            'translate3d(calc(var(--mx) * -14px), calc((var(--my) * -14px) - (var(--sy) * 0.08px)), 0) scale(1.06)',
        }}
      >
        <picture className="h-full w-full">
          <source media="(max-width: 640px)" srcSet={mobileBgWebp} type="image/webp" />
          <source media="(max-width: 640px)" srcSet={mobileBgPng} type="image/png" />
          <source srcSet={bgWebp} type="image/webp" />
          <img
            src={bgPng}
            alt=""
            aria-hidden
            fetchPriority="high"
            className="h-full w-full object-cover object-center"
          />
        </picture>
      </div>

      {/* light rays fanning down from the upper atmosphere */}
      <div
        className="absolute left-1/2 top-0 h-[70%] w-[120%] -translate-x-1/2 opacity-60 mix-blend-screen"
        style={{
          transform:
            'translate3d(calc(-50% + var(--mx) * -6px), calc(var(--my) * -6px), 0)',
          background:
            'conic-gradient(from 180deg at 50% 8%, transparent 0deg, rgba(255,255,255,0.5) 12deg, transparent 26deg, transparent 150deg, rgba(255,255,255,0.4) 168deg, transparent 200deg, transparent 320deg, rgba(255,255,255,0.45) 340deg, transparent 356deg)',
          WebkitMaskImage: 'linear-gradient(180deg, #000 0%, transparent 78%)',
          maskImage: 'linear-gradient(180deg, #000 0%, transparent 78%)',
        }}
      />

      {/* floating middle sphere / planet with atmospheric halo */}
      <div
        ref={sphereRef}
        className="absolute left-1/2 top-[6%] sm:top-[7%] md:top-[8%]"
        style={{
          transformOrigin: 'center center',
          transform:
            'translate3d(calc(-50% + var(--mx) * -5px), calc(var(--my) * -5px - var(--sy) * 0.14px), 0)',
        }}
      >
        {/* mint coronal halo aura */}
        <div
          ref={haloRef}
          className="absolute -inset-[12%] rounded-full mix-blend-screen pointer-events-none transition-opacity duration-200"
          style={{
            animation: 'void-halo-pulse 9s ease-in-out infinite',
            background:
              'radial-gradient(circle at 50% 50%, rgba(120,196,150,0.38) 0%, rgba(120,196,150,0.12) 40%, transparent 68%)',
            filter: 'blur(16px)',
          }}
        />

        {/* high-resolution sphere cutout with gentle float */}
        <picture>
          <source srcSet={sphereWebp} type="image/webp" />
          <img
            src={spherePng}
            alt=""
            aria-hidden
            fetchPriority="high"
            className="h-[46vw] max-h-[520px] min-h-[260px] w-[46vw] max-w-[520px] min-w-[260px] object-contain drop-shadow-[0_10px_35px_rgba(120,196,150,0.22)] select-none pointer-events-none"
            style={{
              animation: 'void-halo-pulse 11s ease-in-out infinite',
            }}
          />
        </picture>
      </div>

      {/* slow drifting clouds */}
      <div
        className="absolute inset-x-[-10%] top-0 h-[55%] opacity-70"
        style={{
          transform: 'translate3d(calc(var(--mx) * -10px), calc(var(--my) * -10px), 0)',
        }}
      >
        <div
          className="h-full w-full"
          style={{
            animation: 'void-drift 46s ease-in-out infinite alternate',
            background:
              'radial-gradient(60% 40% at 18% 30%, rgba(255,255,255,0.55), transparent 70%), radial-gradient(50% 35% at 82% 24%, rgba(255,255,255,0.5), transparent 70%), radial-gradient(40% 30% at 60% 50%, rgba(255,255,255,0.4), transparent 70%)',
            filter: 'blur(6px)',
          }}
        />
      </div>

      {/* floating atmospheric particles */}
      <div
        className="absolute inset-0"
        style={{ transform: 'translate3d(calc(var(--mx) * -22px), calc(var(--my) * -22px), 0)' }}
      >
        {particles.map((p) => (
          <span
            key={p.id}
            className="absolute rounded-full bg-white"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: p.size,
              height: p.size,
              ['--p-op' as string]: p.op,
              opacity: p.op,
              boxShadow: '0 0 6px rgba(255,255,255,0.8)',
              animation: `void-float ${p.dur}s ease-in-out ${p.delay}s infinite`,
            }}
          />
        ))}
      </div>

      {/* reflection shimmer across the frozen surface */}
      <div
        className="absolute inset-x-0 bottom-0 h-[38%] opacity-50 mix-blend-screen"
        style={{
          backgroundImage:
            'linear-gradient(100deg, transparent 20%, rgba(255,255,255,0.55) 48%, transparent 76%)',
          backgroundSize: '200% 100%',
          animation: 'void-shimmer 14s linear infinite',
          WebkitMaskImage: 'linear-gradient(180deg, transparent, #000 60%)',
          maskImage: 'linear-gradient(180deg, transparent, #000 60%)',
        }}
      />

      {/* readability wash */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(240,245,247,0.35) 0%, rgba(240,245,247,0) 26%, rgba(240,245,247,0) 68%, rgba(238,243,245,0.5) 100%)',
        }}
      />
    </div>
  )
}
