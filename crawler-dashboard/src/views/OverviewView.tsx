import type {
  CrawlProfile,
  CrawlLogEntry,
  QueueItem,
  CrawlError,
  CrawlTarget,
  IndexedDocument,
} from '../types/dashboard'
import { PipelineGraph } from '../components/PipelineGraph'
import { LiveLogs } from '../components/LiveLogs'
import { SimpleCrawlBar } from '../components/SimpleCrawlBar'

type Props = {
  stats: {
    discovered: number
    queued: number
    crawled: number
    indexed: number
    failed: number
    rateUrlsPerSec: number
    avgLatencyMs: number
    activeWorkers: number
  }
  activeProfile: CrawlProfile
  logs: CrawlLogEntry[]
  queue?: QueueItem[]
  errors?: CrawlError[]
  targets?: CrawlTarget[]
  indexedDocs?: IndexedDocument[]
  onSyncIndexed?: (docs: IndexedDocument[]) => void
  onSyncTargets?: () => void
  onAnalyzeUrl: (url: string) => void
  analyzing: boolean
  onSwitchView: (view: any) => void
}

export function OverviewView({
  stats,
  activeProfile,
  logs,
  queue = [],
  errors = [],
  targets = [],
  indexedDocs = [],
  onSyncIndexed,
  onSyncTargets,
  onAnalyzeUrl,
  analyzing: _analyzing,
  onSwitchView,
}: Props) {
  const PRESET_URLS = [
    { label: 'React RSC Reference', url: 'https://react.dev/reference/rsc/server-components' },
    { label: 'arXiv: Mamba Paper', url: 'https://arxiv.org/abs/2312.00752' },
    { label: 'MDN WebAssembly', url: 'https://developer.mozilla.org/en-US/docs/Web/API/WebAssembly' },
    { label: 'GitHub React Repo', url: 'https://github.com/facebook/react' },
  ]

  return (
    <div className="space-y-6">
      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-[#0e131d] border border-[#1e2638] shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-bl-full pointer-events-none" />
          <span className="text-[11px] font-mono-code text-slate-400 uppercase tracking-wider block">
            Discovered URLs
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono-code text-white tracking-tight">
              {stats.discovered.toLocaleString()}
            </span>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono-code mt-1 block">
            {stats.discovered > 0 ? 'Live Registered Targets' : 'Awaiting Targets'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#0e131d] border border-[#1e2638] shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-bl-full pointer-events-none" />
          <span className="text-[11px] font-mono-code text-slate-400 uppercase tracking-wider block">
            Queued
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono-code text-amber-300 tracking-tight">
              {stats.queued.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-400 font-mono-code">items</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono-code mt-1 block">
            {queue.length > 0
              ? `P0: ${queue.filter((q) => q.priority === 'P0').length} · P1: ${queue.filter((q) => q.priority === 'P1').length} · P2: ${queue.filter((q) => q.priority === 'P2').length}`
              : 'Queue empty'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#0e131d] border border-[#1e2638] shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-bl-full pointer-events-none" />
          <span className="text-[11px] font-mono-code text-slate-400 uppercase tracking-wider block">
            Crawled
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono-code text-slate-200 tracking-tight">
              {stats.crawled.toLocaleString()}
            </span>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono-code mt-1 block">
            {stats.crawled > 0 ? `${stats.crawled} processed` : '0 processed'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#0e131d] border border-emerald-500/30 bg-emerald-500/[0.02] shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-bl-full pointer-events-none" />
          <span className="text-[11px] font-mono-code text-emerald-400 uppercase tracking-wider block">
            Indexed into VOID
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono-code text-emerald-300 tracking-tight">
              {stats.indexed.toLocaleString()}
            </span>
          </div>
          <span className="text-[10px] text-emerald-400/80 font-mono-code mt-1 block">
            {stats.indexed > 0 ? `${stats.indexed} documents in index` : 'Index ready'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#0e131d] border border-[#1e2638] shadow-sm relative overflow-hidden group col-span-2 sm:col-span-1">
          <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/5 rounded-bl-full pointer-events-none" />
          <span className="text-[11px] font-mono-code text-slate-400 uppercase tracking-wider block">
            Failed / 4xx / 5xx
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono-code text-rose-400 tracking-tight">
              {stats.failed}
            </span>
            <span className="text-[11px] text-slate-400 font-mono-code">
              {errors.length > 0 ? `${errors.length} total errors` : '0 errors'}
            </span>
          </div>
          <span className="text-[10px] text-rose-400/80 font-mono-code mt-1 block">
            {errors.length > 0
              ? `${errors.filter((e) => e.retryCount > 0).length} pending retry`
              : 'No crawl errors'}
          </span>
        </div>
      </div>

      {/* Hero URL Ingest & Live Crawl Command Center */}
      <SimpleCrawlBar
        targets={targets}
        indexedDocs={indexedDocs}
        onSyncIndexed={onSyncIndexed || (() => {})}
        onSyncTargets={onSyncTargets}
        activeProfileId={activeProfile.id}
      />

      {/* Quick Test Targets */}
      <div className="p-3.5 rounded-xl border border-[#1e2638] bg-[#0e131d] flex items-center justify-between gap-3 flex-wrap text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-mono-code text-slate-400">Quick Test Links:</span>
          {PRESET_URLS.map((item) => (
            <button
              key={item.url}
              onClick={() => {
                onAnalyzeUrl(item.url)
              }}
              className="px-2.5 py-1 rounded-md bg-[#161c28] hover:bg-[#1f2838] border border-[#232d3f] hover:border-slate-500 text-[11px] font-mono-code text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              {item.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => onSwitchView('profiles')}
          className="text-xs font-mono-code text-emerald-400 hover:underline cursor-pointer"
        >
          Manage Scope & Targets →
        </button>
      </div>

      {/* 7-Stage Pipeline Visualizer */}
      <PipelineGraph />

      {/* Scope Envelope Card */}
      <div className="p-4 rounded-xl bg-[#0e131d] border border-[#1e2638] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-mono-code text-slate-400">Active Scope Envelope:</span>
            <span className="text-xs font-semibold text-white">{activeProfile.name}</span>
            <span className="px-2 py-0.5 rounded bg-[#18202f] text-[10px] font-mono-code text-emerald-400 border border-[#253247]">
              {activeProfile.scopeType}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono-code">
            Allowed Domains: {activeProfile.allowedDomains.join(', ')} · Max Depth: {activeProfile.maxDepth} · Rate Delay: {activeProfile.crawlDelayMs}ms
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onSwitchView('profiles')}
            className="px-3 py-1.5 rounded bg-[#161c28] hover:bg-[#1e2638] border border-[#232d3f] text-xs font-mono-code text-slate-300 transition-colors cursor-pointer"
          >
            Configure Scope Rules →
          </button>
        </div>
      </div>

      {/* Live Log Feed */}
      <LiveLogs logs={logs} onInspectUrl={onAnalyzeUrl} />
    </div>
  )
}
