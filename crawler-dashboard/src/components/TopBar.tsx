import { useState } from 'react'
import type { CrawlProfile } from '../types/dashboard'

type Props = {
  profiles: CrawlProfile[]
  activeProfile: CrawlProfile
  onSelectProfile: (profile: CrawlProfile) => void
  isCrawling: boolean
  onToggleCrawl: () => void
  onOpenQuickIngest: () => void
  geminiLive: boolean
}

export function TopBar({
  profiles,
  activeProfile,
  onSelectProfile,
  isCrawling,
  onToggleCrawl,
  onOpenQuickIngest,
  geminiLive,
}: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false)

  return (
    <header className="h-16 px-6 bg-[#0e131d]/95 backdrop-blur border-b border-[#1e2638] flex items-center justify-between sticky top-0 z-20">
      {/* Left: Active Profile Selector */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#161c28] border border-[#232d3f] hover:border-slate-600 text-xs text-white transition-all cursor-pointer"
          >
            <span className="text-slate-400 font-mono-code text-[11px]">Profile:</span>
            <span className="font-medium text-emerald-300 flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-400" />
              {activeProfile.name}
            </span>
            <svg
              className={`size-3.5 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 9-7 7-7-7" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 mt-2 w-72 rounded-lg bg-[#121722] border border-[#242e42] shadow-2xl shadow-black/80 py-1.5 z-50">
              <div className="px-3 py-1 text-[10px] uppercase font-mono-code text-slate-400 tracking-wider">
                Select Active Crawl Profile
              </div>
              {profiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelectProfile(p)
                    setDropdownOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors flex flex-col gap-0.5 cursor-pointer ${
                    p.id === activeProfile.id
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'text-slate-300 hover:bg-[#1a2232] hover:text-white'
                  }`}
                >
                  <span className="font-semibold flex items-center justify-between">
                    {p.name}
                    <span className="text-[10px] font-mono-code text-slate-400">Depth {p.maxDepth}</span>
                  </span>
                  <span className="text-[11px] text-slate-400 line-clamp-1">{p.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs font-mono-code text-slate-400 border-l border-[#1e2638] pl-4">
          <span>Scope:</span>
          <span className="px-2 py-0.5 rounded bg-[#161c28] border border-[#232d3f] text-slate-300 text-[11px]">
            {activeProfile.scopeType}
          </span>
        </div>
      </div>

      {/* Right: Controls & AI Status */}
      <div className="flex items-center gap-3">
        {/* Gemini Status Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#161c28] border border-[#232d3f] text-xs">
          <span className="size-2 rounded-full bg-violet-400 animate-pulse" />
          <span className="font-mono-code text-slate-400 text-[11px]">Gemini 1.5:</span>
          <span className={`font-semibold text-[11px] ${geminiLive ? 'text-violet-300' : 'text-amber-300'}`}>
            {geminiLive ? 'Live API (Connected)' : 'Active (Enrichment Ready)'}
          </span>
        </div>

        {/* Quick Ingest Button */}
        <button
          onClick={onOpenQuickIngest}
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#161c28] hover:bg-[#1e2638] border border-[#232d3f] hover:border-slate-500 text-xs font-medium text-slate-200 transition-all cursor-pointer"
        >
          <svg className="size-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Ingest URL</span>
        </button>

        {/* Start / Pause Crawl Action Button */}
        <button
          onClick={onToggleCrawl}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all shadow-sm cursor-pointer ${
            isCrawling
              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold'
          }`}
        >
          {isCrawling ? (
            <>
              <span className="size-2 rounded-full bg-amber-400 animate-ping" />
              <span>Pause Crawl</span>
            </>
          ) : (
            <>
              <svg className="size-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              <span>Start Crawl</span>
            </>
          )}
        </button>
      </div>
    </header>
  )
}
