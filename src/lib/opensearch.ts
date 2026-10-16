/**
 * Aiven OpenSearch client for VOID Search Engine
 * Features: BM25 ranking, search operators, phrase matching, caching, snippets & autocomplete
 */

const OPENSEARCH_URL =
  import.meta.env.VITE_OPENSEARCH_URL ||
  'https://os-3c0470b3-voidcore.j.aivencloud.com:12170'

const OPENSEARCH_USER = import.meta.env.VITE_OPENSEARCH_USER || ''
const OPENSEARCH_PASSWORD = import.meta.env.VITE_OPENSEARCH_PASSWORD || ''
const OPENSEARCH_INDEX = import.meta.env.VITE_OPENSEARCH_INDEX || 'indexed_pages'

const authHeader =
  OPENSEARCH_USER && OPENSEARCH_PASSWORD
    ? 'Basic ' + btoa(`${OPENSEARCH_USER}:${OPENSEARCH_PASSWORD}`)
    : ''

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
type CacheEntry<T> = {
  data: T
  expiresAt: number
}
const searchCache = new Map<string, CacheEntry<OpenSearchResult>>()
const autocompleteCache = new Map<string, CacheEntry<string[]>>()
const CACHE_TTL_MS = 3 * 60 * 1000 // 3 minutes

/**
 * Parse search operators from query string:
 * - site:example.com
 * - -excludedTerm
 * - "exact phrase"
 */
function parseQueryOperators(rawQuery: string) {
  let query = rawQuery.trim()
  let siteFilter: string | null = null
  const exclusions: string[] = []
  const phrases: string[] = []

  // Extract site:domain
  const siteMatch = query.match(/(?:^|\s)site:([^\s]+)/i)
  if (siteMatch) {
    siteFilter = siteMatch[1].toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    query = query.replace(siteMatch[0], ' ').trim()
  }

  // Extract quoted exact phrases
  const phraseMatches = query.match(/"([^"]+)"/g)
  if (phraseMatches) {
    for (const pm of phraseMatches) {
      const phraseContent = pm.slice(1, -1).trim()
      if (phraseContent) phrases.push(phraseContent)
      query = query.replace(pm, ' ').trim()
    }
  }

  // Extract exclusions: -word
  const words = query.split(/\s+/).filter(Boolean)
  const remainingWords: string[] = []

  for (const w of words) {
    if (w.startsWith('-') && w.length > 1) {
      exclusions.push(w.slice(1))
    } else {
      remainingWords.push(w)
    }
  }

  return {
    cleanQuery: remainingWords.join(' ').trim(),
    siteFilter,
    exclusions,
    phrases,
  }
}

/**
 * Search Aiven OpenSearch using multi-field BM25 scoring, exact phrase matching,
 * operators (site:, -word, quotes), fuzzy fallback, and highlighted snippets.
 */
export async function searchOpenSearch(
  query: string,
  mode = 'all',
  size = 100,
  signal?: AbortSignal
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

  const {
    cleanQuery: mainTerms,
    siteFilter,
    exclusions,
    phrases,
  } = parseQueryOperators(cleanQuery)

  const mustClauses: any[] = []
  const mustNotClauses: any[] = []

  // 1. Main terms match with BM25 field weights & fuzzy fallback
  if (mainTerms) {
    mustClauses.push({
      bool: {
        should: [
          // Exact match boost
          {
            multi_match: {
              query: mainTerms,
              fields: [
                'title^4',
                'summary^2.5',
                'topics^2',
                'tags^2',
                'domain^1.5',
                'url',
              ],
              type: 'best_fields',
              boost: 2.0,
            },
          },
          // Fuzzy typo tolerance
          {
            multi_match: {
              query: mainTerms,
              fields: [
                'title^3',
                'summary^2',
                'topics^1.5',
                'tags^1.5',
                'domain^1.2',
                'url',
              ],
              fuzziness: 'AUTO',
              operator: 'or',
            },
          },
        ],
        minimum_should_match: 1,
      },
    })
  }

  // 2. Exact phrase clauses ("term one term two")
  for (const phrase of phrases) {
    mustClauses.push({
      multi_match: {
        query: phrase,
        type: 'phrase',
        fields: ['title^4', 'summary^2', 'url'],
        boost: 3.0,
      },
    })
  }

  // 3. Site filter operator (site:monugurjar.vercel.app)
  if (siteFilter) {
    mustClauses.push({
      bool: {
        should: [
          { wildcard: { domain: `*${siteFilter}*` } },
          { wildcard: { url: `*${siteFilter}*` } },
        ],
        minimum_should_match: 1,
      },
    })
  }

  // 4. Exclusions (-keyword)
  for (const excl of exclusions) {
    mustNotClauses.push({
      multi_match: {
        query: excl,
        fields: ['title', 'summary', 'url', 'topics', 'tags'],
      },
    })
  }

  // 5. Category/Mode filtering if not 'all' or 'web'
  if (mode && mode !== 'all' && mode !== 'web' && mode !== 'tools') {
    mustClauses.push({
      bool: {
        should: [
          { match: { category: mode } },
          { match: { page_type: mode } },
          { match: { topics: mode } },
          { match: { tags: mode } },
        ],
        minimum_should_match: 1,
      },
    })
  }

  // If both mainTerms and phrases were empty (e.g. only site: filter), use match_all
  if (mustClauses.length === 0) {
    mustClauses.push({ match_all: {} })
  }

  const searchBody: any = {
    size,
    query: {
      bool: {
        must: mustClauses,
        must_not: mustNotClauses.length > 0 ? mustNotClauses : undefined,
      },
    },
    highlight: {
      pre_tags: ['<mark class="highlight-term">'],
      post_tags: ['</mark>'],
      fields: {
        title: { number_of_fragments: 1, fragment_size: 100 },
        summary: { number_of_fragments: 2, fragment_size: 160 },
      },
    },
  }

  const endpoint = `${OPENSEARCH_URL}/${OPENSEARCH_INDEX}/_search`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (authHeader) {
    headers['Authorization'] = authHeader
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(searchBody),
    signal,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenSearch error ${response.status}: ${errorText}`)
  }

  const responseText = await response.text()
  if (!responseText || !responseText.trim()) {
    return { total: 0, hits: [] }
  }

  let data: any
  try {
    data = JSON.parse(responseText)
  } catch {
    return { total: 0, hits: [] }
  }
  const total =
    typeof data.hits?.total === 'number'
      ? data.hits.total
      : data.hits?.total?.value || 0

  const hits: OpenSearchDocument[] = (data.hits?.hits || []).map((hit: any) => {
    const src = hit._source || {}
    const highlightedTitle = hit.highlight?.title?.[0]
    const highlightedSummary = hit.highlight?.summary?.join(' ... ')

    return {
      ...src,
      id: hit._id || src.id,
      highlightedTitle: highlightedTitle || src.title,
      highlightedSummary: highlightedSummary || src.summary,
    }
  })

  const result: OpenSearchResult = { total, hits }

  // Save to cache
  searchCache.set(cacheKey, {
    data: result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  })

  return result
}

/**
 * Autocomplete suggestions fetched dynamically from OpenSearch
 */
export async function getAutocompleteSuggestions(
  query: string,
  signal?: AbortSignal
): Promise<string[]> {
  const clean = query.trim()
  if (!clean || clean.length < 2) return []

  const cacheKey = clean.toLowerCase()
  const cached = autocompleteCache.get(cacheKey)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data
  }

  try {
    const endpoint = `${OPENSEARCH_URL}/${OPENSEARCH_INDEX}/_search`
    const body = {
      size: 5,
      _source: ['title', 'topics', 'domain'],
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

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (authHeader) {
      headers['Authorization'] = authHeader
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    })

    if (!res.ok) return []

    const json = await res.json()
    const suggestionsSet = new Set<string>()

    for (const hit of json.hits?.hits || []) {
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
    autocompleteCache.set(cacheKey, {
      data: suggestions,
      expiresAt: Date.now() + CACHE_TTL_MS,
    })

    return suggestions
  } catch {
    return []
  }
}
