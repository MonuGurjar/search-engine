import { useState } from 'react'

type Stage = {
  id: string
  name: string
  subtitle: string
  stat: string
  latency: string
  status: 'active' | 'idle' | 'warning'
  description: string
}

const STAGES: Stage[] = [
  {
    id: 'seed',
    name: 'Seed URL',
    subtitle: 'Queue Dispatch',
    stat: 'Queue Dispatch',
    latency: '< 2ms',
    status: 'active',
    description: 'Prioritizes seeds based on domain priority, freshness score, and profile crawl delay politeness rules.',
  },
  {
    id: 'scope',
    name: 'Scope Check',
    subtitle: 'Rule Validation',
    stat: 'Rule Gate',
    latency: '< 1ms',
    status: 'active',
    description: 'Validates target URL against active crawl profile boundaries, path inclusions/exclusions, and robots.txt.',
  },
  {
    id: 'fetch',
    name: 'HTTP Fetch',
    subtitle: 'Network Client',
    stat: 'HTTP/2 Client',
    latency: 'Network SLA',
    status: 'active',
    description: 'Executes HTTP/2 request with customized VOID crawler user-agent, respects gzip/brotli, and records status.',
  },
  {
    id: 'parse',
    name: 'HTML Parse',
    subtitle: 'DOM Tokenizer',
    stat: 'DOM Tokenizer',
    latency: '< 20ms',
    status: 'active',
    description: 'Constructs DOM tree, resolves relative URLs to canonical targets, and strips scripts/styles/noise.',
  },
  {
    id: 'extract',
    name: 'Extract Meta',
    subtitle: 'Signal Harvest',
    stat: 'Meta & OG Extract',
    latency: '< 10ms',
    status: 'active',
    description: 'Extracts title, meta description, Open Graph cards, H1-H3 headings, internal/external links, and keywords.',
  },
  {
    id: 'gemini',
    name: 'Gemini Enrichment',
    subtitle: 'AI Semantic Class',
    stat: 'Gemini Flash',
    latency: 'API Bound',
    status: 'active',
    description: 'Secure server-side LLM inference: generates 2-sentence executive summary, topics, category, entities, and search tags.',
  },
  {
    id: 'normalize',
    name: 'Normalize',
    subtitle: 'Sanitize & Vector',
    stat: 'Dedupe & Vectorize',
    latency: '< 10ms',
    status: 'active',
    description: 'Cleans text entities, computes document hash for deduplication, and normalizes ranking score.',
  },
  {
    id: 'index',
    name: 'Inverted Index',
    subtitle: 'Postings Commit',
    stat: 'BM25 Commit',
    latency: '< 15ms',
    status: 'active',
    description: 'Commits enriched document into the VOID Search engine inverted index with BM25 + semantic vector weights.',
  },
]

export function PipelineGraph() {
  const [selectedStage, setSelectedStage] = useState<Stage>(STAGES[5])

  return (
    <div className="rounded-xl border border-[#1e2638] bg-[#0e131d] p-4 lg:p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono-code">
              Crawl & Indexing Pipeline Architecture
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Sequential stages from seed dispatch to secure Gemini AI enrichment and inverted index commit
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono-code">
          <span className="text-slate-400">Pipeline SLA:</span>
          <span className="text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
            Nominal & Ready
          </span>
        </div>
      </div>

      {/* Interactive Node Flow */}
      <div className="overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex items-center min-w-[960px] gap-2">
          {STAGES.map((st, index) => {
            const isSelected = selectedStage.id === st.id
            const isGemini = st.id === 'gemini'
            return (
              <div key={st.id} className="flex items-center flex-1">
                <button
                  onClick={() => setSelectedStage(st)}
                  className={`w-full text-left p-3 rounded-lg border transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? isGemini
                        ? 'bg-violet-500/20 border-violet-500 shadow-md shadow-violet-500/10 ring-1 ring-violet-500/40'
                        : 'bg-emerald-500/15 border-emerald-500 shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500/40'
                      : isGemini
                      ? 'bg-[#151324] border-violet-500/30 hover:border-violet-500/60'
                      : 'bg-[#121722] border-[#222c3e] hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-mono-code text-slate-400 font-semibold">0{index + 1}</span>
                    <span
                      className={`text-[9px] font-mono-code font-bold px-1.5 py-0.2 rounded ${
                        isGemini
                          ? 'bg-violet-500/20 text-violet-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {st.latency}
                    </span>
                  </div>

                  <p className={`text-xs font-semibold truncate ${isGemini ? 'text-violet-200' : 'text-slate-200'}`}>
                    {st.name}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate font-mono-code">{st.stat}</p>
                </button>

                {index < STAGES.length - 1 && (
                  <div className="px-1 text-slate-400 shrink-0">
                    <svg className="size-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected Stage Detail Drawer / Card */}
      <div className="mt-3 p-3.5 rounded-lg bg-[#121722] border border-[#222c3e] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded bg-[#18202f] border border-[#273347] shrink-0 font-mono-code text-emerald-400 font-bold">
            STAGE
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">{selectedStage.name}</span>
              <span className="text-[11px] text-slate-400 font-mono-code">({selectedStage.subtitle})</span>
            </div>
            <p className="text-slate-300 mt-1 leading-relaxed">{selectedStage.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0 font-mono-code text-[11px] border-t md:border-t-0 md:border-l border-[#222c3e] pt-2 md:pt-0 md:pl-4">
          <div>
            <span className="text-slate-400 block">Metric</span>
            <span className="text-white font-semibold">{selectedStage.stat}</span>
          </div>
          <div>
            <span className="text-slate-400 block">Avg Cost</span>
            <span className="text-emerald-400 font-semibold">{selectedStage.latency}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
