import type { IncomingMessage, ServerResponse } from "node:http"
import {
  searchOpenSearch,
  getAutocompleteSuggestions,
  buildSearchPayload,
  parseQueryOperators,
  resolveOpenSearchEnv,
  type IndexedDocument,
  type SearchHit,
} from "../server/opensearch-service.ts"

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

export { buildSearchPayload, parseQueryOperators }

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

  try {
    let action = "search"
    let rawQuery = ""
    let mode = "all"
    let limit = 100
    let page = 1

    if (req.method === "GET") {
      const parsedUrl = new URL(req.url || "/", "http://localhost")
      const p = parsedUrl.searchParams
      rawQuery = p.get("q") || p.get("query") || ""
      action = p.get("action") || (rawQuery.startsWith("suggest:") ? "suggest" : "search")
      mode = p.get("category") || p.get("mode") || "all"
      limit = parseInt(p.get("limit") || p.get("size") || "100", 10)
      page = parseInt(p.get("page") || "1", 10)
    } else {
      const body = await readBody(req)
      action = typeof body.action === "string" ? body.action : "search"
      rawQuery = typeof body.query === "string" ? body.query : (typeof body.q === "string" ? body.q : "")
      mode = typeof body.mode === "string" ? body.mode : (typeof body.category === "string" ? body.category : "all")
      const requestedSize = typeof body.size === "number" ? body.size : (typeof body.limit === "number" ? body.limit : 100)
      limit = requestedSize > 0 ? requestedSize : 100
      page = typeof body.page === "number" && body.page > 0 ? body.page : 1
    }

    const cleanQuery = rawQuery.trim().slice(0, 300)

    if (!cleanQuery) {
      if (action === "suggest") {
        return sendJson(res, 200, { suggestions: [] })
      }
      return sendJson(res, 200, { total: 0, hits: [] })
    }

    if (action === "suggest") {
      const suggestions = await getAutocompleteSuggestions(cleanQuery)
      return sendJson(res, 200, { suggestions })
    }

    // BM25 Full-Text Search with boosts, canonical deduplication and highlights
    const searchResponse = await searchOpenSearch(cleanQuery, {
      category: mode && mode !== "all" ? mode : undefined,
      page,
      limit,
    })

    const hits: OpenSearchDocument[] = searchResponse.hits.map((h: SearchHit) => {
      const doc = h.document
      const titleHighlight = h.highlights?.title?.[0]
      const contentHighlight = h.highlights?.content?.join(" ... ")
      const summaryHighlight = h.highlights?.summary?.join(" ... ") || h.highlights?.ai_summary?.join(" ... ")
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
        highlightedSummary: summaryHighlight || contentHighlight || doc.summary || doc.description,
        highlightedContent: contentHighlight,
        highlightedHeadings: headingHighlights,
        extraction_method: doc.extractionMethod || doc.extraction_method,
        extractionMethod: doc.extractionMethod || doc.extraction_method,
      }
    })

    return sendJson(res, 200, {
      total: searchResponse.total,
      hits,
    })
  } catch (err: any) {
    console.error("[api/search] Request error:", err?.message || err)
    return sendJson(res, 500, { error: "Search service error" })
  }
}
