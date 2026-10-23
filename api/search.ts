import type { IncomingMessage, ServerResponse } from "node:http"

export interface OpenSearchDocument {
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

export interface OpenSearchResult {
  total: number
  hits: OpenSearchDocument[]
}

// Server-only environment variables
function getServerConfig() {
  const url =
    process.env.OPENSEARCH_URL ||
    process.env.VITE_OPENSEARCH_URL ||
    "https://os-3c0470b3-voidcore.j.aivencloud.com:12170"

  const user =
    process.env.OPENSEARCH_USER || process.env.VITE_OPENSEARCH_USER || ""
  const password =
    process.env.OPENSEARCH_PASSWORD ||
    process.env.VITE_OPENSEARCH_PASSWORD ||
    ""
  const index =
    process.env.OPENSEARCH_INDEX ||
    process.env.VITE_OPENSEARCH_INDEX ||
    "indexed_pages"

  return { url, user, password, index }
}

function parseQueryOperators(rawQuery: string) {
  let query = rawQuery.trim()
  let siteFilter: string | null = null
  const exclusions: string[] = []
  const phrases: string[] = []

  // Extract site:domain
  const siteMatch = query.match(/(?:^|\s)site:([^\s]+)/i)
  if (siteMatch) {
    siteFilter = siteMatch[1]
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
    query = query.replace(siteMatch[0], " ").trim()
  }

  // Extract quoted exact phrases
  const phraseMatches = query.match(/"([^"]+)"/g)
  if (phraseMatches) {
    for (const pm of phraseMatches) {
      const phraseContent = pm.slice(1, -1).trim()
      if (phraseContent) phrases.push(phraseContent)
      query = query.replace(pm, " ").trim()
    }
  }

  // Extract exclusions: -word
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

function buildSearchPayload(query: string, mode: string, size: number) {
  const {
    cleanQuery: mainTerms,
    siteFilter,
    exclusions,
    phrases,
  } = parseQueryOperators(query)

  const mustClauses: any[] = []
  const mustNotClauses: any[] = []

  if (mainTerms) {
    mustClauses.push({
      bool: {
        should: [
          {
            multi_match: {
              query: mainTerms,
              fields: [
                "title^4",
                "summary^2.5",
                "topics^2",
                "tags^2",
                "domain^1.5",
                "url",
              ],
              type: "best_fields",
              boost: 2.0,
            },
          },
          {
            multi_match: {
              query: mainTerms,
              fields: [
                "title^3",
                "summary^2",
                "topics^1.5",
                "tags^1.5",
                "domain^1.2",
                "url",
              ],
              fuzziness: "AUTO",
              operator: "or",
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
        fields: ["title^4", "summary^2", "url"],
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
        fields: ["title", "summary", "url", "topics", "tags"],
      },
    })
  }

  if (mode && mode !== "all" && mode !== "web" && mode !== "tools") {
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

  if (mustClauses.length === 0) {
    mustClauses.push({ match_all: {} })
  }

  return {
    size,
    query: {
      bool: {
        must: mustClauses,
        must_not: mustNotClauses.length > 0 ? mustNotClauses : undefined,
      },
    },
    highlight: {
      pre_tags: ['<mark class="highlight-term">'],
      post_tags: ["</mark>"],
      fields: {
        summary: { number_of_fragments: 2, fragment_size: 160 },
      },
    },
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
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST")
    return sendJson(res, 405, { error: "Method not allowed" })
  }

  try {
    const body = await readBody(req)
    const action = typeof body.action === "string" ? body.action : "search"
    const rawQuery = typeof body.query === "string" ? body.query : ""
    const cleanQuery = rawQuery.trim().slice(0, 300)

    if (!cleanQuery) {
      if (action === "suggest") {
        return sendJson(res, 200, { suggestions: [] })
      }
      return sendJson(res, 200, { total: 0, hits: [] })
    }

    const { url, user, password, index } = getServerConfig()

    // Fail closed safely if server credentials are unavailable
    if (!user || !password) {
      console.warn(
        "[api/search] OpenSearch credentials not configured on server.",
      )
      if (action === "suggest") {
        return sendJson(res, 200, { suggestions: [] })
      }
      return sendJson(res, 200, { total: 0, hits: [] })
    }

    const authHeader =
      "Basic " + Buffer.from(`${user}:${password}`).toString("base64")
    const endpoint = `${url}/${encodeURIComponent(index)}/_search`

    if (action === "suggest") {
      const suggestBody = {
        size: 5,
        _source: ["title", "topics", "domain"],
        query: {
          bool: {
            should: [
              {
                match_phrase_prefix: {
                  title: { query: cleanQuery, max_expansions: 10 },
                },
              },
              { prefix: { domain: cleanQuery.toLowerCase() } },
              { match_phrase_prefix: { topics: { query: cleanQuery } } },
            ],
          },
        },
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(suggestBody),
      })

      if (!response.ok) {
        return sendJson(res, 200, { suggestions: [] })
      }

      const data: any = await response.json()
      const suggestionsSet = new Set<string>()

      for (const hit of data.hits?.hits || []) {
        const src = hit._source || {}
        if (
          src.title &&
          src.title.toLowerCase().includes(cleanQuery.toLowerCase())
        ) {
          suggestionsSet.add(src.title.trim())
        }
        if (Array.isArray(src.topics)) {
          for (const t of src.topics) {
            if (t && t.toLowerCase().includes(cleanQuery.toLowerCase())) {
              suggestionsSet.add(t.trim())
            }
          }
        }
      }

      return sendJson(res, 200, {
        suggestions: Array.from(suggestionsSet).slice(0, 5),
      })
    }

    // Default: 'search'
    const mode = typeof body.mode === "string" ? body.mode : "all"
    const requestedSize =
      typeof body.size === "number" && body.size > 0 ? body.size : 100
    const size = Math.min(requestedSize, 100)

    const searchPayload = buildSearchPayload(cleanQuery, mode, size)

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(searchPayload),
    })

    if (!response.ok) {
      console.error(`[api/search] Upstream response status: ${response.status}`)
      return sendJson(res, 200, { total: 0, hits: [] })
    }

    const data: any = await response.json()
    const total =
      typeof data.hits?.total === "number"
        ? data.hits.total
        : data.hits?.total?.value || 0

    const hits: OpenSearchDocument[] = (data.hits?.hits || []).map(
      (hit: any) => {
        const src = hit._source || {}
        const highlightedTitle = hit.highlight?.title?.[0]
        const highlightedSummary = hit.highlight?.summary?.join(" ... ")

        return {
          ...src,
          id: hit._id || src.id,
          highlightedTitle: highlightedTitle || src.title,
          highlightedSummary: highlightedSummary || src.summary,
        }
      },
    )

    return sendJson(res, 200, { total, hits })
  } catch (err: any) {
    console.error("[api/search] Request error:", err?.message || err)
    return sendJson(res, 500, { error: "Search service error" })
  }
}
