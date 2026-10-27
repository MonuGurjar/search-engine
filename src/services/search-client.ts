/**
 * Centralized Frontend Search Client for VOID Search Engine
 * Exclusively communicates with same-origin serverless API endpoints:
 * - /api/search
 * - /api/autocomplete
 *
 * ZERO browser-to-database requests.
 * ZERO OpenSearch credentials or cluster URLs in client bundles.
 */

export interface OpenSearchDocument {
  id?: string
  url: string
  canonical_url?: string
  canonicalUrl?: string
  title: string
  raw_title?: string
  rawTitle?: string
  domain: string
  site_name?: string
  siteName?: string
  category?: string
  page_type?: string
  pageType?: string
  description?: string
  summary?: string
  ai_summary?: string
  aiSummary?: string
  content?: string
  headings?: string[]
  topics?: string[]
  tags?: string[]
  language?: string
  favicon?: string | null
  indexed_at?: string
  indexedAt?: string
  preview_image?: string | null
  previewImage?: string | null
  images?: string[]
  http_status?: number
  httpStatus?: number
  score?: number
  highlightedTitle?: string
  highlightedSummary?: string
  highlightedContent?: string
  highlightedHeadings?: string[]
  extraction_method?: string
  extractionMethod?: string
}

export interface OpenSearchResult {
  total: number
  hits: OpenSearchDocument[]
}

// In-memory cache with 3-minute TTL
type CacheEntry<T,> = {
  data: T
  expiresAt: number
}

const searchCache = new Map<string, CacheEntry<OpenSearchResult>>()
const autocompleteCache = new Map<string, CacheEntry<string[]>>()
const CACHE_TTL_MS = 3 * 60 * 1000 // 3 minutes

function normalizeHit(h: any): OpenSearchDocument {
  if (h.document && typeof h.document === "object") {
    const doc = h.document
    const titleHighlight = h.highlights?.title?.[0]
    const contentHighlight = h.highlights?.content?.join(" ... ")
    const summaryHighlight =
      h.highlights?.summary?.join(" ... ") ||
      h.highlights?.ai_summary?.join(" ... ")
    return {
      ...doc,
      id: doc.id || doc.url,
      score: typeof h.score === "number" ? h.score : doc.score,
      highlightedTitle: titleHighlight || doc.title,
      highlightedSummary:
        summaryHighlight || contentHighlight || doc.summary || doc.description,
      highlightedContent: contentHighlight,
      highlightedHeadings: h.highlights?.headings,
    }
  }

  const src = h._source || h
  const titleHighlight = h.highlight?.title?.[0]
  const contentHighlight = h.highlight?.content?.join(" ... ")
  const summaryHighlight =
    h.highlight?.summary?.join(" ... ") ||
    h.highlight?.ai_summary?.join(" ... ")

  return {
    ...src,
    id: h._id || src.id || src.url,
    score:
      typeof h._score === "number" ? Number(h._score.toFixed(2)) : src.score,
    highlightedTitle: titleHighlight || src.highlightedTitle || src.title,
    highlightedSummary:
      summaryHighlight ||
      src.highlightedSummary ||
      contentHighlight ||
      src.summary ||
      src.description,
    highlightedContent: contentHighlight || src.highlightedContent,
    highlightedHeadings: h.highlight?.headings || src.highlightedHeadings,
  }
}

/**
 * Executes search query via same-origin /api/search endpoint.
 */
export async function search(
  query: string,
  mode = "all",
  size = 100,
  signal?: AbortSignal,
): Promise<OpenSearchResult> {
  const cleanQuery = query.trim()
  if (!cleanQuery) {
    return { total: 0, hits: [] }
  }

  // Check client-side in-memory cache
  const cacheKey = `${cleanQuery.toLowerCase()}::${mode}::${size}`
  const cached = searchCache.get(cacheKey)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data
  }

  try {
    const response = await fetch("/api/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "search",
        query: cleanQuery,
        mode,
        size,
      }),
      signal,
    })

    if (response.ok) {
      const data = await response.json()
      const rawHits = Array.isArray(data.hits) ? data.hits : []
      const hits = rawHits.map(normalizeHit)
      const result: OpenSearchResult = {
        total: typeof data.total === "number" ? data.total : hits.length,
        hits,
      }
      searchCache.set(cacheKey, {
        data: result,
        expiresAt: Date.now() + CACHE_TTL_MS,
      })
      return result
    }

    // Attempt GET fallback if POST was rejected or failed
    if (!response.ok) {
      const getUrl = `/api/search?q=${encodeURIComponent(cleanQuery)}&category=${encodeURIComponent(mode)}&limit=${size}`
      const getResponse = await fetch(getUrl, { signal })
      if (getResponse.ok) {
        const getData = await getResponse.json()
        const rawHits = Array.isArray(getData.hits) ? getData.hits : []
        const hits = rawHits.map(normalizeHit)
        const result: OpenSearchResult = {
          total:
            typeof getData.total === "number" ? getData.total : hits.length,
          hits,
        }
        searchCache.set(cacheKey, {
          data: result,
          expiresAt: Date.now() + CACHE_TTL_MS,
        })
        return result
      }
    }
  } catch (err: any) {
    if (err?.name === "AbortError") throw err
    console.warn("[search-client] API query warning:", err?.message || err)
  }

  return { total: 0, hits: [] }
}

/**
 * Retrieves autocomplete suggestions via same-origin /api/autocomplete.
 */
export async function getAutocomplete(
  query: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const clean = query.trim()
  if (!clean || clean.length < 2) return []

  const cacheKey = clean.toLowerCase()
  const cached = autocompleteCache.get(cacheKey)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data
  }

  // Primary: /api/autocomplete
  try {
    const res = await fetch(
      `/api/autocomplete?q=${encodeURIComponent(clean)}`,
      {
        method: "GET",
        signal,
      },
    )

    if (res.ok) {
      const json = await res.json()
      const suggestions = Array.isArray(json.suggestions)
        ? json.suggestions
        : []
      if (suggestions.length > 0) {
        autocompleteCache.set(cacheKey, {
          data: suggestions,
          expiresAt: Date.now() + CACHE_TTL_MS,
        })
        return suggestions
      }
    }
  } catch (err: any) {
    if (err?.name === "AbortError") throw err
  }

  // Secondary fallback: /api/search?action=suggest
  try {
    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "suggest", query: clean }),
      signal,
    })

    if (res.ok) {
      const json = await res.json()
      const suggestions = Array.isArray(json.suggestions)
        ? json.suggestions
        : []
      autocompleteCache.set(cacheKey, {
        data: suggestions,
        expiresAt: Date.now() + CACHE_TTL_MS,
      })
      return suggestions
    }
  } catch {}

  return []
}
