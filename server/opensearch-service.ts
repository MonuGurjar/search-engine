import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'

export interface IndexedDocument {
  id?: string
  url: string
  canonicalUrl?: string
  canonical_url?: string
  domain: string
  siteName?: string
  site_name?: string
  title: string
  rawTitle?: string
  raw_title?: string
  description?: string
  summary?: string
  aiSummary?: string
  ai_summary?: string
  content?: string
  headings?: string[]
  category?: string
  pageType?: string
  page_type?: string
  language?: string
  favicon?: string | null
  topics?: string[]
  tags?: string[]
  httpStatus?: number
  http_status?: number
  indexedAt?: string
  indexed_at?: string
  crawlDurationMs?: number
  previewImage?: string | null
  preview_image?: string | null
  images?: string[]
  extractionMethod?: string
  extraction_method?: string
}

export interface SearchHit {
  document: IndexedDocument
  score: number
  highlights?: {
    title?: string[]
    content?: string[]
    headings?: string[]
    summary?: string[]
    description?: string[]
    ai_summary?: string[]
  }
}

export interface SearchResponse {
  total: number
  tookMs: number
  hits: SearchHit[]
}

export function resolveOpenSearchEnv() {
  const envPaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../.env'),
  ]

  const envVars: Record<string, string> = {}
  for (const p of envPaths) {
    try {
      if (fs.existsSync(p)) {
        const lines = fs.readFileSync(p, 'utf-8').split('\n')
        for (const l of lines) {
          const match = l.match(/^([A-Z0-9_]+)=(.*)$/)
          if (match) envVars[match[1]] = match[2].trim()
        }
      }
    } catch {}
  }

  const url =
    process.env.OPENSEARCH_URL ||
    envVars['OPENSEARCH_URL'] ||
    process.env.VITE_OPENSEARCH_URL ||
    envVars['VITE_OPENSEARCH_URL'] ||
    'https://os-3c0470b3-voidcore.j.aivencloud.com:12170'

  const user =
    process.env.OPENSEARCH_USER ||
    envVars['OPENSEARCH_USER'] ||
    process.env.VITE_OPENSEARCH_USER ||
    envVars['VITE_OPENSEARCH_USER'] ||
    'avnadmin'

  const password =
    process.env.OPENSEARCH_PASSWORD ||
    envVars['OPENSEARCH_PASSWORD'] ||
    process.env.VITE_OPENSEARCH_PASSWORD ||
    envVars['VITE_OPENSEARCH_PASSWORD'] ||
    ''

  const index =
    process.env.OPENSEARCH_INDEX ||
    envVars['OPENSEARCH_INDEX'] ||
    process.env.VITE_OPENSEARCH_INDEX ||
    envVars['VITE_OPENSEARCH_INDEX'] ||
    'indexed_pages'

  const authHeader = 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64')

  return { url, user, password, index, authHeader }
}

export function parseQueryOperators(rawQuery: string) {
  let query = rawQuery.trim()
  let siteFilter: string | null = null
  const exclusions: string[] = []
  const phrases: string[] = []

  // Extract site:domain
  const siteMatch = query.match(/(?:^|\s)site:([^\s]+)/i)
  if (siteMatch) {
    siteFilter = siteMatch[1]
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
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
 * Builds OpenSearch query payload conforming to the BM25 Ranking Pipeline refactor:
 * Boosts:
 * - title^3.5
 * - headings^2.0
 * - topics^1.8
 * - tags^1.5
 * - description^1.2
 * - ai_summary^1.2
 * - content^1.0
 * - domain^1.0
 */
export function buildSearchPayload(
  query: string,
  options: {
    category?: string
    from?: number
    size?: number
  } = {}
) {
  const { cleanQuery: mainTerms, siteFilter, exclusions, phrases } = parseQueryOperators(query)
  const from = options.from ?? 0
  const size = options.size ?? 20

  const mustClauses: any[] = []
  const mustNotClauses: any[] = []
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

  if (mainTerms) {
    mustClauses.push({
      bool: {
        should: [
          {
            multi_match: {
              query: mainTerms,
              fields: [
                'title^3.5',
                'headings^2.0',
                'topics^1.8',
                'tags^1.5',
                'description^1.2',
                'ai_summary^1.2',
                'content^1.0',
                'domain^1.0',
              ],
              type: 'best_fields',
              fuzziness: 'AUTO',
              boost: 2.0,
            },
          },
          {
            multi_match: {
              query: mainTerms,
              fields: [
                'title^3.5',
                'headings^2.0',
                'topics^1.8',
                'tags^1.5',
                'description^1.2',
                'ai_summary^1.2',
                'content^1.0',
                'domain^1.0',
              ],
              operator: 'or',
            },
          },
        ],
        minimum_should_match: 1,
      },
    })
  }

  for (const phrase of phrases) {
    mustClauses.push({
      multi_match: {
        query: phrase,
        type: 'phrase',
        fields: ['title^4.0', 'headings^2.5', 'summary^2.0', 'content^1.5', 'url'],
        boost: 3.0,
      },
    })
  }

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

  for (const excl of exclusions) {
    mustNotClauses.push({
      multi_match: {
        query: excl,
        fields: ['title', 'headings', 'description', 'summary', 'ai_summary', 'content', 'url', 'topics', 'tags'],
      },
    })
  }

  if (options.category && options.category !== 'all' && options.category !== 'web' && options.category !== 'tools') {
    filterClauses.push({
      bool: {
        should: [
          { match: { category: options.category } },
          { match: { page_type: options.category } },
          { match: { topics: options.category } },
          { match: { tags: options.category } },
        ],
        minimum_should_match: 1,
      },
    })
  }

  if (mustClauses.length === 0) {
    mustClauses.push({ match_all: {} })
  }

  return {
    from,
    size,
    query: {
      bool: {
        must: mustClauses,
        must_not: mustNotClauses.length > 0 ? mustNotClauses : undefined,
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
        description: { fragment_size: 160, number_of_fragments: 1 },
        summary: { fragment_size: 160, number_of_fragments: 1 },
        ai_summary: { fragment_size: 160, number_of_fragments: 1 },
      },
    },
  }
}

/**
 * Production BM25 Search against OpenSearch
 * Applies multi_match boosts, highlighting with <mark>, and canonical deduplication
 */
export async function searchOpenSearch(
  queryStr: string,
  options: {
    category?: string
    page?: number
    limit?: number
  } = {}
): Promise<SearchResponse> {
  const { url, index, authHeader } = resolveOpenSearchEnv()
  const q = (queryStr || '').trim()
  const limit = Math.min(100, Math.max(1, options.limit || 20))
  const page = Math.max(1, options.page || 1)
  const from = (page - 1) * limit

  const searchPayload = buildSearchPayload(q, {
    category: options.category,
    from,
    size: limit * 2, // Request buffer for deduplication
  })

  const body = JSON.stringify(searchPayload)
  const parsedUrl = new URL(`${url}/${index}/_search`)

  return new Promise<SearchResponse>((resolve) => {
    const startTime = Date.now()
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port ? parseInt(parsedUrl.port) : 443,
      path: parsedUrl.pathname,
      method: 'POST',
      family: 4,
      timeout: 10000,
      rejectUnauthorized: false,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Authorization': authHeader,
      },
    }

    const req = https.request(reqOptions, (res) => {
      let data = ''
      res.on('data', (c) => (data += c))
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          const rawHits = json.hits?.hits || []
          const totalHits = typeof json.hits?.total?.value === 'number' ? json.hits.total.value : rawHits.length
          const seenCanonicals = new Set<string>()
          const hits: SearchHit[] = []

          for (const h of rawHits) {
            const s = h._source || {}
            const canonical = s.canonical_url || s.url || h._id
            if (seenCanonicals.has(canonical)) {
              continue
            }
            seenCanonicals.add(canonical)

            const document: IndexedDocument = {
              id: h._id || s.id,
              url: s.url,
              canonicalUrl: s.canonical_url || s.url,
              canonical_url: s.canonical_url || s.url,
              domain: s.domain,
              siteName: s.site_name,
              site_name: s.site_name,
              title: s.title,
              rawTitle: s.raw_title,
              raw_title: s.raw_title,
              description: s.description,
              summary: s.summary,
              aiSummary: s.ai_summary || s.summary,
              ai_summary: s.ai_summary || s.summary,
              content: s.content,
              headings: Array.isArray(s.headings) ? s.headings : [],
              category: s.category,
              pageType: s.page_type || 'WebPage',
              page_type: s.page_type || 'WebPage',
              language: s.language || 'en',
              favicon: s.favicon,
              topics: Array.isArray(s.topics) ? s.topics : [],
              tags: Array.isArray(s.tags) ? s.tags : [],
              httpStatus: s.http_status || 200,
              http_status: s.http_status || 200,
              indexedAt: s.indexed_at,
              indexed_at: s.indexed_at,
              crawlDurationMs: s.crawl_duration_ms,
              previewImage: s.preview_image,
              preview_image: s.preview_image,
              images: Array.isArray(s.images) ? s.images : [],
              extractionMethod: s.extraction_method,
              extraction_method: s.extraction_method,
            }

            hits.push({
              document,
              score: typeof h._score === 'number' ? Number(h._score.toFixed(2)) : 1.0,
              highlights: h.highlight,
            })

            if (hits.length >= limit) {
              break
            }
          }

          resolve({
            total: totalHits,
            tookMs: Date.now() - startTime,
            hits,
          })
        } catch (e: any) {
          console.error('[OpenSearch BM25] Response parse error:', e?.message || e)
          resolve({
            total: 0,
            tookMs: Date.now() - startTime,
            hits: [],
          })
        }
      })
    })

    req.on('timeout', () => {
      req.destroy()
      resolve({
        total: 0,
        tookMs: 10000,
        hits: [],
      })
    })

    req.on('error', (err) => {
      console.error('[OpenSearch BM25] Network error:', err.message)
      resolve({
        total: 0,
        tookMs: 0,
        hits: [],
      })
    })

    req.write(body)
    req.end()
  })
}

/**
 * Autocomplete prefix matching for search bar suggestions
 */
export async function getAutocompleteSuggestions(query: string): Promise<string[]> {
  const clean = (query || '').trim().slice(0, 100)
  if (!clean || clean.length < 2) return []

  const { url, index, authHeader } = resolveOpenSearchEnv()
  const suggestBody = {
    size: 6,
    _source: ['title', 'topics', 'headings', 'domain'],
    query: {
      bool: {
        should: [
          {
            match_phrase_prefix: {
              title: { query: clean, max_expansions: 10 },
            },
          },
          { prefix: { domain: clean.toLowerCase() } },
          { match_phrase_prefix: { topics: { query: clean } } },
          { match_phrase_prefix: { headings: { query: clean } } },
        ],
      },
    },
  }

  const body = JSON.stringify(suggestBody)
  const parsedUrl = new URL(`${url}/${index}/_search`)

  return new Promise<string[]>((resolve) => {
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port ? parseInt(parsedUrl.port) : 443,
      path: parsedUrl.pathname,
      method: 'POST',
      family: 4,
      timeout: 5000,
      rejectUnauthorized: false,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Authorization': authHeader,
      },
    }

    const req = https.request(reqOptions, (res) => {
      let data = ''
      res.on('data', (c) => (data += c))
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
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
            if (Array.isArray(src.headings)) {
              for (const h of src.headings) {
                if (h && h.toLowerCase().includes(clean.toLowerCase())) {
                  suggestionsSet.add(h.trim())
                }
              }
            }
          }
          resolve(Array.from(suggestionsSet).slice(0, 5))
        } catch {
          resolve([])
        }
      })
    })

    req.on('timeout', () => {
      req.destroy()
      resolve([])
    })
    req.on('error', () => resolve([]))

    req.write(body)
    req.end()
  })
}
