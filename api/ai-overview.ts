import type { IncomingMessage, ServerResponse } from "node:http"
import dns from "node:dns"
import fs from "node:fs"
import path from "node:path"

// Prefer IPv4 to avoid IPv6 hanging on systems without IPv6 routing
try {
  dns.setDefaultResultOrder("ipv4first")
} catch {
  // Ignore in environments where not supported
}

// In-memory cache for recent AI Overviews (10-minute TTL)
interface CacheEntry {
  data: any
  expiresAt: number
}
const overviewCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes
const MAX_CACHE_ENTRIES = 100

function getCached(key: string) {
  const entry = overviewCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    overviewCache.delete(key)
    return null
  }
  return entry.data
}

function setCache(key: string, data: any) {
  if (overviewCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = overviewCache.keys().next().value
    if (oldestKey) overviewCache.delete(oldestKey)
  }
  overviewCache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  })
}

function sendJson(res: ServerResponse, status: number, body: any) {
  res.statusCode = status
  res.setHeader("Content-Type", "application/json; charset=utf-8")
  res.setHeader(
    "Cache-Control",
    "public, max-age=60, stale-while-revalidate=120",
  )
  res.end(JSON.stringify(body))
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  // CORS & method check
  if (req.method === "OPTIONS") {
    res.statusCode = 204
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")
    res.end()
    return
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" })
  }

  // Extract query and context
  let query = ""
  let contextSources: Array<{
    title: string
    url: string
    domain: string
    snippet?: string
  }> = []

  const host = req.headers.host || "localhost"
  const urlObj = new URL(req.url || "/", `http://${host}`)

  if (req.method === "GET") {
    query = (urlObj.searchParams.get("q") || "").trim()
  } else {
    try {
      const bodyStr = await new Promise<string>((resolve, reject) => {
        let acc = ""
        req.on("data", (chunk) => {
          acc += chunk
          if (acc.length > 20000) reject(new Error("Payload too large"))
        })
        req.on("end", () => resolve(acc))
        req.on("error", reject)
      })

      if (bodyStr.trim()) {
        const parsed = JSON.parse(bodyStr)
        query = (parsed.q || parsed.query || "").trim()
        if (Array.isArray(parsed.context)) {
          contextSources = parsed.context.slice(0, 6).map((c: any) => ({
            title: String(c.title || "").slice(0, 150),
            url: String(c.url || "").slice(0, 300),
            domain: String(c.domain || "").slice(0, 80),
            snippet: String(c.snippet || c.description || "").slice(0, 300),
          }))
        }
      }
    } catch {
      return sendJson(res, 400, { error: "Invalid JSON payload" })
    }
  }

  if (!query) {
    return sendJson(res, 400, { error: "Query parameter 'q' is required" })
  }

  if (query.length > 300) {
    query = query.slice(0, 300)
  }

  // Check cache
  const cacheKey = query.toLowerCase()
  const cached = getCached(cacheKey)
  if (cached) {
    return sendJson(res, 200, cached)
  }

  let apiKey =
    (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "").trim()

  if (!apiKey) {
    try {
      const envPath = path.resolve(process.cwd(), ".env")
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, "utf-8")
        const match = envContent.match(/^GEMINI_API_KEY=(.+)$/m)
        if (match && match[1]) {
          apiKey = match[1].trim()
        }
      }
    } catch {}
  }

  if (!apiKey) {
    return sendJson(res, 503, {
      enabled: false,
      message: "AI Overview is not configured.",
    })
  }

  // Format context for grounding
  let contextText = ""
  if (contextSources.length > 0) {
    contextText =
      "\n\nGrounding Search Context:\n" +
      contextSources
        .map(
          (s, i) =>
            `[Source ${i + 1}] Title: ${s.title}\nDomain: ${s.domain}\nSnippet: ${s.snippet || ""}`,
        )
        .join("\n\n")
  }

  const systemPrompt = `You are VOID Search AI, an intelligent, objective, privacy-first search assistant.
Generate a concise, high-quality, Google AI Overview-style summary answering the user query.
Guidelines:
- Deliver a clear, direct explanation (2-3 concise paragraphs).
- Bold key terms and technical concepts (**like this**).
- Provide 2-4 key bullet takeaways where appropriate.
- Ground your response in factual truth and the provided search results context.
- Do NOT use conversational intro phrases (e.g. "Sure!", "Here is a summary"). Begin directly with the factual explanation.
- Return valid JSON matching the exact schema.`

  const userPrompt = `Search Query: "${query}"${contextText}

Generate the AI Overview JSON.`

  const modelsToTry = [
    "models/gemini-3.5-flash-lite",
    "models/gemini-3.5-flash",
  ]

  let aiResponseData: any = null
  let lastError: any = null

  for (const model of modelsToTry) {
    try {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            {
              parts: [{ text: userPrompt }],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
            maxOutputTokens: 1000,
          },
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errText = await response.text()
        console.warn(`[api/ai-overview] Model ${model} returned ${response.status}:`, errText)
        continue
      }

      const json = await response.json()
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text
      if (rawText) {
        aiResponseData = JSON.parse(rawText)
        break
      }
    } catch (err: any) {
      lastError = err?.message || err
    }
  }

  if (!aiResponseData || (!aiResponseData.summary && !aiResponseData.overview)) {
    console.error("[api/ai-overview] Failed to generate overview:", lastError)
    return sendJson(res, 500, {
      enabled: false,
      error: "Unable to generate AI overview at this moment",
    })
  }

  const result = {
    query,
    summary: aiResponseData.summary || aiResponseData.overview || "",
    keyPoints: Array.isArray(aiResponseData.keyPoints)
      ? aiResponseData.keyPoints
      : [],
    suggestedFollowups: Array.isArray(aiResponseData.suggestedFollowups)
      ? aiResponseData.suggestedFollowups
      : [],
    sources: contextSources.map((s) => ({
      title: s.title,
      url: s.url,
      domain: s.domain,
    })),
  }

  setCache(cacheKey, result)
  return sendJson(res, 200, result)
}
