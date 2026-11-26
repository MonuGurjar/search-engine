import { useState, useEffect, useRef } from "react"
import { Sparkles, Copy, Check, ChevronDown, ChevronUp, ArrowUpRight, Search } from "lucide-react"
import { fetchAiOverview, type AiOverviewResult, type AiOverviewSource } from "../services/search-client"
import { sanitizeHref } from "../lib/sanitizer"

type Props = {
  query: string
  contextResults?: Array<{
    title: string
    url: string
    domain: string
    snippet?: string
  }>
  onSearch?: (q: string) => void
}

/**
 * Parses simple markdown bold (**text**) safely into React nodes.
 */
function renderFormattedText(text: string) {
  if (!text) return null
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong
          key={index}
          className="font-semibold text-slate-900 dark:text-zinc-100"
        >
          {part.slice(2, -2)}
        </strong>
      )
    }
    return part
  })
}

export function AiOverview({ query, contextResults = [], onSearch }: Props) {
  const [data, setData] = useState<AiOverviewResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const contextResultsRef = useRef(contextResults)
  useEffect(() => {
    contextResultsRef.current = contextResults
  }, [contextResults])

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setData(null)
      setLoading(false)
      setHasError(false)
      return
    }

    let isCancelled = false
    const controller = new AbortController()

    setLoading(true)
    setHasError(false)
    setData(null)
    setExpanded(false)

    // Wait up to 180ms for search results to provide grounded context, or fire immediately if already loaded
    const delay = contextResults.length > 0 ? 0 : 180

    const timer = setTimeout(() => {
      if (isCancelled) return

      const context: AiOverviewSource[] = (contextResultsRef.current || [])
        .slice(0, 5)
        .map((r) => ({
          title: r.title,
          url: r.url,
          domain: r.domain,
          snippet: r.snippet,
        }))

      fetchAiOverview(trimmed, context, controller.signal)
        .then((res) => {
          if (isCancelled) return
          if (res && (res.summary || (res.keyPoints && res.keyPoints.length > 0))) {
            setData(res)
          } else {
            setHasError(true)
          }
        })
        .catch((err) => {
          if (!isCancelled && err?.name !== "AbortError") {
            setHasError(true)
          }
        })
        .finally(() => {
          if (!isCancelled) {
            setLoading(false)
          }
        })
    }, delay)

    return () => {
      isCancelled = true
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  const handleCopy = () => {
    if (!data) return
    const textToCopy = [
      data.summary,
      data.keyPoints && data.keyPoints.length > 0
        ? `\nKey points:\n${data.keyPoints.map((k) => `• ${k}`).join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n")

    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // If there's no query, error without data, or finished without data, degrade silently
  if (!query.trim() || (!loading && (!data || hasError))) {
    return null
  }

  // Combine returned sources with provided context sources to ensure citation cards
  const displaySources = (
    data?.sources && data.sources.length > 0
      ? data.sources
      : contextResults.slice(0, 4)
  ).slice(0, 4)

  return (
    <section
      aria-label="VOID AI Overview"
      className="mb-6 w-full max-w-3xl rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 shadow-xs transition-colors sm:mb-8 sm:p-5 dark:border-zinc-800/90 dark:bg-[#131417]"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-200/70 pb-3 dark:border-zinc-800/80">
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* VOID AI Sparkle Badge */}
          <div className="flex size-6 sm:size-7 items-center justify-center rounded-lg border border-emerald-600/20 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-400">
            <Sparkles className="size-3.5 sm:size-4" />
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-balance text-sm font-semibold text-slate-900 sm:text-base dark:text-zinc-100">
              AI Overview
            </h2>
            <span className="inline-flex items-center whitespace-nowrap rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-emerald-700 dark:text-emerald-400">
              VOID AI
            </span>
          </div>
        </div>

        {/* Action icons (Copy / Collapse) */}
        {!loading && data && (
          <div className="flex items-center gap-1 text-slate-500 dark:text-zinc-400">
            <button
              type="button"
              onClick={handleCopy}
              title="Copy overview"
              aria-label="Copy overview to clipboard"
              className="flex size-7 sm:size-8 items-center justify-center rounded-lg transition-colors duration-150 hover:bg-slate-200/70 hover:text-slate-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 cursor-pointer"
            >
              {copied ? (
                <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              title={expanded ? "Show less" : "Show more"}
              aria-label={expanded ? "Show less" : "Show more"}
              className="flex size-7 sm:size-8 items-center justify-center rounded-lg transition-colors duration-150 hover:bg-slate-200/70 hover:text-slate-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 cursor-pointer"
            >
              {expanded ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Structural Skeleton Loading State */}
      {loading && (
        <div className="mt-3.5 space-y-3 animate-pulse" aria-busy="true">
          <div className="text-xs font-medium text-slate-500 dark:text-zinc-400">
            Generating VOID AI overview…
          </div>
          <div className="space-y-2 max-w-[65ch]">
            <div className="h-3.5 w-11/12 rounded bg-slate-200/80 dark:bg-zinc-800" />
            <div className="h-3.5 w-full rounded bg-slate-200/60 dark:bg-zinc-800/80" />
            <div className="h-3.5 w-4/5 rounded bg-slate-200/70 dark:bg-zinc-800/70" />
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-4 sm:overflow-visible">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-14 min-w-[150px] shrink-0 rounded-xl border border-slate-200/60 bg-white/80 p-2 sm:min-w-0 dark:border-zinc-800 dark:bg-zinc-900/50"
              />
            ))}
          </div>
        </div>
      )}

      {/* Overview Content */}
      {!loading && data && (
        <div className="mt-3.5 space-y-3.5 sm:space-y-4">
          {/* Main summary paragraph */}
          <div
            className={`max-w-[65ch] text-pretty text-[0.875rem] sm:text-[0.9375rem] leading-[1.6] text-slate-700 dark:text-zinc-300 ${
              !expanded && data.summary.length > 300
                ? "line-clamp-3 sm:line-clamp-4"
                : ""
            }`}
          >
            {data.summary.split("\n\n").map((para, i) => (
              <p key={i} className="mb-2.5 last:mb-0">
                {renderFormattedText(para)}
              </p>
            ))}
          </div>

          {/* Key Takeaways list */}
          {data.keyPoints && data.keyPoints.length > 0 && (
            <div className="mt-3 space-y-2 border-t border-slate-200/70 pt-3 dark:border-zinc-800/80">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 dark:text-zinc-400">
                Key Takeaways
              </span>
              <ul className="space-y-1.5 pl-0.5 max-w-[65ch]">
                {data.keyPoints.map((point, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-pretty text-[0.8125rem] sm:text-[0.875rem] leading-[1.55] text-slate-700 dark:text-zinc-300"
                  >
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                    <span>{renderFormattedText(point)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Collapsible "Show more / Show less" toggle */}
          {data.summary.length > 300 && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 transition-colors duration-150 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 cursor-pointer"
            >
              {expanded ? (
                <>
                  Show less <ChevronUp className="size-3.5" />
                </>
              ) : (
                <>
                  Show more <ChevronDown className="size-3.5" />
                </>
              )}
            </button>
          )}

          {/* Grounding Source Citation Chips - Horizontal scroll carousel on mobile */}
          {displaySources.length > 0 && (
            <div className="border-t border-slate-200/70 pt-3 dark:border-zinc-800/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 dark:text-zinc-400">
                  Sources
                </span>
                <span className="text-[11px] text-slate-400 dark:text-zinc-500 sm:hidden">
                  Swipe across →
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1.5 pt-0.5 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible sm:pb-0">
                {displaySources.map((source, idx) => {
                  const safeUrl = sanitizeHref(source.url)
                  const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
                    source.domain || "google.com",
                  )}&sz=32`

                  return (
                    <a
                      key={idx}
                      href={safeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex min-w-[170px] max-w-[210px] shrink-0 flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-2.5 transition-colors duration-150 hover:border-slate-300 hover:shadow-xs sm:min-w-0 sm:max-w-none dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700"
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <img
                          src={faviconUrl}
                          alt=""
                          className="size-3.5 rounded-sm object-contain opacity-80 shrink-0"
                          loading="lazy"
                          onError={(e) => {
                            ;(e.target as HTMLElement).style.display = "none"
                          }}
                        />
                        <bdi className="text-[11px] font-medium text-slate-600 truncate dark:text-zinc-400">
                          {source.domain}
                        </bdi>
                        <ArrowUpRight className="ml-auto size-3 text-slate-400 opacity-60 sm:opacity-0 transition-opacity duration-150 group-hover:opacity-100 dark:text-zinc-500 shrink-0" />
                      </div>
                      <p className="line-clamp-2 text-xs font-medium text-slate-800 transition-colors duration-150 group-hover:text-emerald-700 dark:text-zinc-200 dark:group-hover:text-emerald-400 leading-[1.4]">
                        {source.title || source.domain}
                      </p>
                    </a>
                  )
                })}
              </div>
            </div>
          )}

          {/* Suggested follow-up queries */}
          {data.suggestedFollowups && data.suggestedFollowups.length > 0 && onSearch && (
            <div className="border-t border-slate-200/70 pt-3 dark:border-zinc-800/80">
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 dark:text-zinc-400">
                Explore further
              </span>
              <div className="flex gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
                {data.suggestedFollowups.map((followup, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSearch(followup)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors duration-150 hover:border-slate-300 hover:bg-slate-100/70 hover:text-slate-900 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 cursor-pointer"
                  >
                    <Search className="size-3 opacity-60 shrink-0" />
                    <span>{followup}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
