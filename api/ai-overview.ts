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

function decodeXmlEntities(str: string): string {
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/<[^>]+>/g, "")
    .trim()
}

function extractXmlTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"))
  return match ? decodeXmlEntities(match[1]) : ""
}

function unwrapBingUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl)
    if (parsed.hostname.includes("bing.com") && parsed.searchParams.get("url")) {
      return parsed.searchParams.get("url") || rawUrl
    }
  } catch {}
  return rawUrl
}

async function scrapeLiveNewsForOverview(query: string) {
  const itemsOut: Array<{
    title: string
    url: string
    domain: string
    snippet?: string
    pubDate?: string
  }> = []

  try {
    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), 2200)
    const res = await fetch(
      `https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=rss`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        signal: controller.signal,
      },
    )
    clearTimeout(tid)
    if (res.ok) {
      const xml = await res.text()
      const items = xml.match(/<item>([\s\S]*?)<\/item>/gi) || []
      for (const item of items.slice(0, 4)) {
        const title = extractXmlTag(item, "title")
        const url = unwrapBingUrl(extractXmlTag(item, "link"))
        const snippet = extractXmlTag(item, "description")
        const pubDate = extractXmlTag(item, "pubDate")
        let domain = "news"
        try {
          domain = new URL(url).hostname.replace(/^www\./, "")
        } catch {}
        if (title && url.startsWith("http")) {
          itemsOut.push({
            title: title.slice(0, 150),
            url,
            domain,
            snippet: snippet.slice(0, 260),
            pubDate,
          })
        }
      }
    }
  } catch {}

  return itemsOut
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

  // Scrape live news in parallel when query asks for news/latest or lacks local context
  const isNewsQuery =
    /\b(news|latest|today|recent|update|updates|breaking|2026|current|live|score|release)\b/i.test(
      query,
    )
  const wantsLiveNews = isNewsQuery || contextSources.length < 3

  let mergedSources = [...contextSources]
  if (wantsLiveNews) {
    const liveItems = await scrapeLiveNewsForOverview(query)
    if (liveItems.length > 0) {
      const seen = new Set<string>()
      const combined = isNewsQuery
        ? [...liveItems, ...contextSources]
        : [...contextSources, ...liveItems]
      mergedSources = combined
        .filter((s) => {
          if (!s.url || seen.has(s.url)) return false
          seen.add(s.url)
          return true
        })
        .slice(0, 6)
    }
  }

  // Format context for grounding
  let contextText = ""
  if (mergedSources.length > 0) {
    contextText =
      "\n\nGrounding Live News & Search Context:\n" +
      mergedSources
        .map(
          (s: any, i) =>
            `[Source ${i + 1}] Title: ${s.title}\nDomain: ${s.domain}${s.pubDate ? ` (${s.pubDate})` : ""}\nSnippet: ${s.snippet || ""}`,
        )
        .join("\n\n")
  }

  const todayStr = new Date().toUTCString()

  const systemPrompt = `You are VOID Search AI, an intelligent, objective, privacy-first search assistant with live news grounding.
Current Date/Time: ${todayStr}
Generate a concise, high-quality VOID AI Overview answering the user query.
Guidelines:
- Deliver a clear, direct explanation (2-3 concise paragraphs).
- Bold key terms and technical concepts (**like this**).
- Provide 2-4 key bullet takeaways where appropriate.
- Ground your response in factual truth and the provided live news & search results context. Mention dates/sources when summarizing recent news.
- Do NOT use conversational intro phrases (e.g. "Sure!", "Here is a summary"). Begin directly with the factual explanation.
- Return valid JSON with keys: "summary" (string), "keyPoints" (string[]), "suggestedFollowups" (string[]).`

  const userPrompt = `Search Query: "${query}"${contextText}

Generate the AI Overview JSON.`

  const modelsToTry = [
    "models/gemini-flash-lite-latest",
    "models/gemini-3.5-flash-lite",
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
    sources: mergedSources.slice(0, 4).map((s) => ({
      title: s.title,
      url: s.url,
      domain: s.domain,
    })),
  }

  setCache(cacheKey, result)
  return sendJson(res, 200, result)
}
