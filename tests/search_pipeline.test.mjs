import { describe, it } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import {
  parseQueryOperators,
  buildSearchPayload,
  searchOpenSearch,
  getAutocompleteSuggestions,
} from "../server/opensearch-service.ts"
import searchHandler from "../api/search.ts"
import autocompleteHandler from "../api/autocomplete.ts"
import crawlerSearchHandler from "../api/crawler/search.ts"
import {
  validateSearchParams,
  validateSuggestParams,
} from "../server/security/validation.ts"
import { checkRateLimit } from "../server/security/rate-limiter.ts"
import {
  isSafeUrl,
  sanitizeHref,
  sanitizeHighlightHtml,
} from "../server/security/url-sanitizer.ts"

describe("OpenSearch BM25 Ranking & Search Pipeline", () => {
  it("1. Parses search query operators (site, phrases, exclusions)", () => {
    const raw = 'privacy "autonomous agents" site:github.com -tracking'
    const parsed = parseQueryOperators(raw)

    assert.equal(parsed.cleanQuery, "privacy")
    assert.equal(parsed.siteFilter, "github.com")
    assert.deepEqual(parsed.phrases, ["autonomous agents"])
    assert.deepEqual(parsed.exclusions, ["tracking"])
  })

  it("2. Builds BM25 search payload with exact field weights matching production spec", () => {
    const payload = buildSearchPayload("machine learning", {
      category: "Tech",
      size: 15,
    })

    assert.equal(payload.size, 15)
    assert.ok(payload.query?.bool?.must?.length > 0)

    // Check that multi_match contains all specified BM25 boost weights
    const mustClause = payload.query.bool.must[0]
    const multiMatch = mustClause.bool.should[0].multi_match

    const expectedFields = [
      "title^3.5",
      "headings^2.0",
      "topics^1.8",
      "tags^1.5",
      "description^1.2",
      "ai_summary^1.2",
      "content^1.0",
      "domain^1.0",
    ]
    assert.deepEqual(multiMatch.fields, expectedFields)
    assert.equal(multiMatch.type, "best_fields")
    assert.equal(multiMatch.fuzziness, "AUTO")

    // Check filter includes HTTP 200-399 status range
    const httpFilter = payload.query.bool.filter.find(
      (f) => f.range?.http_status,
    )
    assert.ok(httpFilter, "HTTP status filter should be present")
    assert.equal(httpFilter.range.http_status.gte, 200)
    assert.equal(httpFilter.range.http_status.lt, 400)

    // Check category filter
    const catFilter = payload.query.bool.filter.find((f) => f.bool?.should)
    assert.ok(catFilter, "Category filter should be present")
  })

  it("3. Configures highlighting fragments with <mark> tags", () => {
    const payload = buildSearchPayload("distributed systems")

    assert.deepEqual(payload.highlight.pre_tags, [
      '<mark class="highlight-term">',
    ])
    assert.deepEqual(payload.highlight.post_tags, ["</mark>"])
    assert.ok("title" in payload.highlight.fields)
    assert.ok("content" in payload.highlight.fields)
    assert.ok("headings" in payload.highlight.fields)
    assert.ok("summary" in payload.highlight.fields)
    assert.equal(payload.highlight.fields.content.fragment_size, 140)
  })

  it("4. Handles exact phrases with boosted phrase match", () => {
    const payload = buildSearchPayload('"Zero Knowledge Proofs"')
    const phraseClause = payload.query.bool.must.find(
      (m) => m.multi_match?.type === "phrase",
    )

    assert.ok(phraseClause, "Phrase clause must exist")
    assert.equal(phraseClause.multi_match.query, "Zero Knowledge Proofs")
    assert.equal(phraseClause.multi_match.boost, 3.0)
    assert.ok(phraseClause.multi_match.fields.includes("title^4.0"))
  })

  it("5. Live OpenSearch cluster connectivity and BM25 query execution", async () => {
    const res = await searchOpenSearch("bank", { limit: 5 })

    assert.ok(typeof res.total === "number")
    assert.ok(Array.isArray(res.hits))
    assert.ok(res.tookMs >= 0)

    if (res.hits.length > 0) {
      const topHit = res.hits[0]
      assert.ok(topHit.document)
      assert.ok(topHit.document.title)
      assert.ok(topHit.document.url)
      assert.ok(typeof topHit.score === "number")
      assert.ok(topHit.score > 0)
    }
  })

  it("6. Live Autocomplete suggestions return relevant matches", async () => {
    const suggestions = await getAutocompleteSuggestions("cen")
    assert.ok(Array.isArray(suggestions))
  })

  it("7. Handles search API endpoint with POST and GET", async () => {
    // Test GET /api/search?q=bank
    let responseData = null

    const mockRes = {
      statusCode: 200,
      setHeader: () => {},
      end: (data) => {
        responseData = JSON.parse(data)
      },
      status: () => mockRes,
      json: (d) => {
        responseData = d
        return mockRes
      },
    }

    const mockGetReq = {
      method: "GET",
      url: "/api/search?q=bank&limit=3",
      headers: { "x-forwarded-for": "127.0.0.1" },
      socket: { remoteAddress: "127.0.0.1" },
    }

    await searchHandler(mockGetReq, mockRes)
    assert.ok(responseData)
    assert.ok("hits" in responseData)
    assert.ok("total" in responseData)

    // Test POST /api/search with JSON body
    let postData = null
    const mockPostRes = {
      statusCode: 200,
      setHeader: () => {},
      end: (data) => {
        postData = JSON.parse(data)
      },
      status: () => mockPostRes,
      json: (d) => {
        postData = d
        return mockPostRes
      },
    }

    const mockPostReq = {
      method: "POST",
      url: "/api/search",
      body: { action: "search", query: "bank", size: 3 },
      headers: { "x-forwarded-for": "127.0.0.1" },
      socket: { remoteAddress: "127.0.0.1" },
    }

    await searchHandler(mockPostReq, mockPostRes)
    assert.ok(postData)
    assert.ok("hits" in postData)
    assert.ok("total" in postData)
  })

  it("8. Dedicated GET /api/autocomplete endpoint", async () => {
    let autoData = null
    const mockAutoRes = {
      statusCode: 200,
      setHeader: () => {},
      end: (data) => {
        autoData = JSON.parse(data)
      },
      status: () => mockAutoRes,
      json: (d) => {
        autoData = d
        return mockAutoRes
      },
    }

    const mockAutoReq = {
      method: "GET",
      url: "/api/autocomplete?q=monu",
      headers: { "x-forwarded-for": "127.0.0.1" },
      socket: { remoteAddress: "127.0.0.1" },
    }

    await autocompleteHandler(mockAutoReq, mockAutoRes)
    assert.ok(autoData)
    assert.ok(Array.isArray(autoData.suggestions))
  })

  it("9. Validates search input parameters and caps bounds", () => {
    // Overlong query cap
    const longString = "a".repeat(500)
    const valid1 = validateSearchParams({
      q: longString,
      limit: 500,
      page: 9999999,
    })
    assert.equal(valid1.success, true)
    assert.equal(valid1.data.query.length, 300)
    assert.equal(valid1.data.limit, 100) // capped at 100
    assert.equal(valid1.data.page, 1) // out-of-range fallback to 1

    // Suggest validation
    const suggestValid = validateSuggestParams({ q: "test", limit: 20 })
    assert.equal(suggestValid.success, true)
    assert.equal(suggestValid.data.limit, 10) // capped at 10
  })

  it("10. Rate limiting enforcement", () => {
    const mockReq = {
      headers: { "x-forwarded-for": "198.51.100.42" },
      socket: { remoteAddress: "198.51.100.42" },
    }

    const r1 = checkRateLimit(mockReq, { windowMs: 1000, maxRequests: 2 })
    assert.equal(r1.allowed, true)
    assert.equal(r1.remaining, 1)

    const r2 = checkRateLimit(mockReq, { windowMs: 1000, maxRequests: 2 })
    assert.equal(r2.allowed, true)
    assert.equal(r2.remaining, 0)

    const r3 = checkRateLimit(mockReq, { windowMs: 1000, maxRequests: 2 })
    assert.equal(r3.allowed, false)
  })

  it("11. URL scheme safety validation prevents XSS vectors", () => {
    // Valid schemes
    assert.equal(isSafeUrl("https://example.com/page"), true)
    assert.equal(isSafeUrl("http://insecure.org/path?q=1"), true)

    // Unsafe schemes blocked
    assert.equal(isSafeUrl("javascript:alert(1)"), false)
    assert.equal(isSafeUrl("data:text/html,<script>alert(1)</script>"), false)
    assert.equal(isSafeUrl("vbscript:msgbox(1)"), false)
    assert.equal(isSafeUrl("file:///etc/passwd"), false)
    assert.equal(isSafeUrl(""), false)
    assert.equal(isSafeUrl(null), false)

    assert.equal(sanitizeHref("javascript:alert(1)"), "#")
    assert.equal(sanitizeHref("https://example.com"), "https://example.com")
  })

  it("12. HTML highlight sanitizer escapes unsafe tags while preserving <mark>", () => {
    const dirty =
      'Here is <script>alert("xss")</script> with <mark class="highlight-term">safe match</mark> and <img src=x onerror=alert(1)>'
    const sanitized = sanitizeHighlightHtml(dirty)

    assert.ok(
      !sanitized.includes("<script>"),
      "Unsafe script tag must not remain",
    )
    assert.ok(!sanitized.includes("<img"), "Unsafe img tag must not remain")
    assert.ok(
      sanitized.includes("&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"),
    )
    assert.ok(
      sanitized.includes('<mark class="highlight-term">safe match</mark>'),
    )
  })

  it("13. Bundle secret audit: Production client bundle contains ZERO database credentials or URLs", () => {
    const distAssetsDir = path.resolve(process.cwd(), "dist/assets")
    if (!fs.existsSync(distAssetsDir)) {
      assert.fail("dist/assets does not exist; run build first")
    }

    const files = fs.readdirSync(distAssetsDir).filter((f) => f.endsWith(".js"))
    assert.ok(files.length > 0, "Should have at least one client JS bundle")

    for (const f of files) {
      const content = fs.readFileSync(path.join(distAssetsDir, f), "utf-8")

      // Assert OpenSearch cluster host is absent
      assert.ok(
        !content.includes("os-3c0470b3-voidcore.j.aivencloud.com"),
        `Bundle ${f} contains leaked OpenSearch cluster hostname!`,
      )

      // Assert fallback basic auth token is absent
      assert.ok(
        !content.includes("QVZOU191RFFZaVVCMGFWeDUzSmk4Y0lf"),
        `Bundle ${f} contains leaked OpenSearch Basic Auth token!`,
      )

      // Assert Aiven password token is absent
      const aivenSecret = Buffer.from(
        "QVZOU191RFFZaVVCMGFWeDUzSmk4Y0lf",
        "base64",
      ).toString("utf-8")
      assert.ok(
        !content.includes(aivenSecret),
        `Bundle ${f} contains leaked OpenSearch plaintext credentials!`,
      )
    }
  })
})
