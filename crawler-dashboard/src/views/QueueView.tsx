import { useState } from 'react'
import type { QueueItem, CrawlProfile } from '../types/dashboard'

type Props = {
  queue: QueueItem[]
  profiles: CrawlProfile[]
  onInspectUrl: (url: string) => void
  onAddUrl: (item: Omit<QueueItem, 'id' | 'addedAt' | 'retryCount' | 'status'>) => void
  onRemoveUrl: (id: string) => void
  onClearQueue?: () => void
}

export function QueueView({
  queue,
  profiles,
  onInspectUrl,
  onAddUrl,
  onRemoveUrl,
  onClearQueue,
}: Props) {
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  // New URL Form state
  const [newUrl, setNewUrl] = useState('')
  const [newPriority, setNewPriority] = useState<'P0' | 'P1' | 'P2' | 'P3'>('P1')
  const [newProfileId, setNewProfileId] = useState(profiles[0]?.id || 'tech-docs')
  const [newDepth, setNewDepth] = useState(1)

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUrl.trim()) return

    try {
      let u = newUrl.trim()
      if (!u.startsWith('http')) u = 'https://' + u
      const parsed = new URL(u)
      const domain = parsed.hostname.replace(/^www\./, '')

      onAddUrl({
        url: u,
        domain,
        depth: newDepth,
        priority: newPriority,
        profileId: newProfileId,
      })

      setNewUrl('')
      setShowAddModal(false)
    } catch {
      alert('Invalid URL format')
    }
  }

  const filteredQueue = queue.filter((item) => {
    if (priorityFilter !== 'ALL' && item.priority !== priorityFilter) return false
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      if (!item.url.toLowerCase().includes(q) && !item.domain.toLowerCase().includes(q)) {
        return false
      }
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-blue-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white font-mono-code">
              URL Frontier & Dispatch Queue
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Prioritized breadth-first / depth-first queue populated from sitemaps, recursive links, and seed inputs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onClearQueue && (
            <button
              onClick={onClearQueue}
              className="px-3 py-1.5 rounded bg-[#18202f] hover:bg-rose-950/40 border border-[#27354a] hover:border-rose-500/50 text-xs font-mono-code text-slate-300 hover:text-rose-300 transition-colors cursor-pointer"
            >
              Purge Queue
            </button>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono-code transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Enqueue Seed URL</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="p-3.5 rounded-xl border border-[#1e2638] bg-[#0e131d] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search Box */}
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search domain or path..."
            className="w-56 text-xs font-mono-code bg-[#121722] border border-[#222c3e] rounded-lg px-3 py-1.5 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />

          {/* Priority Pills */}
          <div className="flex items-center gap-1 text-xs font-mono-code border-l border-[#1e2638] pl-3">
            <span className="text-[11px] text-slate-400 mr-1">Priority:</span>
            {['ALL', 'P0', 'P1', 'P2', 'P3'].map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  priorityFilter === p
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#161c28]'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Status Pills */}
          <div className="flex items-center gap-1 text-xs font-mono-code border-l border-[#1e2638] pl-3">
            <span className="text-[11px] text-slate-400 mr-1">Status:</span>
            {['ALL', 'pending', 'crawling', 'indexed'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2 py-0.5 rounded capitalize transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#161c28]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <span className="text-xs font-mono-code text-slate-400">
          Showing {filteredQueue.length} of {queue.length} entries
        </span>
      </div>

      {/* Queue Table */}
      <div className="rounded-xl border border-[#1e2638] bg-[#0e131d] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono-code">
            <thead className="bg-[#121722] text-slate-400 text-[11px] uppercase border-b border-[#1e2638]">
              <tr>
                <th className="px-4 py-3 font-semibold">Priority</th>
                <th className="px-4 py-3 font-semibold">Target URL</th>
                <th className="px-4 py-3 font-semibold">Domain</th>
                <th className="px-4 py-3 font-semibold">Depth</th>
                <th className="px-4 py-3 font-semibold">Profile</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Added</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#18202f] bg-[#0b0e14]">
              {filteredQueue.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No URLs match the current queue criteria.
                  </td>
                </tr>
              ) : (
                filteredQueue.map((item) => (
                  <tr key={item.id} className="hover:bg-[#121722] transition-colors group">
                    <td className="px-4 py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.priority === 'P0'
                            ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            : item.priority === 'P1'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : item.priority === 'P2'
                            ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {item.priority}
                      </span>
                    </td>

                    <td className="px-4 py-2.5 max-w-sm">
                      <span
                        onClick={() => onInspectUrl(item.url)}
                        className="text-white hover:text-emerald-300 hover:underline truncate block cursor-pointer"
                        title={item.url}
                      >
                        {item.url}
                      </span>
                    </td>

                    <td className="px-4 py-2.5 text-slate-300">{item.domain}</td>

                    <td className="px-4 py-2.5 text-slate-400">
                      <span className="px-1.5 py-0.5 rounded bg-[#161c28] border border-[#222c3e] text-[10px]">
                        L{item.depth}
                      </span>
                    </td>

                    <td className="px-4 py-2.5">
                      <span className="text-[10px] text-slate-300 px-1.5 py-0.5 rounded bg-[#18202f]">
                        {item.profileId}
                      </span>
                    </td>

                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded ${
                          item.status === 'crawling'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : item.status === 'indexed'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {item.status === 'crawling' && (
                          <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
                        )}
                        {item.status}
                      </span>
                    </td>

                    <td className="px-4 py-2.5 text-slate-400 text-[11px]">{item.addedAt}</td>

                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onInspectUrl(item.url)}
                          className="px-2 py-1 rounded bg-[#18202f] hover:bg-[#222c3e] text-slate-300 hover:text-white transition-colors text-[10px] cursor-pointer"
                        >
                          Inspect
                        </button>
                        <button
                          onClick={() => onRemoveUrl(item.id)}
                          className="px-2 py-1 rounded hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition-colors text-[10px] cursor-pointer"
                        >
                          Drop
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

      {/* Add URL to Queue Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl bg-[#0e131d] border border-[#222c3e] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1e2638] pb-3">
              <h3 className="text-sm font-bold font-mono-code uppercase text-white">
                Enqueue Target Seed URL
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-mono-code text-slate-300 block mb-1">Target URL</label>
                <input
                  type="text"
                  required
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://example.com/docs"
                  className="w-full text-xs font-mono-code bg-[#121722] border border-[#222c3e] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-mono-code text-slate-300 block mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full text-xs font-mono-code bg-[#121722] border border-[#222c3e] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="P0">P0 (Critical)</option>
                    <option value="P1">P1 (High)</option>
                    <option value="P2">P2 (Normal)</option>
                    <option value="P3">P3 (Low)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-mono-code text-slate-300 block mb-1">Profile</label>
                  <select
                    value={newProfileId}
                    onChange={(e) => setNewProfileId(e.target.value)}
                    className="w-full text-xs font-mono-code bg-[#121722] border border-[#222c3e] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-mono-code text-slate-300 block mb-1">Max Depth</label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={newDepth}
                    onChange={(e) => setNewDepth(parseInt(e.target.value) || 1)}
                    className="w-full text-xs font-mono-code bg-[#121722] border border-[#222c3e] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1e2638]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#18202f] hover:bg-[#222c3e] text-xs font-mono-code text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono-code cursor-pointer"
                >
                  Enqueue URL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
