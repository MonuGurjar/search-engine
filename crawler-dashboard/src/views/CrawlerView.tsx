import { useState } from 'react'

import type { QueueItem } from '../types/dashboard'

type Props = {
  isCrawling: boolean
  onToggleCrawl: () => void
  queue?: QueueItem[]
}

type WorkerThread = {
  id: string
  name: string
  stage: 'FETCH' | 'PARSE' | 'EXTRACT' | 'GEMINI' | 'IDLE'
  currentUrl: string
  elapsedMs: number
  processedCount: number
  status: 'active' | 'idle' | 'backoff'
}

export function CrawlerView({ isCrawling, onToggleCrawl, queue = [] }: Props) {
  const [concurrency, setConcurrency] = useState(8)
  const [rateLimitPerDomain, setRateLimitPerDomain] = useState(4)
  const [httpTimeoutSec, setHttpTimeoutSec] = useState(8)
  const [robotsPolicy, setRobotsPolicy] = useState<'strict' | 'relaxed' | 'ignore'>('strict')
  const [customUserAgent, setCustomUserAgent] = useState(
    'VOID-Crawler/1.4.2 (+https://voidsearch.internal/bot; indexing@void.internal)'
  )

  const workers: WorkerThread[] = Array.from({ length: concurrency }).map((_, index) => {
    const threadNum = String(index + 1).padStart(2, '0')
    if (!isCrawling) {
      return {
        id: `w-${index + 1}`,
        name: `Worker Thread #${threadNum}`,
        stage: 'IDLE',
        currentUrl: 'Worker pool suspended — Engine is paused',
        elapsedMs: 0,
        processedCount: 0,
        status: 'idle',
      }
    }

    const assignedItem = queue[index]
    if (assignedItem) {
      return {
        id: `w-${index + 1}`,
        name: `Worker Thread #${threadNum}`,
        stage: 'FETCH',
        currentUrl: assignedItem.url,
        elapsedMs: 45,
        processedCount: 1,
        status: 'active',
      }
    }

    return {
      id: `w-${index + 1}`,
      name: `Worker Thread #${threadNum}`,
      stage: 'IDLE',
      currentUrl:
        queue.length === 0
          ? 'Idle — Queue empty. Enqueue URLs to dispatch.'
          : 'Idle — Awaiting next queue dispatch',
      elapsedMs: 0,
      processedCount: 0,
      status: 'idle',
    }
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white font-mono-code">
              Crawler Orchestration & Worker Telemetry
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time process thread pools, concurrency allocation, asynchronous I/O sockets, and rate-limiting politeness.
          </p>
        </div>

        <button
          onClick={onToggleCrawl}
          className={`px-4 py-2 rounded-lg text-xs font-mono-code font-bold transition-all flex items-center gap-2 cursor-pointer ${
            isCrawling
              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
          }`}
        >
          <span
            className={`size-2 rounded-full ${isCrawling ? 'bg-amber-400 animate-ping' : 'bg-slate-950'}`}
          />
          <span>{isCrawling ? 'Pause Worker Pool' : 'Resume Worker Pool'}</span>
        </button>
      </div>

      {/* Telemetry Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-[#0e131d] border border-[#1e2638]">
          <span className="text-[10px] uppercase font-mono-code text-slate-400 block">
            Engine State
          </span>
          <span
            className={`text-sm font-bold font-mono-code block mt-1 ${
              isCrawling ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {isCrawling ? 'ACTIVE / DISPATCHING' : 'SUSPENDED'}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0e131d] border border-[#1e2638]">
          <span className="text-[10px] uppercase font-mono-code text-slate-400 block">
            Online Workers
          </span>
          <span className="text-sm font-bold font-mono-code text-white block mt-1">
            {concurrency} Threads (Allocated)
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0e131d] border border-[#1e2638]">
          <span className="text-[10px] uppercase font-mono-code text-slate-400 block">
            Throughput Rate
          </span>
          <span className="text-sm font-bold font-mono-code text-emerald-400 block mt-1">
            {isCrawling && queue.length > 0 ? 'Active dispatch' : '0.0 req / sec'}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0e131d] border border-[#1e2638]">
          <span className="text-[10px] uppercase font-mono-code text-slate-400 block">
            Runtime Host
          </span>
          <span className="text-sm font-bold font-mono-code text-slate-200 block mt-1">
            Port 3001 (Node.js)
          </span>
        </div>
      </div>

      {/* Workers Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold font-mono-code uppercase text-white flex items-center gap-2">
            <span>Active Worker Pool ({workers.length} Threads)</span>
          </h3>
          <span className="text-[11px] text-slate-400 font-mono-code">
            Auto-scaling enabled up to 32 workers
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {workers.map((worker) => (
            <div
              key={worker.id}
              className="p-3.5 rounded-xl bg-[#0e131d] border border-[#1e2638] flex flex-col justify-between space-y-2 relative"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono-code text-white">
                  {worker.name}
                </span>

                <span
                  className={`text-[9px] font-mono-code font-bold px-1.5 py-0.5 rounded border ${
                    worker.stage === 'GEMINI'
                      ? 'bg-violet-500/15 text-violet-300 border-violet-500/30'
                      : worker.stage === 'FETCH'
                      ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                      : worker.stage === 'PARSE'
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : worker.stage === 'EXTRACT'
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {worker.stage}
                </span>
              </div>

              <div className="min-w-0">
                <p
                  className="text-[11px] font-mono-code text-slate-300 truncate"
                  title={worker.currentUrl}
                >
                  {worker.currentUrl}
                </p>
              </div>

              <div className="pt-2 border-t border-[#18202f] flex items-center justify-between text-[10px] font-mono-code text-slate-400">
                <span>Done: {worker.processedCount}</span>
                <span>{worker.elapsedMs > 0 ? `${worker.elapsedMs}ms` : 'Idle'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Concurrency & Rate Limit Tuner Panel */}
      <div className="p-5 rounded-xl border border-[#1e2638] bg-[#0e131d] space-y-5">
        <h3 className="text-xs font-bold font-mono-code uppercase text-white border-b border-[#1e2638] pb-3">
          Crawler Network & Concurrency Tuners
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <div className="flex items-center justify-between mb-1 text-xs font-mono-code">
              <label className="text-slate-300">Max Worker Threads</label>
              <span className="text-emerald-400 font-bold">{concurrency}</span>
            </div>
            <input
              type="range"
              min="1"
              max="32"
              value={concurrency}
              onChange={(e) => setConcurrency(parseInt(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <span className="text-[10px] text-slate-400 font-mono-code block mt-1">
              Controls parallel HTTP sockets and parser subprocesses.
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1 text-xs font-mono-code">
              <label className="text-slate-300">Per-Domain Rate Limit</label>
              <span className="text-emerald-400 font-bold">{rateLimitPerDomain} req/s</span>
            </div>
            <input
              type="range"
              min="1"
              max="16"
              value={rateLimitPerDomain}
              onChange={(e) => setRateLimitPerDomain(parseInt(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <span className="text-[10px] text-slate-400 font-mono-code block mt-1">
              Enforces polite crawl boundaries to avoid HTTP 429 rate limit triggers.
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1 text-xs font-mono-code">
              <label className="text-slate-300">Socket Timeout</label>
              <span className="text-emerald-400 font-bold">{httpTimeoutSec}s</span>
            </div>
            <input
              type="range"
              min="2"
              max="30"
              value={httpTimeoutSec}
              onChange={(e) => setHttpTimeoutSec(parseInt(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <span className="text-[10px] text-slate-400 font-mono-code block mt-1">
              Abort controller deadline before dropping stalled endpoints.
            </span>
          </div>
        </div>

        {/* Robots.txt & User-Agent */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="text-xs font-mono-code text-slate-300 block mb-1">
              robots.txt Compliance Strategy
            </label>
            <select
              value={robotsPolicy}
              onChange={(e) => setRobotsPolicy(e.target.value as any)}
              className="w-full text-xs font-mono-code bg-[#121722] border border-[#222c3e] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="strict">Strict (Respect all Disallow directives & Crawl-delay)</option>
              <option value="relaxed">Relaxed (Respect User-Agent specific rules only)</option>
              <option value="ignore">Developer Bypass (Ignore robots.txt for testing)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-mono-code text-slate-300 block mb-1">
              Crawler User-Agent Header
            </label>
            <input
              type="text"
              value={customUserAgent}
              onChange={(e) => setCustomUserAgent(e.target.value)}
              className="w-full text-xs font-mono-code bg-[#121722] border border-[#222c3e] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
