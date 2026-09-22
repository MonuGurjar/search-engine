import { useState, useEffect } from 'react'
import { MODES } from './modes'
import { Wordmark } from './Wordmark'

type Props = {
  query: string
  mode: string
  onSearch: (q: string) => void
}

const EXPLORATION_TOPICS = [
  'Monu Gurjar',
  'Instagram Profile',
  'Autonomous AI agents',
  'Cryptographic privacy',
]

type SearchResultItem = {
  title: string
  domain: string
  path: string
  url: string
  snippet: string
}

export function Results({ query, mode, onSearch }: Props) {
  const hasQuery = Boolean(query.trim())
  const modeLabel = MODES.find((m) => m.id === mode)?.label ?? 'Web'
  const [results, setResults] = useState<SearchResultItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchedQuery, setSearchedQuery] = useState('')

  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setResults([])
      setSearchedQuery('')
      return
    }

    setLoading(true)
    setSearchedQuery(q)

    const controller = new AbortController()

    // Query exclusively from VOID Crawler internally indexed database
    fetch('http://localhost:3001/api/crawler/indexed', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : []))
      .catch(() => [])
      .then((indexedDocs: any[]) => {
        const qLow = q.toLowerCase()
        const localMatches: SearchResultItem[] = (Array.isArray(indexedDocs) ? indexedDocs : [])
          .filter((doc) => {
            const inTitle = doc.title?.toLowerCase().includes(qLow)
            const inUrl = doc.url?.toLowerCase().includes(qLow)
            const inSummary = doc.summary?.toLowerCase().includes(qLow)
            const inTags = doc.tags?.some((t: string) => t.toLowerCase().includes(qLow))
            const inTopics = doc.topics?.some((t: string) => t.toLowerCase().includes(qLow))
            return inTitle || inUrl || inSummary || inTags || inTopics
          })
          .map((doc) => {
            let pathname = '/'
            try {
              pathname = new URL(doc.url).pathname
            } catch {}
            return {
              title: doc.title,
              domain: doc.domain,
              path: pathname,
              url: doc.url,
              snippet: doc.summary,
            }
          })

        setResults(localMatches)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Search error:', err)
          setResults([])
        }
      })
      .finally(() => {
        setLoading(false)
      })

    return () => controller.abort()
  }, [query, mode])

  return (
    <section className="relative min-h-[calc(100vh-220px)] pb-16">
      <div
        className="mx-auto w-full max-w-5xl rounded-3xl sm:rounded-[32px] px-6 py-7 sm:px-10 sm:py-9 transition-all duration-300"
        style={{
          background: 'rgba(255, 255, 255, 0.80)',
          backdropFilter: 'blur(40px) saturate(160%)',
          WebkitBackdropFilter: 'blur(40px) saturate(160%)',
          border: '1px solid rgba(216, 222, 224, 0.85)',
          boxShadow:
            '0 24px 64px -20px rgba(37, 54, 60, 0.10), 0 2px 8px rgba(37, 54, 60, 0.04)',
        }}
      >
        {hasQuery ? (
          <>
            {/* Meta status line with comfortable spacing */}
            <div className="flex items-center justify-between text-[13.5px] text-void-muted/80 tracking-wide">
              <p>
                {loading ? (
                  <span>Searching VOID index...</span>
                ) : (
                  <>
                    {results.length} results for{' '}
                    <span className="font-medium text-void-ink">“{searchedQuery || query}”</span> in {modeLabel} · no history saved
                  </>
                )}
              </p>
            </div>

            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-void-muted">
                <div className="size-6 border-2 border-void-green border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-light">Retrieving private search results...</p>
              </div>
            ) : results.length === 0 ? (
              <div className="py-20 text-center text-void-muted">
                <p className="text-lg font-light text-void-ink">No results found in VOID index for “{query}”</p>
                <p className="text-sm mt-1">This page has not been indexed yet. Add and crawl it in your VOID Crawler Dashboard.</p>
              </div>
            ) : (
              /* Results list with generous, open vertical rhythm */
              <ol className="mt-6 sm:mt-8 flex flex-col divide-y divide-void-line/60">
                {results.map((r, i) => (
                  <li key={i} className="group py-7 sm:py-8">
                    <div className="flex items-center gap-2.5 text-[13.5px] text-void-muted">
                      <span className="grid size-5 place-items-center rounded-full bg-void-green/15 text-[11px] font-semibold text-void-green">
                        {r.domain[0].toUpperCase()}
                      </span>
                      <span>
                        {r.domain}
                        {r.path}
                      </span>
                    </div>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 block font-display text-[22px] sm:text-2xl font-normal tracking-tight text-void-ink transition-colors group-hover:text-void-green leading-snug"
                    >
                      {r.title}
                    </a>
                    <p className="mt-2 max-w-3xl text-[15px] sm:text-base leading-relaxed text-void-muted">
                      {r.snippet}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </>
        ) : (
          /* Exploration state when scrolling down before typing a query */
          <div className="py-12 text-center sm:py-16">
            <p className="void-label text-xs tracking-widest text-void-faint">
              Explore Without Being Tracked
            </p>
            <h3 className="mt-2 font-display text-2xl font-light text-void-ink sm:text-3xl">
              Curated queries for the curious mind
            </h3>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
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
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Wordmark size={22} />
          <p className="void-label text-[10px] text-void-faint">The end of the void</p>
        </div>
      </div>
    </section>
  )
}
