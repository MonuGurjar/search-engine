import type { ViewType } from '../types/dashboard'

type Props = {
  activeView: ViewType
  onSelectView: (v: ViewType) => void
  queueCount: number
  errorCount: number
  targetsCount?: number
}


export function Sidebar({ activeView, onSelectView, queueCount, errorCount, targetsCount = 0 }: Props) {
  const navItems: Array<{
    id: ViewType
    label: string
    icon: string
    badge?: number | string
    badgeVariant?: 'blue' | 'amber' | 'emerald'
  }> = [
    { id: 'overview', label: 'Overview', icon: 'M4 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5zm10 0a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V5zM4 15a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4zm10 0a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-4z' },
    {
      id: 'profiles',
      label: 'Scope & Targets',
      icon: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm0-14a6 6 0 1 0 6 6 6 6 0 0 0-6-6zm0 10a4 4 0 1 1 4-4 4 4 0 0 1-4 4z',
      badge: targetsCount > 0 ? targetsCount : undefined,
      badgeVariant: 'emerald',
    },
    {
      id: 'queue',
      label: 'URL Queue',
      icon: 'M4 6h16M4 12h16M4 18h16',
      badge: queueCount > 0 ? (queueCount > 999 ? `${(queueCount / 1000).toFixed(1)}k` : queueCount) : undefined,
      badgeVariant: 'blue',
    },
    { id: 'crawler', label: 'Crawler & Workers', icon: 'M12 2v4m0 12v4M2 12h4m12 0h4M5 5l3 3m8 8 3 3M5 19l3-3m8-8 3-3' },
    { id: 'indexed', label: 'Indexed Pages', icon: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm0 4h16M4 12h16M4 16h16', badgeVariant: 'emerald' },
    { id: 'domains', label: 'Domains', icon: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm-1 17.93a8 8 0 0 1-6.93-6.93h3.08a14 14 0 0 0 1.85 6.93zm-2-8.93H4.07a8 8 0 0 1 0-2h4.93a16.3 16.3 0 0 0 0 2zm1-3.93a14 14 0 0 0-1.85-6.93A8 8 0 0 1 11 5.07zm2 0h-2c-.37 1.8-.57 3.8-.57 6s.2 4.2.57 6h2c.37-1.8.57-3.8.57-6s-.2-4.2-.57-6z' },
    {
      id: 'errors',
      label: 'Errors & Retries',
      icon: 'M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z',
      badge: errorCount > 0 ? errorCount : undefined,
      badgeVariant: 'amber',
    },
    { id: 'scheduler', label: 'Scheduler', icon: 'M12 2v6m0 8v6M2 12h6m8 0h6' },
    { id: 'settings', label: 'Settings', icon: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54A.48.48 0 0 0 14 2h-4a.48.48 0 0 0-.49.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.63 8.47a.49.49 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.49.41h4c.25 0 .44-.17.49-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.01-1.58zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z' },
  ]
  return (
    <aside className="w-64 shrink-0 flex flex-col bg-[#0e131d] border-r border-[#1e2638] select-none h-screen sticky top-0">
      {/* Brand & Console Title */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-[#1e2638]">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 grid place-items-center">
            <span className="font-mono-code font-bold text-sm text-emerald-400">V</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono-code font-bold text-sm tracking-wider text-white">VOID</span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                Engine
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono-code leading-none mt-0.5">Crawler & Indexer</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 text-[10px] font-semibold font-mono-code text-slate-400 uppercase tracking-widest mb-2">
          Infrastructure
        </p>

        {navItems.map((item) => {
          const active = activeView === item.id
          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer ${
                active
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-500/5'
                  : 'text-slate-300 hover:text-white hover:bg-[#161c28]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <svg
                  className={`size-4 shrink-0 transition-colors ${active ? 'text-emerald-400' : 'text-slate-400'}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span
                  className={`text-[10px] font-mono-code font-medium px-1.5 py-0.5 rounded ${
                    item.badgeVariant === 'amber'
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      : item.badgeVariant === 'emerald'
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer System Telemetry */}
      <div className="p-3 border-t border-[#1e2638] bg-[#0a0d14]/70">
        <div className="rounded-md border border-[#1e2638] bg-[#121722] p-2.5 space-y-2 text-[11px]">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              Engine Status
            </span>
            <span className="font-mono-code text-emerald-400 font-semibold">Online</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-slate-400">Active Queue</span>
            <span className="font-mono-code text-white">{queueCount} URLs</span>
          </div>
        </div>

        <div className="mt-2.5 px-1 flex items-center justify-between text-[11px] text-slate-400">
          <span className="font-mono-code">v1.4.2-engine</span>
          <span className="text-emerald-400 font-medium">Port 3001</span>
        </div>
      </div>
    </aside>
  )
}
