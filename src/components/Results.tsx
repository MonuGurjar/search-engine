import { useState, useEffect, useMemo, useCallback } from "react"
import { searchOpenSearch, type OpenSearchDocument } from "../lib/opensearch"
import { sanitizeHref, sanitizeHighlightHtml } from "../lib/sanitizer"
import { ExternalLink, X, ChevronLeft, ChevronRight } from "lucide-react"
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
} from "./icons"

type Props = {
  query: string
  mode: string
  onSearch: (q: string) => void
}

const TEXT_PAGE_SIZE = 10
const IMAGE_PAGE_SIZE = 24

const EXPLORATION_TOPICS = [
  "Monu Gurjar",
  "Instagram Profile",
  "Autonomous AI agents",
  "Cryptographic privacy",
]

type SearchResultItem = {
  title: string
  domain: string
  path: string
  url: string
  snippet: string
  score?: number
  headings?: string[]
  canonicalUrl?: string
  highlightedTitle?: string
  highlightedSnippet?: string
  highlightedContent?: string
  previewImage?: string
  images?: string[]
}

export type ImageResultCard = {
  id: string
  imageUrl: string
  title: string
  pageUrl: string
  domain: string
}

function isValidImageUrl(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false
  const trimmed = url.trim()
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://"))
    return false
  if (
    trimmed.includes("facebook.com/tr") ||
    trimmed.includes("doubleclick.net") ||
    trimmed.includes("google-analytics.com")
  ) {
    return false
  }
  if (
    trimmed.startsWith("data:image/png;base64") ||
    trimmed.startsWith("data:image/jpeg;base64")
  ) {
    return false
  }
  return true
}

export function Results({ query, mode, onSearch }: Props) {
  const isImageMode = mode === "images"
  const pageSize = isImageMode ? IMAGE_PAGE_SIZE : TEXT_PAGE_SIZE
  const hasQuery = Boolean(query.trim())
  const [results, setResults] = useState<SearchResultItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(pageSize)
  const [latencyMs, setLatencyMs] = useState(0)
  const [retryTrigger, setRetryTrigger] = useState(0)
  const [selectedImage, setSelectedImage] = useState<ImageResultCard | null>(
    null,
  )

  useEffect(() => {
    const q = query.trim()
    setVisibleCount(isImageMode ? IMAGE_PAGE_SIZE : TEXT_PAGE_SIZE)
    setError(null)
    setSelectedImage(null)

    if (!q) {
      setResults([])
      setLatencyMs(0)
      return
    }

    setLoading(true)

    const controller = new AbortController()
    let cancelled = false
    const startTime = performance.now()

    async function executeSearch() {
      try {
        const openSearchResult = await searchOpenSearch(
          q,
          mode,
          100,
          controller.signal,
        )

        if (cancelled) return

        const elapsed = Math.round(performance.now() - startTime)
        setLatencyMs(elapsed)

        const formatted: SearchResultItem[] = openSearchResult.hits.map(
          (doc: OpenSearchDocument) => {
            let pathname = "/"
            try {
              pathname = new URL(doc.url).pathname
            } catch {}
            return {
              title: doc.title || doc.url,
              domain: doc.domain || (doc.url ? new URL(doc.url).hostname : ""),
              path: pathname,
              url: doc.url,
              canonicalUrl: doc.canonical_url || doc.canonicalUrl,
              snippet: doc.summary || doc.description || "",
              score: typeof doc.score === "number" ? doc.score : undefined,
              headings: Array.isArray(doc.headings) ? doc.headings : [],
              highlightedTitle: doc.highlightedTitle,
              highlightedSnippet:
                doc.highlightedSummary || doc.highlightedContent,
              highlightedContent: doc.highlightedContent,
              previewImage:
                doc.preview_image || (doc as any).previewImage || undefined,
              images: Array.isArray(doc.images) ? doc.images : [],
            }
          },
        )

        setResults(formatted)
        setError(null)
      } catch (err: any) {
        if (!cancelled && err.name !== "AbortError") {
          console.error("[Results] Search execution error:", err)
          setError(
            "Failed to fetch search results. The service might be temporarily unavailable.",
          )
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
  }, [query, mode, retryTrigger, isImageMode])

  // Extract all images for Google Images mode
  const allImageCards: ImageResultCard[] = useMemo(() => {
    if (!isImageMode) return []
    const cards: ImageResultCard[] = []
    const seenUrls = new Set<string>()

    for (const r of results) {
      const candidates: string[] = []
      if (isValidImageUrl(r.previewImage)) candidates.push(r.previewImage!)
      if (Array.isArray(r.images)) {
        for (const img of r.images) {
          if (isValidImageUrl(img)) candidates.push(img)
        }
      }

      for (const imgUrl of candidates) {
        if (!seenUrls.has(imgUrl)) {
          seenUrls.add(imgUrl)
          cards.push({
            id: `${r.url}-${imgUrl}`,
            imageUrl: imgUrl,
            title: r.title,
            pageUrl: r.url,
            domain: r.domain,
          })
        }
      }
    }
    return cards
  }, [results, isImageMode])

  // Handle modal keyboard navigation (Esc, ArrowLeft, ArrowRight)
  const currentImageIdx = useMemo(() => {
    if (!selectedImage) return -1
    return allImageCards.findIndex((c) => c.imageUrl === selectedImage.imageUrl)
  }, [selectedImage, allImageCards])

  const showPreviousImage = useCallback(() => {
    if (currentImageIdx > 0) {
      setSelectedImage(allImageCards[currentImageIdx - 1])
    }
  }, [currentImageIdx, allImageCards])

  const showNextImage = useCallback(() => {
    if (currentImageIdx < allImageCards.length - 1) {
      setSelectedImage(allImageCards[currentImageIdx + 1])
    }
  }, [currentImageIdx, allImageCards])

  useEffect(() => {
    if (!selectedImage) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSelectedImage(null)
      } else if (e.key === "ArrowLeft") {
        showPreviousImage()
      } else if (e.key === "ArrowRight") {
        showNextImage()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedImage, showPreviousImage, showNextImage])

  const totalResults = isImageMode ? allImageCards.length : results.length
  const displayedResults = results.slice(0, visibleCount)
  const displayedImages = allImageCards.slice(0, visibleCount)
  const hasMore = visibleCount < totalResults
  const remainingCount = Math.max(0, totalResults - visibleCount)

  function handleShowMore() {
    setVisibleCount((prev) => Math.min(prev + pageSize, totalResults))
  }

  function getDomainIcon(domain: string) {
    const d = domain.toLowerCase()

    if (d.includes("github")) {
      return (
        <span className="grid size-4 place-items-center rounded-full bg-[#24292e] text-white shrink-0">
          <GithubIcon className="size-2.5" />
        </span>
      )
    }
    if (d.includes("twitter") || d.includes("x.com")) {
      return (
        <span className="grid size-4 place-items-center rounded-full bg-black text-white shrink-0">
          <XIcon className="size-2" />
        </span>
      )
    }
    if (d.includes("youtube")) {
      return (
        <span className="grid size-4 place-items-center rounded-full bg-[#FF0000] text-white shrink-0">
          <YoutubeIcon className="size-2.5" />
        </span>
      )
    }
    if (d.includes("instagram")) {
      return (
        <span className="grid size-4 place-items-center rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white shrink-0">
          <InstagramIcon className="size-2.5" />
        </span>
      )
    }
    if (d.includes("linkedin")) {
      return (
        <span className="grid size-4 place-items-center rounded-full bg-[#0A66C2] text-white shrink-0">
          <LinkedinIcon className="size-2.5" />
        </span>
      )
    }
    if (d.includes("reddit")) {
      return (
        <span className="grid size-4 place-items-center rounded-full bg-[#FF4500] text-white shrink-0">
          <RedditIcon className="size-2.5" />
        </span>
      )
    }
    if (d.includes("wikipedia")) {
      return (
        <span className="grid size-4 place-items-center rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 shrink-0">
          <WikipediaIcon className="size-2.5" />
        </span>
      )
    }
    if (d.includes("facebook")) {
      return (
        <span className="grid size-4 place-items-center rounded-full bg-[#1877F2] text-white shrink-0">
          <FacebookIcon className="size-2.5" />
        </span>
      )
    }
    if (d.includes("spotify")) {
      return (
        <span className="grid size-4 place-items-center rounded-full bg-[#1DB954] text-white shrink-0">
          <SpotifyIcon className="size-2.5" />
        </span>
      )
    }
    if (d.includes("stackoverflow")) {
      return (
        <span className="grid size-4 place-items-center rounded-full bg-[#F48024] text-white shrink-0">
          <StackOverflowIcon className="size-2.5" />
        </span>
      )
    }
    if (d.includes("discord")) {
      return (
        <span className="grid size-4 place-items-center rounded-full bg-[#5865F2] text-white shrink-0">
          <DiscordIcon className="size-2.5" />
        </span>
      )
    }
    if (d.includes("figma")) {
      return (
        <span className="grid size-4 place-items-center rounded-full bg-black text-white shrink-0">
          <FigmaIcon className="size-2.5" />
        </span>
      )
    }
    if (d.includes("google")) {
      return (
        <span className="grid size-4 place-items-center rounded-full bg-white text-slate-800 shadow-xs shrink-0">
          <GoogleIcon className="size-2.5" />
        </span>
      )
    }
    if (d.includes("snapchat")) {
      return (
        <span className="grid size-4 place-items-center rounded-full bg-[#FFFC00] text-black shrink-0">
          <SnapchatIcon className="size-2.5" />
        </span>
      )
    }
    if (d.includes("pinterest")) {
      return (
        <span className="grid size-4 place-items-center rounded-full bg-[#E60023] text-white shrink-0">
          <PinterestIcon className="size-2.5" />
        </span>
      )
    }

    const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`
    return (
      <span className="relative grid size-4 place-items-center rounded-full bg-slate-100 dark:bg-zinc-800 text-[10px] font-semibold text-slate-600 dark:text-zinc-300 overflow-hidden shrink-0">
        <GlobeIcon className="absolute size-2 text-slate-400 dark:text-zinc-500" />
        <img
          src={faviconUrl}
          alt={domain}
          className="relative z-10 size-3 object-contain"
          onError={(e) => {
            ;(e.target as HTMLElement).style.display = "none"
          }}
        />
      </span>
    )
  }

  function formatBreadcrumb(domain: string, path: string) {
    const parts = path.split("/").filter(Boolean)
    if (parts.length === 0) return domain
    return `${domain} › ${parts.join(" › ")}`
  }

  return (
    <section id="search-results" className="w-full pb-16">
      <div className="w-full">
        {hasQuery ? (
          <>
            {/* Results meta stat line */}
            <div className="text-xs sm:text-[13px] text-slate-500 dark:text-zinc-400 tracking-normal pb-4">
              {loading ? (
                <span>
                  Searching VOID {isImageMode ? "images" : "index"}...
                </span>
              ) : error ? (
                <span className="text-rose-500 dark:text-rose-400">
                  Search notice
                </span>
              ) : (
                <span>
                  About {totalResults.toLocaleString()}{" "}
                  {isImageMode ? "images" : "results"} (
                  {latencyMs ? (latencyMs / 1000).toFixed(2) : "0.04"} seconds)
                </span>
              )}
            </div>

            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400 dark:text-zinc-500">
                <div className="size-6 border-2 border-blue-600 dark:border-zinc-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-light">
                  Searching VOID {isImageMode ? "images" : "private index"}...
                </p>
              </div>
            ) : error ? (
              <div className="py-12 text-center max-w-md mx-auto">
                <p className="text-sm text-slate-700 dark:text-zinc-300 mb-3">
                  {error}
                </p>
                <button
                  type="button"
                  onClick={() => setRetryTrigger((prev) => prev + 1)}
                  className="px-4 py-2 text-xs font-medium rounded-full bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 transition-opacity cursor-pointer font-sans"
                >
                  Retry Search
                </button>
              </div>
            ) : totalResults === 0 ? (
              <div className="py-16 text-slate-500 dark:text-zinc-400">
                <p className="text-base font-normal text-slate-800 dark:text-zinc-100">
                  No {isImageMode ? "images" : "results"} found for “{query}”
                </p>
                <p className="text-xs mt-2 text-slate-400 dark:text-zinc-500">
                  {isImageMode
                    ? "Try searching in the 'All' tab or using different keywords."
                    : "This page hasn't been crawled yet. You can add it using your VOID Crawler Dashboard."}
                </p>
              </div>
            ) : isImageMode ? (
              /* ================================================================= */
              /* GOOGLE IMAGES WALL / GRID                                         */
              /* ================================================================= */
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
                  {displayedImages.map((item, idx) => {
                    const optimizedThumb = getOptimizedThumbnailUrl(
                      item.imageUrl,
                      400,
                      300,
                    )
                    return (
                      <div
                        key={`${item.id}-${idx}`}
                        onClick={() => setSelectedImage(item)}
                        className="group relative flex flex-col cursor-pointer rounded-xl overflow-hidden bg-white dark:bg-[#151619] border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 transition-all hover:shadow-md select-none"
                      >
                        {/* Image preview box with smooth hover zoom */}
                        <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-zinc-900">
                          <img
                            src={optimizedThumb}
                            alt={item.title}
                            loading={idx < 12 ? "eager" : "lazy"}
                            decoding="async"
                            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              if (target.src !== item.imageUrl) {
                                target.src = item.imageUrl
                              } else {
                                target.parentElement?.parentElement?.remove()
                              }
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2 pointer-events-none">
                            <span className="text-[10px] text-white/95 font-medium truncate">
                              {item.domain}
                            </span>
                          </div>
                        </div>

                        {/* Google Images style caption */}
                        <div className="p-2 sm:p-2.5 flex flex-col justify-between flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-zinc-400">
                            {getDomainIcon(item.domain)}
                            <span className="truncate">{item.domain}</span>
                          </div>
                          <p className="mt-1 text-xs font-medium text-slate-800 dark:text-zinc-200 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-[#8ab4f8] transition-colors leading-tight">
                            {item.title}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Show more images button */}
                {hasMore && (
                  <div className="mt-10 flex justify-center pt-4">
                    <button
                      type="button"
                      onClick={handleShowMore}
                      className="group inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-2.5 text-xs font-medium text-slate-700 dark:text-zinc-300 shadow-xs transition-all hover:border-slate-400 dark:hover:border-zinc-700 dark:hover:text-zinc-100 cursor-pointer"
                    >
                      <span>Show more images</span>
                      <span className="text-slate-400 dark:text-zinc-500">
                        ({remainingCount} remaining)
                      </span>
                      <ChevronDown className="size-3.5 text-slate-400 dark:text-zinc-500 group-hover:text-slate-700 dark:group-hover:text-zinc-300 transition-transform group-hover:translate-y-0.5" />
                    </button>
                  </div>
                )}

                {/* ========================================================= */}
                {/* GOOGLE IMAGES PREVIEW MODAL                                */}
                {/* ========================================================= */}
                {selectedImage && (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
                    onClick={() => setSelectedImage(null)}
                  >
                    <div
                      className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-[#16171b] border border-slate-200 dark:border-zinc-800 shadow-2xl animate-in zoom-in-95 duration-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Modal Top Header */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
                        <div className="flex items-center gap-2 min-w-0 pr-4">
                          {getDomainIcon(selectedImage.domain)}
                          <span className="text-xs font-medium text-slate-700 dark:text-zinc-300 truncate">
                            {selectedImage.domain}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Visit original page button */}
                          <a
                            href={sanitizeHref(selectedImage.pageUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
                          >
                            <span>Visit page</span>
                            <ExternalLink className="size-3" />
                          </a>

                          {/* Close button */}
                          <button
                            type="button"
                            onClick={() => setSelectedImage(null)}
                            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                            title="Close (Esc)"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      </div>

                      {/* Modal Main Image Display */}
                      <div className="relative flex-1 min-h-[300px] max-h-[68vh] flex items-center justify-center bg-slate-950 p-2 sm:p-4 overflow-hidden select-none">
                        <img
                          src={selectedImage.imageUrl}
                          alt={selectedImage.title}
                          className="max-h-[64vh] max-w-full object-contain rounded-lg shadow-lg"
                        />

                        {/* Left Arrow Button */}
                        {currentImageIdx > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              showPreviousImage()
                            }}
                            className="absolute left-3 p-2 rounded-full bg-black/60 hover:bg-black/85 text-white/90 hover:text-white backdrop-blur-xs transition-all cursor-pointer shadow-md"
                            title="Previous image (Left Arrow)"
                          >
                            <ChevronLeft className="size-5" />
                          </button>
                        )}

                        {/* Right Arrow Button */}
                        {currentImageIdx < allImageCards.length - 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              showNextImage()
                            }}
                            className="absolute right-3 p-2 rounded-full bg-black/60 hover:bg-black/85 text-white/90 hover:text-white backdrop-blur-xs transition-all cursor-pointer shadow-md"
                            title="Next image (Right Arrow)"
                          >
                            <ChevronRight className="size-5" />
                          </button>
                        )}
                      </div>

                      {/* Modal Bottom Footer / Caption */}
                      <div className="px-4 py-3 flex items-center justify-between bg-white dark:bg-[#16171b] text-xs">
                        <p className="font-medium text-slate-800 dark:text-zinc-200 truncate pr-4">
                          {selectedImage.title}
                        </p>
                        <a
                          href={sanitizeHref(selectedImage.imageUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-[#8ab4f8] shrink-0 font-sans"
                        >
                          Open image in new tab ↗
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* ================================================================= */
              /* STANDARD WEB SEARCH RESULTS LIST                                  */
              /* ================================================================= */
              <>
                <ol className="flex flex-col space-y-7 sm:space-y-8">
                  {displayedResults.map((r, i) => {
                    const safeUrl = sanitizeHref(r.url)
                    const sanitizedSnippetHtml = sanitizeHighlightHtml(
                      r.highlightedSnippet || r.snippet,
                    )

                    return (
                      <li key={`${i}-${r.url}`} className="group max-w-3xl">
                        {/* Domain, breadcrumb & relevance score badge */}
                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-zinc-400">
                          {getDomainIcon(r.domain)}
                          <span className="truncate">
                            {formatBreadcrumb(r.domain, r.path)}
                          </span>
                          {typeof r.score === "number" && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                              score {r.score.toFixed(1)}
                            </span>
                          )}
                        </div>

                        <div className="mt-1 flex flex-row items-start justify-between gap-3 sm:gap-4">
                          <div className="flex-1 min-w-0">
                            {/* Result Title with validated URL protocol */}
                            <a
                              href={safeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block font-sans text-lg sm:text-[19px] font-medium tracking-tight text-blue-600 dark:text-[#8ab4f8] hover:underline leading-snug"
                            >
                              {r.title}
                            </a>

                            {/* Snippet with sanitized excerpt highlighting */}
                            <p
                              dangerouslySetInnerHTML={{
                                __html: sanitizedSnippetHtml,
                              }}
                              className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-zinc-400"
                            />

                            {/* Matching section headings */}
                            {r.headings && r.headings.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {r.headings.slice(0, 3).map((h, hIdx) => (
                                  <span
                                    key={hIdx}
                                    className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-400 border border-slate-200/60 dark:border-zinc-700/60 font-sans"
                                  >
                                    {h}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Image Preview Thumbnail (Google / Arc style with speed optimization & Instagram DP) */}
                          <ResultThumbnail result={r} index={i} />
                        </div>
                      </li>
                    )
                  })}
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
 * Compresses PNG/JPEG files down to ~2KB WebP via Cloudflare CDN proxy
 */
function getOptimizedThumbnailUrl(
  src?: string,
  width = 192,
  height = 192,
): string {
  if (!src) return ""
  const trimmed = src.trim()
  if (
    trimmed.startsWith("data:image/svg+xml") ||
    trimmed.endsWith(".svg") ||
    trimmed.includes(".svg?")
  ) {
    return trimmed
  }
  if (
    trimmed.startsWith("data:image/png;base64") ||
    trimmed.startsWith("data:image/jpeg;base64")
  ) {
    return ""
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
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
    result.domain?.toLowerCase().includes("instagram") ||
    result.url?.toLowerCase().includes("instagram.com")

  const safeUrl = sanitizeHref(result.url)
  const rawImage = result.previewImage
  const isGenericOrCorrupt =
    rawImage?.startsWith("data:image/png;base64") ||
    rawImage?.startsWith("data:image/jpeg;base64") ||
    rawImage?.startsWith("data:image/svg+xml")

  const validImage = isGenericOrCorrupt ? undefined : rawImage
  const optimized = validImage
    ? getOptimizedThumbnailUrl(validImage, 192, 192)
    : ""
  const [src, setSrc] = useState(optimized)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const nextValid = isGenericOrCorrupt ? undefined : rawImage
    setSrc(nextValid ? getOptimizedThumbnailUrl(nextValid, 192, 192) : "")
    setHasError(false)
  }, [rawImage, isGenericOrCorrupt])

  if (validImage && !hasError) {
    return (
      <a
        href={safeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`shrink-0 group/img relative overflow-hidden ${
          isInstagram
            ? "rounded-full border-2 border-pink-500/30 ring-2 ring-pink-500/10"
            : "rounded-xl border border-slate-200 dark:border-zinc-800"
        } bg-slate-100 dark:bg-zinc-900/80 shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all`}
      >
        <img
          src={src}
          alt={result.title}
          loading={index < 3 ? "eager" : "lazy"}
          fetchPriority={index < 3 ? "high" : "auto"}
          decoding="async"
          referrerPolicy="no-referrer"
          className="size-20 sm:size-24 object-cover object-top transition-transform duration-300 group-hover/img:scale-105"
          onError={() => {
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

  if (isInstagram) {
    const handle =
      result.url.split("instagram.com/")[1]?.replace(/[/?#].*$/, "") ||
      result.title.match(/@([a-zA-Z0-9_.]+)/)?.[1] ||
      "instagram"
    const initial = (
      handle.replace(/[^a-zA-Z0-9]/g, "")[0] || "I"
    ).toUpperCase()

    return (
      <a
        href={safeUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={`Instagram: @${handle}`}
        className="shrink-0 group/img relative overflow-hidden rounded-full border-2 border-pink-500/40 bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 shadow-xs hover:scale-105 transition-all p-0.5"
      >
        <div className="size-20 sm:size-24 rounded-full bg-slate-900/50 backdrop-blur-xs flex flex-col items-center justify-center text-white">
          <span className="text-xl font-bold tracking-tight">{initial}</span>
          <span className="text-[10px] opacity-80 truncate max-w-[60px]">
            @{handle}
          </span>
        </div>
      </a>
    )
  }

  return null
}
