import { useState } from 'react'
import type { CrawlLogEntry } from '../types/dashboard'

type Props = {
  logs: CrawlLogEntry[]
  onClear?: () => void
  onInspectUrl?: (url: string) => void
}

export function LiveLogs({ logs, onClear, onInspectUrl }: Props) {
  const [filterState, setFilterState] = useState<string>('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  const filteredLogs = logs.filter((l) => {
    if (filterState !== 'ALL' && l.crawlState !== filterState) return false
    if (searchTerm && !l.url.toLowerCase().includes(searchTerm.toLowerCase()) && !l.message?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }
    return true
  })

  return (
    <div className="rounded-xl border border-[#1e2638] bg-[#0e131d] overflow-hidden flex flex-col shadow-sm">
      {/* Header Bar */}
      <div className="px-4 py-3 border-b border-[#1e2638] bg-[#121722] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono-code">
            Live Crawler Ingestion Stream
          </h3>
          <span className="text-[10px] font-mono-code text-slate-400 px-1.5 py-0.5 rounded bg-[#18202f] border border-[#232d3f]">
            {filteredLogs.length} events
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Search input */}
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by URL or event..."
              className="w-48 text-xs font-mono-code bg-[#0b0e14] border border-[#222c3e] rounded px-2.5 py-1 text-slate-200 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 text-[11px] font-mono-code">
            {['ALL', 'GEMINI', 'INDEXED', 'EXTRACT', 'BLOCKED', 'ERROR'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterState(st)}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  filterState === st
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#18202f]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {onClear && (
            <button
              onClick={onClear}
              className="text-[11px] font-mono-code text-slate-400 hover:text-rose-400 px-2 py-0.5 rounded hover:bg-[#18202f] transition-colors cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Log Feed */}
      <div className="divide-y divide-[#18202f] max-h-72 overflow-y-auto font-mono-code text-xs bg-[#0b0e14]">
        {filteredLogs.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs font-mono-code">
            No crawler events match the selected criteria.
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isError = log.crawlState === 'ERROR'
            const isBlocked = log.crawlState === 'BLOCKED'
            const isGemini = log.crawlState === 'GEMINI'
            const isIndexed = log.crawlState === 'INDEXED'

            return (
              <div
                key={log.id}
                className="px-4 py-2 hover:bg-[#121722] flex items-center justify-between gap-3 group transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="text-[11px] text-slate-400 shrink-0 select-none">
                    {log.timestamp}
                  </span>

                  {/* Crawl State Pill */}
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 border ${
                      isGemini
                        ? 'bg-violet-500/15 text-violet-300 border-violet-500/30'
                        : isIndexed
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : isBlocked
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        : isError
                        ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                        : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                    }`}
                  >
                    {log.crawlState}
                  </span>

                  {/* HTTP Status Code */}
                  <span
                    className={`text-[11px] font-semibold shrink-0 ${
                      log.status >= 200 && log.status < 300
                        ? 'text-emerald-400'
                        : log.status === 403
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {log.status}
                  </span>

                  {/* Target URL */}
                  <span
                    onClick={() => onInspectUrl?.(log.url)}
                    className="text-slate-200 truncate hover:text-emerald-300 hover:underline cursor-pointer"
                    title={log.url}
                  >
                    {log.url}
                  </span>

                  {/* Event Message */}
                  {log.message && (
                    <span className="hidden xl:inline text-[11px] text-slate-400 truncate max-w-sm">
                      — {log.message}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0 text-[11px] text-slate-400">
                  {log.sizeBytes && (
                    <span className="hidden md:inline">{(log.sizeBytes / 1024).toFixed(1)} KB</span>
                  )}
                  <span className="text-slate-400">{log.responseTimeMs}ms</span>
                  {onInspectUrl && (
                    <button
                      onClick={() => onInspectUrl(log.url)}
                      className="opacity-0 group-hover:opacity-100 text-[10px] text-emerald-400 hover:underline px-1.5 py-0.5 rounded bg-[#1a2334] cursor-pointer"
                    >
                      Analyze
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
