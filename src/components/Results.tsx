import { useState } from 'react'
import { ArrowLeft } from './icons'
import { MODES } from './modes'
import { ModePills } from './ModePills'
import { SearchBar } from './SearchBar'
import { Wordmark } from './Wordmark'

type Props = {
  query: string
  mode: string
  onMode: (id: string) => void
  onSearch: (q: string) => void
  onHome: () => void
}

/** Deterministic mock results — the architecture is ready for a real backend. */
function mockResults(query: string) {
  const q = query.trim()
  const domains = [
    'wikipedia.org',
    'arxiv.org',
    'nature.com',
    'stanford.edu',
    'archive.org',
    'openlibrary.org',
  ]
  const frames = [
    `Understanding ${q}: a private overview`,
    `${q} — background, context and history`,
    `A quiet guide to ${q}`,
    `${q}: sources without tracking`,
    `Everything about ${q}, from primary sources`,
    `${q} explained, calmly`,
  ]
  const snippets = [
    `A concise, privacy-first summary of ${q} drawn from open sources, with no profiling and no stored search history.`,
    `Explore ${q} through curated references. VOID surfaces relevant material while keeping your queries anonymous.`,
    `Primary documents and peer-reviewed writing on ${q}, ranked for relevance rather than engagement.`,
    `Read about ${q} without ads, trackers, or personalized manipulation of what you see.`,
    `Background on ${q}, presented plainly. Follow the sources; nothing follows you.`,
    `Open, verifiable information on ${q} — the way the web was meant to be searched.`,
  ]
  return frames.map((title, i) => ({
    title,
    domain: domains[i % domains.length],
    path: `/wiki/${encodeURIComponent(q.replace(/\s+/g, '_'))}`,
    snippet: snippets[i % snippets.length],
  }))
}

export function Results({ query, mode, onMode, onSearch, onHome }: Props) {
  const [value, setValue] = useState(query)
  const results = mockResults(query)
  const modeLabel = MODES.find((m) => m.id === mode)?.label ?? 'Web'

  return (
    <section className="relative min-h-[calc(100vh-88px)]">
      <div className="mx-auto w-full max-w-5xl px-6 pt-4 sm:px-10">
        {/* search row */}
        <div className="flex items-center gap-4">
          <button
            onClick={onHome}
            aria-label="Back to home"
            className="hidden shrink-0 items-center gap-2 text-sm text-void-muted transition-colors hover:text-void-ink sm:flex"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="flex-1">
            <SearchBar value={value} onChange={setValue} onSubmit={onSearch} compact />
          </div>
        </div>

        <div className="mt-5">
          <div className="flex justify-center sm:justify-start">
            <ModePills active={mode} onChange={onMode} compact />
          </div>
        </div>

        {/* meta */}
        <p className="mt-6 text-[13px] text-void-faint">
          {results.length}+ private results for{' '}
          <span className="text-void-muted">“{query}”</span> in {modeLabel} · no history saved
        </p>

        {/* results */}
        <ol className="mt-4 flex flex-col divide-y divide-void-line/60">
          {results.map((r, i) => (
            <li key={i} className="group py-6">
              <div className="flex items-center gap-2 text-[13px] text-void-muted">
                <span className="grid size-5 place-items-center rounded-full bg-void-green/12 text-void-green text-[10px] font-medium">
                  {r.domain[0].toUpperCase()}
                </span>
                <span>{r.domain}{r.path}</span>
              </div>
              <a
                href="#"
                className="mt-1.5 block font-display text-xl font-normal text-void-ink transition-colors group-hover:text-void-green"
              >
                {r.title}
              </a>
              <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-void-muted">
                {r.snippet}
              </p>
            </li>
          ))}
        </ol>

        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Wordmark size={22} />
          <p className="void-label text-[10px] text-void-faint">The end of the void</p>
        </div>
      </div>
    </section>
  )
}
