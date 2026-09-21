import { MODES } from './modes'
import { Wordmark } from './Wordmark'

type Props = {
  query: string
  mode: string
  onSearch: (q: string) => void
}

const EXPLORATION_TOPICS = [
  'Cryptographic privacy',
  'Deep sea geology',
  'Autonomous AI agents',
  'Orbital mechanics',
  'Zero knowledge proofs',
  'Ancient libraries',
]

/** Deterministic mock results */
function mockResults(query: string) {
  const q = query.trim()
  if (!q) return []

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

export function Results({ query, mode, onSearch }: Props) {
  const hasQuery = Boolean(query.trim())
  const results = mockResults(query)
  const modeLabel = MODES.find((m) => m.id === mode)?.label ?? 'Web'

  return (
    <section className="relative">
      <div className="mx-auto w-full max-w-5xl px-6 pt-0 sm:px-10">
        {hasQuery ? (
          <>
            {/* Meta status line */}
            <p className="text-[13px] text-void-faint">
              {results.length}+ private results for{' '}
              <span className="font-medium text-void-muted">“{query}”</span> in {modeLabel} · no
              history saved
            </p>

            {/* Results list */}
            <ol className="mt-3 flex flex-col divide-y divide-void-line/60">
              {results.map((r, i) => (
                <li key={i} className="group py-5">
                  <div className="flex items-center gap-2 text-[13px] text-void-muted">
                    <span className="grid size-5 place-items-center rounded-full bg-void-green/12 text-[10px] font-medium text-void-green">
                      {r.domain[0].toUpperCase()}
                    </span>
                    <span>
                      {r.domain}
                      {r.path}
                    </span>
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
          </>
        ) : (
          /* Exploration state when scrolling down before typing a query */
          <div className="py-6 text-center sm:py-8">
            <p className="void-label text-xs tracking-widest text-void-faint">
              Explore Without Being Tracked
            </p>
            <h3 className="mt-2 font-display text-2xl font-light text-void-ink sm:text-3xl">
              Curated queries for the curious mind
            </h3>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
              {EXPLORATION_TOPICS.map((topic) => (
                <button
                  key={topic}
                  onClick={() => onSearch(topic)}
                  className="rounded-full border border-void-line/80 bg-white/70 px-4 py-2 text-sm text-void-ink backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-void-green/50 hover:bg-white hover:text-void-green cursor-pointer"
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* End of results mark */}
        <div className="flex flex-col items-center gap-3 py-12 text-center sm:py-16">
          <Wordmark size={22} />
          <p className="void-label text-[10px] text-void-faint">The end of the void</p>
        </div>
      </div>
    </section>
  )
}
