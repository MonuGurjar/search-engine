import { useState } from 'react'

export function Footer() {
  const [modalOpen, setModalOpen] = useState<string | null>(null)

  const links = [
    { label: 'About', content: 'VOID is a minimalist, privacy-focused search engine built with Supabase cloud index and real-time semantic neural extraction.' },
    { label: 'Privacy', content: 'VOID does not log personal tracking profiles or sell search history. Your queries remain private and lightweight.' },
    { label: 'Terms', content: 'Free for open web search, developer documentation exploration, research discovery, and media lookup.' },
    { label: 'Settings', content: 'VOID Search Preferences: SafeSearch Moderate, Neural Ranking enabled, Direct Supabase Inverted Indexing.' },
  ]

  return (
    <>
      <footer className="w-full px-6 sm:px-12 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-sans text-slate-500 dark:text-slate-400 select-none relative z-20">
        {/* Left Links */}
        <div className="flex items-center gap-5 sm:gap-6 flex-wrap justify-center sm:justify-start">
          {links.map((link) => (
            <button
              key={link.label}
              onClick={() => setModalOpen(link.label)}
              className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Right Tagline */}
        <div className="text-slate-400 dark:text-slate-500 text-center sm:text-right text-[12px] font-sans">
          Search without boundaries.
        </div>
      </footer>

      {/* Simple Information Modal if any link clicked */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-semibold text-slate-900 dark:text-white font-sans text-sm">
                {modalOpen} — VOID
              </h3>
              <button
                onClick={() => setModalOpen(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
              {links.find((l) => l.label === modalOpen)?.content}
            </p>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setModalOpen(null)}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium cursor-pointer"
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
