import { useState } from 'react'
import type { CrawlError } from '../types/dashboard'

type Props = {
  errors: CrawlError[]
  onRetry: (id: string) => void
  onDiscard: (id: string) => void
  onInspectUrl?: (url: string) => void
  onRetryAll?: () => void
}

export function ErrorsView({ errors, onRetry, onDiscard, onInspectUrl, onRetryAll }: Props) {
  const [errorFilter, setErrorFilter] = useState('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  const filteredErrors = errors.filter((err) => {
    if (errorFilter !== 'ALL' && err.errorType !== errorFilter) return false
    if (searchTerm && !err.url.toLowerCase().includes(searchTerm.toLowerCase()) && !err.domain.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-rose-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white font-mono-code">
              Crawler Errors & Dead-Letter Queue ({errors.length})
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Network timeouts, HTTP 4xx client errors, 5xx gateway faults, parser panics, and scope exclusions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onRetryAll && (
            <button
              onClick={onRetryAll}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono-code transition-colors cursor-pointer"
            >
              Retry All Eligible ({errors.length})
            </button>
          )}
        </div>
      </div>

      {/* Error Types Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-[#0e131d] border border-[#1e2638]">
          <span className="text-[10px] uppercase font-mono-code text-slate-400 block">
            HTTP 404 (Not Found)
          </span>
          <span className="text-xl font-bold font-mono-code text-amber-300 block mt-1">
            {errors.filter((e) => e.errorType === 'HTTP 404').length}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0e131d] border border-[#1e2638]">
          <span className="text-[10px] uppercase font-mono-code text-slate-400 block">
            HTTP 429 (Rate Limits)
          </span>
          <span className="text-xl font-bold font-mono-code text-amber-400 block mt-1">
            {errors.filter((e) => e.errorType === 'HTTP 429').length}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0e131d] border border-[#1e2638]">
          <span className="text-[10px] uppercase font-mono-code text-slate-400 block">
            Scope Blocked
          </span>
          <span className="text-xl font-bold font-mono-code text-blue-400 block mt-1">
            {errors.filter((e) => e.errorType === 'Scope Blocked').length}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0e131d] border border-[#1e2638]">
          <span className="text-[10px] uppercase font-mono-code text-slate-400 block">
            Socket Timeouts
          </span>
          <span className="text-xl font-bold font-mono-code text-rose-400 block mt-1">
            {errors.filter((e) => e.errorType === 'Timeout').length}
          </span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-3.5 rounded-xl border border-[#1e2638] bg-[#0e131d] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search error URL or domain..."
            className="w-64 text-xs font-mono-code bg-[#121722] border border-[#222c3e] rounded-lg px-3 py-1.5 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />

          <select
            value={errorFilter}
            onChange={(e) => setErrorFilter(e.target.value)}
            className="text-xs font-mono-code bg-[#121722] border border-[#222c3e] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Error Types</option>
            <option value="HTTP 404">HTTP 404</option>
            <option value="HTTP 429">HTTP 429 (Rate Limit)</option>
            <option value="HTTP 500">HTTP 500</option>
            <option value="Timeout">Timeout</option>
            <option value="Scope Blocked">Scope Blocked</option>
            <option value="Parse Error">Parse Error</option>
          </select>
        </div>

        <span className="text-xs font-mono-code text-slate-400">
          Showing {filteredErrors.length} of {errors.length} errors
        </span>
      </div>

      {/* Error Table */}
      <div className="rounded-xl border border-[#1e2638] bg-[#0e131d] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono-code">
            <thead className="bg-[#121722] text-slate-400 text-[11px] uppercase border-b border-[#1e2638]">
              <tr>
                <th className="px-4 py-3 font-semibold">Error Type</th>
                <th className="px-4 py-3 font-semibold">Target URL</th>
                <th className="px-4 py-3 font-semibold">Domain</th>
                <th className="px-4 py-3 font-semibold">Retries</th>
                <th className="px-4 py-3 font-semibold">Diagnostic Details</th>
                <th className="px-4 py-3 font-semibold">Timestamp</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#18202f] bg-[#0b0e14]">
              {filteredErrors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    No errors currently recorded in this category.
                  </td>
                </tr>
              ) : (
                filteredErrors.map((err) => (
                  <tr key={err.id} className="hover:bg-[#121722] transition-colors">
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          err.errorType === 'Scope Blocked'
                            ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                            : err.errorType === 'HTTP 429'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {err.errorType}
                      </span>
                    </td>

                    <td className="px-4 py-3 max-w-xs">
                      <span
                        onClick={() => onInspectUrl?.(err.url)}
                        className="text-white hover:text-emerald-400 hover:underline cursor-pointer truncate block"
                        title={err.url}
                      >
                        {err.url}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-slate-300">{err.domain}</td>

                    <td className="px-4 py-3 text-slate-400">
                      <span className="px-1.5 py-0.5 rounded bg-[#161c28] border border-[#222c3e] text-[10px]">
                        {err.retryCount} / 3
                      </span>
                    </td>

                    <td className="px-4 py-3 text-slate-300 max-w-sm">
                      <span className="truncate block" title={err.details}>
                        {err.details}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-slate-400">{err.timestamp}</td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onRetry(err.id)}
                          className="px-2 py-1 rounded bg-[#18202f] hover:bg-emerald-500 hover:text-slate-950 text-slate-300 text-[10px] transition-colors cursor-pointer"
                        >
                          Retry
                        </button>
                        <button
                          onClick={() => onDiscard(err.id)}
                          className="px-2 py-1 rounded hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 text-[10px] transition-colors cursor-pointer"
                        >
                          Discard
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
