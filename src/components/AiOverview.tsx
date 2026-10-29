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
      className="mb-6 w-full max-w-3xl rounded-2xl border border-indigo-100/90 bg-gradient-to-b from-blue-50/40 via-indigo-50/20 to-white/90 p-3.5 shadow-xs transition-all sm:mb-8 sm:p-5 sm:shadow-sm dark:border-indigo-500/20 dark:bg-gradient-to-b dark:from-[#151926]/90 dark:via-[#161823]/70 dark:to-[#121319]/90 dark:shadow-none"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-indigo-100/60 pb-3 dark:border-white/5">
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* VOID AI Sparkle Badge */}
          <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white shadow-xs">
            <Sparkles
              className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${loading ? "animate-spin [animation-duration:3s]" : ""}`}
            />
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-slate-900 sm:text-base dark:text-zinc-100">
              AI Overview
            </h2>
            <span className="inline-flex items-center rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[9.5px] font-semibold tracking-wider uppercase text-indigo-600 dark:text-indigo-400">
              VOID AI
            </span>
          </div>
        </div>

        {/* Action icons (Copy / Collapse) */}
        {!loading && data && (
          <div className="flex items-center gap-1 text-slate-500 dark:text-zinc-400">
            <button
              onClick={handleCopy}
              title="Copy overview"
              aria-label="Copy overview to clipboard"
              className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg transition-colors hover:bg-slate-200/60 hover:text-slate-800 dark:hover:bg-white/10 dark:hover:text-zinc-200"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              title={expanded ? "Show less" : "Show more"}
              aria-label={expanded ? "Show less" : "Show more"}
              className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg transition-colors hover:bg-slate-200/60 hover:text-slate-800 dark:hover:bg-white/10 dark:hover:text-zinc-200"
            >
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Loading Shimmer State */}
      {loading && (
        <div className="mt-3.5 space-y-3 animate-pulse">
          <div className="flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-400">
            <span className="inline-block h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
            Generating VOID AI overview...
          </div>
          <div className="h-3.5 sm:h-4 w-11/12 rounded bg-indigo-100/70 dark:bg-zinc-800/80" />
          <div className="h-3.5 sm:h-4 w-full rounded bg-indigo-100/50 dark:bg-zinc-800/60" />
          <div className="h-3.5 sm:h-4 w-4/5 rounded bg-indigo-100/60 dark:bg-zinc-800/70" />
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-4 sm:overflow-visible">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-14 min-w-[150px] shrink-0 rounded-xl border border-indigo-100/40 bg-white/60 p-2 sm:min-w-0 dark:border-white/5 dark:bg-white/5"
              />
            ))}
          </div>
        </div>
      )}

      {/* Overview Content */}
      {!loading && data && (
        <div className="mt-3.5 space-y-3 sm:space-y-4">
          {/* Main summary paragraph */}
          <div
            className={`text-[13.5px] sm:text-[14.5px] leading-relaxed text-slate-700 dark:text-zinc-300 ${
              !expanded && data.summary.length > 300
                ? "line-clamp-3 sm:line-clamp-4"
                : ""
            }`}
          >
            {data.summary.split("\n\n").map((para, i) => (
              <p key={i} className="mb-2 last:mb-0">
                {renderFormattedText(para)}
              </p>
            ))}
          </div>

          {/* Key Takeaways list */}
          {data.keyPoints && data.keyPoints.length > 0 && (
            <div className="mt-3 space-y-1.5 border-t border-indigo-100/60 pt-2.5 dark:border-white/5">
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Key Takeaways
              </span>
              <ul className="space-y-1 sm:space-y-1.5 pl-0.5">
                {data.keyPoints.map((point, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-[13px] sm:text-[13.5px] leading-snug text-slate-700 dark:text-zinc-300"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500 dark:bg-indigo-400" />
                    <span>{renderFormattedText(point)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Collapsible "Show more / Show less" toggle */}
          {data.summary.length > 300 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 transition-colors hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 cursor-pointer"
            >
              {expanded ? (
                <>
                  Show less <ChevronUp className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  Show more <ChevronDown className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          )}

          {/* Grounding Source Citation Chips - Horizontal scroll carousel on mobile */}
          {displaySources.length > 0 && (
            <div className="border-t border-indigo-100/60 pt-3 dark:border-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Sources
                </span>
                <span className="text-[10px] text-slate-400 sm:hidden">
                  Swipe across →
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1.5 pt-0.5 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible sm:pb-0 scrollbar-none">
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
                      className="group flex min-w-[170px] max-w-[210px] shrink-0 flex-col justify-between rounded-xl border border-indigo-100/70 bg-white/80 p-2 sm:min-w-0 sm:max-w-none sm:p-2.5 transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-xs dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-indigo-500/40"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <img
                          src={faviconUrl}
                          alt=""
                          className="h-3.5 w-3.5 rounded-sm object-contain opacity-80 shrink-0"
                          loading="lazy"
                          onError={(e) => {
                            ;(e.target as HTMLElement).style.display = "none"
                          }}
                        />
                        <span className="text-[10.5px] sm:text-[11px] font-medium text-slate-600 truncate dark:text-zinc-400">
                          {source.domain}
                        </span>
                        <ArrowUpRight className="ml-auto h-3 w-3 text-slate-400 opacity-60 sm:opacity-0 transition-opacity group-hover:opacity-100 dark:text-zinc-500 shrink-0" />
                      </div>
                      <p className="line-clamp-2 text-[11px] sm:text-xs font-medium text-slate-800 transition-colors group-hover:text-indigo-600 dark:text-zinc-200 dark:group-hover:text-indigo-300 leading-tight">
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
            <div className="border-t border-indigo-100/60 pt-2.5 dark:border-white/5">
              <span className="mb-2 block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Explore further
              </span>
              <div className="flex gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible scrollbar-none">
                {data.suggestedFollowups.map((followup, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSearch(followup)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-indigo-100 bg-white/80 px-2.5 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs font-medium text-slate-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300 cursor-pointer"
                  >
                    <Search className="h-2.5 w-2.5 sm:h-3 sm:w-3 opacity-60 shrink-0" />
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
