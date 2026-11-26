import type { IncomingMessage, ServerResponse } from "node:http"
import dns from "node:dns"
import fs from "node:fs"
import path from "node:path"
import { searchOpenSearch } from "../server/opensearch-service.ts"

try {
  dns.setDefaultResultOrder("ipv4first")
} catch {
  // Ignore in environments where not supported
}

function sendJson(res: ServerResponse, status: number, body: any) {
  res.statusCode = status
  res.setHeader("Content-Type", "application/json; charset=utf-8")
  res.end(JSON.stringify(body))
}

function getGeminiApiKey(): string {
  let apiKey = (
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    ""
  ).trim()

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

  return apiKey
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

  // Ground the answer in real OpenSearch results from VOID's index
  let sources: Array<{ title: string; url: string; domain: string; snippet?: string }> = []
  try {
    const searchRes = await searchOpenSearch(query, { limit: 4 })
    if (Array.isArray(searchRes.hits)) {
      sources = searchRes.hits.slice(0, 4).map((h: any) => ({
        title: String(h.document?.title || h.document?.url || "").slice(0, 140),
        url: String(h.document?.url || ""),
        domain: String(h.document?.domain || ""),
        snippet: String(
          h.document?.summary || h.document?.description || "",
        ).slice(0, 280),
      }))
    }
  } catch {
    // Grounding is best-effort; continue even if index lookup fails
  }

  const contextBlock =
    sources.length > 0
      ? "\n\nGrounding Web Sources from VOID Index:\n" +
        sources
          .map(
            (s, i) =>
              `[${i + 1}] ${s.title} (${s.domain})\n${s.snippet || ""}`,
          )
          .join("\n\n")
      : ""

  const timeConstraint =
    timeFilter && timeFilter !== "Any time"
      ? `\nTime preference: Focus on context relevant to "${timeFilter}".`
      : ""

  const systemInstruction = `You are VOID AI, an intelligent, objective, privacy-first AI search assistant.
${
  reasoning
    ? "Reasoning Mode is ENABLED: Think step-by-step, compare nuances, and deliver a thorough, well-structured technical or analytical answer."
    : "Deliver a clear, concise, direct, and helpful answer."
}
Formatting guidelines:
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

  const modelsToTry = reasoning
    ? ["models/gemini-3.5-flash", "models/gemini-3.5-flash-lite"]
    : ["models/gemini-3.5-flash-lite", "models/gemini-3.5-flash"]

  let parsedAi: any = null
  let lastError: any = null

  for (const model of modelsToTry) {
    try {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 14000)

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
    sources: sources.map(({ title, url, domain }) => ({ title, url, domain })),
    mode: reasoning ? "VOID AI · Reasoning" : "VOID AI",
  })
}
