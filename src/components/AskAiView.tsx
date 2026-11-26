import { useState, useEffect, useRef, type FormEvent } from "react"
import {
  Sparkles,
  Copy,
  Check,
  ArrowUpRight,
  Send,
  Atom,
  Search,
  RotateCcw,
} from "lucide-react"
import {
  fetchAskAi,
  type AskAiMessage,
} from "../services/search-client"
import { sanitizeHref } from "../lib/sanitizer"

type Props = {
  initialQuery: string
  initialReasoning?: boolean
  timeFilter?: string
  onSwitchToWebSearch: (q: string) => void
}

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong
          key={idx}
          className="font-semibold text-slate-900 dark:text-zinc-100"
        >
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={idx}
          className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.8125rem] text-slate-800 dark:bg-zinc-800 dark:text-zinc-200"
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    return part
  })
}

function MarkdownAnswer({ content }: { content: string }) {
  const blocks = content.split(/(```[\s\S]*?```)/g)

  return (
    <div className="space-y-3 max-w-[65ch] text-pretty text-[0.9375rem] leading-[1.6] text-slate-700 dark:text-zinc-300">
      {blocks.map((block, bIdx) => {
        if (block.startsWith("```") && block.endsWith("```")) {
          const lines = block.slice(3, -3).split("\n")
          const lang = lines[0]?.trim()
          const code = (lang && /^[a-z0-9_-]+$/i.test(lang)
            ? lines.slice(1)
            : lines
          ).join("\n")

          return (
            <pre
              key={bIdx}
              className="overflow-x-auto rounded-xl border border-slate-200/80 bg-slate-900 p-3.5 text-xs leading-relaxed text-zinc-100 dark:border-zinc-800 dark:bg-[#0c0d0e]"
            >
              <code>{code.trim()}</code>
            </pre>
          )
        }

        const paragraphs = block.trim().split(/\n\n+/)
        return paragraphs.map((para, pIdx) => {
          const lines = para.split("\n")
          const isBulletList = lines.every(
            (l) => /^\s*[-*•]\s+/.test(l) || !l.trim(),
          )
          const isOrderedList = lines.every(
            (l) => /^\s*\d+\.\s+/.test(l) || !l.trim(),
          )

          if (isBulletList) {
            return (
              <ul key={`${bIdx}-${pIdx}`} className="space-y-1.5 pl-1">
                {lines
                  .filter((l) => l.trim())
                  .map((item, lIdx) => (
                    <li key={lIdx} className="flex items-start gap-2.5">
                      <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                      <span>
                        {renderInlineMarkdown(
                          item.replace(/^\s*[-*•]\s+/, ""),
                        )}
                      </span>
                    </li>
                  ))}
              </ul>
            )
          }

          if (isOrderedList) {
            return (
              <ol
                key={`${bIdx}-${pIdx}`}
                className="list-decimal space-y-1.5 pl-5"
              >
                {lines
                  .filter((l) => l.trim())
                  .map((item, lIdx) => (
                    <li key={lIdx}>
                      {renderInlineMarkdown(
                        item.replace(/^\s*\d+\.\s+/, ""),
                      )}
                    </li>
                  ))}
              </ol>
            )
          }

          return (
            <p key={`${bIdx}-${pIdx}`}>
              {renderInlineMarkdown(para)}
            </p>
          )
        })
      })}
    </div>
  )
}

export function AskAiView({
  initialQuery,
  initialReasoning = false,
  timeFilter = "Any time",
  onSwitchToWebSearch,
}: Props) {
  const [messages, setMessages] = useState<AskAiMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [followupInput, setFollowupInput] = useState("")
  const [reasoning, setReasoning] = useState(initialReasoning)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setReasoning(initialReasoning)
  }, [initialReasoning])

  useEffect(() => {
    const clean = initialQuery.trim()
    if (!clean) {
      setMessages([])
      return
    }

    const controller = new AbortController()
    let cancelled = false

    setMessages([{ role: "user", content: clean }])
    setLoading(true)
    setError(null)

    fetchAskAi(clean, {
      reasoning: initialReasoning,
      timeFilter,
      signal: controller.signal,
    })
      .then((res) => {
        if (cancelled) return
        setMessages([
          { role: "user", content: clean },
          {
            role: "assistant",
            content: res.answer,
            sources: res.sources,
            followups: res.followups,
            mode: res.mode,
          },
        ])
      })
      .catch((err) => {
        if (!cancelled && err?.name !== "AbortError") {
          setError(err?.message || "Unable to reach VOID AI right now.")
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [initialQuery, initialReasoning, timeFilter])

  async function sendFollowup(question: string) {
    const clean = question.trim()
    if (!clean || loading) return

    const history = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    setFollowupInput("")
    setError(null)
    setMessages((prev) => [...prev, { role: "user", content: clean }])
    setLoading(true)

    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    }, 50)

    try {
      const res = await fetchAskAi(clean, {
        history,
        reasoning,
        timeFilter,
      })

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.answer,
          sources: res.sources,
          followups: res.followups,
          mode: res.mode,
        },
      ])
    } catch (err: any) {
      setError(err?.message || "Unable to generate a response right now.")
    } finally {
      setLoading(false)
    }
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault()
    sendFollowup(followupInput)
  }

  function handleCopy(text: string, idx: number) {
    navigator.clipboard.writeText(text)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  return (
    <section aria-label="VOID AI Conversation" className="w-full max-w-3xl pb-16">
      {/* Top context bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 pb-3 dark:border-zinc-800/80">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg border border-emerald-600/20 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-400">
            <Sparkles className="size-4" />
          </div>
          <span className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
            Ask VOID AI
          </span>
          {reasoning && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-emerald-700 dark:text-emerald-400">
              <Atom className="size-3" />
              Reasoning
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => onSwitchToWebSearch(initialQuery)}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-white cursor-pointer"
        >
          <Search className="size-3.5" />
          <span>Web results</span>
        </button>
      </div>

      {/* Conversation thread */}
      <div className="space-y-6">
        {messages.map((msg, idx) =>
          msg.role === "user" ? (
            <div key={idx} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl bg-slate-900 px-4 py-2.5 text-sm text-white dark:bg-zinc-800 dark:text-zinc-100 text-pretty">
                {msg.content}
              </div>
            </div>
          ) : (
            <article
              key={idx}
              className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 sm:p-5 dark:border-zinc-800/90 dark:bg-[#131417]"
            >
              <div className="mb-3 flex items-center justify-between border-b border-slate-200/70 pb-2.5 dark:border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-semibold uppercase tracking-[0.05em] text-slate-600 dark:text-zinc-400">
                    {msg.mode || "VOID AI"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(msg.content, idx)}
                  aria-label="Copy response"
                  title="Copy response"
                  className="flex size-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 cursor-pointer"
                >
                  {copiedIdx === idx ? (
                    <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </button>
              </div>

              <MarkdownAnswer content={msg.content} />

              {/* Grounded Sources */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-4 border-t border-slate-200/70 pt-3 dark:border-zinc-800/80">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 dark:text-zinc-400">
                    Grounded Sources
                  </span>
                  <div className="flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible">
                    {msg.sources.map((src, sIdx) => {
                      const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
                        src.domain || "google.com",
                      )}&sz=32`
                      return (
                        <a
                          key={sIdx}
                          href={sanitizeHref(src.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex min-w-[165px] max-w-[200px] shrink-0 flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-2.5 transition-colors hover:border-slate-300 sm:min-w-0 sm:max-w-none dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700"
                        >
                          <div className="mb-1 flex items-center gap-1.5">
                            <img
                              src={faviconUrl}
                              alt=""
                              className="size-3.5 rounded-sm object-contain opacity-80 shrink-0"
                              loading="lazy"
                              onError={(e) => {
                                ;(e.target as HTMLElement).style.display = "none"
                              }}
                            />
                            <bdi className="truncate text-[11px] font-medium text-slate-600 dark:text-zinc-400">
                              {src.domain}
                            </bdi>
                            <ArrowUpRight className="ml-auto size-3 text-slate-400 opacity-60 sm:opacity-0 group-hover:opacity-100 shrink-0" />
                          </div>
                          <p className="line-clamp-2 text-xs font-medium leading-[1.4] text-slate-800 group-hover:text-emerald-700 dark:text-zinc-200 dark:group-hover:text-emerald-400">
                            {src.title || src.domain}
                          </p>
                        </a>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Suggested Follow-ups */}
              {msg.followups &&
                msg.followups.length > 0 &&
                idx === messages.length - 1 &&
                !loading && (
                  <div className="mt-4 border-t border-slate-200/70 pt-3 dark:border-zinc-800/80">
                    <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 dark:text-zinc-400">
                      Follow-up questions
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.followups.map((f, fIdx) => (
                        <button
                          key={fIdx}
                          type="button"
                          onClick={() => sendFollowup(f)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-100/70 hover:text-slate-900 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 cursor-pointer"
                        >
                          <span>{f}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
            </article>
          ),
        )}

        {/* Loading skeleton */}
        {loading && (
          <div
            className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 sm:p-5 animate-pulse dark:border-zinc-800/90 dark:bg-[#131417]"
            aria-busy="true"
          >
            <div className="mb-3 text-xs font-medium text-slate-500 dark:text-zinc-400">
              {reasoning
                ? "VOID AI is reasoning through your question…"
                : "Thinking with VOID AI…"}
            </div>
            <div className="space-y-2 max-w-[65ch]">
              <div className="h-3.5 w-11/12 rounded bg-slate-200/80 dark:bg-zinc-800" />
              <div className="h-3.5 w-full rounded bg-slate-200/60 dark:bg-zinc-800/80" />
              <div className="h-3.5 w-4/5 rounded bg-slate-200/70 dark:bg-zinc-800/70" />
            </div>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300 flex items-center justify-between gap-3">
            <span className="text-pretty">{error}</span>
            <button
              type="button"
              onClick={() => {
                const lastUser = [...messages]
                  .reverse()
                  .find((m) => m.role === "user")
                if (lastUser) sendFollowup(lastUser.content)
              }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 cursor-pointer"
            >
              <RotateCcw className="size-3" />
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Follow-up prompt composer */}
      <form
        onSubmit={handleFormSubmit}
        className="mt-6 flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-xs focus-within:border-slate-300 dark:border-zinc-800 dark:bg-[#141518] dark:focus-within:border-zinc-700"
      >
        <input
          value={followupInput}
          onChange={(e) => setFollowupInput(e.target.value)}
          placeholder="Ask a follow-up question…"
          aria-label="Ask a follow-up question"
          disabled={loading}
          className="min-w-0 flex-1 bg-transparent px-2 py-1 text-base sm:text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />
        <button
          type="button"
          onClick={() => setReasoning((prev) => !prev)}
          title="Toggle deep reasoning"
          aria-label="Toggle deep reasoning"
          className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
            reasoning
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
              : "text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          }`}
        >
          <Atom className="size-3.5" />
          <span className="hidden sm:inline">Reasoning</span>
        </button>
        <button
          type="submit"
          disabled={loading || !followupInput.trim()}
          aria-label="Send follow-up"
          className="flex size-8 items-center justify-center rounded-xl bg-slate-900 text-white transition-opacity hover:opacity-90 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 cursor-pointer disabled:cursor-not-allowed"
        >
          <Send className="size-3.5" />
        </button>
      </form>

      <div ref={bottomRef} />
    </section>
  )
}
