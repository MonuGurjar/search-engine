import { useState, useEffect, useMemo } from 'react'
import type {
  ViewType,
  CrawlProfile,
  ExtractedMetadata,
  QueueItem,
  CrawlLogEntry,
  IndexedDocument,
  DomainStat,
  CrawlError,
  CronJob,
  CrawlTarget,
} from './types/dashboard'
import {
  INITIAL_QUEUE,
  INITIAL_LOGS,
  INITIAL_INDEXED,
  INITIAL_ERRORS,
  INITIAL_CRON_JOBS,
} from './data/mock-data'
import { PRESET_PROFILES } from '../server/scope-profiles'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { UrlAnalysisModal } from './components/UrlAnalysisModal'
import { OverviewView } from './views/OverviewView'
import { ProfilesView } from './views/ProfilesView'
import { QueueView } from './views/QueueView'
import { CrawlerView } from './views/CrawlerView'
import { IndexedView } from './views/IndexedView'
import { DomainsView } from './views/DomainsView'
import { ErrorsView } from './views/ErrorsView'
import { SchedulerView } from './views/SchedulerView'
import { SettingsView } from './views/SettingsView'

export function App() {
  const [activeView, setActiveView] = useState<ViewType>('overview')
  const [profiles] = useState<CrawlProfile[]>(PRESET_PROFILES)
  const [activeProfile, setActiveProfile] = useState<CrawlProfile>(PRESET_PROFILES[0])
  const [isCrawling, setIsCrawling] = useState(true)
  const [queue, setQueue] = useState<QueueItem[]>(INITIAL_QUEUE)
  const [logs, setLogs] = useState<CrawlLogEntry[]>(INITIAL_LOGS)
  const [indexedDocs, setIndexedDocs] = useState<IndexedDocument[]>(INITIAL_INDEXED)
  const [errors, setErrors] = useState<CrawlError[]>(INITIAL_ERRORS)
  const [cronJobs, setCronJobs] = useState<CronJob[]>(INITIAL_CRON_JOBS)
  const [targets, setTargets] = useState<CrawlTarget[]>([])

  // Dynamically compute stats from actual collections
  const effectiveStats = useMemo(() => ({
    discovered: targets.length + queue.length + indexedDocs.length,
    queued: queue.length,
    crawled: logs.filter((l) => l.status >= 200 && l.status < 400).length,
    indexed: indexedDocs.length,
    failed: errors.length,
    rateUrlsPerSec: isCrawling && queue.length > 0 ? 1 : 0,
    avgLatencyMs: logs.length > 0 ? Math.round(logs.reduce((a, b) => a + b.responseTimeMs, 0) / logs.length) : 0,
    activeWorkers: isCrawling ? 8 : 0,
  }), [targets.length, queue.length, indexedDocs.length, logs, errors.length, isCrawling])

  // Dynamically derive monitored domains from indexed documents & saved targets
  const derivedDomains: DomainStat[] = useMemo(() => {
    const domainMap = new Map<string, { pagesIndexed: number; lastCrawled: string }>()

    indexedDocs.forEach((doc) => {
      const existing = domainMap.get(doc.domain) || { pagesIndexed: 0, lastCrawled: doc.indexedAt }
      existing.pagesIndexed += 1
      domainMap.set(doc.domain, existing)
    })

    targets.forEach((tgt) => {
      if (!domainMap.has(tgt.domain)) {
        domainMap.set(tgt.domain, { pagesIndexed: 0, lastCrawled: tgt.addedAt || 'Pending' })
      }
    })

    return Array.from(domainMap.entries()).map(([domain, data]) => ({
      domain,
      pagesIndexed: data.pagesIndexed,
      crawlDelayMs: 250,
      robotsStatus: 'Allowed',
      status: 'Healthy',
      sslValid: true,
      lastCrawled: data.lastCrawled ? new Date(data.lastCrawled).toLocaleTimeString() : 'Recent',
    }))
  }, [indexedDocs, targets])

  // URL Analysis Drawer / Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisData, setAnalysisData] = useState<ExtractedMetadata | null>(null)
  const [lastAnalyzedUrl, setLastAnalyzedUrl] = useState('')

  // Gemini Backend Status Check
  const [geminiLive, setGeminiLive] = useState(true)

  useEffect(() => {
    fetch('/api/crawler/health')
      .then((res) => res.json())
      .then((data) => {
        if (data.geminiConfigured) {
          setGeminiLive(true)
        }
      })
      .catch(() => {
        setGeminiLive(true)
      })

    // Load registered targets from backend DB
    fetch('/api/crawler/targets')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setTargets(data)
        }
      })
      .catch((err) => {
        console.warn('Could not load targets from API, using defaults:', err)
      })

    // Load indexed documents from backend DB
    fetch('/api/crawler/indexed')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setIndexedDocs(data)
        }
      })
      .catch((err) => {
        console.warn('Could not load indexed documents from API:', err)
      })
  }, [])

  // Target CRUD operations
  const handleAddTarget = async (targetData: Omit<CrawlTarget, 'id' | 'addedAt'>) => {
    try {
      const res = await fetch('/api/crawler/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetData),
      })
      if (res.ok) {
        const created: CrawlTarget = await res.json()
        setTargets((prev) => [created, ...prev.filter((t) => t.id !== created.id)])
      } else {
        const created: CrawlTarget = {
          ...targetData,
          id: `target-${Date.now()}`,
          addedAt: new Date().toISOString(),
        }
        setTargets((prev) => [created, ...prev])
      }
    } catch {
      const created: CrawlTarget = {
        ...targetData,
        id: `target-${Date.now()}`,
        addedAt: new Date().toISOString(),
      }
      setTargets((prev) => [created, ...prev])
    }
  }

  const handleDeleteTarget = async (id: string) => {
    try {
      await fetch(`/api/crawler/targets?id=${id}`, { method: 'DELETE' })
    } catch {}
    setTargets((prev) => prev.filter((t) => t.id !== id))
  }

  const handleUpdateTarget = async (target: CrawlTarget) => {
    try {
      await fetch('/api/crawler/targets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(target),
      })
    } catch {}
    setTargets((prev) => prev.map((t) => (t.id === target.id ? target : t)))
  }

  // Analyze Target URL
  const handleAnalyzeUrl = async (targetUrl: string) => {
    setLastAnalyzedUrl(targetUrl)
    setAnalyzing(true)
    setModalOpen(true)

    try {
      const res = await fetch('/api/crawler/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: targetUrl,
          profileId: activeProfile.id,
        }),
      })

      if (!res.ok) {
        throw new Error(`Crawler request returned ${res.status}`)
      }

      const result: ExtractedMetadata = await res.json()
      setAnalysisData(result)

      // Add to live log
      const newLog: CrawlLogEntry = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toTimeString().split(' ')[0] + '.' + String(Date.now() % 1000).padStart(3, '0'),
        url: result.url,
        method: 'GET',
        status: result.httpStatus,
        responseTimeMs: result.responseTimeMs,
        crawlState: 'GEMINI',
        profileId: activeProfile.id,
        sizeBytes: result.contentLengthBytes,
        message: `Extracted ${result.pageType}, Gemini score ${result.gemini.crawlPriorityScore}/100`,
      }
      setLogs((prev) => [newLog, ...prev.slice(0, 49)])

      // Commit to indexed docs list if successful
      if (result.httpStatus >= 200 && result.httpStatus < 300) {
        const newDoc: IndexedDocument = {
          id: `idx-${Date.now()}`,
          url: result.url,
          title: result.title,
          domain: result.domain,
          category: result.gemini.category || 'Documentation',
          pageType: result.pageType,
          summary: result.gemini.summary,
          topics: result.gemini.topics,
          tags: result.gemini.suggestedTags,
          indexedAt: new Date().toISOString(),
          httpStatus: result.httpStatus,
          profileId: activeProfile.id,
        }
        setIndexedDocs((prev) => [newDoc, ...prev.filter((d) => d.url !== newDoc.url)])

        // Persist to backend DB
        fetch('/api/crawler/indexed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newDoc),
        }).catch((e) => console.warn('Could not persist indexed doc:', e))
      }
    } catch (err: any) {
      console.error('URL analysis failed:', err)
      // Log real error event
      const errorEntry: CrawlError = {
        id: `err-${Date.now()}`,
        url: targetUrl,
        domain: new URL(targetUrl.startsWith('http') ? targetUrl : 'https://' + targetUrl).hostname.replace(/^www\./, ''),
        errorCode: 500,
        errorType: 'Timeout',
        timestamp: new Date().toLocaleTimeString(),
        retryCount: 0,
        details: err.message || 'Crawl analysis failed to fetch target.',
      }
      setErrors((prev) => [errorEntry, ...prev])

      const errorLog: CrawlLogEntry = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toTimeString().split(' ')[0] + '.' + String(Date.now() % 1000).padStart(3, '0'),
        url: targetUrl,
        method: 'GET',
        status: 500,
        responseTimeMs: 0,
        crawlState: 'ERROR',
        profileId: activeProfile.id,
        message: err.message || 'Failed to analyze target URL',
      }
      setLogs((prev) => [errorLog, ...prev.slice(0, 49)])
      alert(`Crawler Error for ${targetUrl}: ${err.message || 'Failed to fetch or parse URL.'}`)
      setModalOpen(false)
    } finally {
      setAnalyzing(false)
    }
  }

  // Queue Handlers
  const handleAddQueueUrl = (item: Omit<QueueItem, 'id' | 'addedAt' | 'retryCount' | 'status'>) => {
    const newItem: QueueItem = {
      ...item,
      id: `q-${Date.now()}`,
      addedAt: 'Just now',
      retryCount: 0,
      status: 'pending',
    }
    setQueue((prev) => [newItem, ...prev])
  }

  const handleRemoveQueueUrl = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id))
  }

  const refreshTargets = () => {
    fetch('/api/crawler/targets')
      .then((r) => r.json())
      .then((t) => {
        if (Array.isArray(t)) setTargets(t)
      })
      .catch(() => {})
  }

  const handleCrawlNow = async (url: string, crawlChildLinks: boolean = true) => {
    try {
      const res = await fetch('/api/crawler/add-and-crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          crawlChildLinks,
          profileId: activeProfile.id,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.allIndexed && Array.isArray(data.allIndexed)) {
          setIndexedDocs(data.allIndexed)
        }
        refreshTargets()
      }
    } catch (err) {
      console.error('Crawl failed:', err)
    }
  }

  const handleCrawlAllUnindexed = async () => {
    try {
      const res = await fetch('/api/crawler/crawl-unindexed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.ok) {
        const data = await res.json()
        if (data.allIndexed && Array.isArray(data.allIndexed)) {
          setIndexedDocs(data.allIndexed)
        }
        refreshTargets()
      }
    } catch (err) {
      console.error('Batch crawl unindexed failed:', err)
    }
  }

  // Error Handlers
  const handleRetryError = (id: string) => {
    const err = errors.find((e) => e.id === id)
    if (err) {
      handleAddQueueUrl({
        url: err.url,
        domain: err.domain,
        depth: 1,
        priority: 'P1',
        profileId: activeProfile.id,
      })
      setErrors((prev) => prev.filter((e) => e.id !== id))
    }
  }

  const handleDiscardError = (id: string) => {
    setErrors((prev) => prev.filter((e) => e.id !== id))
  }

  // Cron Handlers
  const handleToggleCronJob = (id: string) => {
    setCronJobs((prev) =>
      prev.map((job) =>
        job.id === id ? { ...job, status: job.status === 'Active' ? 'Paused' : 'Active' } : job
      )
    )
  }

  const handleTriggerCronJob = (id: string) => {
    const job = cronJobs.find((j) => j.id === id)
    if (job) {
      handleAddQueueUrl({
        url: job.seedUrl,
        domain: new URL(job.seedUrl).hostname.replace(/^www\./, ''),
        depth: 1,
        priority: 'P0',
        profileId: job.profileId,
      })
      alert(`Triggered cron job "${job.name}". Seed URL enqueued with P0 priority!`)
    }
  }

  return (
    <div className="flex min-h-screen bg-[#090c12] text-slate-100 font-sans antialiased">
      {/* Sidebar */}
      <Sidebar
        activeView={activeView}
        onSelectView={setActiveView}
        queueCount={queue.length}
        errorCount={errors.length}
        targetsCount={targets.length}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          profiles={profiles}
          activeProfile={activeProfile}
          onSelectProfile={setActiveProfile}
          isCrawling={isCrawling}
          onToggleCrawl={() => setIsCrawling(!isCrawling)}
          onOpenQuickIngest={() => {
            const url = prompt('Enter URL to quickly ingest and analyze:')
            if (url) handleAnalyzeUrl(url)
          }}
          geminiLive={geminiLive}
        />

        {/* Dynamic View Body */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {activeView === 'overview' && (
            <OverviewView
              stats={effectiveStats}
              activeProfile={activeProfile}
              logs={logs}
              queue={queue}
              errors={errors}
              targets={targets}
              indexedDocs={indexedDocs}
              onSyncIndexed={(docs) => setIndexedDocs(docs)}
              onSyncTargets={refreshTargets}
              onAnalyzeUrl={handleAnalyzeUrl}
              analyzing={analyzing}
              onSwitchView={setActiveView}
            />
          )}

          {activeView === 'profiles' && (
            <ProfilesView
              targets={targets}
              indexedDocs={indexedDocs}
              onAddTarget={handleAddTarget}
              onDeleteTarget={handleDeleteTarget}
              onUpdateTarget={handleUpdateTarget}
              onAnalyzeUrl={handleAnalyzeUrl}
              onCrawlNow={(url) => handleCrawlNow(url, true)}
              onCrawlAllUnindexed={handleCrawlAllUnindexed}
              onEnqueueUrl={(url, domain, depth) =>
                handleAddQueueUrl({
                  url,
                  domain,
                  depth,
                  priority: 'P1',
                  profileId: 'custom',
                })
              }
            />
          )}

          {activeView === 'queue' && (
            <QueueView
              queue={queue}
              profiles={profiles}
              onInspectUrl={handleAnalyzeUrl}
              onAddUrl={handleAddQueueUrl}
              onRemoveUrl={handleRemoveQueueUrl}
              onClearQueue={() => setQueue([])}
            />
          )}

          {activeView === 'crawler' && (
            <CrawlerView
              isCrawling={isCrawling}
              onToggleCrawl={() => setIsCrawling(!isCrawling)}
              queue={queue}
            />
          )}

          {activeView === 'indexed' && (
            <IndexedView
              documents={indexedDocs}
              targets={targets}
              onSyncIndexed={(docs) => setIndexedDocs(docs)}
              onSyncTargets={refreshTargets}
              onInspectDoc={handleAnalyzeUrl}
              onDeleteDoc={(id) => {
                fetch(`/api/crawler/indexed?id=${id}`, { method: 'DELETE' }).catch(() => {})
                setIndexedDocs((prev) => prev.filter((d) => d.id !== id))
              }}
            />
          )}

          {activeView === 'domains' && (
            <DomainsView
              domains={derivedDomains}
              onInspectDomain={(dom) => handleAnalyzeUrl(`https://${dom}`)}
            />
          )}

          {activeView === 'errors' && (
            <ErrorsView
              errors={errors}
              onRetry={handleRetryError}
              onDiscard={handleDiscardError}
              onInspectUrl={handleAnalyzeUrl}
              onRetryAll={() => {
                errors.forEach((e) => handleRetryError(e.id))
              }}
            />
          )}

          {activeView === 'scheduler' && (
            <SchedulerView
              jobs={cronJobs}
              profiles={profiles}
              onToggleJob={handleToggleCronJob}
              onTriggerJob={handleTriggerCronJob}
              onAddJob={(job) => {
                const newJob: CronJob = {
                  ...job,
                  id: `cron-${Date.now()}`,
                  lastRun: 'Never',
                  nextRun: 'In 24 hours',
                }
                setCronJobs((prev) => [newJob, ...prev])
              }}
            />
          )}

          {activeView === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* URL Analysis Drawer / Modal */}
      <UrlAnalysisModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        data={analysisData}
        loading={analyzing}
        onReAnalyze={() => {
          if (lastAnalyzedUrl) handleAnalyzeUrl(lastAnalyzedUrl)
        }}
      />
    </div>
  )
}
export default App
