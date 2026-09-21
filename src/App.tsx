import { useState } from 'react'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { Home } from './components/Home'
import { Results } from './components/Results'
import { Scene } from './components/Scene'

type View = 'home' | 'results'

export default function App() {
  const [view, setView] = useState<View>('home')
  const [mode, setMode] = useState('web')
  const [query, setQuery] = useState('')

  function runSearch(q: string) {
    setQuery(q)
    setView('results')
    window.scrollTo({ top: 0 })
  }

  function goHome() {
    setView('home')
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <Scene />
      <Header onHome={goHome} />

      <main className="flex-1">
        {view === 'home' ? (
          <Home mode={mode} onMode={setMode} onSearch={runSearch} />
        ) : (
          <Results
            query={query}
            mode={mode}
            onMode={setMode}
            onSearch={runSearch}
            onHome={goHome}
          />
        )}
      </main>

      <Footer />
    </div>
  )
}
