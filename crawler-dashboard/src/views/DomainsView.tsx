import { useState } from 'react'
import type { DomainStat } from '../types/dashboard'

type Props = {
  domains: DomainStat[]
  onInspectDomain?: (domain: string) => void
}

export function DomainsView({ domains, onInspectDomain }: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const filteredDomains = domains.filter((d) => {
    if (statusFilter !== 'ALL' && d.status !== statusFilter) return false
    if (searchTerm && !d.domain.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white font-mono-code">
              Domain Health, Politeness & robots.txt Registry
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Per-domain crawl politeness quotas, parsed robots.txt rules, and upstream HTTP health telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono-code text-slate-400 px-3 py-1.5 rounded-lg bg-[#0e131d] border border-[#1e2638]">
            {domains.length} Domains Monitored
          </span>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-[#0e131d] border border-[#1e2638]">
          <span className="text-[10px] uppercase font-mono-code text-slate-400 block">
            Monitored Domains
          </span>
          <span className="text-xl font-bold font-mono-code text-white block mt-1">
            {domains.length}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0e131d] border border-[#1e2638]">
          <span className="text-[10px] uppercase font-mono-code text-slate-400 block">
            Healthy Status
          </span>
          <span className="text-xl font-bold font-mono-code text-emerald-400 block mt-1">
            {domains.filter((d) => d.status === 'Healthy').length}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0e131d] border border-[#1e2638]">
          <span className="text-[10px] uppercase font-mono-code text-slate-400 block">
            Rate Limited / 429
          </span>
          <span className="text-xl font-bold font-mono-code text-amber-400 block mt-1">
            {domains.filter((d) => d.status === 'Rate Limited').length}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0e131d] border border-[#1e2638]">
          <span className="text-[10px] uppercase font-mono-code text-slate-400 block">
            Avg Crawl Delay
          </span>
          <span className="text-xl font-bold font-mono-code text-slate-200 block mt-1">
            {domains.length > 0
              ? `${Math.round(domains.reduce((a, b) => a + b.crawlDelayMs, 0) / domains.length)} ms`
              : '0 ms'}
          </span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-3.5 rounded-xl border border-[#1e2638] bg-[#0e131d] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search domain..."
            className="w-64 text-xs font-mono-code bg-[#121722] border border-[#222c3e] rounded-lg px-3 py-1.5 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-mono-code bg-[#121722] border border-[#222c3e] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Health Statuses</option>
            <option value="Healthy">Healthy</option>
            <option value="Rate Limited">Rate Limited</option>
            <option value="Degraded">Degraded</option>
          </select>
        </div>

        <span className="text-xs font-mono-code text-slate-400">
          Showing {filteredDomains.length} domains
        </span>
      </div>

      {/* Domain Registry Table */}
      <div className="rounded-xl border border-[#1e2638] bg-[#0e131d] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono-code">
            <thead className="bg-[#121722] text-slate-400 text-[11px] uppercase border-b border-[#1e2638]">
              <tr>
                <th className="px-4 py-3 font-semibold">Domain Name</th>
                <th className="px-4 py-3 font-semibold">Pages Indexed</th>
                <th className="px-4 py-3 font-semibold">Crawl Delay</th>
                <th className="px-4 py-3 font-semibold">robots.txt</th>
                <th className="px-4 py-3 font-semibold">Health Status</th>
                <th className="px-4 py-3 font-semibold">SSL Valid</th>
                <th className="px-4 py-3 font-semibold">Last Crawled</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#18202f] bg-[#0b0e14]">
              {filteredDomains.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No domains monitored yet. Domains will appear as targets are registered and crawled.
                  </td>
                </tr>
              ) : (
                filteredDomains.map((d) => (
                <tr key={d.domain} className="hover:bg-[#121722] transition-colors">
                  <td className="px-4 py-3 text-white font-bold">{d.domain}</td>
                  <td className="px-4 py-3 text-slate-300">{d.pagesIndexed.toLocaleString()}</td>
                  <td className="px-4 py-3 text-emerald-400">{d.crawlDelayMs} ms</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        d.robotsStatus === 'Allowed'
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {d.robotsStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        d.status === 'Healthy'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-amber-500/15 text-amber-300'
                      }`}
                    >
                      {d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-emerald-400">
                    {d.sslValid ? '✓ Valid TLS' : '✕ Insecure'}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{d.lastCrawled}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onInspectDomain?.(d.domain)}
                      className="px-2.5 py-1 rounded bg-[#18202f] hover:bg-[#222c3e] text-slate-300 hover:text-white transition-colors text-[11px] cursor-pointer"
                    >
                      Inspect
                    </button>
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
