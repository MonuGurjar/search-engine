import type { IncomingMessage, ServerResponse } from "node:http"
import { searchOpenSearch } from "../../server/opensearch-service.ts"

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

  try {
    const url = req.url || "/"
    const parsedUrl = new URL(url, "http://localhost")
    const queryParams = parsedUrl.searchParams

    let q = queryParams.get("q") || queryParams.get("query") || ""
    let category =
      queryParams.get("category") || queryParams.get("mode") || undefined
    let page = parseInt(queryParams.get("page") || "1", 10)
    let limit = parseInt(
      queryParams.get("limit") || queryParams.get("size") || "20",
      10,
    )

    if (req.method === "POST") {
      const body = await readBody(req)
      if (typeof body.q === "string") q = body.q
      if (typeof body.query === "string") q = body.query
      if (typeof body.category === "string") category = body.category
      if (typeof body.mode === "string") category = body.mode
      if (typeof body.page === "number") page = body.page
      if (typeof body.limit === "number") limit = body.limit
      if (typeof body.size === "number") limit = body.size
    }

    const result = await searchOpenSearch(q, {
      category: category && category !== "all" ? category : undefined,
      page: isNaN(page) ? 1 : page,
      limit: isNaN(limit) ? 20 : limit,
    })

    return sendJson(res, 200, result)
  } catch (err: any) {
    console.error("[api/crawler/search] Request error:", err?.message || err)
    return sendJson(res, 500, { error: "Search service error" })
  }
}
