import type { IncomingMessage, ServerResponse } from "node:http"
import https from "node:https"
import fs from "node:fs"
import path from "node:path"

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

const DEFAULT_OPENSEARCH_URL =
  "https://os-3c0470b3-voidcore.j.aivencloud.com:12170"
const DEFAULT_OPENSEARCH_USER = "avnadmin"
const DEFAULT_OPENSEARCH_PASSWORD = Buffer.from(
  "QVZOU191RFFZaVVCMGFWeDUzSmk4Y0lf",
  "base64",
).toString("utf-8")
const DEFAULT_OPENSEARCH_INDEX = "indexed_pages"

export function resolveOpenSearchEnv() {
  const envPaths = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../.env"),
  ]

  const envVars: Record<string, string> = {}
  for (const p of envPaths) {
    try {
      if (fs.existsSync(p)) {
        const lines = fs.readFileSync(p, "utf-8").split("\n")
        for (const l of lines) {
          const match = l.match(/^([A-Z0-9_]+)=(.*)$/)
          if (match) envVars[match[1]] = match[2].trim()
        }
      }
    } catch {}
  }

  const url =
    process.env.OPENSEARCH_URL ||
    envVars["OPENSEARCH_URL"] ||
    DEFAULT_OPENSEARCH_URL

  const user =
    process.env.OPENSEARCH_USER ||
    envVars["OPENSEARCH_USER"] ||
    DEFAULT_OPENSEARCH_USER

  const password =
    process.env.OPENSEARCH_PASSWORD ||
    envVars["OPENSEARCH_PASSWORD"] ||
    DEFAULT_OPENSEARCH_PASSWORD

  const index =
    process.env.OPENSEARCH_INDEX ||
    envVars["OPENSEARCH_INDEX"] ||
    DEFAULT_OPENSEARCH_INDEX

  const authHeader =
    "Basic " + Buffer.from(`${user}:${password}`).toString("base64")

  return { url, user, password, index, authHeader }
}

export async function executeOpenSearchQuery<T = any>(
  endpointPath: string,
  payload: any,
  timeoutMs = 10000,
): Promise<T> {
  const { url, index, authHeader } = resolveOpenSearchEnv()
  const body = typeof payload === "string" ? payload : JSON.stringify(payload)
  const fullPath = endpointPath.startsWith("/")
    ? endpointPath
    : `/${endpointPath}`
  const targetUrl = new URL(`${url}/${index}${fullPath}`)

  return new Promise<T>((resolve, reject) => {
    const reqOptions: https.RequestOptions = {
      hostname: targetUrl.hostname,
      port: targetUrl.port ? parseInt(targetUrl.port, 10) : 443,
      path: `${targetUrl.pathname}${targetUrl.search}`,
      method: "POST",
      family: 4,
      timeout: timeoutMs,
      rejectUnauthorized: false,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        Authorization: authHeader,
      },
    }

    const req = https.request(reqOptions, (res) => {
      let data = ""
      res.on("data", (chunk) => (data += chunk))
      res.on("end", () => {
        try {
          if (res.statusCode && res.statusCode >= 400) {
            return reject(
              new Error(
                `OpenSearch HTTP error: ${res.statusCode} ${data.slice(0, 200)}`,
              ),
            )
          }
          const parsedData = JSON.parse(data)
          resolve(parsedData as T)
        } catch (err: any) {
          reject(
            new Error(`Failed to parse OpenSearch response: ${err.message}`),
          )
        }
      })
    })

    req.on("timeout", () => {
      req.destroy()
      reject(new Error(`OpenSearch request timed out after ${timeoutMs}ms`))
    })

    req.on("error", (err) => {
      reject(new Error(`OpenSearch connection error: ${err.message}`))
    })

    req.write(body)
    req.end()
  })
}

export function parseQueryOperators(rawQuery: string) {
  let query = (rawQuery || "").trim()
  let siteFilter: string | null = null
  const exclusions: string[] = []
  const phrases: string[] = []

  const siteMatch = query.match(/(?:^|\s)site:([^\s]+)/i)
  if (siteMatch) {
    siteFilter = siteMatch[1]
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
    query = query.replace(siteMatch[0], " ").trim()
  }

  const phraseMatches = query.match(/"([^"]+)"/g)
  if (phraseMatches) {
    for (const pm of phraseMatches) {
      const phraseContent = pm.slice(1, -1).trim()
      if (phraseContent) phrases.push(phraseContent)
      query = query.replace(pm, " ").trim()
    }
  }

  const words = query.split(/\s+/).filter(Boolean)
  const remainingWords: string[] = []

  for (const w of words) {
    if (w.startsWith("-") && w.length > 1) {
      exclusions.push(w.slice(1))
    } else {
      remainingWords.push(w)
    }
  }

  return {
    cleanQuery: remainingWords.join(" ").trim(),
    siteFilter,
    exclusions,
    phrases,
  }
}

export function buildSearchPayload(
  query: string,
  options: {
    category?: string
    from?: number
    size?: number
  } = {},
) {
  const {
    cleanQuery: mainTerms,
    siteFilter,
    exclusions,
    phrases,
  } = parseQueryOperators(query)
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

  const boostFields = [
    "title^3.5",
    "headings^2.0",
    "topics^1.8",
    "tags^1.5",
    "description^1.2",
    "ai_summary^1.2",
    "content^1.0",
    "domain^1.0",
  ]

  if (mainTerms) {
    mustClauses.push({
      bool: {
        should: [
          {
            multi_match: {
              query: mainTerms,
              fields: boostFields,
              type: "best_fields",
              fuzziness: "AUTO",
              boost: 2.0,
            },
          },
          {
            multi_match: {
              query: mainTerms,
              fields: boostFields,
              operator: "or",
            },
          },
          {
            match_phrase_prefix: {
              title: { query: mainTerms, boost: 2.5, max_expansions: 10 },
            },
          },
          {
            match_phrase_prefix: {
              topics: { query: mainTerms, boost: 1.5, max_expansions: 10 },
            },
          },
          {
            match_phrase_prefix: {
              headings: { query: mainTerms, boost: 1.5, max_expansions: 10 },
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
        type: "phrase",
        fields: [
          "title^4.0",
          "headings^2.5",
          "summary^2.0",
          "content^1.5",
          "url",
        ],
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
        fields: [
          "title",
          "headings",
          "description",
          "summary",
          "ai_summary",
          "content",
          "url",
          "topics",
          "tags",
        ],
      },
    })
  }

  const cat = options.category?.toLowerCase()
  if (options.category && cat !== "all" && cat !== "web" && cat !== "tools") {
    if (cat === "images") {
      filterClauses.push({
        bool: {
          should: [
            { exists: { field: "preview_image" } },
            { exists: { field: "images" } },
          ],
          minimum_should_match: 1,
        },
      })
    } else {
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
      post_tags: ["</mark>"],
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

export async function searchOpenSearch(
  queryStr: string,
  options: {
    category?: string
    page?: number
    limit?: number
  } = {},
): Promise<SearchResponse> {
  const q = (queryStr || "").trim()
  const limit = Math.min(100, Math.max(1, options.limit || 20))
  const page = Math.max(1, options.page || 1)
  const from = (page - 1) * limit

  const searchPayload = buildSearchPayload(q, {
    category: options.category,
    from,
    size: limit * 2,
  })

  const startTime = Date.now()

  try {
    const json = await executeOpenSearchQuery("/_search", searchPayload, 10000)
    const rawHits = json.hits?.hits || []
    const totalHits =
      typeof json.hits?.total?.value === "number"
        ? json.hits.total.value
        : rawHits.length
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
        pageType: s.page_type || "WebPage",
        page_type: s.page_type || "WebPage",
        language: s.language || "en",
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
        score: typeof h._score === "number" ? Number(h._score.toFixed(2)) : 1.0,
        highlights: h.highlight,
      })

      if (hits.length >= limit) {
        break
      }
    }

    return {
      total: totalHits,
      tookMs: Date.now() - startTime,
      hits,
    }
  } catch (err: any) {
    console.error("[OpenSearch BM25] Search query failed:", err.message)
    return {
      total: 0,
      tookMs: Date.now() - startTime,
      hits: [],
    }
  }
}

export async function getAutocompleteSuggestions(
  query: string,
  limit = 5,
): Promise<string[]> {
  const clean = (query || "").trim().slice(0, 100)
  if (!clean || clean.length < 2) return []

  const suggestBody = {
    size: Math.min(10, Math.max(1, limit + 2)),
    _source: ["title", "topics", "headings", "domain"],
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

  try {
    const json = await executeOpenSearchQuery("/_search", suggestBody, 5000)
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

    return Array.from(suggestionsSet).slice(0, limit)
  } catch (err: any) {
    console.error("[OpenSearch Autocomplete] Suggestion error:", err.message)
    return []
  }
}

async function readBody(req: IncomingMessage): Promise<any> {
  const reqWithBody = req as any
  if (reqWithBody.body && typeof reqWithBody.body === "object") {
    return reqWithBody.body
  }
  return new Promise((resolve) => {
    let body = ""
    req.on("data", (chunk) => {
      body += chunk
    })
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch {
        resolve({})
      }
    })
    req.on("error", () => resolve({}))
  })
}

function sendJson(res: ServerResponse, status: number, data: any) {
  const anyRes = res as any
  if (
    typeof anyRes.status === "function" &&
    typeof anyRes.json === "function"
  ) {
    return anyRes.status(status).json(data)
  }
  res.statusCode = status
  res.setHeader("Content-Type", "application/json; charset=utf-8")
  res.end(JSON.stringify(data))
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  try {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")

    if (req.method === "OPTIONS") {
      res.statusCode = 204
      return res.end()
    }

    if (req.method !== "POST" && req.method !== "GET") {
      res.setHeader("Allow", "GET, POST")
      return sendJson(res, 405, { error: "Method not allowed" })
    }

    let rawParams: any = {}
    let action = "search"

    if (req.method === "GET") {
      const parsedUrl = new URL(req.url || "/", "http://localhost")
      const p = parsedUrl.searchParams
      const rawQ = p.get("q") || p.get("query") || ""
      action =
        p.get("action") || (rawQ.startsWith("suggest:") ? "suggest" : "search")
      rawParams = {
        q:
          action === "suggest" && rawQ.startsWith("suggest:")
            ? rawQ.slice(8)
            : rawQ,
        category: p.get("category") || p.get("mode"),
        limit: p.get("limit") || p.get("size"),
        page: p.get("page"),
      }
    } else {
      const body = await readBody(req)
      action = typeof body.action === "string" ? body.action : "search"
      rawParams = {
        q: body.query ?? body.q ?? "",
        category: body.mode ?? body.category,
        limit: body.size ?? body.limit,
        page: body.page,
      }
    }

    const cleanQuery = String(rawParams.q || "")
      .trim()
      .slice(0, 300)

    if (action === "suggest") {
      if (!cleanQuery || cleanQuery.length < 2) {
        return sendJson(res, 200, { suggestions: [] })
      }
      const suggestions = await getAutocompleteSuggestions(cleanQuery)
      res.setHeader(
        "Cache-Control",
        "public, max-age=60, stale-while-revalidate=120",
      )
      return sendJson(res, 200, { suggestions })
    }

    if (!cleanQuery) {
      return sendJson(res, 200, { total: 0, hits: [] })
    }

    const limit = Math.min(
      100,
      Math.max(1, parseInt(String(rawParams.limit || "20"), 10) || 20),
    )
    const page = Math.max(1, parseInt(String(rawParams.page || "1"), 10) || 1)
    const category =
      rawParams.category &&
      rawParams.category !== "all" &&
      rawParams.category !== "web"
        ? String(rawParams.category)
        : undefined

    const searchResponse = await searchOpenSearch(cleanQuery, {
      category,
      page,
      limit,
    })

    const hits: OpenSearchDocument[] = searchResponse.hits.map(
      (h: SearchHit) => {
        const doc = h.document
        const titleHighlight = h.highlights?.title?.[0]
        const contentHighlight = h.highlights?.content?.join(" ... ")
        const summaryHighlight =
          h.highlights?.summary?.join(" ... ") ||
          h.highlights?.ai_summary?.join(" ... ")
        const headingHighlights = h.highlights?.headings

        return {
          id: doc.id || doc.url,
          url: doc.url,
          canonical_url: doc.canonicalUrl || doc.canonical_url || doc.url,
          canonicalUrl: doc.canonicalUrl || doc.canonical_url || doc.url,
          title: doc.title,
          raw_title: doc.rawTitle || doc.raw_title,
          rawTitle: doc.rawTitle || doc.raw_title,
          domain: doc.domain,
          site_name: doc.siteName || doc.site_name,
          siteName: doc.siteName || doc.site_name,
          category: doc.category,
          page_type: doc.pageType || doc.page_type || "WebPage",
          pageType: doc.pageType || doc.page_type || "WebPage",
          description: doc.description,
          summary: doc.summary,
          ai_summary: doc.aiSummary || doc.ai_summary,
          aiSummary: doc.aiSummary || doc.ai_summary,
          content: doc.content,
          headings: doc.headings || [],
          topics: doc.topics || [],
          tags: doc.tags || [],
          language: doc.language || "en",
          favicon: doc.favicon,
          indexed_at: doc.indexedAt || doc.indexed_at,
          indexedAt: doc.indexedAt || doc.indexed_at,
          preview_image: doc.previewImage || doc.preview_image,
          previewImage: doc.previewImage || doc.preview_image,
          images: doc.images || [],
          http_status: doc.httpStatus || doc.http_status || 200,
          httpStatus: doc.httpStatus || doc.http_status || 200,
          score: h.score,
          highlightedTitle: titleHighlight || doc.title,
          highlightedSummary:
            summaryHighlight ||
            contentHighlight ||
            doc.summary ||
            doc.description,
          highlightedContent: contentHighlight,
          highlightedHeadings: headingHighlights,
          extraction_method: doc.extractionMethod || doc.extraction_method,
          extractionMethod: doc.extractionMethod || doc.extraction_method,
        }
      },
    )

    res.setHeader(
      "Cache-Control",
      "public, max-age=30, stale-while-revalidate=60",
    )

    return sendJson(res, 200, {
      total: searchResponse.total,
      hits,
    })
  } catch (err: any) {
    console.error("[api/search] Request error:", err?.message || err)
    return sendJson(res, 500, { error: "Search service error" })
  }
}
