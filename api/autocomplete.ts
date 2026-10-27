import type { IncomingMessage, ServerResponse } from "node:http"
import https from "node:https"
import fs from "node:fs"
import path from "node:path"

const DEFAULT_OPENSEARCH_URL =
  "https://os-3c0470b3-voidcore.j.aivencloud.com:12170"
const DEFAULT_OPENSEARCH_USER = "avnadmin"
const DEFAULT_OPENSEARCH_PASSWORD = Buffer.from(
  "QVZOU191RFFZaVVCMGFWeDUzSmk4Y0lf",
  "base64",
).toString("utf-8")
const DEFAULT_OPENSEARCH_INDEX = "indexed_pages"

function resolveOpenSearchEnv() {
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

async function executeOpenSearchQuery<T = any>(
  endpointPath: string,
  payload: any,
  timeoutMs = 5000,
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

async function getAutocompleteSuggestions(
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

    if (req.method !== "GET" && req.method !== "POST") {
      res.setHeader("Allow", "GET, POST")
      return sendJson(res, 405, { error: "Method not allowed" })
    }

    let rawParams: any = {}
    if (req.method === "GET") {
      const parsedUrl = new URL(req.url || "/", "http://localhost")
      rawParams = {
        q:
          parsedUrl.searchParams.get("q") ||
          parsedUrl.searchParams.get("query") ||
          "",
        limit:
          parsedUrl.searchParams.get("limit") ||
          parsedUrl.searchParams.get("size"),
      }
    } else {
      rawParams = await readBody(req)
    }

    const query = String(rawParams.q || "")
      .trim()
      .slice(0, 100)
    const limit = Math.min(
      10,
      Math.max(1, parseInt(String(rawParams.limit || "5"), 10) || 5),
    )

    if (!query || query.length < 2) {
      return sendJson(res, 200, { suggestions: [] })
    }

    const suggestions = await getAutocompleteSuggestions(query, limit)

    res.setHeader(
      "Cache-Control",
      "public, max-age=60, stale-while-revalidate=120",
    )

    return sendJson(res, 200, { suggestions })
  } catch (err: any) {
    console.error("[api/autocomplete] Error:", err?.message || err)
    return sendJson(res, 500, {
      error: "Autocomplete service temporarily unavailable",
    })
  }
}
