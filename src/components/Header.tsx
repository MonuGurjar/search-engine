import { useState, useRef, useEffect } from 'react'
import { Wordmark } from './Wordmark'
import { WaffleGridIcon, SunIcon, MoonIcon, ChevronDown } from './icons'

type Props = {
  activeMode: string
  onSelectMode: (modeId: string) => void
  onHome: () => void
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

export function Header({
  activeMode,
  onSelectMode,
  onHome,
  theme,
  onToggleTheme,
}: Props) {
  const [waffleOpen, setWaffleOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const waffleRef = useRef<HTMLDivElement>(null)
  const moreRef = useRef<HTMLDivElement>(null)

  // Close menus on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (waffleRef.current && !waffleRef.current.contains(e.target as Node)) {
        setWaffleOpen(false)
      }
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const navTabs = [
    { id: 'web', label: 'Search' },
    { id: 'images', label: 'Images' },
    { id: 'videos', label: 'Videos' },
    { id: 'news', label: 'News' },
    { id: 'maps', label: 'Maps' },
  ]

  const moreTabs = [
    { id: 'academic', label: 'Academic & Papers' },
    { id: 'code', label: 'Code & Repositories' },
  ]

  const isMoreActive = moreTabs.some((t) => t.id === activeMode)

  return (
    <header className="w-full px-4 sm:px-8 py-3.5 flex items-center justify-between select-none relative z-50">
      {/* Left: Minimalist VOID Logo */}
      <div className="flex items-center">
        <button
          onClick={onHome}
          className="cursor-pointer group flex items-center transition-opacity hover:opacity-85 focus:outline-none"
          aria-label="VOID Home"
        >
          <Wordmark size={24} />
        </button>
      </div>

      {/* Center: Minimalist Nav Tabs */}
      <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-sans font-medium">
        {navTabs.map((tab) => {
          const isActive = activeMode === tab.id || (activeMode === 'all' && tab.id === 'web')
          return (
            <button
              key={tab.id}
              onClick={() => onSelectMode(tab.id)}
              className={`relative py-1 cursor-pointer transition-colors ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-[-4px] left-0 right-0 h-[2.5px] bg-blue-600 dark:bg-blue-400 rounded-full animate-in fade-in duration-150" />
              )}
            </button>
          )
        })}

        {/* More dropdown */}
        <div ref={moreRef} className="relative">
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={`flex items-center gap-1 py-1 cursor-pointer transition-colors ${
              isMoreActive
                ? 'text-blue-600 dark:text-blue-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <span>More</span>
            <ChevronDown className={`size-3.5 transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
            {isMoreActive && (
              <span className="absolute bottom-[-4px] left-0 right-0 h-[2.5px] bg-blue-600 dark:bg-blue-400 rounded-full" />
            )}
          </button>

          {moreOpen && (
            <div className="absolute top-full left-0 mt-2 w-48 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              {moreTabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    onSelectMode(t.id)
                    setMoreOpen(false)
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs font-sans transition-colors cursor-pointer ${
                    activeMode === t.id
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Right: Apps Grid and Theme Toggle */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* 9-dot Waffle Launcher */}
        <div ref={waffleRef} className="relative">
          <button
            onClick={() => setWaffleOpen(!waffleOpen)}
            className="size-9 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
            title="VOID Apps & Tools"
            aria-label="Apps launcher"
          >
            <WaffleGridIcon className="size-5" />
          </button>

          {waffleOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400 block px-2 pb-2">
                VOID Ecosystem
              </span>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href="https://crawler-delta-one.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-center transition-all group"
                >
                  <div className="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 grid place-items-center mb-1 group-hover:scale-105 transition-transform">
                    <span className="font-mono text-xs font-bold">C</span>
                  </div>
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200">Crawler</span>
                  <span className="text-[10px] text-slate-400">Web Ingest</span>
                </a>

                <button
                  onClick={() => {
                    onHome()
                    setWaffleOpen(false)
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-center transition-all group cursor-pointer"
                >
                  <div className="size-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-500 grid place-items-center mb-1 group-hover:scale-105 transition-transform">
                    <span className="font-mono text-xs font-bold">S</span>
                  </div>
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200">Search</span>
                  <span className="text-[10px] text-slate-400">Cloud Index</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-slate-200 dark:bg-slate-800" aria-hidden />

        {/* Theme Toggle (Sun / Moon) */}
        <button
          onClick={onToggleTheme}
          className="size-9 rounded-full flex items-center justify-center bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-slate-600 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-xs"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <MoonIcon className="size-4.5 text-blue-400" />
          ) : (
            <SunIcon className="size-4.5 text-slate-600" />
          )}
        </button>
      </div>
    </header>
  )
}
