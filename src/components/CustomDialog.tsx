import { useEffect, useCallback, type ReactNode } from "react"
import { X } from "lucide-react"

type Props = {
  isOpen: boolean
  onClose: () => void
  icon?: ReactNode
  badge?: string
  badgeColor?: "emerald" | "cyan" | "amber" | "rose" | "purple"
  title: string
  description?: string
  children?: ReactNode
  actionLabel?: string
  onAction?: () => void
}

export function CustomDialog({
  isOpen,
  onClose,
  icon,
  badge = "VOID",
  badgeColor = "cyan",
  title,
  description,
  children,
  actionLabel = "Got it",
  onAction,
}: Props) {
  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    },
    [onClose],
  )

  useEffect(() => {
    if (!isOpen) return
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, handleKeyDown])

  // Prevent background scrolling while open
  useEffect(() => {
    if (isOpen) {
      const orig = document.body.style.overflow
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = orig
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  const badgeColorStyles = {
    emerald:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
    amber:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    purple:
      "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  }[badgeColor]

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm sm:max-w-md rounded-2xl sm:rounded-3xl overflow-hidden bg-white/95 dark:bg-[#141519]/95 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.3)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] text-slate-800 dark:text-zinc-200 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Glossy Accent Line */}
        <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 opacity-90" />

        <div className="p-5 sm:p-6 space-y-4">
          {/* Header Row: Badge & Close */}
          <div className="flex items-center justify-between">
            <span
              className={`text-[10px] font-mono font-medium tracking-wider uppercase px-2 py-0.5 rounded-full border ${badgeColorStyles}`}
            >
              {badge}
            </span>

            <button
              type="button"
              onClick={onClose}
              className="size-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Main Visual & Text */}
          <div className="space-y-3 pt-1">
            {icon && (
              <div className="flex justify-start">
                <div className="size-11 rounded-2xl bg-slate-100 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700/60 grid place-items-center shadow-xs">
                  {icon}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-base sm:text-lg font-semibold tracking-tight text-slate-900 dark:text-white font-sans">
                {title}
              </h3>
              {description && (
                <p className="text-xs leading-relaxed text-slate-600 dark:text-zinc-400 mt-1.5 font-sans">
                  {description}
                </p>
              )}
            </div>

            {children}
          </div>

          {/* Action Footer */}
          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-zinc-800/80">
            <button
              type="button"
              onClick={() => {
                if (onAction) onAction()
                onClose()
              }}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-medium cursor-pointer transition-all shadow-xs"
            >
              {actionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
