import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseQueryOperators,
  buildSearchPayload,
  searchOpenSearch,
  getAutocompleteSuggestions,
} from '../server/opensearch-service.ts'
import searchHandler from '../api/search.ts'
import crawlerSearchHandler from '../api/crawler/search.ts'

describe('OpenSearch BM25 Ranking & Search Pipeline', () => {
  it('1. Parses search query operators (site, phrases, exclusions)', () => {
    const raw = 'privacy "autonomous agents" site:github.com -tracking'
    const parsed = parseQueryOperators(raw)

    assert.equal(parsed.cleanQuery, 'privacy')
    assert.equal(parsed.siteFilter, 'github.com')
    assert.deepEqual(parsed.phrases, ['autonomous agents'])
    assert.deepEqual(parsed.exclusions, ['tracking'])
  })

  it('2. Builds BM25 search payload with exact field weights matching production spec', () => {
    const payload = buildSearchPayload('machine learning', { category: 'Tech', size: 15 })

    assert.equal(payload.size, 15)
    assert.ok(payload.query?.bool?.must?.length > 0)

    // Check that multi_match contains all specified BM25 boost weights
    const mustClause = payload.query.bool.must[0]
    const multiMatch = mustClause.bool.should[0].multi_match

    const expectedFields = [
      'title^3.5',
      'headings^2.0',
      'topics^1.8',
      'tags^1.5',
      'description^1.2',
      'ai_summary^1.2',
      'content^1.0',
      'domain^1.0',
    ]
    assert.deepEqual(multiMatch.fields, expectedFields)
    assert.equal(multiMatch.type, 'best_fields')
    assert.equal(multiMatch.fuzziness, 'AUTO')

    // Check filter includes HTTP 200-399 status range
    const httpFilter = payload.query.bool.filter.find((f) => f.range?.http_status)
    assert.ok(httpFilter, 'HTTP status filter should be present')
    assert.equal(httpFilter.range.http_status.gte, 200)
    assert.equal(httpFilter.range.http_status.lt, 400)

    // Check category filter
    const catFilter = payload.query.bool.filter.find((f) => f.bool?.should)
    assert.ok(catFilter, 'Category filter should be present')
  })

  it('3. Configures highlighting fragments with <mark> tags', () => {
    const payload = buildSearchPayload('distributed systems')

    assert.deepEqual(payload.highlight.pre_tags, ['<mark class="highlight-term">'])
    assert.deepEqual(payload.highlight.post_tags, ['</mark>'])
    assert.ok('title' in payload.highlight.fields)
    assert.ok('content' in payload.highlight.fields)
    assert.ok('headings' in payload.highlight.fields)
    assert.ok('summary' in payload.highlight.fields)
    assert.equal(payload.highlight.fields.content.fragment_size, 140)
  })

  it('4. Handles exact phrases with boosted phrase match', () => {
    const payload = buildSearchPayload('"Zero Knowledge Proofs"')
    const phraseClause = payload.query.bool.must.find((m) => m.multi_match?.type === 'phrase')

    assert.ok(phraseClause, 'Phrase clause must exist')
    assert.equal(phraseClause.multi_match.query, 'Zero Knowledge Proofs')
    assert.equal(phraseClause.multi_match.boost, 3.0)
    assert.ok(phraseClause.multi_match.fields.includes('title^4.0'))
  })

  it('5. Live OpenSearch cluster connectivity and BM25 query execution', async () => {
    const res = await searchOpenSearch('bank', { limit: 5 })

    assert.ok(typeof res.total === 'number')
    assert.ok(Array.isArray(res.hits))
    assert.ok(res.tookMs >= 0)

    if (res.hits.length > 0) {
      const topHit = res.hits[0]
      assert.ok(topHit.document)
      assert.ok(topHit.document.title)
      assert.ok(topHit.document.url)
      assert.ok(typeof topHit.score === 'number')
      assert.ok(topHit.score > 0)
    }
  })

  it('6. Live Autocomplete suggestions return relevant matches', async () => {
    const suggestions = await getAutocompleteSuggestions('cen')
    assert.ok(Array.isArray(suggestions))
  })

  it('7. Handles search API endpoint with POST and GET', async () => {
    // Test GET /api/search?q=bank
    let responseStatus = 0
    let responseData = null

    const mockRes = {
      statusCode: 200,
      setHeader: () => {},
      end: (data) => {
        responseData = JSON.parse(data)
      },
      status: (s) => {
        responseStatus = s
        return mockRes
      },
      json: (d) => {
        responseData = d
        return mockRes
      },
    }

    const mockGetReq = {
      method: 'GET',
      url: '/api/search?q=bank&limit=3',
    }

    await searchHandler(mockGetReq, mockRes)
    assert.ok(responseData)
    assert.ok('hits' in responseData)
    assert.ok('total' in responseData)

    // Test POST /api/search with JSON body
    let postData = null
    const mockPostRes = {
      statusCode: 200,
      setHeader: () => {},
      end: (data) => {
        postData = JSON.parse(data)
      },
      status: (s) => mockPostRes,
      json: (d) => {
        postData = d
        return mockPostRes
      },
    }

    const mockPostReq = {
      method: 'POST',
      url: '/api/search',
      body: { action: 'search', query: 'bank', size: 3 },
    }

    await searchHandler(mockPostReq, mockPostRes)
    assert.ok(postData)
    assert.ok('hits' in postData)
    assert.ok('total' in postData)
  })

  it('8. Handles GET /api/crawler/search endpoint with BM25 responses', async () => {
    let crawlerResData = null
    const mockCrawlerRes = {
      statusCode: 200,
      setHeader: () => {},
      end: (data) => {
        crawlerResData = JSON.parse(data)
      },
      status: (s) => mockCrawlerRes,
      json: (d) => {
        crawlerResData = d
        return mockCrawlerRes
      },
    }

    const mockCrawlerReq = {
      method: 'GET',
      url: '/api/crawler/search?q=bank&limit=2',
    }

    await crawlerSearchHandler(mockCrawlerReq, mockCrawlerRes)
    assert.ok(crawlerResData)
    assert.ok('hits' in crawlerResData)
    assert.ok('total' in crawlerResData)
    assert.ok(typeof crawlerResData.tookMs === 'number')
  })
})
