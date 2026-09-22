import { useState } from 'react'
import type { IndexedDocument, CrawlTarget } from '../types/dashboard'
import { SimpleCrawlBar } from '../components/SimpleCrawlBar'

type Props = {
  documents: IndexedDocument[]
  targets?: CrawlTarget[]
  onSyncIndexed?: (docs: IndexedDocument[]) => void
  onSyncTargets?: () => void
  onInspectDoc: (url: string) => void
  onDeleteDoc?: (id: string) => void
}

export function IndexedView({
  documents,
  targets = [],
  onSyncIndexed,
  onSyncTargets,
  onInspectDoc,
  onDeleteDoc,
}: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')

  const categories = ['ALL', ...Array.from(new Set(documents.map((d) => d.category)))]

  const filteredDocs = documents.filter((doc) => {
    if (categoryFilter !== 'ALL' && doc.category !== categoryFilter) return false
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      const inTitle = doc.title.toLowerCase().includes(q)
      const inUrl = doc.url.toLowerCase().includes(q)
      const inSummary = doc.summary.toLowerCase().includes(q)
      const inTags = doc.tags.some((t) => t.toLowerCase().includes(q))
      const inTopics = doc.topics.some((tp) => tp.toLowerCase().includes(q))
      if (!inTitle && !inUrl && !inSummary && !inTags && !inTopics) return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* 1-Click Quick Add & Crawl Bar */}
      <SimpleCrawlBar
        targets={targets}
        indexedDocs={documents}
        onSyncIndexed={onSyncIndexed || (() => {})}
        onSyncTargets={onSyncTargets}
      />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white font-mono-code">
              Indexed Documents Catalog ({documents.length})
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Parsed, normalized, and Gemini-enriched documents committed to the VOID Search inverted index.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono-code text-slate-400 px-3 py-1.5 rounded-lg bg-[#0e131d] border border-[#1e2638]">
            Inverted Index: <strong className="text-emerald-400">{documents.length} Total Records</strong>
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 rounded-xl border border-[#1e2638] bg-[#0e131d] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search Box */}
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, tag, topic, or URL..."
            className="w-72 text-xs font-mono-code bg-[#121722] border border-[#222c3e] rounded-lg px-3 py-1.5 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs font-mono-code bg-[#121722] border border-[#222c3e] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-emerald-500"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === 'ALL' ? 'All Categories' : c}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs font-mono-code text-slate-400">
          Showing {filteredDocs.length} of {documents.length}
        </span>
      </div>

      {/* Documents Cards List */}
      <div className="space-y-3">
        {filteredDocs.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs font-mono-code rounded-xl border border-[#1e2638] bg-[#0e131d]">
            No indexed documents found matching your search query.
          </div>
        ) : (
          filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="p-4 rounded-xl border border-[#1e2638] bg-[#0e131d] hover:border-slate-600 transition-all space-y-3 shadow-sm group"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold font-mono-code px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      {doc.category}
                    </span>
                    <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-[#18202f] text-slate-300">
                      {doc.pageType}
                    </span>
                    <span className="text-[10px] font-mono-code text-slate-400">
                      {doc.domain}
                    </span>
                  </div>

                  <h3
                    onClick={() => onInspectDoc(doc.url)}
                    className="text-sm font-bold text-white hover:text-emerald-400 cursor-pointer transition-colors"
                  >
                    {doc.title}
                  </h3>

                  <p className="text-xs font-mono-code text-slate-400 truncate max-w-2xl">
                    {doc.url}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
                  <button
                    onClick={() => onInspectDoc(doc.url)}
                    className="px-3 py-1.5 rounded-lg bg-[#18202f] hover:bg-emerald-500 hover:text-slate-950 text-xs font-mono-code font-semibold text-slate-200 transition-all cursor-pointer"
                  >
                    View Extraction ↗
                  </button>

                  {onDeleteDoc && (
                    <button
                      onClick={() => onDeleteDoc(doc.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition-colors text-xs cursor-pointer"
                      title="Remove from Index"
                    >
                      <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Gemini Summary Box */}
              <div className="p-3 rounded-lg bg-violet-950/20 border border-violet-500/25 text-xs text-slate-300 leading-relaxed">
                <span className="text-[10px] font-mono-code font-bold text-violet-300 uppercase block mb-1">
                  Gemini 1.5 Semantic Summary:
                </span>
                {doc.summary}
              </div>

              {/* Topics & Tags */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex flex-wrap gap-1.5">
                  {doc.topics.map((t) => (
                    <span
                      key={t}
                      className="text-[11px] font-mono-code px-2 py-0.5 rounded bg-[#161c28] border border-[#222c3e] text-slate-300"
                    >
                      #{t}
                    </span>
                  ))}
                  {doc.tags.map((tg) => (
                    <span
                      key={tg}
                      className="text-[11px] font-mono-code px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300/90 border border-emerald-500/20"
                    >
                      +{tg}
                    </span>
                  ))}
                </div>

                <span className="text-[10px] font-mono-code text-slate-400">
                  Indexed: {new Date(doc.indexedAt).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
