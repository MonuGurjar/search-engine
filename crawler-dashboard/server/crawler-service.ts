import { execFileSync } from 'node:child_process'
import {
  evaluateScope,
  isUrlExcluded,
  PRESET_PROFILES,
  type CrawlProfile,
} from './scope-profiles.ts'
import { enrichWithGemini, type GeminiEnrichmentResult } from './gemini-service.ts'
import {
  addIndexedDocToDb,
  isUrlIndexed,
  normalizeUrl,
  readIndexedFromDb,
  type IndexedDocument,
} from './indexed-service.ts'

export type ExtractedMetadata = {
  url: string
  canonicalUrl: string
  httpStatus: number
  statusText: string
  responseTimeMs: number
  contentType: string
  contentLengthBytes: number
  title: string
  metaDescription: string
  openGraph: {
    title?: string
    description?: string
    image?: string
    type?: string
    siteName?: string
    url?: string
  }
  favicon: string
  previewImage?: string
  detectedLanguage: string
  domain: string
  tld: string
  protocol: string
  pageType: 'Documentation' | 'Article' | 'Research Paper' | 'Repository' | 'Portal' | 'Media'
  headings: {
    h1: string[]
    h2: string[]
    h3: string[]
  }
  extractedLinks: Array<{
    url: string
    text: string
    internal: boolean
  }>
  keywords: string[]
  indexedTimestamp: string
  scopeEvaluation: {
    allowed: boolean
    reason: string
    matchedRule?: string
    profileName: string
  }
  gemini: GeminiEnrichmentResult
}

export async function analyzeTargetUrl(
  inputUrl: string,
  profileId: string = 'tech-docs',
  customScope?: Partial<CrawlProfile>
): Promise<ExtractedMetadata> {
  const startTime = Date.now()

  // 1. Normalize URL
  const target = normalizeUrl(inputUrl)
  const urlObj = new URL(target)
  const domain = urlObj.hostname.replace(/^www\./, '')
  const tld = domain.split('.').pop() || 'com'

  // 2. Select Profile & Scope Evaluation
  const profile = PRESET_PROFILES.find((p) => p.id === profileId) || PRESET_PROFILES[0]
  const scopeResult = evaluateScope(target, profile, customScope)

  // If excluded, reject immediately without network request or Gemini quota usage
  if (!scopeResult.allowed) {
    return {
      url: target,
      canonicalUrl: target,
      httpStatus: 403,
      statusText: `Forbidden by scope rule: ${scopeResult.reason}`,
      responseTimeMs: Date.now() - startTime,
      contentType: 'text/plain',
      contentLengthBytes: 0,
      title: `${domain} — Excluded Route`,
      metaDescription: `URL excluded from indexing: ${scopeResult.reason}`,
      openGraph: {},
      favicon: `https://${domain}/favicon.ico`,
      detectedLanguage: 'en-US',
      domain,
      tld,
      protocol: urlObj.protocol.replace(':', ''),
      pageType: 'Portal',
      headings: { h1: [], h2: [], h3: [] },
      extractedLinks: [],
      keywords: [],
      indexedTimestamp: new Date().toISOString(),
      scopeEvaluation: {
        ...scopeResult,
        profileName: profile.name,
      },
      gemini: {
        provider: 'Scope Filter Gate',
        latencyMs: 0,
        model: 'none',
        summary: `URL is excluded from VOID indexing by route exclusion rules (${scopeResult.reason}).`,
        category: 'Excluded Route',
        topics: [],
        entities: [],
        suggestedTags: [],
        semanticKeywords: [],
        crawlPriorityScore: 0,
      },
    }
  }

  // 3. Fetch URL content with realistic crawler headers
  let html = ''
  let httpStatus = 200
  let statusText = 'OK'
  let contentType = 'text/html; charset=utf-8'
  let contentLengthBytes = 0

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)

    const res = await fetch(target, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })
    clearTimeout(timeout)

    httpStatus = res.status
    statusText = res.statusText || (res.ok ? 'OK' : 'Error')
    contentType = res.headers.get('content-type') || contentType
    const text = await res.text()
    html = text
    contentLengthBytes = new Blob([text]).size
  } catch (fetchErr: any) {
    // Robust fallback: If Node.js undici hits connection timeouts (common with IPv6/Anycast CDNs), use curl
    try {
      const curlOutput = execFileSync(
        'curl',
        [
          '-s',
          '-L',
          '--max-time',
          '8',
          '-A',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          target,
        ],
        { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
      )
      if (curlOutput && curlOutput.trim().length > 0) {
        html = curlOutput
        httpStatus = 200
        statusText = 'OK'
        contentLengthBytes = new Blob([curlOutput]).size
      } else {
        throw new Error('Empty response from crawler fallback')
      }
    } catch (curlErr: any) {
      httpStatus = 502
      statusText = `Failed to fetch: ${fetchErr.message || curlErr.message || 'Network unreachable'}`
      html = ''
      contentLengthBytes = 0
    }
  }

  const responseTimeMs = Date.now() - startTime

  // 4. HTML Parser & Metadata Extraction
  const parsedMeta = parseHtmlContent(html, target, domain)

  // 5. Secure Gemini Enrichment
  const geminiResult = await enrichWithGemini(
    {
      url: target,
      title: parsedMeta.title,
      description: parsedMeta.metaDescription,
      headings: parsedMeta.headings.h1.concat(parsedMeta.headings.h2),
      snippet: parsedMeta.bodySnippet,
      domain,
      language: parsedMeta.detectedLanguage,
    },
    profile.geminiDirective
  )

  return {
    url: target,
    canonicalUrl: parsedMeta.canonicalUrl || target,
    httpStatus,
    statusText,
    responseTimeMs,
    contentType,
    contentLengthBytes,
    title: parsedMeta.title,
    metaDescription: parsedMeta.metaDescription,
    openGraph: parsedMeta.openGraph,
    favicon: parsedMeta.favicon,
    previewImage: parsedMeta.openGraph.image || undefined,
    detectedLanguage: parsedMeta.detectedLanguage,
    domain,
    tld,
    protocol: urlObj.protocol.replace(':', ''),
    pageType: inferPageType(domain, parsedMeta.title, target),
    headings: parsedMeta.headings,
    extractedLinks: parsedMeta.extractedLinks,
    keywords: parsedMeta.keywords,
    indexedTimestamp: new Date().toISOString(),
    scopeEvaluation: {
      ...scopeResult,
      profileName: profile.name,
    },
    gemini: geminiResult,
  }
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#0*39;/g, "'")
    .replace(/&#0*34;/g, '"')
    .replace(/&#0*64;/g, '@')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .trim()
}

function parseHtmlContent(html: string, url: string, domain: string) {
  // Title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const rawTitle = titleMatch ? titleMatch[1].trim() : `${domain} — Web Document`
  const title = decodeHtmlEntities(rawTitle)

  // Meta Description
  const descMatch =
    html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) ||
    html.match(/<meta\s+content=["']([^"']*)["']\s+name=["']description["']/i)
  const metaDescription = descMatch
    ? decodeHtmlEntities(descMatch[1].trim())
    : `Primary web resource hosted at ${domain} parsed by VOID search engine crawler.`

  // Canonical
  const canonMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i)
  const canonicalUrl = canonMatch ? canonMatch[1].trim() : url

  // Favicon
  const iconMatch = html.match(/<link\s+[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']*)["']/i)
  let favicon = iconMatch ? iconMatch[1].trim() : `https://${domain}/favicon.ico`
  if (favicon.startsWith('/')) {
    favicon = `https://${domain}${favicon}`
  }

  // Open Graph
  const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']*)["']/i)
  const ogDescMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']*)["']/i)
  const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']*)["']/i)
  const ogTypeMatch = html.match(/<meta\s+property=["']og:type["']\s+content=["']([^"']*)["']/i)
  const ogSiteMatch = html.match(/<meta\s+property=["']og:site_name["']\s+content=["']([^"']*)["']/i)

  const openGraph = {
    title: ogTitleMatch ? ogTitleMatch[1] : title,
    description: ogDescMatch ? ogDescMatch[1] : metaDescription,
    image: ogImageMatch ? ogImageMatch[1] : undefined,
    type: ogTypeMatch ? ogTypeMatch[1] : 'website',
    siteName: ogSiteMatch ? ogSiteMatch[1] : domain,
    url: canonicalUrl,
  }

  // Language
  const langMatch = html.match(/<html[^>]*\slang=["']([^"']*)["']/i)
  const detectedLanguage = langMatch ? langMatch[1] : 'en-US'

  // Headings
  const h1: string[] = []
  const h2: string[] = []
  const h3: string[] = []

  const h1Matches = html.matchAll(/<h1[^>]*>([^<]+)<\/h1>/gi)
  for (const m of h1Matches) h1.push(m[1].trim().replace(/\s+/g, ' '))

  const h2Matches = html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/gi)
  for (const m of h2Matches) h2.push(m[1].trim().replace(/\s+/g, ' '))

  const h3Matches = html.matchAll(/<h3[^>]*>([^<]+)<\/h3>/gi)
  for (const m of h3Matches) h3.push(m[1].trim().replace(/\s+/g, ' '))

  // Only fallback h1 to title if h1 is empty
  if (h1.length === 0 && title) h1.push(title)

  // Extracted Links with strict exclusion and domain boundary filtering
  const extractedLinks: Array<{ url: string; text: string; internal: boolean }> = []
  const aMatches = html.matchAll(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis)
  let count = 0
  for (const m of aMatches) {
    if (count++ > 35) break
    const href = m[1].trim()
    const linkText = m[2].replace(/<[^>]+>/g, '').trim()
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) continue

    let fullHref = href
    if (href.startsWith('/')) {
      fullHref = `https://${domain}${href}`
    } else if (!href.startsWith('http://') && !href.startsWith('https://')) {
      continue
    }

    try {
      const parsedHref = new URL(fullHref)
      const cleanHrefHost = parsedHref.hostname.replace(/^www\./, '').toLowerCase()
      const cleanDomain = domain.replace(/^www\./, '').toLowerCase()
      // Strictly same domain - don't crawl subdomains like about.instagram.com, help.instagram.com, etc.
      const isInternal = cleanHrefHost === cleanDomain
      if (!isInternal) continue

      // Strictly skip any links that match exclusion patterns (/api, /docs, /blog, /login, /accounts, /legal, /terms, etc.)
      if (isUrlExcluded(fullHref).excluded) {
        continue
      }

      extractedLinks.push({
        url: fullHref,
        text: linkText || fullHref,
        internal: true,
      })
    } catch {
      continue
    }
  }

  // Extract snippet
  const cleanBody = decodeHtmlEntities(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, '')
      .replace(/<style\b[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  )

  const bodySnippet = cleanBody.slice(0, 1500)

  // Meaningful description fallback
  let finalDescription = metaDescription
  if (
    !finalDescription ||
    finalDescription.startsWith('Primary web resource hosted at') ||
    finalDescription.length < 15
  ) {
    if (ogDescMatch && ogDescMatch[1].trim()) {
      finalDescription = decodeHtmlEntities(ogDescMatch[1].trim())
    } else if (cleanBody.length > 20) {
      const firstChunk = cleanBody.slice(0, 240).replace(/\s+/g, ' ')
      finalDescription = firstChunk.endsWith('.') ? firstChunk : `${firstChunk}...`
    } else {
      finalDescription = `Web resource at ${domain} indexed by VOID search engine.`
    }
  }

  // Keywords
  const words = cleanBody
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 4 && !['about', 'their', 'which', 'there', 'could', 'other', 'const', 'false', 'true'].includes(w))
  const freq: Record<string, number> = {}
  for (const w of words) freq[w] = (freq[w] || 0) + 1
  const keywords = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([w]) => w)

  return {
    title,
    metaDescription: finalDescription,
    canonicalUrl,
    favicon,
    openGraph,
    detectedLanguage,
    headings: {
      h1: h1.slice(0, 3),
      h2: h2.slice(0, 6),
      h3: h3.slice(0, 6),
    },
    extractedLinks,
    bodySnippet,
    keywords,
  }
}

function inferPageType(domain: string, title: string, url: string): ExtractedMetadata['pageType'] {
  const low = (domain + ' ' + title + ' ' + url).toLowerCase()
  if (low.includes('arxiv') || low.includes('paper') || low.includes('research') || low.includes('doi')) return 'Research Paper'
  if (low.includes('docs') || low.includes('documentation') || low.includes('reference') || low.includes('learn')) return 'Documentation'
  if (low.includes('github') || low.includes('gitlab') || low.includes('repo')) return 'Repository'
  if (low.includes('blog') || low.includes('news') || low.includes('post') || low.includes('article')) return 'Article'
  if (low.includes('youtube') || low.includes('vimeo') || low.includes('podcast')) return 'Media'
  return 'Portal'
}

/**
 * Crawls and directly indexes a single URL into the VOID index database.
 * Strictly prevents indexing excluded routes and duplicates.
 */
export async function crawlAndIndexSingle(
  targetUrl: string,
  profileId: string = 'tech-docs',
  forceReindex: boolean = false
): Promise<{ doc: IndexedDocument; isDuplicate: boolean; excluded?: boolean }> {
  const norm = normalizeUrl(targetUrl)

  // 1. Check exclusion filter
  const exclCheck = isUrlExcluded(norm)
  if (exclCheck.excluded) {
    console.log(`[Crawler] Skipping excluded route: ${norm} (${exclCheck.reason})`)
    return {
      doc: {
        id: `idx-excluded-${Date.now()}`,
        url: norm,
        title: 'Excluded Route',
        domain: '',
        category: 'Excluded',
        pageType: 'Portal',
        summary: `URL is excluded from VOID indexing: ${exclCheck.reason}`,
        topics: [],
        tags: [],
        indexedAt: new Date().toISOString(),
        httpStatus: 403,
        profileId,
      },
      isDuplicate: true,
      excluded: true,
    }
  }

  // 2. Check deduplication
  if (!forceReindex && isUrlIndexed(norm)) {
    const existingDocs = readIndexedFromDb()
    const found = existingDocs.find((d) => normalizeUrl(d.url) === norm)
    if (found) {
      return { doc: found, isDuplicate: true }
    }
  }

  const meta = await analyzeTargetUrl(norm, profileId)
  if (meta.httpStatus === 403) {
    return {
      doc: {
        id: `idx-excluded-${Date.now()}`,
        url: norm,
        title: meta.title,
        domain: meta.domain,
        category: 'Excluded',
        pageType: 'Portal',
        summary: meta.metaDescription,
        topics: [],
        tags: [],
        indexedAt: new Date().toISOString(),
        httpStatus: 403,
        profileId,
      },
      isDuplicate: true,
      excluded: true,
    }
  }

  const isSocial = ['instagram.com', 'facebook.com', 'linkedin.com', 'twitter.com', 'x.com', 'threads.net', 'tiktok.com'].some(
    (d) => meta.domain === d || meta.domain.endsWith('.' + d)
  )

  let docCategory = meta.gemini?.category
  const isPortfolio =
    meta.title.toLowerCase().includes('engineer') ||
    meta.title.toLowerCase().includes('portfolio') ||
    meta.title.toLowerCase().includes('developer') ||
    norm.toLowerCase().includes('portfolio')

  if (!docCategory || docCategory === 'General Web Resource') {
    if (isSocial) docCategory = 'Social Profile'
    else if (meta.pageType === 'Repository') docCategory = 'Code Repository'
    else if (isPortfolio) docCategory = 'Developer Portfolio'
    else docCategory = 'Documentation'
  }

  // Filter out any legacy or placeholder topics, and clean terminal artifacts
  let docTopics = (meta.gemini?.topics || [])
    .filter((t) => !['Core Concepts and Architecture', 'Quick Reference & Examples', 'API Specifications'].includes(t))
    .map((t) => t.replace(/^SYSTEM@[^:]+:\~?\$?\s*/i, '').trim())
    .filter(Boolean)

  if (isPortfolio) {
    if (meta.title.toLowerCase().includes('ai engineer')) {
      docTopics.push('AI Engineering', 'Machine Learning', 'Developer Portfolio', 'Python & Systems')
    } else {
      docTopics.push('Software Engineering', 'Developer Portfolio')
    }
  }

  if (docTopics.length === 0) {
    if (isSocial) {
      const platform = meta.domain.replace(/\.(com|org|net)$/i, '')
      const platformTitle = platform.charAt(0).toUpperCase() + platform.slice(1)
      const cleanTitle = meta.title.replace(/\s*[•|–-].*$/, '').trim()
      docTopics = [`${platformTitle} Profile`, 'Social Media', cleanTitle || 'Profile'].filter(Boolean)
    } else {
      if (meta.title) docTopics.push(meta.title)
      if (meta.domain) docTopics.push(meta.domain)
    }
  }
  docTopics = Array.from(new Set(docTopics))

  let docSummary = meta.gemini?.summary || meta.metaDescription
  if (isSocial && meta.domain.includes('instagram.com')) {
    const userMatch = norm.match(/instagram\.com\/([a-zA-Z0-9_.]+)/)
    const handle = userMatch ? `@${userMatch[1]}` : ''
    docSummary = `${handle ? `${handle} on ` : ''}Instagram: Photos, videos, updates, and profile details.`
  }

  const newDoc: IndexedDocument = {
    id: `idx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    url: norm,
    title: meta.title,
    domain: meta.domain,
    category: docCategory,
    pageType: isSocial ? 'Portal' : meta.pageType,
    summary: docSummary,
    topics: docTopics,
    tags: meta.gemini?.suggestedTags?.length ? meta.gemini.suggestedTags : (meta.keywords || []),
    indexedAt: new Date().toISOString(),
    httpStatus: meta.httpStatus,
    profileId,
  }

  return addIndexedDocToDb(newDoc)
}

/**
 * Crawls root URL and discovers/crawls child pages or GitHub repositories.
 * Strictly prevents duplicates and excluded paths.
 */
export async function crawlWithChildLinks(
  rootUrl: string,
  profileId: string = 'tech-docs',
  maxChildren: number = 35
): Promise<{
  rootDoc: IndexedDocument
  childDocs: IndexedDocument[]
  skippedCount: number
}> {
  const normRoot = normalizeUrl(rootUrl)

  // If root is excluded, skip immediately
  if (isUrlExcluded(normRoot).excluded) {
    return {
      rootDoc: {
        id: 'idx-excluded',
        url: normRoot,
        title: 'Excluded',
        domain: '',
        category: 'Excluded',
        pageType: 'Portal',
        summary: 'Excluded by scope',
        topics: [],
        tags: [],
        indexedAt: new Date().toISOString(),
        httpStatus: 403,
        profileId,
      },
      childDocs: [],
      skippedCount: 1,
    }
  }

  const rootResult = await crawlAndIndexSingle(normRoot, profileId, false)
  const childDocs: IndexedDocument[] = []
  let skippedCount = rootResult.isDuplicate ? 1 : 0

  // 1. GitHub Profile Auto-Discovery (e.g. https://github.com/MonuGurjar)
  const ghMatch = normRoot.match(/^https?:\/\/github\.com\/([a-zA-Z0-9_-]+)(?:\/?|\?.*)?$/)
  if (
    ghMatch &&
    !['features', 'topics', 'trending', 'collections', 'events', 'explore', 'login', 'signup', 'search'].includes(
      ghMatch[1].toLowerCase()
    )
  ) {
    const username = ghMatch[1]
    try {
      const res = await fetch(`https://api.github.com/users/${username}/repos?per_page=100`, {
        headers: {
          'User-Agent': 'VOID-Crawler/1.4.2 (+https://voidsearch.internal/bot)',
          'Accept': 'application/vnd.github.v3+json',
        },
      })
      if (res.ok) {
        const repos: any[] = await res.json()
        for (const repo of repos.slice(0, maxChildren)) {
          const repoUrl = normalizeUrl(repo.html_url)

          // Strictly filter out excluded repo paths
          if (isUrlExcluded(repoUrl).excluded) {
            skippedCount++
            continue
          }

          if (isUrlIndexed(repoUrl)) {
            skippedCount++
            continue
          }

          const doc: IndexedDocument = {
            id: `idx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            url: repoUrl,
            title: `${repo.name} — ${username} (GitHub)`,
            domain: 'github.com',
            category: 'Code Repository',
            pageType: 'Repository',
            summary: repo.description
              ? `${repo.description}. Primary language: ${repo.language || 'Code'}.`
              : `Open-source software repository ${repo.name} created by ${username} on GitHub. Built with ${repo.language || 'modern software technologies'}.`,
            topics: [repo.language, 'Open Source', 'GitHub Repository', 'Software Project'].filter(Boolean),
            tags: [repo.name.toLowerCase(), username.toLowerCase(), (repo.language || '').toLowerCase(), 'github'].filter(Boolean),
            indexedAt: new Date().toISOString(),
            httpStatus: 200,
            profileId,
          }
          const saved = addIndexedDocToDb(doc)
          if (!saved.isDuplicate && !saved.excluded) {
            childDocs.push(saved.doc)
          } else {
            skippedCount++
          }
        }
        return { rootDoc: rootResult.doc, childDocs, skippedCount }
      }
    } catch (err) {
      console.warn('GitHub API crawl fallback:', err)
    }
  }

  // 2. Social domains boundary check:
  // Social profiles (Instagram, LinkedIn, Facebook, etc.) do not have crawlable public child web pages without login.
  // Crawling internal links on these domains leads only to platform boilerplate (login, legal, popular, explore).
  const rootObj = new URL(normRoot)
  const isSocialDomain = ['instagram.com', 'facebook.com', 'linkedin.com', 'twitter.com', 'x.com', 'threads.net', 'tiktok.com'].some(
    (d) => rootObj.hostname === d || rootObj.hostname.endsWith('.' + d)
  )
  if (isSocialDomain) {
    return { rootDoc: rootResult.doc, childDocs, skippedCount }
  }

  // 3. Generic internal links discovery (constrained to scope/path prefix)
  try {
    const meta = await analyzeTargetUrl(normRoot, profileId)
    const rootPath = rootObj.pathname.replace(/\/+$/, '')
    const candidates = meta.extractedLinks
      .filter((l) => {
        if (!l.internal) return false
        const norm = normalizeUrl(l.url)
        if (norm === normRoot) return false
        if (isUrlExcluded(norm).excluded) return false
        // If root has a specific path prefix (like /docs/guide or /repo/name), constrain child links to that prefix
        if (rootPath && rootPath !== '/' && rootPath.split('/').length > 2) {
          try {
            const lPath = new URL(norm).pathname
            if (!lPath.startsWith(rootPath)) return false
          } catch {
            return false
          }
        }
        return true
      })
      .slice(0, maxChildren)

    for (const item of candidates) {
      const itemNorm = normalizeUrl(item.url)
      if (isUrlExcluded(itemNorm).excluded) {
        skippedCount++
        continue
      }
      if (isUrlIndexed(itemNorm)) {
        skippedCount++
        continue
      }
      try {
        const res = await crawlAndIndexSingle(itemNorm, profileId, false)
        if (!res.isDuplicate && !res.excluded) {
          childDocs.push(res.doc)
        } else {
          skippedCount++
        }
      } catch (err) {
        console.warn(`Could not crawl child link ${itemNorm}:`, err)
      }
    }
  } catch (err) {
    console.error('Child crawl extraction error:', err)
  }

  return { rootDoc: rootResult.doc, childDocs, skippedCount }
}

/**
 * Crawls and indexes any targets in the database that are not yet in the index.
 */
export async function crawlUnindexedTargets(
  targets: Array<{ url: string; profileId?: string }>
): Promise<{
  crawledDocs: IndexedDocument[]
  skippedCount: number
}> {
  const crawledDocs: IndexedDocument[] = []
  let skippedCount = 0

  for (const t of targets) {
    const norm = normalizeUrl(t.url)
    if (isUrlExcluded(norm).excluded) {
      skippedCount++
      continue
    }
    if (isUrlIndexed(norm)) {
      skippedCount++
      continue
    }
    try {
      const res = await crawlWithChildLinks(norm, t.profileId || 'tech-docs', 25)
      crawledDocs.push(res.rootDoc, ...res.childDocs)
      skippedCount += res.skippedCount
    } catch (err) {
      console.error(`Failed to crawl unindexed target ${norm}:`, err)
    }
  }

  return { crawledDocs, skippedCount }
}
