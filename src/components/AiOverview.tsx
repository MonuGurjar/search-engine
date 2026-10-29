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
      aria-label="AI Overview"
      className="mb-8 w-full max-w-3xl rounded-2xl border border-indigo-100/90 bg-gradient-to-b from-blue-50/40 via-indigo-50/20 to-white/90 p-5 shadow-sm transition-all sm:p-6 dark:border-indigo-500/20 dark:bg-gradient-to-b dark:from-[#151926]/90 dark:via-[#161823]/70 dark:to-[#121319]/90 dark:shadow-none"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-indigo-100/60 pb-3.5 dark:border-white/5">
        <div className="flex items-center gap-2.5">
          {/* Animated Gemini multi-color sparkle icon */}
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-500 text-white shadow-sm shadow-indigo-500/20">
            <Sparkles
              className={`h-4 w-4 ${loading ? "animate-spin [animation-duration:3s]" : ""}`}
            />
          </div>
          <div className="flex items-baseline gap-2">
            <h2 className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg dark:text-zinc-100">
              AI Overview
            </h2>
            <span className="inline-flex items-center rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase text-indigo-600 dark:text-indigo-400">
              Gemini
            </span>
          </div>
        </div>

        {/* Action icons (Copy / Collapse) */}
        {!loading && data && (
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400">
            <button
              onClick={handleCopy}
              title="Copy overview"
              aria-label="Copy overview to clipboard"
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-slate-200/60 hover:text-slate-800 dark:hover:bg-white/10 dark:hover:text-zinc-200"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              title={expanded ? "Show less" : "Show more"}
              aria-label={expanded ? "Show less" : "Show more"}
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-slate-200/60 hover:text-slate-800 dark:hover:bg-white/10 dark:hover:text-zinc-200"
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Loading Shimmer State */}
      {loading && (
        <div className="mt-4 space-y-3.5 animate-pulse">
          <div className="flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-400">
            <span className="inline-block h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
            Generating summary with Gemini...
          </div>
          <div className="h-4 w-11/12 rounded bg-indigo-100/70 dark:bg-zinc-800/80" />
          <div className="h-4 w-full rounded bg-indigo-100/50 dark:bg-zinc-800/60" />
          <div className="h-4 w-4/5 rounded bg-indigo-100/60 dark:bg-zinc-800/70" />
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-16 rounded-xl border border-indigo-100/40 bg-white/60 p-2.5 dark:border-white/5 dark:bg-white/5"
              />
            ))}
          </div>
        </div>
      )}

      {/* Overview Content */}
      {!loading && data && (
        <div className="mt-4 space-y-4">
          {/* Main summary paragraph */}
          <div
            className={`text-[14.5px] leading-relaxed text-slate-700 dark:text-zinc-300 ${
              !expanded && data.summary.length > 380 ? "line-clamp-4" : ""
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
            <div className="mt-3.5 space-y-2 border-t border-indigo-100/60 pt-3 dark:border-white/5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Key Takeaways
              </span>
              <ul className="space-y-1.5 pl-1">
                {data.keyPoints.map((point, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-[13.5px] leading-snug text-slate-700 dark:text-zinc-300"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500 dark:bg-indigo-400" />
                    <span>{renderFormattedText(point)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Collapsible "Show more / Show less" toggle */}
          {data.summary.length > 380 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 transition-colors hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
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

          {/* Grounding Source Citation Chips */}
          {displaySources.length > 0 && (
            <div className="border-t border-indigo-100/60 pt-3.5 dark:border-white/5">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Sources
              </span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
                      className="group flex flex-col justify-between rounded-xl border border-indigo-100/70 bg-white/70 p-2.5 transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-indigo-500/40"
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <img
                          src={faviconUrl}
                          alt=""
                          className="h-3.5 w-3.5 rounded-sm object-contain opacity-80"
                          loading="lazy"
                          onError={(e) => {
                            ;(e.target as HTMLElement).style.display = "none"
                          }}
                        />
                        <span className="text-[11px] font-medium text-slate-600 truncate dark:text-zinc-400">
                          {source.domain}
                        </span>
                        <ArrowUpRight className="ml-auto h-3 w-3 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 dark:text-zinc-500" />
                      </div>
                      <p className="line-clamp-2 text-xs font-medium text-slate-800 transition-colors group-hover:text-indigo-600 dark:text-zinc-200 dark:group-hover:text-indigo-300">
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
            <div className="border-t border-indigo-100/60 pt-3 dark:border-white/5">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Explore further
              </span>
              <div className="flex flex-wrap gap-2">
                {data.suggestedFollowups.map((followup, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSearch(followup)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
                  >
                    <Search className="h-3 w-3 opacity-60" />
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
