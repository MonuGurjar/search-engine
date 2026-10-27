import { useState, useRef, useEffect } from "react"
import { Wordmark } from "./Wordmark"
import {
  WaffleGridIcon,
  SunIcon,
  MoonIcon,
  GithubIcon,
} from "./icons"
import medRussiaIcon from "../assets/app-medrussia.webp"
import placementAiIcon from "../assets/app-placement-ai.webp"
import portfolioIcon from "../assets/app-portfolio.webp"

type Props = {
  activeMode?: string
  onSelectMode?: (modeId: string) => void
  onHome: () => void
  theme: "light" | "dark"
  onToggleTheme: () => void
  showLogo?: boolean
  onOpenLegal?: (tab: "privacy" | "terms" | "about") => void
}

export function Header({
  onHome,
  theme,
  onToggleTheme,
  showLogo = true,
  onOpenLegal,
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
    window.addEventListener("mousedown", handleClickOutside)
    return () => window.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <header className="w-full px-4 sm:px-8 py-3.5 flex items-center justify-between select-none relative z-50">
      {/* Left: Minimalist VOID Logo */}
      <div className="flex items-center min-h-[32px]">
        {showLogo && (
          <button
            onClick={onHome}
            className="cursor-pointer group flex items-center transition-opacity hover:opacity-85 focus:outline-none"
            aria-label="VOID Home"
          >
            <Wordmark size={24} />
          </button>
        )}
      </div>

      {/* Right: Apps Grid and Theme Toggle */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* 9-dot Waffle Launcher */}
        <div ref={waffleRef} className="relative">
          <button
            onClick={() => setWaffleOpen(!waffleOpen)}
            className="size-9 rounded-full flex items-center justify-center text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer"
            title="VOID Apps & Tools"
            aria-label="Apps launcher"
          >
            <WaffleGridIcon className="size-5" />
          </button>

          {waffleOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-white dark:bg-[#141416] border border-slate-200 dark:border-zinc-800 shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block px-2 pb-2">
                Featured Apps
              </span>
              <div className="grid grid-cols-3 gap-2">
                <a
                  href="https://med-russia.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/70 text-center transition-all group"
                >
                  <div className="size-9 rounded-xl overflow-hidden drop-shadow-sm mb-1.5 group-hover:scale-110 transition-transform flex items-center justify-center">
                    <img
                      src={medRussiaIcon}
                      alt="Med Russia"
                      className="size-full object-contain"
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-800 dark:text-zinc-200">
                    Med Russia
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                    Medical
                  </span>
                </a>

                <a
                  href="https://ai-placement-preparation.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/70 text-center transition-all group"
                >
                  <div className="size-9 rounded-xl overflow-hidden drop-shadow-sm mb-1.5 group-hover:scale-110 transition-transform flex items-center justify-center">
                    <img
                      src={placementAiIcon}
                      alt="Placement AI"
                      className="size-full object-contain"
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-800 dark:text-zinc-200">
                    Placement AI
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                    Prep
                  </span>
                </a>

                <a
                  href="https://monugurjar.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/70 text-center transition-all group"
                >
                  <div className="size-9 rounded-xl overflow-hidden drop-shadow-sm mb-1.5 group-hover:scale-110 transition-transform flex items-center justify-center">
                    <img
                      src={portfolioIcon}
                      alt="Portfolio"
                      className="size-full object-contain"
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-800 dark:text-zinc-200">
                    Portfolio
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                    Monu
                  </span>
                </a>
              </div>

              {/* About Developer: Monu Gurjar */}
              <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-zinc-800">
                <a
                  href="https://github.com/MonuGurjar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800/40 dark:hover:bg-zinc-800/80 border border-slate-200/60 dark:border-zinc-800 transition-all group"
                  title="Visit Monu Gurjar on GitHub"
                >
                  <div className="relative size-8 rounded-full overflow-hidden ring-1 ring-slate-300 dark:ring-zinc-700 shrink-0 bg-zinc-900 grid place-items-center">
                    <img
                      src="https://avatars.githubusercontent.com/u/70533008?v=4"
                      alt="Monu Gurjar"
                      className="size-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none"
                      }}
                    />
                    <div className="absolute inset-0 grid place-items-center -z-10 text-white">
                      <GithubIcon className="size-4" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        Monu Gurjar
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium shrink-0">
                        Creator
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 block truncate">
                      github.com/MonuGurjar
                    </span>
                  </div>

                  <div className="text-slate-400 group-hover:text-slate-700 dark:text-zinc-500 dark:group-hover:text-zinc-300 transition-colors shrink-0 pr-1">
                    <GithubIcon className="size-3.5" />
                  </div>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-slate-200 dark:bg-zinc-800" aria-hidden />

        {/* Theme Toggle (Sun / Moon) */}
        <button
          onClick={onToggleTheme}
          className="size-9 rounded-full flex items-center justify-center bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700/80 text-slate-600 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-all cursor-pointer shadow-xs"
          title={
            theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"
          }
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <MoonIcon className="size-4.5 text-amber-300 dark:text-amber-300" />
          ) : (
            <SunIcon className="size-4.5 text-slate-600" />
          )}
        </button>
      </div>
    </header>
  )
}
