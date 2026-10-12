import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { MODES } from './modes'
import { Wordmark } from './Wordmark'
import { ChevronDown } from './icons'

type Props = {
  query: string
  mode: string
  onSearch: (q: string) => void
}

const PAGE_SIZE = 10

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
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => {
    const q = query.trim()
    setVisibleCount(PAGE_SIZE)

    if (!q) {
      setResults([])
      setSearchedQuery('')
      return
    }

    setLoading(true)
    setSearchedQuery(q)

    const controller = new AbortController()
    let cancelled = false

    async function executeSearch() {
      try {
        const qLow = q.toLowerCase()

        // 1. Query Supabase cloud index (works on Vercel and production)
        const { data: supabaseDocs, error } = await supabase
          .from('indexed_pages')
          .select('id, url, title, domain, summary, topics, tags, page_type')
          .or(`title.ilike.%${q}%,summary.ilike.%${q}%,url.ilike.%${q}%,domain.ilike.%${q}%`)
          .limit(100)

        if (!cancelled && !error && Array.isArray(supabaseDocs) && supabaseDocs.length > 0) {
          const formatted: SearchResultItem[] = supabaseDocs.map((doc: any) => {
            let pathname = '/'
            try {
              pathname = new URL(doc.url).pathname
            } catch {}
            return {
              title: doc.title || doc.url,
              domain: doc.domain || (doc.url ? new URL(doc.url).hostname : ''),
              path: pathname,
              url: doc.url,
              snippet: doc.summary || '',
            }
          })
          setResults(formatted)
          setLoading(false)
          return
        }

        // 2. Local fallback if Supabase table is empty or local crawler is running
        const localDocs = await fetch('http://localhost:3001/api/crawler/indexed', {
          signal: controller.signal,
        })
          .then((res) => (res.ok ? res.json() : []))
          .catch(() => [])

        if (cancelled) return

        const localMatches: SearchResultItem[] = (Array.isArray(localDocs) ? localDocs : [])
          .filter((doc: any) => {
            const inTitle = doc.title?.toLowerCase().includes(qLow)
            const inUrl = doc.url?.toLowerCase().includes(qLow)
            const inSummary = doc.summary?.toLowerCase().includes(qLow)
            const inTags = doc.tags?.some((t: string) => t.toLowerCase().includes(qLow))
            const inTopics = doc.topics?.some((t: string) => t.toLowerCase().includes(qLow))
            return inTitle || inUrl || inSummary || inTags || inTopics
          })
          .map((doc: any) => {
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
      } catch (err: any) {
        if (!cancelled && err.name !== 'AbortError') {
          console.error('Search error:', err)
          setResults([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    executeSearch()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [query, mode])

  const totalResults = results.length
  const displayedResults = results.slice(0, visibleCount)
  const hasMore = visibleCount < totalResults
  const remainingCount = Math.max(0, totalResults - visibleCount)

  function handleShowMore() {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, totalResults))
  }

  return (
    <section id="search-results" className="relative min-h-[calc(100vh-220px)] pb-16">
      <div
        className="mx-auto w-full max-w-4xl rounded-2xl sm:rounded-3xl px-6 py-6 sm:px-8 sm:py-8 transition-all duration-300 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)]"
      >
        {hasQuery ? (
          <>
            {/* Meta status line with comfortable spacing */}
            <div className="flex items-center justify-between text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 tracking-wide pb-4 border-b border-slate-100 dark:border-slate-800/80">
              <p>
                {loading ? (
                  <span>Searching VOID index...</span>
                ) : (
                  <>
                    {totalResults > PAGE_SIZE ? (
                      <>
                        Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{displayedResults.length}</span> of{' '}
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{totalResults}</span> results for{' '}
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{totalResults}</span> results for{' '}
                      </>
                    )}
                    <span className="font-semibold text-blue-600 dark:text-blue-400">“{searchedQuery || query}”</span> in {modeLabel} · private
                  </>
                )}
              </p>
            </div>

            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                <div className="size-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-light">Searching VOID private index...</p>
              </div>
            ) : totalResults === 0 ? (
              <div className="py-16 text-center text-slate-500 dark:text-slate-400">
                <p className="text-base font-normal text-slate-800 dark:text-slate-100">No results found in VOID index for “{query}”</p>
                <p className="text-xs mt-2 text-slate-400 max-w-sm mx-auto">This page hasn't been crawled yet. You can add it using your VOID Crawler Dashboard.</p>
              </div>
            ) : (
              <>
                {/* Results list with generous rhythm */}
                <ol className="mt-4 flex flex-col divide-y divide-slate-100 dark:divide-slate-800/70">
                  {displayedResults.map((r, i) => (
                    <li key={`${i}-${r.url}`} className="group py-5 sm:py-6 first:pt-2">
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="grid size-4.5 place-items-center rounded-full bg-blue-50 dark:bg-blue-950 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                          {r.domain[0]?.toUpperCase() || 'W'}
                        </span>
                        <span className="truncate max-w-md">
                          {r.domain}
                          {r.path}
                        </span>
                      </div>
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 block font-sans text-lg sm:text-[19px] font-medium tracking-tight text-blue-600 dark:text-blue-400 hover:underline leading-snug"
                      >
                        {r.title}
                      </a>
                      <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                        {r.snippet}
                      </p>
                    </li>
                  ))}
                </ol>

                {/* Show more results button */}
                {hasMore && (
                  <div className="mt-6 flex justify-center border-t border-slate-100 dark:border-slate-800/80 pt-6">
                    <button
                      type="button"
                      onClick={handleShowMore}
                      className="group inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm transition-all hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 active:scale-95 cursor-pointer"
                    >
                      <span>Show more results</span>
                      <span className="text-slate-400">
                        ({remainingCount} remaining)
                      </span>
                      <ChevronDown className="size-3.5 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-y-0.5" />
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          /* Exploration state when scrolling down before typing a query */
          <div className="py-10 text-center sm:py-12">
            <p className="text-[11px] uppercase tracking-widest font-mono text-slate-400">
              Explore Without Being Tracked
            </p>
            <h3 className="mt-2 text-xl font-light text-slate-800 dark:text-slate-100 sm:text-2xl font-sans">
              Curated queries for the curious mind
            </h3>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {EXPLORATION_TOPICS.map((topic) => (
                <button
                  key={topic}
                  onClick={() => onSearch(topic)}
                  className="rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850 px-3.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 transition-all hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* End of results mark */}
        <div className="flex flex-col items-center gap-2 py-10 text-center border-t border-slate-100 dark:border-slate-800/80 mt-6">
          <Wordmark size={18} />
          <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">A quieter way to search</p>
        </div>
      </div>
    </section>
  )
}
