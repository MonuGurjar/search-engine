import { useState } from 'react'
import type { IndexedDocument, CrawlTarget } from '../types/dashboard'

type Props = {
  targets: CrawlTarget[]
  indexedDocs: IndexedDocument[]
  onSyncIndexed: (docs: IndexedDocument[]) => void
  onSyncTargets?: () => void
  activeProfileId?: string
}

export function SimpleCrawlBar({
  targets,
  indexedDocs,
  onSyncIndexed,
  onSyncTargets,
  activeProfileId = 'tech-docs',
}: Props) {
  const [urlInput, setUrlInput] = useState('')
  const [crawlChildLinks, setCrawlChildLinks] = useState(true)
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{
    type: 'idle' | 'running' | 'success' | 'info' | 'error'
    text: string
    subtext?: string
  }>({
    type: 'idle',
    text: 'Enter any link to crawl & index it immediately into VOID.',
  })

  // Calculate unindexed targets
  const indexedUrls = new Set(indexedDocs.map((d) => d.url.toLowerCase().replace(/\/+$/, '')))
  const unindexedTargets = targets.filter((t) => {
    const norm = t.url.toLowerCase().replace(/\/+$/, '')
    return !indexedUrls.has(norm)
  })
  const unindexedCount = unindexedTargets.length

  const handleAddAndCrawl = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const target = urlInput.trim()
    if (!target) return

    setLoading(true)
    setStatusMessage({
      type: 'running',
      text: `Crawling & indexing ${target}...`,
      subtext: crawlChildLinks ? 'Extracting page content and discovering child links/repositories...' : 'Parsing page and generating Gemini summary...',
    })

    try {
      const res = await fetch('/api/crawler/add-and-crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: target,
          crawlChildLinks,
          profileId: activeProfileId,
        }),
      })

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`)
      }

      const data = await res.json()
      if (data.allIndexed && Array.isArray(data.allIndexed)) {
        onSyncIndexed(data.allIndexed)
      }
      if (onSyncTargets) {
        onSyncTargets()
      }

      setUrlInput('')

      if (data.rootDoc?.category === 'Excluded' || data.rootDoc?.title === 'Excluded Route') {
        setStatusMessage({
          type: 'info',
          text: `URL Excluded by Scope Rule`,
          subtext: `"${target}" matches an excluded route (/api, /docs, /blog, /blogs, /login, /search, /commit, /issues, /pulls, /releases). Crawling and indexing skipped.`,
        })
      } else if (data.isDuplicate && (!data.childDocs || data.childDocs.length === 0)) {
        setStatusMessage({
          type: 'info',
          text: `Already indexed in VOID!`,
          subtext: `"${target}" was already present in the index. Duplicate skipped, zero duplicate records created.`,
        })
      } else {
        const totalNew = (data.isDuplicate ? 0 : 1) + (data.childDocs ? data.childDocs.length : 0)
        setStatusMessage({
          type: 'success',
          text: `✓ Successfully crawled & indexed ${totalNew} page${totalNew === 1 ? '' : 's'}!`,
          subtext: `${data.skippedCount ? `${data.skippedCount} duplicate(s) skipped. ` : ''}All documents are now searchable in VOID.`,
        })
      }
    } catch (err: any) {
      console.error('Crawl failed:', err)
      setStatusMessage({
        type: 'error',
        text: 'Crawl failed',
        subtext: err.message || 'Network error or target unreachable.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCrawlAllUnindexed = async () => {
    if (unindexedCount === 0 || loading) return

    setLoading(true)
    setStatusMessage({
      type: 'running',
      text: `Crawling ${unindexedCount} unindexed target${unindexedCount === 1 ? '' : 's'} in batch...`,
      subtext: 'Fetching pages and generating Gemini semantic summaries...',
    })

    try {
      const res = await fetch('/api/crawler/crawl-unindexed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const data = await res.json()

      if (data.allIndexed && Array.isArray(data.allIndexed)) {
        onSyncIndexed(data.allIndexed)
      }
      if (onSyncTargets) {
        onSyncTargets()
      }

      setStatusMessage({
        type: 'success',
        text: `✓ Batch crawl complete! Indexed ${data.crawledCount || 0} pages.`,
        subtext: `${data.skippedCount || 0} duplicate(s) skipped. All targets are now indexed!`,
      })
    } catch (err: any) {
      console.error('Batch crawl failed:', err)
      setStatusMessage({
        type: 'error',
        text: 'Batch crawl failed',
        subtext: err.message || 'Could not crawl unindexed targets.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-[#0e131d] p-4 sm:p-5 shadow-lg shadow-black/40 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-white font-mono-code">
            Add & Crawl Link
          </h2>
          <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
            Auto-Index on Add · Deduplication Active
          </span>
        </div>

        {unindexedCount > 0 && (
          <button
            onClick={handleCrawlAllUnindexed}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-mono-code font-semibold transition-all cursor-pointer disabled:opacity-50"
          >
            <svg className="size-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
            </svg>
            <span>⚡ Crawl All Unindexed ({unindexedCount} pending)</span>
          </button>
        )}
      </div>

      {/* URL Input Form */}
      <form onSubmit={handleAddAndCrawl} className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Paste any link: e.g. https://github.com/MonuGurjar or https://react.dev"
            disabled={loading}
            className="w-full px-3.5 py-2.5 rounded-lg bg-[#090c12] border border-[#242f44] text-white font-mono-code text-xs placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-all disabled:opacity-60"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !urlInput.trim()}
          className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono-code transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {loading ? (
            <>
              <div className="size-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              <span>Crawling & Indexing...</span>
            </>
          ) : (
            <>
              <svg className="size-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
              </svg>
              <span>Add & Crawl Now ⚡</span>
            </>
          )}
        </button>
      </form>

      {/* Controls & Feedback Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs pt-1 border-t border-[#18202f]">
        <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={crawlChildLinks}
            onChange={(e) => setCrawlChildLinks(e.target.checked)}
            className="rounded border-[#2a374d] text-emerald-500 focus:ring-0 bg-[#090c12]"
          />
          <span className="font-mono-code text-[11px] text-slate-300">
            Also discover & crawl public repos or internal child links
          </span>
        </label>

        {/* Dynamic Status Text */}
        <div className="text-[11px] font-mono-code text-right">
          {statusMessage.type === 'running' && (
            <span className="text-amber-300 flex items-center gap-1.5 justify-end">
              <span className="size-1.5 rounded-full bg-amber-400 animate-ping" />
              {statusMessage.text}
            </span>
          )}
          {statusMessage.type === 'success' && (
            <span className="text-emerald-400 font-semibold">{statusMessage.text}</span>
          )}
          {statusMessage.type === 'info' && (
            <span className="text-blue-300">{statusMessage.text}</span>
          )}
          {statusMessage.type === 'error' && (
            <span className="text-rose-400 font-semibold">{statusMessage.text}</span>
          )}
          {statusMessage.type === 'idle' && (
            <span className="text-slate-400">{statusMessage.text}</span>
          )}
        </div>
      </div>

      {statusMessage.subtext && (
        <div className="text-[11px] font-mono-code text-slate-400 bg-[#090c12] px-3 py-1.5 rounded border border-[#1e2638]">
          {statusMessage.subtext}
        </div>
      )}
    </div>
  )
}
