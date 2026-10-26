import {
  useState,
  useEffect,
  useCallback,
  Component,
  type ReactNode,
} from "react"
import { Header } from "./components/Header"
import { Footer } from "./components/Footer"
import { Wordmark } from "./components/Wordmark"
import { SearchBar } from "./components/SearchBar"
import { ModePills } from "./components/ModePills"
import { Results } from "./components/Results"

class ResultsErrorBoundary extends Component<{
  children: ReactNode
  onReset: () => void
}, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error: any) {
    console.error("Results render error caught by boundary:", error)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="py-16 text-center">
          <p className="text-base text-slate-700 dark:text-zinc-300">
            Something went wrong while displaying search results.
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false })
              this.props.onReset()
            }}
            className="mt-4 px-4 py-2 text-xs font-medium rounded-full border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:border-zinc-400 hover:text-zinc-100 transition-all cursor-pointer"
          >
            Try search again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  const [query, setQuery] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("q") || ""
    }
    return ""
  })
  const [submittedQuery, setSubmittedQuery] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("q") || ""
    }
    return ""
  })
  const [mode, setMode] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("mode") || "all"
    }
    return "all"
  })
  const [pathname, setPathname] = useState(() => {
    if (typeof window !== "undefined") {
      return window.location.pathname
    }
    return "/"
  })
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("void_theme")
      if (saved === "dark" || saved === "light") return saved
      if (
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      )
        return "dark"
    }
    return "light"
  })

  // Listen to browser Back / Forward buttons (popstate)
  useEffect(() => {
    function handlePopState() {
      const params = new URLSearchParams(window.location.search)
      const q = params.get("q") || ""
      const m = params.get("mode") || "all"
      setQuery(q)
      setSubmittedQuery(q)
      setMode(m)
      setPathname(window.location.pathname)
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  // Sync theme with html root class and persist to localStorage
  useEffect(() => {
    const root = document.documentElement
    if (theme === "dark") {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
    try {
      localStorage.setItem("void_theme", theme)
    } catch {}
  }, [theme])

  function toggleTheme() {
    setTheme((prev) => (prev === "light" ? "dark" : "light"))
  }

  // Update URL search parameters shareably
  const updateUrl = useCallback((q: string, m: string) => {
    if (typeof window === "undefined") return
    const url = new URL(window.location.href)
    if (q.trim()) {
      url.searchParams.set("q", q.trim())
      if (m && m !== "all") {
        url.searchParams.set("mode", m)
      } else {
        url.searchParams.delete("mode")
      }
    } else {
      url.searchParams.delete("q")
      url.searchParams.delete("mode")
    }
    window.history.pushState(null, "", url.toString())
  }, [])

  function handleSearch(q: string, newMode = mode) {
    const clean = q.trim()
    setQuery(clean)
    setSubmittedQuery(clean)
    updateUrl(clean, newMode)
    if (clean) {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  function handleModeChange(newMode: string) {
    setMode(newMode)
    if (submittedQuery.trim()) {
      updateUrl(submittedQuery, newMode)
    }
  }

  function goHome() {
    setQuery("")
    setSubmittedQuery("")
    setMode("all")
    updateUrl("", "all")
    if (typeof window !== "undefined" && window.location.pathname !== "/") {
      window.history.pushState(null, "", "/")
      setPathname("/")
    }
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const isSearchActive = Boolean(submittedQuery.trim())

  return (
    <div
      className={`min-h-screen flex flex-col justify-between bg-white dark:bg-[#0c0d0e] text-slate-800 dark:text-zinc-100 transition-colors duration-200 ${theme}`}
    >
      {/* Top Navigation Header */}
      <Header
        activeMode={mode === "all" ? "web" : mode}
        onSelectMode={(newMode) => {
          const targetMode = newMode === "web" ? "all" : newMode
          handleModeChange(targetMode)
        }}
        onHome={goHome}
        theme={theme}
        onToggleTheme={toggleTheme}
        showLogo={isSearchActive || pathname !== "/"}
      />

      {/* Main Content Area */}
      <main
        className={`flex-1 flex flex-col px-4 sm:px-6 ${
          isSearchActive && pathname === "/"
            ? "justify-start"
            : "justify-center"
        }`}
      >
        {pathname !== "/" ? (
          <div className="w-full max-w-md mx-auto text-center py-16 animate-in fade-in duration-300">
            <h2 className="text-xl font-medium text-slate-800 dark:text-zinc-100 mb-2">
              Page Not Found
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mb-6 font-sans">
              The requested page could not be found.
            </p>
            <button
              onClick={goHome}
              className="px-4 py-2 text-xs font-medium rounded-full bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 transition-opacity cursor-pointer font-sans"
            >
              Return to Search
            </button>
          </div>
        ) : !isSearchActive ? (
          /* Clean Minimalist Homepage matching Minimalist VOID Search Homepage.png */
          <div className="w-full max-w-2xl mx-auto flex flex-col items-center text-center py-12 sm:py-20 animate-in fade-in duration-300">
            {/* Minimalist VOID Wordmark as semantic H1 */}
            <h1
              className="mb-2 cursor-pointer hover:opacity-95 transition-opacity text-inherit font-normal inline-block m-0 p-0"
              onClick={goHome}
            >
              <Wordmark size={68} />
            </h1>

            {/* Tagline */}
            <p className="text-[12px] sm:text-[13px] font-sans uppercase tracking-[0.28em] text-slate-400 dark:text-zinc-500 font-medium mb-8 sm:mb-9">
              A QUIETER WAY TO SEARCH
            </p>

            {/* Centered Search Bar */}
            <div className="w-full mb-6">
              <SearchBar
                value={query}
                onChange={setQuery}
                onSubmit={(q) => handleSearch(q, mode)}
                autoFocus
                placeholder="Ask anything privately"
              />
            </div>

            {/* Category / Mode Pills */}
            <div className="w-full flex justify-center">
              <ModePills active={mode} onChange={handleModeChange} />
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
                  placeholder="Ask anything privately"
                />
              </div>

              {/* Mode Pills row */}
              <div className="flex justify-start overflow-x-auto py-0.5">
                <ModePills active={mode} onChange={handleModeChange} compact />
              </div>
            </div>

            {/* Search Results with Error Boundary */}
            <ResultsErrorBoundary
              key={submittedQuery}
              onReset={() => handleSearch(submittedQuery, mode)}
            >
              <Results
                query={submittedQuery}
                mode={mode}
                onSearch={(q) => handleSearch(q, mode)}
              />
            </ResultsErrorBoundary>
          </div>
        )}
      </main>

      {/* Minimalist Footer */}
      <Footer />
    </div>
  )
}
