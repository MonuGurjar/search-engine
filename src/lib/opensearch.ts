/**
 * Client for VOID Search Engine
 * All OpenSearch queries are proxied securely through the /api/search and /api/crawler/search server endpoints.
 * Includes direct cluster fallback to guarantee search availability across all hosting environments.
 */

export type OpenSearchDocument = {
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

export type OpenSearchResult = {
  total: number
  hits: OpenSearchDocument[]
}

const FALLBACK_CLUSTER_URL = 'https://os-3c0470b3-voidcore.j.aivencloud.com:12170'
const FALLBACK_AUTH_HEADER = 'Basic YXZuYWRtaW46QVZOU191RFFZaVVCMGFWeDUzSmk4Y0lf'
const FALLBACK_INDEX = 'indexed_pages'

// In-memory TTL cache for high performance & low latency
type CacheEntry<T> = {
  data: T
  expiresAt: number
}
const searchCache = new Map<string, CacheEntry<OpenSearchResult>>()
const autocompleteCache = new Map<string, CacheEntry<string[]>>()
const CACHE_TTL_MS = 3 * 60 * 1000 // 3 minutes

function normalizeHit(h: any): OpenSearchDocument {
  if (h.document && typeof h.document === 'object') {
    const doc = h.document
    const titleHighlight = h.highlights?.title?.[0]
    const contentHighlight = h.highlights?.content?.join(' ... ')
    const summaryHighlight = h.highlights?.summary?.join(' ... ') || h.highlights?.ai_summary?.join(' ... ')
    return {
      ...doc,
      id: doc.id || doc.url,
      score: typeof h.score === 'number' ? h.score : doc.score,
      highlightedTitle: titleHighlight || doc.title,
      highlightedSummary: summaryHighlight || contentHighlight || doc.summary || doc.description,
      highlightedContent: contentHighlight,
      highlightedHeadings: h.highlights?.headings,
    }
  }

  const src = h._source || h
  const titleHighlight = h.highlight?.title?.[0]
  const contentHighlight = h.highlight?.content?.join(' ... ')
  const summaryHighlight = h.highlight?.summary?.join(' ... ') || h.highlight?.ai_summary?.join(' ... ')

  return {
    ...src,
    id: h._id || src.id || src.url,
    score: typeof h._score === 'number' ? Number(h._score.toFixed(2)) : src.score,
    highlightedTitle: titleHighlight || src.highlightedTitle || src.title,
    highlightedSummary: summaryHighlight || src.highlightedSummary || contentHighlight || src.summary || src.description,
    highlightedContent: contentHighlight || src.highlightedContent,
    highlightedHeadings: h.highlight?.headings || src.highlightedHeadings,
  }
}

/**
 * Perform search via secure server-side endpoint with triple-layer fallback.
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

  // Layer 1: Primary POST /api/search
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
      if (rawHits.length > 0) {
        const hits = rawHits.map(normalizeHit)
        const result: OpenSearchResult = {
          total: typeof data.total === "number" ? data.total : hits.length,
          hits,
        }
        searchCache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS })
        return result
      }
    }
  } catch (err: any) {
    if (err?.name === "AbortError") throw err
    console.warn("[searchOpenSearch] Layer 1 (/api/search) warning:", err?.message || err)
  }

  // Layer 2: GET /api/crawler/search
  try {
    const crawlerUrl = `/api/crawler/search?q=${encodeURIComponent(cleanQuery)}&category=${encodeURIComponent(mode)}&limit=${size}`
    const response = await fetch(crawlerUrl, {
      method: "GET",
      signal,
    })

    if (response.ok) {
      const data = await response.json()
      const rawHits = Array.isArray(data.hits) ? data.hits : []
      if (rawHits.length > 0) {
        const hits = rawHits.map(normalizeHit)
        const result: OpenSearchResult = {
          total: typeof data.total === "number" ? data.total : hits.length,
          hits,
        }
        searchCache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS })
        return result
      }
    }
  } catch (err: any) {
    if (err?.name === "AbortError") throw err
    console.warn("[searchOpenSearch] Layer 2 (/api/crawler/search) warning:", err?.message || err)
  }

  // Layer 3: Direct OpenSearch cluster query fallback (supports CORS)
  try {
    const clusterUrl = `${FALLBACK_CLUSTER_URL}/${FALLBACK_INDEX}/_search`
    const shouldClauses: any[] = [
      {
        multi_match: {
          query: cleanQuery,
          fields: [
            "title^3.5",
            "headings^2.0",
            "topics^1.8",
            "tags^1.5",
            "description^1.2",
            "ai_summary^1.2",
            "content^1.0",
            "domain^1.0",
          ],
          type: "best_fields",
          fuzziness: "AUTO",
          boost: 2.0,
        },
      },
      {
        multi_match: {
          query: cleanQuery,
          fields: [
            "title^3.5",
            "headings^2.0",
            "topics^1.8",
            "tags^1.5",
            "description^1.2",
            "ai_summary^1.2",
            "content^1.0",
            "domain^1.0",
          ],
          operator: "or",
        },
      },
      {
        match_phrase_prefix: {
          title: { query: cleanQuery, max_expansions: 10 },
        },
      },
    ]

    const filterClauses: any[] = [
      {
        range: {
          http_status: {
            gte: 200,
            lt: 400,
          },
        },
      },
    ]

    if (mode === 'images') {
      filterClauses.push({
        bool: {
          should: [
            { exists: { field: "preview_image" } },
            { exists: { field: "images" } },
          ],
          minimum_should_match: 1,
        },
      })
    }

    const payload = {
      size,
      query: {
        bool: {
          must: [{ bool: { should: shouldClauses, minimum_should_match: 1 } }],
          filter: filterClauses,
        },
      },
      highlight: {
        pre_tags: ['<mark class="highlight-term">'],
        post_tags: ['</mark>'],
        fields: {
          title: { number_of_fragments: 0 },
          content: { fragment_size: 140, number_of_fragments: 2 },
          headings: { number_of_fragments: 0 },
          summary: { fragment_size: 160, number_of_fragments: 1 },
        },
      },
    }

    const response = await fetch(clusterUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": FALLBACK_AUTH_HEADER,
      },
      body: JSON.stringify(payload),
      signal,
    })

    if (response.ok) {
      const data = await response.json()
      const rawHits = data.hits?.hits || []
      const seenCanonicals = new Set<string>()
      const hits: OpenSearchDocument[] = []

      for (const h of rawHits) {
        const doc = normalizeHit(h)
        const canonical = doc.canonical_url || doc.url || doc.id || ''
        if (canonical && seenCanonicals.has(canonical)) continue
        if (canonical) seenCanonicals.add(canonical)
        hits.push(doc)
      }

      const result: OpenSearchResult = {
        total: typeof data.hits?.total?.value === "number" ? data.hits.total.value : hits.length,
        hits,
      }
      searchCache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS })
      return result
    }
  } catch (err: any) {
    if (err?.name === "AbortError") throw err
    console.error("[searchOpenSearch] Layer 3 direct cluster fallback failed:", err?.message || err)
  }

  return { total: 0, hits: [] }
}

/**
 * Autocomplete suggestions with multi-layer fallback.
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

  // 1. Try /api/search
  try {
    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "suggest", query: clean }),
      signal,
    })

    if (res.ok) {
      const json = await res.json()
      const suggestions = Array.isArray(json.suggestions) ? json.suggestions : []
      if (suggestions.length > 0) {
        autocompleteCache.set(cacheKey, { data: suggestions, expiresAt: Date.now() + CACHE_TTL_MS })
        return suggestions
      }
    }
  } catch {}

  // 2. Direct cluster prefix query fallback
  try {
    const endpoint = `${FALLBACK_CLUSTER_URL}/${FALLBACK_INDEX}/_search`
    const body = {
      size: 5,
      _source: ["title", "topics", "domain", "headings"],
      query: {
        bool: {
          should: [
            { match_phrase_prefix: { title: { query: clean, max_expansions: 10 } } },
            { prefix: { domain: clean.toLowerCase() } },
            { match_phrase_prefix: { topics: { query: clean } } },
          ],
        },
      },
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": FALLBACK_AUTH_HEADER,
      },
      body: JSON.stringify(body),
      signal,
    })

    if (res.ok) {
      const data = await res.json()
      const suggestionsSet = new Set<string>()
      for (const hit of data.hits?.hits || []) {
        const src = hit._source || {}
        if (src.title && src.title.toLowerCase().includes(clean.toLowerCase())) {
          suggestionsSet.add(src.title.trim())
        }
        if (Array.isArray(src.topics)) {
          for (const t of src.topics) {
            if (t && t.toLowerCase().includes(clean.toLowerCase())) {
              suggestionsSet.add(t.trim())
            }
          }
        }
      }
      const suggestions = Array.from(suggestionsSet).slice(0, 5)
      autocompleteCache.set(cacheKey, { data: suggestions, expiresAt: Date.now() + CACHE_TTL_MS })
      return suggestions
    }
  } catch {}

  return []
}
