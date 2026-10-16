import { useState, useEffect, useCallback } from 'react'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { Wordmark } from './components/Wordmark'
import { SearchBar } from './components/SearchBar'
import { ModePills } from './components/ModePills'
import { Results } from './components/Results'

export default function App() {
  const [query, setQuery] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('q') || ''
    }
    return ''
  })
  const [submittedQuery, setSubmittedQuery] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('q') || ''
    }
    return ''
  })
  const [mode, setMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('mode') || 'all'
    }
    return 'all'
  })
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('void_theme')
      if (saved === 'dark' || saved === 'light') return saved
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
    }
    return 'light'
  })

  // Listen to browser Back / Forward buttons (popstate)
  useEffect(() => {
    function handlePopState() {
      const params = new URLSearchParams(window.location.search)
      const q = params.get('q') || ''
      const m = params.get('mode') || 'all'
      setQuery(q)
      setSubmittedQuery(q)
      setMode(m)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Sync theme with html root class and persist to localStorage
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    try {
      localStorage.setItem('void_theme', theme)
    } catch {}
  }, [theme])

  function toggleTheme() {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  // Update URL search parameters shareably
  const updateUrl = useCallback((q: string, m: string) => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    if (q.trim()) {
      url.searchParams.set('q', q.trim())
      if (m && m !== 'all') {
        url.searchParams.set('mode', m)
      } else {
        url.searchParams.delete('mode')
      }
    } else {
      url.searchParams.delete('q')
      url.searchParams.delete('mode')
    }
    window.history.pushState(null, '', url.toString())
  }, [])

  function handleSearch(q: string, newMode = mode) {
    const clean = q.trim()
    setQuery(clean)
    setSubmittedQuery(clean)
    updateUrl(clean, newMode)
    if (clean) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function handleModeChange(newMode: string) {
    setMode(newMode)
    if (submittedQuery.trim()) {
      updateUrl(submittedQuery, newMode)
    }
  }

  function goHome() {
    setQuery('')
    setSubmittedQuery('')
    setMode('all')
    updateUrl('', 'all')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const isSearchActive = Boolean(submittedQuery.trim())

  return (
    <div className={`min-h-screen flex flex-col justify-between bg-white dark:bg-[#0b0f17] text-slate-800 dark:text-slate-100 transition-colors duration-200 ${theme}`}>
      {/* Top Navigation Header */}
      <Header
        activeMode={mode === 'all' ? 'web' : mode}
        onSelectMode={(newMode) => {
          const targetMode = newMode === 'web' ? 'all' : newMode
          handleModeChange(targetMode)
        }}
        onHome={goHome}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content Area */}
      <main className={`flex-1 flex flex-col px-4 sm:px-6 ${isSearchActive ? 'justify-start' : 'justify-center'}`}>
        {!isSearchActive ? (
          /* Clean Minimalist Homepage matching Minimalist VOID Search Homepage.png */
          <div className="w-full max-w-2xl mx-auto flex flex-col items-center text-center py-12 sm:py-20 animate-in fade-in duration-300">
            {/* Minimalist VOID Wordmark */}
            <div className="mb-2 cursor-pointer hover:opacity-95 transition-opacity" onClick={goHome}>
              <Wordmark size={68} />
            </div>

            {/* Tagline */}
            <p className="text-[12px] sm:text-[13px] font-sans uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500 font-medium mb-8 sm:mb-9">
              A QUIETER WAY TO SEARCH
            </p>

            {/* Centered Search Bar */}
            <div className="w-full mb-6">
              <SearchBar
                value={query}
                onChange={setQuery}
                onSubmit={(q) => handleSearch(q, mode)}
                autoFocus
                placeholder="Search anything..."
              />
            </div>

            {/* Category / Mode Pills */}
            <div className="w-full flex justify-center">
              <ModePills
                active={mode}
                onChange={handleModeChange}
              />
            </div>
          </div>
        ) : (
          /* Search Results View matching uploaded screenshot */
          <div className="w-full max-w-5xl mx-auto pt-2 sm:pt-4 pb-12 animate-in fade-in duration-200">
            {/* Top Search Bar & Mode Pills */}
            <div className="mb-5 space-y-3.5">
              <div className="w-full max-w-2xl">
                <SearchBar
                  value={query}
                  onChange={setQuery}
                  onSubmit={(q) => handleSearch(q, mode)}
                  compact
                  placeholder="Search anything..."
                />
              </div>

              {/* Mode Pills row */}
              <div className="flex justify-start overflow-x-auto py-0.5">
                <ModePills
                  active={mode}
                  onChange={handleModeChange}
                  compact
                />
              </div>
            </div>

            {/* Search Results */}
            <Results
              query={submittedQuery}
              mode={mode}
              onSearch={(q) => handleSearch(q, mode)}
            />
          </div>
        )}
      </main>

      {/* Minimalist Footer */}
      <Footer />
    </div>
  )
}
