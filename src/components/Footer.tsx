import { useState } from 'react'
import { CloseIcon } from './icons'

export function Footer() {
  const [modalOpen, setModalOpen] = useState<string | null>(null)

  const links = [
    { label: 'About', content: 'VOID is a minimalist, privacy-focused search engine powered by Aiven OpenSearch distributed cluster with real-time neural and fuzzy BM25 ranking.' },
    { label: 'Privacy', content: 'VOID does not log personal tracking profiles or sell search history. Your queries remain private and lightweight.' },
    { label: 'Terms', content: 'Free for open web search, developer documentation exploration, research discovery, and media lookup.' },
    { label: 'Settings', content: 'VOID Search Preferences: SafeSearch Moderate, Neural Ranking enabled, Aiven OpenSearch Cluster indexing.' },
  ]

  return (
    <>
      <footer className="w-full px-6 sm:px-12 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-sans text-slate-500 dark:text-zinc-500 select-none relative z-20">
        {/* Left Links */}
        <div className="flex items-center gap-5 sm:gap-6 flex-wrap justify-center sm:justify-start">
          {links.map((link) => (
            <button
              key={link.label}
              onClick={() => setModalOpen(link.label)}
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

      {/* Simple Information Modal if any link clicked */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#141416] border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
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
