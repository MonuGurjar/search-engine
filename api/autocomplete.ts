import type { IncomingMessage, ServerResponse } from "node:http"
import { getAutocompleteSuggestions } from "../server/opensearch/autocomplete-service.ts"
import { validateSuggestParams } from "../server/security/validation.ts"
import { checkRateLimit } from "../server/security/rate-limiter.ts"

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
  })
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

  // Rate Limiting (180 requests/min for autocomplete)
  const rateLimit = checkRateLimit(req, { windowMs: 60000, maxRequests: 180 })
  res.setHeader("X-RateLimit-Limit", rateLimit.limit.toString())
  res.setHeader("X-RateLimit-Remaining", rateLimit.remaining.toString())
  res.setHeader("X-RateLimit-Reset", rateLimit.resetTime.toString())

  if (!rateLimit.allowed) {
    return sendJson(res, 429, {
      error: "Too many autocomplete requests. Please slow down.",
    })
  }

  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST")
    return sendJson(res, 405, { error: "Method not allowed" })
  }

  try {
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

    const validation = validateSuggestParams(rawParams)
    if (!validation.success || !validation.data) {
      return sendJson(res, 400, {
        error: validation.error || "Invalid parameters",
      })
    }

    const { query, limit } = validation.data
    if (!query || query.length < 2) {
      return sendJson(res, 200, { suggestions: [] })
    }

    const suggestions = await getAutocompleteSuggestions(query, limit)

    // Bounded caching for autocomplete responses
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
