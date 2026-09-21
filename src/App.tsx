import { useState } from 'react'
import { Footer } from './components/Footer'
import { Results } from './components/Results'
import { Scene } from './components/Scene'
import { ScrollHero } from './components/ScrollHero'

export default function App() {
  const [mode, setMode] = useState('web')
  const [query, setQuery] = useState('')

  function runSearch(q: string) {
    setQuery(q)
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 640
    const transitionDistance = window.innerHeight * (isMobile ? 0.75 : 0.88)
    if (window.scrollY < transitionDistance) {
      window.scrollTo({ top: transitionDistance + 10, behavior: 'smooth' })
    }
  }

  function goHome() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Background scene with parallax & co-animating middle sphere */}
      <Scene />

      {/* Single scroll-driven hero & header overlay */}
      <ScrollHero
        query={query}
        mode={mode}
        onMode={setMode}
        onSearch={runSearch}
        onHome={goHome}
      />

      {/* Main scrollable document flow */}
      <main className="relative z-10 flex-1">
        {/* Scroll transition spacer */}
        <div
          className="pointer-events-none w-full"
          style={{ height: 'calc(100vh * 0.88)' }}
          aria-hidden
        />

        {/* Results / Exploration area with top padding clearing the compact header */}
        <div className="pt-[180px] sm:pt-[190px]">
          <Results query={query} mode={mode} onSearch={runSearch} />
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
