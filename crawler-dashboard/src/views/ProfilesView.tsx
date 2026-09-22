import { useState } from 'react'
import type { CrawlTarget } from '../types/dashboard'
import { evaluateScope, PRESET_PROFILES } from '../../server/scope-profiles'

type Props = {
  targets: CrawlTarget[]
  indexedDocs?: any[]
  onAddTarget: (target: Omit<CrawlTarget, 'id' | 'addedAt'>) => Promise<void> | void
  onDeleteTarget: (id: string) => Promise<void> | void
  onUpdateTarget?: (target: CrawlTarget) => Promise<void> | void
  onAnalyzeUrl: (url: string) => void
  onEnqueueUrl: (url: string, domain: string, depth: number) => void
  onCrawlNow?: (url: string) => Promise<void> | void
  onCrawlAllUnindexed?: () => Promise<void> | void
}

export function ProfilesView({
  targets,
  indexedDocs = [],
  onAddTarget,
  onDeleteTarget,
  onUpdateTarget,
  onAnalyzeUrl,
  onEnqueueUrl,
  onCrawlNow,
  onCrawlAllUnindexed,
}: Props) {
  // Form State
  const [urlInput, setUrlInput] = useState('')
  const [crawlImmediately, setCrawlImmediately] = useState(true)
  const [targetName, setTargetName] = useState('')
  const [scopeType, setScopeType] = useState<CrawlTarget['scopeType']>('path-prefix')
  const [maxDepth, setMaxDepth] = useState(4)
  const [crawlDelayMs, setCrawlDelayMs] = useState(250)
  const [includedPaths, setIncludedPaths] = useState('/**')
  const [excludedPaths, setExcludedPaths] = useState(
    '/(commit|issues|pulls|actions|blob|releases|stargazers|network)/**, /api/**, /docs/**, /blog/**, /blogs/**, /login, /search, /auth/**, /settings/**'
  )
  const [contentFilter, setContentFilter] = useState({
    extractCodeBlocks: true,
    extractHeadings: true,
    extractLinks: true,
    extractImages: false,
    extractPdfs: false,
  })
  const [geminiDirective, setGeminiDirective] = useState(
    'Extract API methods, architecture paradigms, code syntax concepts, and categorize for developer lookup.'
  )

  // Status feedback
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Filter for registered database list
  const [searchTerm, setSearchTerm] = useState('')

  // Live scope test
  const [testUrl, setTestUrl] = useState('')
  const [testResult, setTestResult] = useState<{ allowed: boolean; reason: string; matchedRule?: string } | null>(null)

  // Apply a template preset
  const applyPreset = (presetId: string) => {
    const preset = PRESET_PROFILES.find((p) => p.id === presetId)
    if (!preset) return
    setScopeType(preset.scopeType)
    setMaxDepth(preset.maxDepth)
    setCrawlDelayMs(preset.crawlDelayMs)
    setIncludedPaths(preset.includedPathPatterns.join(', '))
    setExcludedPaths(preset.excludedPaths.join(', '))
    setContentFilter(preset.contentFilter)
    setGeminiDirective(preset.geminiDirective)
  }

  // Load an existing target into the form
  const handleLoadTarget = (target: CrawlTarget) => {
    setEditingId(target.id)
    setUrlInput(target.url)
    setTargetName(target.name || '')
    setScopeType(target.scopeType)
    setMaxDepth(target.maxDepth)
    setCrawlDelayMs(target.crawlDelayMs)
    setIncludedPaths(target.includedPathPatterns.join(', '))
    setExcludedPaths(target.excludedPaths.join(', '))
    setContentFilter(target.contentFilter)
    setGeminiDirective(target.geminiDirective)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Handle Form Submit to DB
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!urlInput.trim()) return

    try {
      let cleanUrl = urlInput.trim()
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = 'https://' + cleanUrl
      }
      const parsed = new URL(cleanUrl)
      const domain = parsed.hostname.replace(/^www\./, '')

      const targetData: Omit<CrawlTarget, 'id' | 'addedAt'> = {
        url: cleanUrl,
        domain,
        name: targetName.trim() || `${domain} Target`,
        scopeType,
        maxDepth,
        crawlDelayMs,
        includedPathPatterns: includedPaths.split(',').map((s) => s.trim()).filter(Boolean),
        excludedPaths: excludedPaths.split(',').map((s) => s.trim()).filter(Boolean),
        contentFilter,
        geminiDirective: geminiDirective.trim(),
        status: 'Active',
      }

      if (editingId && onUpdateTarget) {
        const existing = targets.find((t) => t.id === editingId)
        if (existing) {
          await onUpdateTarget({ ...existing, ...targetData })
          setSavedFeedback(`Target "${targetData.name}" updated in database!`)
          setEditingId(null)
        }
      } else {
        await onAddTarget(targetData)
        setSavedFeedback(`Target "${cleanUrl}" saved to database!`)
      }

      if (crawlImmediately && onCrawlNow) {
        setSavedFeedback(`Target saved & crawling initiated for "${cleanUrl}"...`)
        onCrawlNow(cleanUrl)
      }

      setTimeout(() => setSavedFeedback(null), 4000)
    } catch {
      alert('Please enter a valid URL (e.g. https://react.dev/docs)')
    }
  }

  const handleTestScope = () => {
    if (!testUrl.trim()) return
    const fakeProfile = {
      id: 'active-form',
      name: targetName || 'Current Form Scope',
      description: '',
      badgeColor: 'emerald',
      icon: 'code',
      scopeType,
      allowedDomains: urlInput ? [new URL(urlInput.startsWith('http') ? urlInput : 'https://' + urlInput).hostname.replace(/^www\./, '')] : ['*'],
      excludedPaths: excludedPaths.split(',').map((s) => s.trim()).filter(Boolean),
      includedPathPatterns: includedPaths.split(',').map((s) => s.trim()).filter(Boolean),
      maxDepth,
      maxPagesPerDomain: 1000,
      crawlDelayMs,
      contentFilter,
      geminiDirective,
    }
    const res = evaluateScope(testUrl.trim(), fakeProfile as any)
    setTestResult(res)
  }

  const filteredTargets = targets.filter((t) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      if (!t.url.toLowerCase().includes(q) && !t.domain.toLowerCase().includes(q) && !(t.name || '').toLowerCase().includes(q)) {
        return false
      }
    }
    return true
  })

  const indexedUrls = new Set((indexedDocs || []).map((d: any) => (d.url || '').toLowerCase().replace(/\/+$/, '')))
  const unindexedTargets = targets.filter((t) => {
    const norm = t.url.toLowerCase().replace(/\/+$/, '')
    return !indexedUrls.has(norm)
  })
  const unindexedCount = unindexedTargets.length

  return (
    <div className="space-y-8">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white font-mono-code">
              URL Scope & Target Database Registry
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Add any particular URL with tailored crawl depth, rate limits, path boundaries, content extraction filters, and Gemini AI instructions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unindexedCount > 0 && onCrawlAllUnindexed && (
            <button
              onClick={onCrawlAllUnindexed}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-mono-code font-semibold transition-all cursor-pointer shrink-0"
            >
              <span>⚡ Crawl All Unindexed ({unindexedCount})</span>
            </button>
          )}

          <span className="text-xs font-mono-code text-slate-400 px-3 py-1.5 rounded-lg bg-[#0e131d] border border-[#1e2638]">
            Database Records: <strong className="text-emerald-400">{targets.length} Saved Targets</strong>
          </span>
        </div>
      </div>

      {/* Main Target URL Config & Add to DB Card */}
      <form
        onSubmit={handleFormSubmit}
        className="rounded-xl border border-[#1e2638] bg-[#0e131d] p-5 sm:p-6 space-y-5 shadow-lg shadow-black/30 relative"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e2638] pb-4">
          <div>
            <span className="text-[11px] font-bold font-mono-code uppercase text-emerald-400 block tracking-wider">
              {editingId ? 'Edit Registered Target' : 'Register New Target URL & Scope'}
            </span>
            <p className="text-xs text-slate-400 mt-0.5">
              Specify the exact URL or website you want to crawl, along with its specific indexing parameters.
            </p>
          </div>

          {/* Quick Preset Template Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono-code text-slate-400 mr-1">Quick Presets:</span>
            {[
              { id: 'tech-docs', label: 'Tech Docs' },
              { id: 'academic', label: 'Academic' },
              { id: 'deep-explorer', label: 'Deep Web' },
              { id: 'quick-discovery', label: 'Quick Recon' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className="px-2 py-0.5 rounded bg-[#161c28] hover:bg-[#202c40] text-[10px] font-mono-code text-slate-300 hover:text-white border border-[#242f44] transition-colors cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* 1. Target URL Input */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs font-mono-code text-slate-300 block mb-1.5 font-semibold">
              Target URL to Crawl & Index <span className="text-emerald-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://react.dev/reference/rsc/server-components"
                className="w-full text-xs font-mono-code bg-[#121722] border border-[#222c3e] rounded-lg px-3.5 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
              />
            </div>
            <span className="text-[10px] text-slate-400 font-mono-code mt-1 block">
              Enter the exact URL, path, or root domain you want VOID to index.
            </span>
          </div>

          <div>
            <label className="text-xs font-mono-code text-slate-300 block mb-1.5">
              Friendly Label / Name
            </label>
            <input
              type="text"
              value={targetName}
              onChange={(e) => setTargetName(e.target.value)}
              placeholder="e.g. React RSC Docs"
              className="w-full text-xs font-mono-code bg-[#121722] border border-[#222c3e] rounded-lg px-3 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* 2. Scope Boundary, Depth, Delay */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-[11px] font-mono-code text-slate-300 block mb-1">
              Scope Boundary Type
            </label>
            <select
              value={scopeType}
              onChange={(e) => setScopeType(e.target.value as any)}
              className="w-full text-xs font-mono-code bg-[#121722] border border-[#222c3e] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="path-prefix">Path Prefix (e.g. /docs/**)</option>
              <option value="domain-only">Domain Only (Strict boundary)</option>
              <option value="subdomains">Domain + All Subdomains</option>
              <option value="cross-domain">Cross-Domain Authority Traversal</option>
              <option value="custom-regex">Custom Regular Expression</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-mono-code text-slate-300 block mb-1">
              Max Crawl Depth
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={maxDepth}
              onChange={(e) => setMaxDepth(parseInt(e.target.value) || 1)}
              className="w-full text-xs font-mono-code bg-[#121722] border border-[#222c3e] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono-code text-slate-300 block mb-1">
              Politeness Delay (ms)
            </label>
            <input
              type="number"
              step="50"
              value={crawlDelayMs}
              onChange={(e) => setCrawlDelayMs(parseInt(e.target.value) || 100)}
              className="w-full text-xs font-mono-code bg-[#121722] border border-[#222c3e] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* 3. Included Path Patterns */}
        <div>
          <label className="text-[11px] font-mono-code text-slate-300 block mb-1">
            Included Path Patterns (Glob syntax: /docs/**, /api/**)
          </label>
          <input
            type="text"
            value={includedPaths}
            onChange={(e) => setIncludedPaths(e.target.value)}
            className="w-full text-xs font-mono-code bg-[#121722] border border-[#222c3e] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 4. Excluded Paths */}
        <div>
          <label className="text-[11px] font-mono-code text-slate-300 block mb-1">
            Excluded Paths (e.g. /login, /cart, /*.zip, /settings)
          </label>
          <input
            type="text"
            value={excludedPaths}
            onChange={(e) => setExcludedPaths(e.target.value)}
            className="w-full text-xs font-mono-code bg-[#121722] border border-[#222c3e] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 5. Content Extraction Filters */}
        <div>
          <label className="text-[11px] font-mono-code text-slate-300 block mb-2">
            Content Extraction Filters
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono-code">
            {[
              { key: 'extractCodeBlocks', label: 'Code Blocks' },
              { key: 'extractHeadings', label: 'H1-H6 Headings' },
              { key: 'extractLinks', label: 'Link Graph' },
              { key: 'extractImages', label: 'Images' },
              { key: 'extractPdfs', label: 'PDFs' },
            ].map((item) => {
              const active = (contentFilter as any)[item.key]
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() =>
                    setContentFilter({
                      ...contentFilter,
                      [item.key]: !active,
                    })
                  }
                  className={`p-2 rounded-lg border text-center transition-colors cursor-pointer ${
                    active
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                      : 'bg-[#121722] text-slate-400 border-[#222c3e] hover:border-slate-500'
                  }`}
                >
                  <span className="block text-xs">{item.label}</span>
                  <span className="text-[10px] font-semibold mt-0.5 block">
                    {active ? '✓ Enabled' : '✕ Disabled'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 6. Gemini Directive */}
        <div>
          <label className="text-[11px] font-mono-code text-violet-300 block mb-1 font-semibold flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-violet-400" />
            Gemini 1.5 Semantic Enrichment Prompt Directive
          </label>
          <textarea
            rows={2}
            value={geminiDirective}
            onChange={(e) => setGeminiDirective(e.target.value)}
            className="w-full text-xs font-mono-code bg-[#121722] border border-violet-500/30 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-violet-500"
          />
        </div>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#1e2638]">
          <div className="text-xs font-mono-code">
            {savedFeedback ? (
              <span className="text-emerald-400 font-bold animate-pulse">✓ {savedFeedback}</span>
            ) : (
              <span className="text-slate-400">
                Saves permanently to backend database (<code className="text-slate-300">targets-db.json</code>).
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={crawlImmediately}
                onChange={(e) => setCrawlImmediately(e.target.checked)}
                className="rounded border-[#2a374d] text-emerald-500 focus:ring-0 bg-[#090c12]"
              />
              <span className="font-mono-code text-[11px] text-emerald-400 font-medium">
                Crawl and index immediately
              </span>
            </label>

            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null)
                  setUrlInput('')
                  setTargetName('')
                }}
                className="px-3.5 py-2 rounded-lg bg-[#18202f] hover:bg-[#222c3e] text-slate-300 text-xs font-mono-code cursor-pointer"
              >
                Cancel Edit
              </button>
            )}

            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono-code transition-all shadow-md shadow-emerald-500/20 cursor-pointer flex items-center gap-2"
            >
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" d="M12 4v16m8-8H4" />
              </svg>
              <span>{editingId ? 'Update Target in DB' : 'Save & Add Target to DB'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Database Listing: Registered Target URLs */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold font-mono-code uppercase text-white flex items-center gap-2">
              <span>Saved Target URLs in Database</span>
              <span className="text-[10px] font-mono-code text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25">
                {filteredTargets.length} Targets
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              These URLs are permanently saved in your scope database. You can crawl, enqueue, or edit any particular URL below.
            </p>
          </div>

          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter saved targets..."
            className="w-56 text-xs font-mono-code bg-[#0e131d] border border-[#222c3e] rounded-lg px-3 py-1.5 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Targets Table / Cards */}
        <div className="rounded-xl border border-[#1e2638] bg-[#0e131d] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono-code">
              <thead className="bg-[#121722] text-slate-400 text-[11px] uppercase border-b border-[#1e2638]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Target URL & Name</th>
                  <th className="px-4 py-3 font-semibold">Scope Type</th>
                  <th className="px-4 py-3 font-semibold">Depth</th>
                  <th className="px-4 py-3 font-semibold">Delay</th>
                  <th className="px-4 py-3 font-semibold">Extraction Filters</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#18202f] bg-[#0b0e14]">
                {filteredTargets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                      No target URLs currently registered in the database. Enter a URL above and click "Save & Add Target to DB".
                    </td>
                  </tr>
                ) : (
                  filteredTargets.map((target) => (
                    <tr key={target.id} className="hover:bg-[#121722] transition-colors group">
                      <td className="px-4 py-3 max-w-sm">
                        <div className="space-y-0.5">
                          <span className="text-white font-bold block truncate">
                            {target.name || target.domain}
                          </span>
                          <span
                            onClick={() => onAnalyzeUrl(target.url)}
                            className="text-xs text-slate-400 hover:text-emerald-300 hover:underline truncate block cursor-pointer"
                            title={target.url}
                          >
                            {target.url}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded bg-[#161c28] border border-[#242f44] text-[10px] text-slate-300">
                          {target.scopeType}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        <span className="px-1.5 py-0.5 rounded bg-[#18202f] text-[10px]">
                          L{target.maxDepth}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-emerald-400">{target.crawlDelayMs}ms</td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-[10px]">
                          {target.contentFilter.extractCodeBlocks && (
                            <span className="px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                              Code
                            </span>
                          )}
                          {target.contentFilter.extractHeadings && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                              Headings
                            </span>
                          )}
                          {target.contentFilter.extractLinks && (
                            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                              Links
                            </span>
                          )}
                          {target.contentFilter.extractPdfs && (
                            <span className="px-1.5 py-0.2 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">
                              PDFs
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          {target.status}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Crawl & Index Now */}
                          <button
                            onClick={() => {
                              if (onCrawlNow) {
                                onCrawlNow(target.url)
                              } else {
                                onAnalyzeUrl(target.url)
                              }
                            }}
                            className="px-2.5 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500 hover:text-slate-950 text-emerald-300 text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 border border-emerald-500/30"
                            title="Crawl & index this target into VOID now"
                          >
                            <span>⚡ Crawl Now</span>
                          </button>

                          {/* Enqueue to Queue */}
                          <button
                            onClick={() => onEnqueueUrl(target.url, target.domain, target.maxDepth)}
                            className="px-2 py-1 rounded bg-[#18202f] hover:bg-[#242f44] text-slate-300 text-[10px] transition-colors cursor-pointer"
                            title="Enqueue URL into active crawler queue"
                          >
                            +Queue
                          </button>

                          {/* Edit / Load into Form */}
                          <button
                            onClick={() => handleLoadTarget(target)}
                            className="px-2 py-1 rounded bg-[#18202f] hover:bg-[#242f44] text-slate-300 text-[10px] transition-colors cursor-pointer"
                            title="Edit this target's configuration"
                          >
                            Edit
                          </button>

                          {/* Delete from DB */}
                          <button
                            onClick={() => {
                              if (confirm(`Remove "${target.url}" from scope database?`)) {
                                onDeleteTarget(target.id)
                              }
                            }}
                            className="p-1 rounded hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition-colors text-[10px] cursor-pointer"
                            title="Delete from database"
                          >
                            <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
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

      {/* Live Scope Rule Validator */}
      <div className="rounded-xl border border-[#1e2638] bg-[#0e131d] p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-blue-400" />
          <h3 className="text-xs font-bold font-mono-code uppercase text-white">
            Live Scope Rule Validator
          </h3>
        </div>
        <p className="text-xs text-slate-400">
          Verify if an arbitrary URL matches or is rejected by the current path patterns and exclusion rules above.
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            value={testUrl}
            onChange={(e) => setTestUrl(e.target.value)}
            placeholder="https://example.com/test-path"
            className="flex-1 text-xs font-mono-code bg-[#121722] border border-[#222c3e] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
          />
          <button
            type="button"
            onClick={handleTestScope}
            className="px-4 py-2 rounded-lg bg-[#18202f] hover:bg-[#222c3e] text-xs font-mono-code text-slate-200 transition-colors cursor-pointer shrink-0"
          >
            Validate URL
          </button>
        </div>

        {testResult && (
          <div
            className={`p-3 rounded-lg border text-xs font-mono-code space-y-1 ${
              testResult.allowed
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="font-bold">
              {testResult.allowed ? '✓ ALLOWED UNDER SCOPE' : '✕ BLOCKED BY SCOPE RULE'}
            </div>
            <p className="text-[11px] text-slate-300">{testResult.reason}</p>
          </div>
        )}
      </div>
    </div>
  )
}
