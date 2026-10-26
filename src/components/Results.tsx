import { useState, useEffect } from 'react'
import { searchOpenSearch, type OpenSearchDocument } from '../lib/opensearch'
import { MODES } from './modes'
import {
  ChevronDown,
  GlobeIcon,
  SnapchatIcon,
  PinterestIcon,
  InstagramIcon,
  LinkedinIcon,
  GithubIcon,
  XIcon,
  YoutubeIcon,
  RedditIcon,
  WikipediaIcon,
  FacebookIcon,
  SpotifyIcon,
  StackOverflowIcon,
  DiscordIcon,
  FigmaIcon,
  GoogleIcon,
} from './icons'

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
  highlightedTitle?: string
  highlightedSnippet?: string
  previewImage?: string
  images?: string[]
}

export function Results({ query, mode, onSearch }: Props) {
  const hasQuery = Boolean(query.trim())
  const modeLabel = MODES.find((m) => m.id === mode)?.label ?? 'Web'
  const [results, setResults] = useState<SearchResultItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchedQuery, setSearchedQuery] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [latencyMs, setLatencyMs] = useState(0)

  useEffect(() => {
    const q = query.trim()
    setVisibleCount(PAGE_SIZE)

    if (!q) {
      setResults([])
      setSearchedQuery('')
      setLatencyMs(0)
      return
    }

    setLoading(true)
    setSearchedQuery(q)

    const controller = new AbortController()
    let cancelled = false
    const startTime = performance.now()

    async function executeSearch() {
      try {
        // 1. Query Aiven OpenSearch cluster (distributed full-text & fuzzy BM25)
        const openSearchResult = await searchOpenSearch(
          q,
          mode,
          100,
          controller.signal
        )

        if (!cancelled && openSearchResult.hits.length > 0) {
          const elapsed = Math.round(performance.now() - startTime)
          setLatencyMs(elapsed)
          const formatted: SearchResultItem[] = openSearchResult.hits.map(
            (doc: OpenSearchDocument) => {
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
                highlightedTitle: doc.highlightedTitle,
                highlightedSnippet: doc.highlightedSummary,
                previewImage: doc.preview_image || (doc as any).previewImage || undefined,
                images: Array.isArray(doc.images) ? doc.images : [],
              }
            }
          )
          setResults(formatted)
          setLoading(false)
          return
        }

        // 2. Local fallback if local crawler is running and OpenSearch has no hits
        const localDocs = await fetch('http://localhost:3001/api/crawler/indexed', {
          signal: controller.signal,
        })
          .then(async (res) => {
            if (!res.ok) return []
            const text = await res.text()
            if (!text || !text.trim()) return []
            try {
              return JSON.parse(text)
            } catch {
              return []
            }
          })
          .catch(() => [])

        if (cancelled) return

        const qLow = q.toLowerCase()
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
              previewImage: doc.previewImage,
              images: doc.images || [],
            }
          })

        setResults(localMatches)
      } catch (err: any) {
        if (!cancelled && err.name !== 'AbortError') {
          console.error('OpenSearch query error:', err)
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

  function getDomainIcon(domain: string) {
    const d = domain.toLowerCase()

    if (d.includes('github')) {
      return (
        <span className="grid size-4.5 place-items-center rounded-full bg-[#24292e] text-white">
          <GithubIcon className="size-3" />
        </span>
      )
    }
    if (d.includes('twitter') || d.includes('x.com')) {
      return (
        <span className="grid size-4.5 place-items-center rounded-full bg-black text-white">
          <XIcon className="size-2.5" />
        </span>
      )
    }
    if (d.includes('youtube')) {
      return (
        <span className="grid size-4.5 place-items-center rounded-full bg-[#FF0000] text-white">
          <YoutubeIcon className="size-3" />
        </span>
      )
    }
    if (d.includes('instagram')) {
      return (
        <span className="grid size-4.5 place-items-center rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white">
          <InstagramIcon className="size-3" />
        </span>
      )
    }
    if (d.includes('linkedin')) {
      return (
        <span className="grid size-4.5 place-items-center rounded-full bg-[#0A66C2] text-white">
          <LinkedinIcon className="size-3" />
        </span>
      )
    }
    if (d.includes('reddit')) {
      return (
        <span className="grid size-4.5 place-items-center rounded-full bg-[#FF4500] text-white">
          <RedditIcon className="size-3" />
        </span>
      )
    }
    if (d.includes('wikipedia')) {
      return (
        <span className="grid size-4.5 place-items-center rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200">
          <WikipediaIcon className="size-3" />
        </span>
      )
    }
    if (d.includes('facebook')) {
      return (
        <span className="grid size-4.5 place-items-center rounded-full bg-[#1877F2] text-white">
          <FacebookIcon className="size-3" />
        </span>
      )
    }
    if (d.includes('spotify')) {
      return (
        <span className="grid size-4.5 place-items-center rounded-full bg-[#1DB954] text-white">
          <SpotifyIcon className="size-3" />
        </span>
      )
    }
    if (d.includes('stackoverflow')) {
      return (
        <span className="grid size-4.5 place-items-center rounded-full bg-[#F48024] text-white">
          <StackOverflowIcon className="size-3" />
        </span>
      )
    }
    if (d.includes('discord')) {
      return (
        <span className="grid size-4.5 place-items-center rounded-full bg-[#5865F2] text-white">
          <DiscordIcon className="size-3" />
        </span>
      )
    }
    if (d.includes('figma')) {
      return (
        <span className="grid size-4.5 place-items-center rounded-full bg-black text-white">
          <FigmaIcon className="size-3" />
        </span>
      )
    }
    if (d.includes('google')) {
      return (
        <span className="grid size-4.5 place-items-center rounded-full bg-white text-slate-800 shadow-xs">
          <GoogleIcon className="size-3" />
        </span>
      )
    }
    if (d.includes('snapchat')) {
      return (
        <span className="grid size-4.5 place-items-center rounded-full bg-[#FFFC00] text-black">
          <SnapchatIcon className="size-3" />
        </span>
      )
    }
    if (d.includes('pinterest')) {
      return (
        <span className="grid size-4.5 place-items-center rounded-full bg-[#E60023] text-white">
          <PinterestIcon className="size-3" />
        </span>
      )
    }

    // Dynamic favicon loader with clean initial fallback
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`
    return (
      <span className="relative grid size-4.5 place-items-center rounded-full bg-slate-100 dark:bg-zinc-800 text-[10px] font-semibold text-slate-600 dark:text-zinc-300 overflow-hidden">
        <GlobeIcon className="absolute size-2.5 text-slate-400 dark:text-zinc-500" />
        <img
          src={faviconUrl}
          alt={domain}
          className="relative z-10 size-3.5 object-contain"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none'
          }}
        />
      </span>
    )
  }

  function formatBreadcrumb(domain: string, path: string) {
    const parts = path.split('/').filter(Boolean)
    if (parts.length === 0) return domain
    return `${domain} › ${parts.join(' › ')}`
  }

  return (
    <section id="search-results" className="w-full pb-16">
      <div className="w-full">
        {hasQuery ? (
          <>
            {/* Results meta stat line */}
            <div className="text-xs sm:text-[13px] text-slate-500 dark:text-zinc-400 tracking-normal pb-4">
              {loading ? (
                <span>Searching VOID index...</span>
              ) : (
                <span>
                  About {totalResults.toLocaleString()} results ({latencyMs ? (latencyMs / 1000).toFixed(2) : '0.04'} seconds)
                </span>
              )}
            </div>

            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400 dark:text-zinc-500">
                <div className="size-6 border-2 border-blue-600 dark:border-zinc-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-light">Searching VOID private index...</p>
              </div>
            ) : totalResults === 0 ? (
              <div className="py-16 text-slate-500 dark:text-zinc-400">
                <p className="text-base font-normal text-slate-800 dark:text-zinc-100">No results found for “{query}”</p>
                <p className="text-xs mt-2 text-slate-400 dark:text-zinc-500">This page hasn't been crawled yet. You can add it using your VOID Crawler Dashboard.</p>
              </div>
            ) : (
              <>
                {/* Clean flat Google-style results list without boxy container */}
                <ol className="flex flex-col space-y-7 sm:space-y-8">
                  {displayedResults.map((r, i) => (
                    <li key={`${i}-${r.url}`} className="group max-w-3xl">
                      {/* Domain and breadcrumb */}
                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-zinc-400">
                        {getDomainIcon(r.domain)}
                        <span className="truncate">
                          {formatBreadcrumb(r.domain, r.path)}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-col sm:flex-row items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Result Title */}
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block font-sans text-lg sm:text-[19px] font-medium tracking-tight text-blue-600 dark:text-[#8ab4f8] hover:underline leading-snug"
                          >
                            {r.title}
                          </a>

                          {/* Snippet */}
                          <p
                            dangerouslySetInnerHTML={{ __html: r.highlightedSnippet || r.snippet }}
                            className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-zinc-400"
                          />
                        </div>

                        {/* Image Preview Thumbnail (Google / Arc style with speed optimization & Instagram DP) */}
                        <ResultThumbnail result={r} index={i} />
                      </div>
                    </li>
                  ))}
                </ol>

                {/* Show more results button */}
                {hasMore && (
                  <div className="mt-10 flex justify-start pt-4">
                    <button
                      type="button"
                      onClick={handleShowMore}
                      className="group inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 py-2 text-xs font-medium text-slate-700 dark:text-zinc-300 shadow-xs transition-all hover:border-slate-400 dark:hover:border-zinc-700 dark:hover:text-zinc-100 cursor-pointer"
                    >
                      <span>Show more results</span>
                      <span className="text-slate-400 dark:text-zinc-500">
                        ({remainingCount} remaining)
                      </span>
                      <ChevronDown className="size-3.5 text-slate-400 dark:text-zinc-500 group-hover:text-slate-700 dark:group-hover:text-zinc-300 transition-transform group-hover:translate-y-0.5" />
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          /* Exploration state when empty */
          <div className="py-10 text-center sm:py-12">
            <p className="text-[11px] uppercase tracking-widest font-mono text-slate-400 dark:text-zinc-500">
              Explore Without Being Tracked
            </p>
            <h3 className="mt-2 text-xl font-light text-slate-800 dark:text-zinc-100 sm:text-2xl font-sans">
              Curated queries for the curious mind
            </h3>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {EXPLORATION_TOPICS.map((topic) => (
                <button
                  key={topic}
                  onClick={() => onSearch(topic)}
                  className="rounded-full border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 px-3.5 py-1.5 text-xs text-slate-700 dark:text-zinc-300 transition-all hover:border-slate-400 dark:hover:border-zinc-700 dark:hover:text-zinc-100 cursor-pointer"
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

/**
 * Optimizes thumbnail image delivery:
 * 1. Passes through SVGs and local assets untouched
 * 2. Filters out broken/corrupt base64 splash artifacts
 * 3. Compresses uncompressed 1MB PNG/JPEG files down to ~2KB WebP via Cloudflare CDN proxy
 *    resulting in instantaneous image loads
 */
function getOptimizedThumbnailUrl(src?: string, width = 192, height = 192): string {
  if (!src) return ''
  const trimmed = src.trim()
  if (trimmed.startsWith('data:image/svg+xml') || trimmed.endsWith('.svg') || trimmed.includes('.svg?')) {
    return trimmed
  }
  // Filter out broken base64 raster splash artifacts
  if (trimmed.startsWith('data:image/png;base64') || trimmed.startsWith('data:image/jpeg;base64')) {
    return ''
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return `https://images.weserv.nl/?url=${encodeURIComponent(trimmed)}&w=${width}&h=${height}&fit=cover&output=webp&q=80`
  }
  return trimmed
}

function ResultThumbnail({
  result,
  index,
}: {
  result: SearchResultItem
  index: number
}) {
  const isInstagram =
    result.domain?.toLowerCase().includes('instagram') ||
    result.url?.toLowerCase().includes('instagram.com')

  const rawImage = result.previewImage
  // Ignore corrupt base64 raster splash images and generic SVG logos
  const isGenericOrCorrupt =
    rawImage?.startsWith('data:image/png;base64') ||
    rawImage?.startsWith('data:image/jpeg;base64') ||
    rawImage?.startsWith('data:image/svg+xml')

  const validImage = isGenericOrCorrupt ? undefined : rawImage
  const optimized = validImage ? getOptimizedThumbnailUrl(validImage, 192, 192) : ''
  const [src, setSrc] = useState(optimized)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const nextValid = isGenericOrCorrupt ? undefined : rawImage
    setSrc(nextValid ? getOptimizedThumbnailUrl(nextValid, 192, 192) : '')
    setHasError(false)
  }, [rawImage, isGenericOrCorrupt])

  if (validImage && !hasError) {
    return (
      <a
        href={result.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`shrink-0 group/img relative overflow-hidden ${
          isInstagram
            ? 'rounded-full border-2 border-pink-500/30 ring-2 ring-pink-500/10'
            : 'rounded-xl border border-slate-200 dark:border-zinc-800'
        } bg-slate-100 dark:bg-zinc-900/80 shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all`}
      >
        <img
          src={src}
          alt={result.title}
          loading={index < 3 ? 'eager' : 'lazy'}
          fetchPriority={index < 3 ? 'high' : 'auto'}
          decoding="async"
          referrerPolicy="no-referrer"
          className="size-20 sm:size-24 object-cover object-top transition-transform duration-300 group-hover/img:scale-105"
          onError={() => {
            // If edge proxy fails, attempt fallback to raw image
            if (src !== validImage && validImage) {
              setSrc(validImage)
            } else {
              setHasError(true)
            }
          }}
        />
      </a>
    )
  }

  // Fallback for Instagram profile without direct picture: initial badge
  if (isInstagram) {
    const handle =
      result.url.split('instagram.com/')[1]?.replace(/[/?#].*$/, '') ||
      result.title.match(/@([a-zA-Z0-9_.]+)/)?.[1] ||
      'instagram'
    const initial = (handle.replace(/[^a-zA-Z0-9]/g, '')[0] || 'I').toUpperCase()

    return (
      <a
        href={result.url}
        target="_blank"
        rel="noopener noreferrer"
        title={`Instagram: @${handle}`}
        className="shrink-0 group/img relative overflow-hidden rounded-full border-2 border-pink-500/40 bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 shadow-xs hover:scale-105 transition-all p-0.5"
      >
        <div className="size-20 sm:size-24 rounded-full bg-slate-900/50 backdrop-blur-xs flex flex-col items-center justify-center text-white">
          <span className="text-xl font-bold tracking-tight">{initial}</span>
          <span className="text-[10px] opacity-80 truncate max-w-[60px]">@{handle}</span>
        </div>
      </a>
    )
  }

  return null
}


