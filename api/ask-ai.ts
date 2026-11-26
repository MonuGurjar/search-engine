import type { IncomingMessage, ServerResponse } from "node:http"
import dns from "node:dns"
import https from "node:https"
import fs from "node:fs"
import path from "node:path"

try {
  dns.setDefaultResultOrder("ipv4first")
} catch {
  // Ignore in environments where not supported
}

interface GroundingSource {
  title: string
  url: string
  domain: string
  snippet?: string
  pubDate?: string
  isLiveNews?: boolean
}

function sendJson(res: ServerResponse, status: number, body: any) {
  res.statusCode = status
  res.setHeader("Content-Type", "application/json; charset=utf-8")
  res.end(JSON.stringify(body))
}

function readEnvVar(name: string): string {
  const direct = process.env[name]
  if (direct && direct.trim()) return direct.trim()

  try {
    const envPath = path.resolve(process.cwd(), ".env")
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf-8")
      const regex = new RegExp(`^${name}=(.+)$`, "m")
      const match = envContent.match(regex)
      if (match && match[1]) return match[1].trim()
    }
  } catch {}

  return ""
}

function getGeminiApiKey(): string {
  return readEnvVar("GEMINI_API_KEY") || readEnvVar("VITE_GEMINI_API_KEY")
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

function unwrapUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl)
    if (parsed.hostname.includes("bing.com") && parsed.searchParams.get("url")) {
      return parsed.searchParams.get("url") || rawUrl
    }
  } catch {}
  return rawUrl
}

function getDomain(urlStr: string, fallback = "news"): string {
  try {
    return new URL(urlStr).hostname.replace(/^www\./, "")
  } catch {
    return fallback
  }
}

/**
 * Scrapes live news & current events from Bing News RSS (with Google News RSS fallback).
 */
async function scrapeLiveNews(query: string): Promise<GroundingSource[]> {
  const clean = query.trim()
  if (!clean) return []

  const sources: GroundingSource[] = []

  // 1. Primary: Bing News RSS (includes snippets, direct URLs, pubDate, and source)
  try {
    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), 2800)
    const rssUrl = `https://www.bing.com/news/search?q=${encodeURIComponent(clean)}&format=rss`
    const res = await fetch(rssUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      },
      signal: controller.signal,
    })
    clearTimeout(tid)

    if (res.ok) {
      const xml = await res.text()
      const items = xml.match(/<item>([\s\S]*?)<\/item>/gi) || []
      for (const item of items.slice(0, 5)) {
        const title = extractXmlTag(item, "title")
        const rawLink = extractXmlTag(item, "link")
        const url = unwrapUrl(rawLink)
        const snippet = extractXmlTag(item, "description")
        const pubDate = extractXmlTag(item, "pubDate")
        const sourceName = extractXmlTag(item, "News:Source")
        const domain = getDomain(url, sourceName || "news")

        if (title && url.startsWith("http")) {
          sources.push({
            title: title.slice(0, 150),
            url,
            domain,
            snippet: snippet.slice(0, 300),
            pubDate,
            isLiveNews: true,
          })
        }
      }
    }
  } catch {}

  if (sources.length > 0) return sources

  // 2. Fallback: Google News RSS
  try {
    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), 2800)
    const gUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(clean)}&hl=en-US&gl=US&ceid=US:en`
    const res = await fetch(gUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: controller.signal,
    })
    clearTimeout(tid)

    if (res.ok) {
      const xml = await res.text()
      const items = xml.match(/<item>([\s\S]*?)<\/item>/gi) || []
      for (const item of items.slice(0, 5)) {
        const title = extractXmlTag(item, "title")
        const url = extractXmlTag(item, "link")
        const pubDate = extractXmlTag(item, "pubDate")
        const sourceTag = item.match(/<source[^>]*url="([^"]+)"[^>]*>([^<]*)<\/source>/i)
        const domain = sourceTag?.[1]
          ? getDomain(sourceTag[1])
          : sourceTag?.[2] || "news.google.com"

        if (title && url.startsWith("http")) {
          sources.push({
            title: title.slice(0, 150),
            url,
            domain,
            snippet: `Published ${pubDate || "recently"} via ${sourceTag?.[2] || domain}`,
            pubDate,
            isLiveNews: true,
          })
        }
      }
    }
  } catch {}

  return sources
}

async function fetchOpenSearchSources(query: string): Promise<GroundingSource[]> {
  const clusterUrl = readEnvVar("OPENSEARCH_URL")
  const user = readEnvVar("OPENSEARCH_USER")
  const pass = readEnvVar("OPENSEARCH_PASSWORD")
  const index = readEnvVar("OPENSEARCH_INDEX") || "indexed_pages"

  if (!clusterUrl || !user || !pass) return []

  try {
    const targetUrl = new URL(`/${index}/_search`, clusterUrl)
    const auth = Buffer.from(`${user}:${pass}`).toString("base64")
    const payload = JSON.stringify({
      size: 4,
      _source: ["title", "url", "domain", "summary", "description"],
      query: {
        multi_match: {
          query,
          fields: ["title^3.5", "headings^2.5", "summary^2.0", "content"],
          type: "best_fields",
          fuzziness: "AUTO",
        },
      },
    })

    const json: any = await new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: targetUrl.hostname,
          port: targetUrl.port || 443,
          path: targetUrl.pathname,
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload),
          },
          timeout: 2200,
        },
        (res) => {
          let data = ""
          res.on("data", (chunk) => (data += chunk))
          res.on("end", () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              try {
                resolve(JSON.parse(data))
              } catch (e) {
                reject(e)
              }
            } else {
              reject(new Error(`OpenSearch HTTP ${res.statusCode}`))
            }
          })
        },
      )
      req.on("timeout", () => {
        req.destroy()
        reject(new Error("OpenSearch timeout"))
      })
      req.on("error", reject)
      req.write(payload)
      req.end()
    })

    const hits = json?.hits?.hits
    if (!Array.isArray(hits)) return []

    return hits.slice(0, 4).map((h: any) => ({
      title: String(h._source?.title || h._source?.url || "").slice(0, 140),
      url: String(h._source?.url || ""),
      domain: String(h._source?.domain || ""),
      snippet: String(
        h._source?.summary || h._source?.description || "",
      ).slice(0, 280),
      isLiveNews: false,
    }))
  } catch {
    return []
  }
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")
    res.end()
    return
  }

  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" })
  }

  let query = ""
  let reasoning = false
  let timeFilter = "Any time"
  let history: Array<{ role: "user" | "assistant"; content: string }> = []

  try {
    const bodyStr = await new Promise<string>((resolve, reject) => {
      let acc = ""
      req.on("data", (chunk) => {
        acc += chunk
        if (acc.length > 40000) reject(new Error("Payload too large"))
      })
      req.on("end", () => resolve(acc))
      req.on("error", reject)
    })

    if (bodyStr.trim()) {
      const parsed = JSON.parse(bodyStr)
      query = String(parsed.query || parsed.q || "").trim().slice(0, 1000)
      reasoning = Boolean(parsed.reasoning)
      timeFilter = String(parsed.timeFilter || "Any time").slice(0, 40)
      if (Array.isArray(parsed.history)) {
        history = parsed.history.slice(-8).map((m: any) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: String(m.content || "").slice(0, 2000),
        }))
      }
    }
  } catch {
    return sendJson(res, 400, { error: "Invalid JSON payload" })
  }

  if (!query) {
    return sendJson(res, 400, { error: "Query is required" })
  }

  const apiKey = getGeminiApiKey()
  if (!apiKey) {
    return sendJson(res, 503, { error: "VOID AI is not configured." })
  }

  // Run live news scraping + OpenSearch index lookup in parallel
  const [liveNewsRes, openSearchRes] = await Promise.allSettled([
    scrapeLiveNews(query),
    fetchOpenSearchSources(query),
  ])

  const liveNews =
    liveNewsRes.status === "fulfilled" ? liveNewsRes.value : []
  const indexSources =
    openSearchRes.status === "fulfilled" ? openSearchRes.value : []

  // Merge live scraped news + OpenSearch index (deduped by URL, capped to 6)
  const seenUrls = new Set<string>()
  const sources: GroundingSource[] = []
  for (const s of [...liveNews, ...indexSources]) {
    if (s.url && !seenUrls.has(s.url)) {
      seenUrls.add(s.url)
      sources.push(s)
      if (sources.length >= 6) break
    }
  }

  const contextBlock =
    sources.length > 0
      ? "\n\nLive Scraped News & Web Context:\n" +
        sources
          .map(
            (s, i) =>
              `[${i + 1}] ${s.title} (${s.domain}${s.pubDate ? ` • ${s.pubDate}` : ""})\n${s.snippet || ""}`,
          )
          .join("\n\n")
      : ""

  const timeConstraint =
    timeFilter && timeFilter !== "Any time"
      ? `\nTime preference: Focus on context relevant to "${timeFilter}".`
      : ""

  const todayStr = new Date().toUTCString()

  const systemInstruction = `You are VOID AI, an intelligent, objective, privacy-first AI search assistant with live web and news access.
Current Date/Time: ${todayStr}
${
  reasoning
    ? "Reasoning Mode is ENABLED: Think step-by-step, compare nuances, and deliver a thorough, well-structured technical or analytical answer."
    : "Deliver a clear, concise, direct, and helpful answer grounded in the provided live scraped news and web sources."
}
Formatting guidelines:
- Prioritize the Live Scraped News & Web Context when answering about recent events, breaking news, or current facts. Mention dates/sources when helpful.
- Use clean Markdown: **bold** for key terms, bullet lists (- item), and fenced code blocks (\`\`\`lang) for code.
- Avoid conversational filler ("Sure!", "I'd be happy to help!"). Start directly with the answer.
- Return valid JSON with exact keys:
  - "answer": string (the markdown answer)
  - "followups": string[] (2-3 concise, natural follow-up questions the user might ask next)`

  const contents = [
    ...history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    {
      role: "user",
      parts: [
        {
          text: `Question: "${query}"${timeConstraint}${contextBlock}\n\nRespond with valid JSON matching { "answer": string, "followups": string[] }.`,
        },
      ],
    },
  ]

  // Latest verified Gemini models
  const modelsToTry = reasoning
    ? [
        "models/gemini-3.8-flash",
        "models/gemini-flash-lite-latest",
        "models/gemini-3.5-flash-lite",
      ]
    : ["models/gemini-flash-lite-latest", "models/gemini-3.5-flash-lite"]

  let parsedAi: any = null
  let lastError: any = null

  for (const model of modelsToTry) {
    try {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`
      const controller = new AbortController()
      const timeoutMs = model.includes("3.8") ? 11000 : 8000
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          contents,
          generationConfig: {
            responseMimeType: "application/json",
            temperature: reasoning ? 0.3 : 0.2,
            maxOutputTokens: reasoning ? 2048 : 1200,
          },
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        lastError = `HTTP ${response.status}`
        continue
      }

      const json = await response.json()
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text
      if (rawText) {
        parsedAi = JSON.parse(rawText)
        break
      }
    } catch (err: any) {
      lastError = err?.message || err
    }
  }

  if (!parsedAi || !parsedAi.answer) {
    console.error("[api/ask-ai] Failed:", lastError)
    return sendJson(res, 500, {
      error: "Unable to generate a response right now. Please try again.",
    })
  }

  return sendJson(res, 200, {
    answer: String(parsedAi.answer),
    followups: Array.isArray(parsedAi.followups)
      ? parsedAi.followups.slice(0, 3).map(String)
      : [],
    sources: sources.slice(0, 4).map(({ title, url, domain }) => ({
      title,
      url,
      domain,
    })),
    mode: reasoning ? "VOID AI · Reasoning" : "VOID AI · Live",
  })
}
