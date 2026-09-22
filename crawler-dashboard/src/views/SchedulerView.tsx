import { useState } from 'react'
import type { CronJob, CrawlProfile } from '../types/dashboard'

type Props = {
  jobs: CronJob[]
  profiles: CrawlProfile[]
  onToggleJob: (id: string) => void
  onTriggerJob: (id: string) => void
  onAddJob?: (job: Omit<CronJob, 'id' | 'lastRun' | 'nextRun'>) => void
}

export function SchedulerView({ jobs, profiles, onToggleJob, onTriggerJob, onAddJob }: Props) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [name, setName] = useState('')
  const [cronExpr, setCronExpr] = useState('0 4 * * *')
  const [seedUrl, setSeedUrl] = useState('')
  const [profileId, setProfileId] = useState(profiles[0]?.id || 'tech-docs')
  const [maxPages, setMaxPages] = useState(1000)

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !seedUrl) return

    onAddJob?.({
      name,
      cronExpr,
      seedUrl,
      profileId,
      maxPages,
      status: 'Active',
    })

    setName('')
    setSeedUrl('')
    setShowAddModal(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white font-mono-code">
              Automated Cron Crawl Scheduler ({jobs.length} Schedules)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Periodic synchronization routines for sitemaps, RSS feeds, preprint archives, and ecosystem doc sweeps.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono-code transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Create Cron Task</span>
        </button>
      </div>

      {/* Cron Jobs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {jobs.length === 0 ? (
          <div className="col-span-1 md:col-span-2 py-16 text-center text-slate-400 text-xs font-mono-code rounded-xl border border-[#1e2638] bg-[#0e131d]">
            No automated cron schedules created yet. Click "Create Cron Task" above to register a recurring crawl schedule.
          </div>
        ) : (
          jobs.map((job) => {
            const isActive = job.status === 'Active'
            return (
              <div
                key={job.id}
                className="p-5 rounded-xl border border-[#1e2638] bg-[#0e131d] space-y-4 hover:border-slate-600 transition-colors shadow-sm"
              >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`size-2 rounded-full ${
                        isActive ? 'bg-emerald-400' : 'bg-slate-600'
                      }`}
                    />
                    <h3 className="text-sm font-bold text-white font-mono-code">{job.name}</h3>
                  </div>
                  <p className="text-xs font-mono-code text-slate-400 truncate max-w-sm mt-1">
                    {job.seedUrl}
                  </p>
                </div>

                <button
                  onClick={() => onToggleJob(job.id)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono-code font-bold transition-colors cursor-pointer border ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {job.status}
                </button>
              </div>

              {/* Specs & Metrics */}
              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-[#121722] border border-[#1e2638] text-xs font-mono-code">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Cron Expression</span>
                  <span className="text-emerald-400 font-bold">{job.cronExpr}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Profile</span>
                  <span className="text-slate-200">{job.profileId}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Max Pages</span>
                  <span className="text-white">{job.maxPages}</span>
                </div>
              </div>

              {/* Execution timestamps & Run button */}
              <div className="flex items-center justify-between pt-1 border-t border-[#1e2638] text-xs font-mono-code">
                <div className="space-y-0.5 text-[11px]">
                  <span className="text-slate-400 block">
                    Next Run: <strong className="text-slate-200">{job.nextRun.split('T')[0]}</strong>
                  </span>
                </div>

                <button
                  onClick={() => onTriggerJob(job.id)}
                  className="px-3 py-1.5 rounded-lg bg-[#18202f] hover:bg-emerald-500 hover:text-slate-950 text-slate-300 text-xs font-mono-code font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Trigger Run Now</span>
                </button>
              </div>
            </div>
          )
          })
        )}
      </div>

      {/* Add Cron Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl bg-[#0e131d] border border-[#222c3e] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1e2638] pb-3">
              <h3 className="text-sm font-bold font-mono-code uppercase text-white">
                Create Recurring Crawl Schedule
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-mono-code text-slate-300 block mb-1">Task Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Daily TypeScript Docs Sync"
                  className="w-full text-xs font-mono-code bg-[#121722] border border-[#222c3e] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-mono-code text-slate-300 block mb-1">Seed or Sitemap URL</label>
                <input
                  type="text"
                  required
                  value={seedUrl}
                  onChange={(e) => setSeedUrl(e.target.value)}
                  placeholder="https://example.com/sitemap.xml"
                  className="w-full text-xs font-mono-code bg-[#121722] border border-[#222c3e] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-mono-code text-slate-300 block mb-1">Cron Expression</label>
                  <input
                    type="text"
                    required
                    value={cronExpr}
                    onChange={(e) => setCronExpr(e.target.value)}
                    placeholder="0 4 * * *"
                    className="w-full text-xs font-mono-code bg-[#121722] border border-[#222c3e] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono-code text-slate-300 block mb-1">Scope Profile</label>
                  <select
                    value={profileId}
                    onChange={(e) => setProfileId(e.target.value)}
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
                  <label className="text-xs font-mono-code text-slate-300 block mb-1">Max Pages</label>
                  <input
                    type="number"
                    value={maxPages}
                    onChange={(e) => setMaxPages(parseInt(e.target.value) || 1000)}
                    className="w-full text-xs font-mono-code bg-[#121722] border border-[#222c3e] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1e2638]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#18202f] text-xs font-mono-code text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono-code cursor-pointer"
                >
                  Create Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
