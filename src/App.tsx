import { useState } from 'react'
import { Footer } from './components/Footer'
import { ModePills } from './components/ModePills'
import { Results } from './components/Results'
import { Scene } from './components/Scene'
import { ScrollHero } from './components/ScrollHero'

export default function App() {
  const [mode, setMode] = useState('web')
  const [query, setQuery] = useState('')

  function runSearch(q: string) {
    setQuery(q)
    const transitionDistance = window.innerHeight
    if (window.scrollY < transitionDistance) {
      window.scrollTo({ top: transitionDistance, behavior: 'smooth' })
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
        {/* Full-screen scroll transition spacer */}
        <div
          className="pointer-events-none w-full h-screen"
          aria-hidden
        />

        {/* Results / Exploration area with ModePills scrolling with page */}
        <div className="pt-[106px] sm:pt-[82px]">
          {/* Mode pills row that scrolls with the page like in Google Search */}
          <div className="mx-auto w-full max-w-5xl px-6 sm:px-10 pb-2 sm:pb-3 flex justify-center">
            <ModePills active={mode} onChange={setMode} compact={true} />
          </div>

          <Results query={query} mode={mode} onSearch={runSearch} />
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
