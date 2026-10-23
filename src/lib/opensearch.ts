/**
 * Client for VOID Search Engine
 * All OpenSearch queries are proxied securely through the /api/search server endpoint.
 * Zero credentials, passwords, or cluster URLs are exposed in browser code.
 */

export type OpenSearchDocument = {
  id?: string
  url: string
  title: string
  domain: string
  category?: string
  page_type?: string
  summary?: string
  topics?: string[]
  tags?: string[]
  indexed_at?: string
  preview_image?: string
  images?: string[]
  http_status?: number
  highlightedTitle?: string
  highlightedSummary?: string
}

export type OpenSearchResult = {
  total: number
  hits: OpenSearchDocument[]
}

// In-memory TTL cache for high performance & low latency
type CacheEntry<T,> = {
  data: T
  expiresAt: number
}
const searchCache = new Map<string, CacheEntry<OpenSearchResult>>()
const autocompleteCache = new Map<string, CacheEntry<string[]>>()
const CACHE_TTL_MS = 3 * 60 * 1000 // 3 minutes

/**
 * Perform search via secure server-side endpoint.
 * Protects OpenSearch cluster credentials from client exposure.
 */
export async function searchOpenSearch(
  query: string,
  mode = "all",
  size = 100,
  signal?: AbortSignal,
): Promise<OpenSearchResult> {
  const cleanQuery = query.trim()
  if (!cleanQuery) {
    return { total: 0, hits: [] }
  }

  // Check cache
  const cacheKey = `${query.toLowerCase()}::${mode}::${size}`
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

    if (!response.ok) {
      return { total: 0, hits: [] }
    }

    const data = await response.json()
    const result: OpenSearchResult = {
      total: typeof data.total === "number" ? data.total : 0,
      hits: Array.isArray(data.hits) ? data.hits : [],
    }

    // Save to cache
    searchCache.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    })

    return result
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw err
    }
    console.error("Search request failed:", err?.message || err)
    return { total: 0, hits: [] }
  }
}

/**
 * Autocomplete suggestions fetched dynamically via secure server-side endpoint.
 */
export async function getAutocompleteSuggestions(
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

  try {
    const res = await fetch("/api/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "suggest",
        query: clean,
      }),
      signal,
    })

    if (!res.ok) return []

    const json = await res.json()
    const suggestions = Array.isArray(json.suggestions) ? json.suggestions : []

    autocompleteCache.set(cacheKey, {
      data: suggestions,
      expiresAt: Date.now() + CACHE_TTL_MS,
    })

    return suggestions
  } catch {
    return []
  }
}
