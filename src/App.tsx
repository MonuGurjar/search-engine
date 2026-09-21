import { useState } from 'react'
import { Footer } from './components/Footer'
import { Results } from './components/Results'
import { Scene } from './components/Scene'
import { ScrollHero } from './components/ScrollHero'

export default function App() {
  const [mode, setMode] = useState('web')
  const [query, setQuery] = useState('')

  const hasQuery = Boolean(query.trim())

  function runSearch(q: string) {
    setQuery(q)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function goHome() {
    setQuery('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Background scene with parallax & co-animating middle sphere */}
      <Scene hasQuery={hasQuery} />

      {/* Single scroll-driven hero & header overlay */}
      <ScrollHero
        query={query}
        hasQuery={hasQuery}
        mode={mode}
        onMode={setMode}
        onSearch={runSearch}
        onHome={goHome}
      />

      {/* Main document flow */}
      <main className="relative z-10 flex-1">
        {/* Scroll transition spacer ONLY on homepage when no search active */}
        {!hasQuery && (
          <div
            className="pointer-events-none w-full"
            style={{ height: 'calc(100vh * 0.88)' }}
            aria-hidden
          />
        )}

        {/* Results area: starts immediately below the compact header with a small ~24–36px gap */}
        <div className="pt-[172px] sm:pt-[176px]">
          <Results query={query} mode={mode} onSearch={runSearch} />
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
