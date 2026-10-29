import { describe, it } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { EventEmitter } from "node:events"
import aiOverviewHandler from "../api/ai-overview.ts"

function createMockReqRes(options) {
  const req = new EventEmitter()
  req.method = options.method || "GET"
  req.url = options.url || "/"
  req.headers = options.headers || { host: "localhost" }

  const res = {
    statusCode: 200,
    headers: {},
    body: "",
    setHeader(key, value) {
      this.headers[key.toLowerCase()] = value
    },
    end(chunk) {
      if (chunk) this.body += chunk
    },
  }

  return { req, res }
}

describe("AI Overview (Gemini Integration)", () => {
  it("1. Rejects invalid HTTP methods with 405 Method Not Allowed", async () => {
    const { req, res } = createMockReqRes({ method: "DELETE", url: "/api/ai-overview" })
    await aiOverviewHandler(req, res)
    assert.equal(res.statusCode, 405)
    const data = JSON.parse(res.body)
    assert.equal(data.error, "Method not allowed")
  })

  it("2. Returns 400 if query 'q' parameter is missing", async () => {
    const { req, res } = createMockReqRes({ method: "GET", url: "/api/ai-overview" })
    await aiOverviewHandler(req, res)
    assert.equal(res.statusCode, 400)
    const data = JSON.parse(res.body)
    assert.ok(data.error.includes("required"))
  })

  it("3. Handles OPTIONS preflight CORS requests cleanly", async () => {
    const { req, res } = createMockReqRes({ method: "OPTIONS", url: "/api/ai-overview" })
    await aiOverviewHandler(req, res)
    assert.equal(res.statusCode, 204)
    assert.equal(res.headers["access-control-allow-origin"], "*")
  })

  it("4. Zero client secret leaks: frontend source files do not contain GEMINI_API_KEY", () => {
    let key = process.env.GEMINI_API_KEY
    if (!key && fs.existsSync(".env")) {
      const match = fs.readFileSync(".env", "utf-8").match(/^GEMINI_API_KEY=(.+)$/m)
      if (match) key = match[1].trim()
    }
    const srcFiles = ["src/components/AiOverview.tsx", "src/services/search-client.ts", "src/components/Results.tsx"]
    for (const relPath of srcFiles) {
      const fullPath = path.resolve(relPath)
      const content = fs.readFileSync(fullPath, "utf-8")
      if (key) {
        assert.ok(!content.includes(key), `Secret key found leaked in ${relPath}!`)
      }
      assert.ok(!content.includes("GEMINI_API_KEY"), `Secret env name found leaked in ${relPath}!`)
    }
  })

  it("5. Live Gemini API generates structured overview JSON with key takeaways", async () => {
    const { req, res } = createMockReqRes({
      method: "POST",
      url: "/api/ai-overview",
    })

    const payload = JSON.stringify({
      q: "what is open search engine",
      context: [
        {
          title: "OpenSearch Official Site",
          url: "https://opensearch.org",
          domain: "opensearch.org",
          snippet: "OpenSearch is a community-driven, open-source search and analytics suite.",
        },
      ],
    })

    const promise = aiOverviewHandler(req, res)
    req.emit("data", payload)
    req.emit("end")
    await promise

    assert.equal(res.statusCode, 200)
    const data = JSON.parse(res.body)
    assert.ok(data.summary && data.summary.length > 20)
    assert.ok(Array.isArray(data.keyPoints))
    assert.ok(Array.isArray(data.sources))
    assert.equal(data.sources[0]?.domain, "opensearch.org")
  })
})
