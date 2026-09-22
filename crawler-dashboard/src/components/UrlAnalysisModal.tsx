import { useState } from 'react'
import type { ExtractedMetadata } from '../types/dashboard'

type Props = {
  data: ExtractedMetadata | null
  isOpen: boolean
  onClose: () => void
  onReAnalyze?: () => void
  loading?: boolean
}

export function UrlAnalysisModal({ data, isOpen, onClose, onReAnalyze, loading }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'gemini' | 'meta' | 'headings' | 'links'>('overview')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-xl bg-[#0e131d] border border-[#222c3e] shadow-2xl shadow-black overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#1e2638] flex items-center justify-between bg-[#121722]">
          <div className="flex items-center gap-3 min-w-0">
            {data?.favicon ? (
              <img src={data.favicon} alt="" className="size-5 rounded shrink-0 bg-white/10 p-0.5" onError={(e) => ((e.target as HTMLElement).style.display = 'none')} />
            ) : (
              <div className="size-5 rounded bg-emerald-500/20 grid place-items-center text-emerald-400 text-xs font-mono-code font-bold">
                U
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white truncate max-w-md">
                  {loading ? 'Analyzing Target URL...' : data?.title || data?.url}
                </h2>
                {data && (
                  <span
                    className={`text-[10px] font-mono-code font-bold px-2 py-0.5 rounded border ${
                      data.httpStatus >= 200 && data.httpStatus < 300
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    HTTP {data.httpStatus} {data.statusText}
                  </span>
                )}
              </div>
              <p className="text-xs font-mono-code text-slate-400 truncate max-w-xl mt-0.5">
                {data?.url}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onReAnalyze && (
              <button
                onClick={onReAnalyze}
                disabled={loading}
                className="px-3 py-1.5 rounded bg-[#18202f] hover:bg-[#202c40] border border-[#29374d] text-xs font-medium text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <svg className={`size-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Re-Crawl</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="size-8 rounded-lg grid place-items-center hover:bg-[#1f2838] text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Tabs */}
        <div className="px-6 border-b border-[#1e2638] bg-[#0e131d] flex items-center gap-1 overflow-x-auto text-xs font-medium">
          {[
            { id: 'overview', label: 'Overview & Technicals' },
            { id: 'gemini', label: 'Gemini 1.5 AI Enrichment', highlight: true },
            { id: 'meta', label: 'Open Graph & Tags' },
            { id: 'headings', label: `Headings (${(data?.headings.h1.length || 0) + (data?.headings.h2.length || 0)})` },
            { id: 'links', label: `Extracted Links (${data?.extractedLinks.length || 0})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? tab.highlight
                    ? 'border-violet-500 text-violet-300 font-semibold'
                    : 'border-emerald-500 text-emerald-300 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.highlight && <span className="size-1.5 rounded-full bg-violet-400" />}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Modal Content */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-center">
              <div className="size-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-mono-code text-slate-300">Fetching URL & Running Gemini AI Enrichment...</p>
              <p className="text-xs text-slate-400">Executing pipeline: Fetch → Parse → Extract → Gemini → Index</p>
            </div>
          ) : !data ? (
            <div className="py-16 text-center text-slate-400 text-xs">No analysis data loaded.</div>
          ) : (
            <>
              {/* Scope & Verification Banner */}
              <div
                className={`p-3.5 rounded-lg border flex items-center justify-between text-xs ${
                  data.scopeEvaluation.allowed
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {data.scopeEvaluation.allowed ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    )}
                  </svg>
                  <span>
                    <strong className="font-semibold">Scope Status:</strong> {data.scopeEvaluation.reason}
                  </span>
                </div>
                <span className="font-mono-code text-[11px] px-2 py-0.5 rounded bg-black/30">
                  Profile: {data.scopeEvaluation.profileName}
                </span>
              </div>

              {/* TAB 1: OVERVIEW & TECHNICALS */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Technical Meta Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-[#121722] border border-[#1e2638]">
                      <span className="text-[10px] font-mono-code text-slate-400 block uppercase">Canonical URL</span>
                      <span className="text-xs font-mono-code text-slate-200 truncate block mt-0.5" title={data.canonicalUrl}>
                        {data.canonicalUrl}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-[#121722] border border-[#1e2638]">
                      <span className="text-[10px] font-mono-code text-slate-400 block uppercase">Response Latency</span>
                      <span className="text-xs font-mono-code text-emerald-400 font-semibold block mt-0.5">
                        {data.responseTimeMs} ms
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-[#121722] border border-[#1e2638]">
                      <span className="text-[10px] font-mono-code text-slate-400 block uppercase">Page Type</span>
                      <span className="text-xs font-semibold text-white block mt-0.5">
                        {data.pageType}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-[#121722] border border-[#1e2638]">
                      <span className="text-[10px] font-mono-code text-slate-400 block uppercase">Detected Language</span>
                      <span className="text-xs font-mono-code text-slate-200 block mt-0.5">
                        {data.detectedLanguage}
                      </span>
                    </div>
                  </div>

                  {/* Title & Description Box */}
                  <div className="p-4 rounded-lg bg-[#121722] border border-[#1e2638] space-y-3">
                    <div>
                      <span className="text-[10px] uppercase font-mono-code text-slate-400 block">Page Title</span>
                      <h3 className="text-base font-bold text-white mt-1">{data.title}</h3>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-mono-code text-slate-400 block">Meta Description</span>
                      <p className="text-xs text-slate-300 leading-relaxed mt-1">{data.metaDescription}</p>
                    </div>
                  </div>

                  {/* Gemini Summary Card Preview */}
                  <div className="p-4 rounded-lg bg-violet-950/20 border border-violet-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-violet-400 animate-pulse" />
                        <span className="text-xs font-bold text-violet-300 font-mono-code">GEMINI 1.5 FLASH SUMMARY</span>
                      </div>
                      <span className="text-[10px] font-mono-code text-slate-400">
                        Latency: {data.gemini.latencyMs}ms · Score: {data.gemini.crawlPriorityScore}/100
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed">{data.gemini.summary}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {data.gemini.topics.map((tp) => (
                        <span key={tp} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/25 text-violet-200">
                          #{tp}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Keywords Pill List */}
                  <div>
                    <span className="text-[10px] uppercase font-mono-code text-slate-400 block mb-2">
                      Extracted Content Keywords
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {data.keywords.map((kw) => (
                        <span key={kw} className="text-xs font-mono-code px-2 py-0.5 rounded bg-[#161c28] border border-[#222c3e] text-slate-300">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: GEMINI ENRICHMENT DETAIL */}
              {activeTab === 'gemini' && (
                <div className="space-y-5">
                  <div className="p-4 rounded-lg bg-[#141224] border border-violet-500/40 space-y-4">
                    <div className="flex items-center justify-between border-b border-violet-500/20 pb-3">
                      <div>
                        <span className="text-xs font-bold text-violet-300 uppercase tracking-wider font-mono-code flex items-center gap-2">
                          <span className="size-2 rounded-full bg-violet-400" />
                          Gemini 1.5 Flash Metadata Enrichment
                        </span>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Enriching parsed document graph with taxonomy classification, named entities, and intent tags
                        </p>
                      </div>
                      <div className="text-right font-mono-code text-xs">
                        <span className="text-slate-400 block text-[10px]">Model Provider</span>
                        <span className="text-violet-300 font-semibold">{data.gemini.model}</span>
                      </div>
                    </div>

                    {/* Executive Summary */}
                    <div>
                      <span className="text-[10px] font-mono-code uppercase text-slate-400 block mb-1">
                        Executive Summary
                      </span>
                      <p className="text-xs text-slate-200 leading-relaxed p-3 rounded bg-black/30 border border-violet-500/20">
                        {data.gemini.summary}
                      </p>
                    </div>

                    {/* Category & Topic Matrix */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] font-mono-code uppercase text-slate-400 block mb-1.5">
                          Assigned Content Category
                        </span>
                        <div className="p-2.5 rounded bg-black/30 border border-[#222c3e] text-xs font-semibold text-emerald-400 flex items-center gap-2">
                          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          {data.gemini.category}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-mono-code uppercase text-slate-400 block mb-1.5">
                          Detected Semantic Topics
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {data.gemini.topics.map((topic) => (
                            <span
                              key={topic}
                              className="text-xs font-medium px-2.5 py-1 rounded bg-violet-500/15 border border-violet-500/30 text-violet-200"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Named Entities Table */}
                    <div>
                      <span className="text-[10px] font-mono-code uppercase text-slate-400 block mb-2">
                        Important Named Entities ({data.gemini.entities.length})
                      </span>
                      <div className="rounded-lg border border-[#222c3e] overflow-hidden">
                        <table className="w-full text-left text-xs font-mono-code">
                          <thead className="bg-black/40 text-slate-400 text-[11px] border-b border-[#222c3e]">
                            <tr>
                              <th className="px-3 py-2 font-medium">Entity Name</th>
                              <th className="px-3 py-2 font-medium">Type</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1e2638] bg-[#0f141f]">
                            {data.gemini.entities.map((ent, i) => (
                              <tr key={i} className="hover:bg-violet-950/20">
                                <td className="px-3 py-1.5 text-white font-semibold">{ent.name}</td>
                                <td className="px-3 py-1.5 text-slate-300">
                                  <span className="px-1.5 py-0.5 rounded bg-[#1c2436] border border-[#2b374e] text-[10px]">
                                    {ent.type}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Suggested Search Tags */}
                    <div>
                      <span className="text-[10px] font-mono-code uppercase text-slate-400 block mb-2">
                        Suggested Search Query Tags & Ranking Weights
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {data.gemini.suggestedTags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs font-mono-code px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-300"
                          >
                            +{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: OPEN GRAPH & PREVIEWS */}
              {activeTab === 'meta' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Open Graph Card */}
                    <div className="p-4 rounded-lg bg-[#121722] border border-[#1e2638] space-y-3">
                      <span className="text-xs font-bold uppercase font-mono-code text-slate-300 block">
                        Open Graph Metadata
                      </span>
                      <div className="space-y-2 text-xs font-mono-code">
                        <div>
                          <span className="text-slate-400 block text-[10px]">og:title</span>
                          <span className="text-white">{data.openGraph.title || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">og:description</span>
                          <span className="text-slate-300 leading-relaxed block">{data.openGraph.description || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">og:type</span>
                          <span className="text-emerald-400">{data.openGraph.type || 'website'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">og:site_name</span>
                          <span className="text-slate-200">{data.openGraph.siteName || data.domain}</span>
                        </div>
                      </div>
                    </div>

                    {/* Preview Image Card */}
                    <div className="p-4 rounded-lg bg-[#121722] border border-[#1e2638] space-y-3">
                      <span className="text-xs font-bold uppercase font-mono-code text-slate-300 block">
                        Social Card Preview
                      </span>
                      {data.openGraph.image ? (
                        <div className="rounded-lg overflow-hidden border border-[#222c3e] bg-black">
                          <img
                            src={data.openGraph.image}
                            alt="Open Graph preview"
                            className="w-full h-44 object-cover"
                            onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                          />
                          <div className="p-3">
                            <p className="text-xs font-bold text-white truncate">{data.openGraph.title || data.title}</p>
                            <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{data.openGraph.description || data.metaDescription}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="h-44 rounded-lg bg-[#0b0e14] border border-[#222c3e] grid place-items-center text-xs text-slate-400">
                          No og:image specified on page
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: HEADINGS HIERARCHY */}
              {activeTab === 'headings' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-[#121722] border border-[#1e2638] space-y-3">
                    <span className="text-xs font-bold uppercase font-mono-code text-slate-300 block">
                      H1 Headings ({data.headings.h1.length})
                    </span>
                    <ul className="space-y-1.5">
                      {data.headings.h1.map((h, i) => (
                        <li key={i} className="p-2 rounded bg-black/30 border border-[#222c3e] text-xs text-white font-semibold">
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-lg bg-[#121722] border border-[#1e2638] space-y-3">
                    <span className="text-xs font-bold uppercase font-mono-code text-slate-300 block">
                      H2 Headings ({data.headings.h2.length})
                    </span>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {data.headings.h2.map((h, i) => (
                        <li key={i} className="p-2 rounded bg-black/30 border border-[#222c3e] text-xs text-slate-200">
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* TAB 5: EXTRACTED OUTBOUND LINKS */}
              {activeTab === 'links' && (
                <div className="rounded-lg border border-[#222c3e] overflow-hidden">
                  <table className="w-full text-left text-xs font-mono-code">
                    <thead className="bg-[#121722] text-slate-400 text-[11px] border-b border-[#222c3e]">
                      <tr>
                        <th className="px-4 py-2 font-medium">Link Anchor Text</th>
                        <th className="px-4 py-2 font-medium">Target URL</th>
                        <th className="px-4 py-2 font-medium">Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e2638] bg-[#0e131d]">
                      {data.extractedLinks.map((link, i) => (
                        <tr key={i} className="hover:bg-[#161c28]">
                          <td className="px-4 py-2 text-slate-200 font-medium truncate max-w-xs">{link.text}</td>
                          <td className="px-4 py-2 text-slate-400 truncate max-w-md" title={link.url}>
                            {link.url}
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                link.internal
                                  ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                                  : 'bg-slate-700 text-slate-300'
                              }`}
                            >
                              {link.internal ? 'Internal' : 'Outbound'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
