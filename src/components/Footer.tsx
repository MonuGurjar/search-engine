import { useState } from "react"
import { CloseIcon } from "./icons"
import type { LegalTab } from "./PrivacyTermsModal"

type Props = {
  onOpenLegal?: (tab: LegalTab) => void
}

export function Footer({ onOpenLegal }: Props) {
  const [modalOpen, setModalOpen] = useState<string | null>(null)

  const links = [
    {
      label: "About",
      isLegal: true,
      tab: "about" as LegalTab,
      content:
        "VOID is a minimalist, privacy-focused search engine powered by Aiven OpenSearch distributed cluster with real-time neural and fuzzy BM25 ranking.",
    },
    {
      label: "Privacy",
      isLegal: true,
      tab: "privacy" as LegalTab,
      content:
        "VOID does not log personal tracking profiles or sell search history. Your queries remain private and lightweight.",
    },
    {
      label: "Terms",
      isLegal: true,
      tab: "terms" as LegalTab,
      content:
        "Free for open web search, developer documentation exploration, research discovery, and media lookup.",
    },
    {
      label: "Settings",
      isLegal: false,
      content:
        "VOID Search Preferences: SafeSearch Moderate, Neural Ranking enabled, Aiven OpenSearch Cluster indexing.",
    },
  ]

  const handleClick = (link: (typeof links)[number]) => {
    if (link.isLegal && link.tab && onOpenLegal) {
      onOpenLegal(link.tab)
    } else {
      setModalOpen(link.label)
    }
  }

  return (
    <>
      <footer className="w-full px-6 sm:px-12 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-sans text-slate-500 dark:text-zinc-500 select-none relative z-20">
        {/* Left Links */}
        <div className="flex items-center gap-5 sm:gap-6 flex-wrap justify-center sm:justify-start">
          {links.map((link) => (
            <button
              key={link.label}
              onClick={() => handleClick(link)}
              className="hover:text-slate-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Right Tagline */}
        <div className="text-slate-400 dark:text-zinc-500 text-center sm:text-right text-[12px] font-sans">
          Search without boundaries.
        </div>
      </footer>

      {/* Settings Modal if non-legal item clicked */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setModalOpen(null)}
        >
          <div
            className="bg-white/95 dark:bg-[#141416]/95 backdrop-blur-xl border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <h3 className="font-semibold text-slate-900 dark:text-zinc-100 font-sans text-sm">
                {modalOpen} — VOID
              </h3>
              <button
                onClick={() => setModalOpen(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded-full p-1 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <CloseIcon className="size-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed font-sans">
              {links.find((l) => l.label === modalOpen)?.content}
            </p>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setModalOpen(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-medium cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
