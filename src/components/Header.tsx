import { useState, useRef, useEffect } from 'react'
import { Wordmark } from './Wordmark'
import { WaffleGridIcon, SunIcon, MoonIcon } from './icons'

type Props = {
  activeMode?: string
  onSelectMode?: (modeId: string) => void
  onHome: () => void
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

export function Header({
  onHome,
  theme,
  onToggleTheme,
}: Props) {
  const [waffleOpen, setWaffleOpen] = useState(false)
  const waffleRef = useRef<HTMLDivElement>(null)

  // Close menus on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (waffleRef.current && !waffleRef.current.contains(e.target as Node)) {
        setWaffleOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
            <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400 block px-2 pb-2">
                Apps & Ecosystem
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    onHome()
                    setWaffleOpen(false)
                  }}
                  className="flex flex-col items-center justify-center p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-center transition-all group cursor-pointer"
                >
                  <div className="size-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-500 grid place-items-center mb-1 group-hover:scale-105 transition-transform">
                    <span className="font-mono text-xs font-bold">V</span>
                  </div>
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200">VOID</span>
                  <span className="text-[10px] text-slate-400">Search</span>
                </button>

                <a
                  href="https://crawler-delta-one.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-center transition-all group"
                >
                  <div className="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 grid place-items-center mb-1 group-hover:scale-105 transition-transform">
                    <span className="font-mono text-xs font-bold">C</span>
                  </div>
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200">Crawler</span>
                  <span className="text-[10px] text-slate-400">Ingest</span>
                </a>

                <a
                  href="https://med-russia.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-center transition-all group"
                >
                  <div className="size-8 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 grid place-items-center mb-1 group-hover:scale-105 transition-transform">
                    <span className="font-mono text-xs font-bold">M</span>
                  </div>
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200">Med Russia</span>
                  <span className="text-[10px] text-slate-400">Medical</span>
                </a>

                <a
                  href="https://ai-placement-preparation.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-center transition-all group"
                >
                  <div className="size-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 grid place-items-center mb-1 group-hover:scale-105 transition-transform">
                    <span className="font-mono text-xs font-bold">AI</span>
                  </div>
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200">Placement AI</span>
                  <span className="text-[10px] text-slate-400">Prep</span>
                </a>

                <a
                  href="https://monugurjar.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-center transition-all group"
                >
                  <div className="size-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 grid place-items-center mb-1 group-hover:scale-105 transition-transform">
                    <span className="font-mono text-xs font-bold">P</span>
                  </div>
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200">Portfolio</span>
                  <span className="text-[10px] text-slate-400">Monu</span>
                </a>
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
