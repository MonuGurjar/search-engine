import { useState, useRef, useEffect } from "react"
import { Sparkles } from "lucide-react"
import { MODES } from "./modes"

type Props = {
  active: string
  onChange: (id: string) => void
  compact?: boolean
  showAllOnly?: boolean
}

const COMING_SOON_MODES: Record<string, string> = {
  videos: "Videos search is coming soon",
  news: "News search is coming soon",
  maps: "Maps search is coming soon",
  academic: "Academic search is coming soon",
  tools: "Tools search is coming soon",
}

export function ModePills({ active, onChange, compact = false }: Props) {
  // Show all modes in results view or hero view
  const heroModes = compact ? MODES : MODES.slice(0, 5)

  const [activeComingSoon, setActiveComingSoon] = useState<{
    id: string
    label: string
  } | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handlePillClick = (id: string, label: string) => {
    if (COMING_SOON_MODES[id]) {
      setActiveComingSoon({ id, label })
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        setActiveComingSoon(null)
      }, 2200)
      return
    }

    setActiveComingSoon(null)
    onChange(id === "all" ? "web" : id)
  }

  return (
    <>
      <div
        className={`flex items-center transition-all duration-200 ${
          compact
            ? "flex-nowrap justify-start gap-1 sm:gap-1.5 overflow-x-auto max-w-full px-1 py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            : "flex-wrap sm:flex-nowrap justify-center gap-2.5 max-w-2xl mx-auto py-2"
        }`}
      >
        {heroModes.map(({ id, label, Icon }) => {
          const selected = id === active || (active === "web" && id === "all")
          const isTriggered = activeComingSoon?.id === id

          return (
            <div key={id} className="relative inline-flex items-center shrink-0">
              {/* Coming Soon Tooltip Badge */}
              {isTriggered && (
                <div
                  role="status"
                  aria-live="polite"
                  className="absolute -top-8 left-1/2 -translate-x-1/2 z-40 pointer-events-none whitespace-nowrap animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-150"
                >
                  <div className="relative px-2.5 py-0.5 rounded-full text-[11px] font-sans font-medium bg-slate-900 dark:bg-white text-white dark:text-zinc-900 shadow-xl border border-slate-700/50 dark:border-zinc-200">
                    Coming soon
                    {/* Downward triangle pointer */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-0.5 border-4 border-transparent border-t-slate-900 dark:border-t-white" />
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => handlePillClick(id, label)}
                aria-pressed={selected}
                title={COMING_SOON_MODES[id] ? `${label} (Coming soon)` : label}
                className={`group flex items-center gap-2 rounded-full font-sans transition-all duration-150 ease-out cursor-pointer select-none ${
                  compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-[13.5px]"
                } ${
                  selected
                    ? "bg-blue-50 dark:bg-zinc-800 text-blue-600 dark:text-zinc-100 border border-blue-200/80 dark:border-zinc-700 shadow-sm font-medium"
                    : isTriggered
                    ? "bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 border border-blue-400 dark:border-blue-500 ring-2 ring-blue-500/20"
                    : "bg-white dark:bg-zinc-900/80 text-slate-700 dark:text-zinc-400 border border-slate-200/90 dark:border-zinc-800/90 hover:bg-slate-50 dark:hover:bg-zinc-800/60 hover:text-slate-900 dark:hover:text-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.04)] active:scale-95"
                }`}
              >
                <Icon
                  className={`size-4 shrink-0 transition-colors ${
                    selected
                      ? "text-blue-600 dark:text-zinc-100"
                      : isTriggered
                      ? "text-blue-500 dark:text-blue-400"
                      : "text-slate-500 dark:text-zinc-500 group-hover:text-slate-700 dark:group-hover:text-zinc-300"
                  }`}
                />
                <span>{label}</span>
              </button>
            </div>
          )
        })}
      </div>

      {/* Floating Glossy Toast for Mobile and Desktop Feedback */}
      {activeComingSoon && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-7 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/95 dark:bg-zinc-100/95 text-white dark:text-zinc-900 backdrop-blur-md shadow-2xl border border-white/10 dark:border-zinc-300 text-xs font-medium">
            <Sparkles className="size-3.5 text-amber-400 dark:text-amber-500 shrink-0" />
            <span>
              {COMING_SOON_MODES[activeComingSoon.id] ||
                `${activeComingSoon.label} is coming soon`}
            </span>
          </div>
        </div>
      )}
    </>
  )
}
