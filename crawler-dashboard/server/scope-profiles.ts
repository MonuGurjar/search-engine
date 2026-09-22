export type CrawlScopeType = 'domain-only' | 'subdomains' | 'path-prefix' | 'cross-domain' | 'custom-regex'

export type ContentFilter = {
  extractCodeBlocks: boolean
  extractHeadings: boolean
  extractLinks: boolean
  extractImages: boolean
  extractPdfs: boolean
}

export type CrawlProfile = {
  id: string
  name: string
  description: string
  badgeColor: string
  icon: string
  scopeType: CrawlScopeType
  allowedDomains: string[]
  excludedPaths: string[]
  includedPathPatterns: string[]
  maxDepth: number
  maxPagesPerDomain: number
  crawlDelayMs: number
  contentFilter: ContentFilter
  geminiDirective: string
}

export const DEFAULT_EXCLUDED_PATTERNS: string[] = [
  '/(commit|issues|pulls|actions|blob|releases|stargazers|network)/**',
  '*/(commit|issues|pulls|actions|blob|releases|stargazers|network)/**',
  // Developer & System routes
  '/api/**',
  '/api',
  '/docs/**',
  '/docs',
  '/blog/**',
  '/blogs/**',
  '/blog',
  '/blogs',
  // Auth & Account routes
  '/login/**',
  '/login',
  '/signin/**',
  '/signin',
  '/signup/**',
  '/signup',
  '/auth/**',
  '/auth',
  '/accounts/**',
  '/accounts',
  '/account/**',
  '/account',
  '/password/**',
  '/reset-password/**',
  // Search & Navigation Boilerplate
  '/search/**',
  '/search',
  '/explore/**',
  '/explore',
  '/popular/**',
  '/popular',
  '/web/**',
  '/directory/**',
  // Legal & Policy Boilerplate
  '/legal/**',
  '/legal',
  '/terms/**',
  '/terms',
  '/privacy/**',
  '/privacy',
  '/policies/**',
  '/policies',
  '/cookies/**',
  '/cookie-policy/**',
  '/cookie-policy',
  // Support, Company & Meta boilerplate
  '/help/**',
  '/help',
  '/support/**',
  '/support',
  '/about/**',
  '/about',
  '/careers/**',
  '/careers',
  '/press/**',
  '/press',
  // Commerce & Settings
  '/cart/**',
  '/checkout/**',
  '/billing/**',
  '/settings/**',
  // Media files
  '*.png',
  '*.jpg',
  '*.jpeg',
  '*.svg',
  '*.gif',
  '*.zip',
  '*.tar.gz',
  '*.mp4',
  '*.pdf',
]

export const PRESET_PROFILES: CrawlProfile[] = [
  {
    id: 'tech-docs',
    name: 'Technical Repositories & Guides',
    description: 'Optimized for code repositories and architecture overviews. System routes (/api, /docs, /blog, /login, /search, /commit, /pulls) excluded by default.',
    badgeColor: 'emerald',
    icon: 'code',
    scopeType: 'path-prefix',
    allowedDomains: ['*'],
    excludedPaths: [...DEFAULT_EXCLUDED_PATTERNS],
    includedPathPatterns: ['/**'],
    maxDepth: 4,
    maxPagesPerDomain: 2500,
    crawlDelayMs: 250,
    contentFilter: {
      extractCodeBlocks: true,
      extractHeadings: true,
      extractLinks: true,
      extractImages: false,
      extractPdfs: false,
    },
    geminiDirective: 'Extract API methods, architecture paradigms, code syntax concepts, and categorize for developer lookup.',
  },
  {
    id: 'academic',
    name: 'Research & Academic Papers',
    description: 'Targeted at preprints, scientific abstracts, and DOI indices.',
    badgeColor: 'cyan',
    icon: 'graduation-cap',
    scopeType: 'domain-only',
    allowedDomains: ['arxiv.org', 'biorxiv.org', 'nature.com', 'sciencedirect.com', 'openalex.org'],
    excludedPaths: [...DEFAULT_EXCLUDED_PATTERNS, '/subscribe', '/cookie-policy'],
    includedPathPatterns: ['/abs/**', '/pdf/**', '/articles/**', '/doi/**'],
    maxDepth: 3,
    maxPagesPerDomain: 5000,
    crawlDelayMs: 500,
    contentFilter: {
      extractCodeBlocks: false,
      extractHeadings: true,
      extractLinks: true,
      extractImages: false,
      extractPdfs: true,
    },
    geminiDirective: 'Identify research methodology, novel contributions, academic discipline, and core mathematical or scientific entities.',
  },
  {
    id: 'deep-explorer',
    name: 'Deep Web Explorer',
    description: 'Broad recursive web graph traversal with strict security and route exclusion gates.',
    badgeColor: 'purple',
    icon: 'globe',
    scopeType: 'cross-domain',
    allowedDomains: ['*'],
    excludedPaths: [...DEFAULT_EXCLUDED_PATTERNS, '/account/*'],
    includedPathPatterns: ['**'],
    maxDepth: 6,
    maxPagesPerDomain: 10000,
    crawlDelayMs: 400,
    contentFilter: {
      extractCodeBlocks: true,
      extractHeadings: true,
      extractLinks: true,
      extractImages: true,
      extractPdfs: true,
    },
    geminiDirective: 'Extract named entities (companies, technologies, leaders), identify semantic knowledge graph nodes, and assign search intent category.',
  },
  {
    id: 'quick-discovery',
    name: 'Quick Seed Discovery',
    description: 'Rapid, lightweight reconnaissance without deep indexing.',
    badgeColor: 'amber',
    icon: 'zap',
    scopeType: 'domain-only',
    allowedDomains: ['*'],
    excludedPaths: [...DEFAULT_EXCLUDED_PATTERNS],
    includedPathPatterns: ['/**'],
    maxDepth: 1,
    maxPagesPerDomain: 500,
    crawlDelayMs: 100,
    contentFilter: {
      extractCodeBlocks: false,
      extractHeadings: true,
      extractLinks: true,
      extractImages: false,
      extractPdfs: false,
    },
    geminiDirective: 'Identify site title, primary topics, and domain ownership hierarchy.',
  },
]

export function globToRegex(pattern: string): RegExp {
  if (pattern === '/**' || pattern === '**' || pattern === '/*' || pattern === '*') {
    return /^.*$/i
  }

  const escaped = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '___GLOB_STAR_STAR___')
    .replace(/\*/g, '[^/]*')
    .replace(/___GLOB_STAR_STAR___/g, '.*')

  if (escaped.endsWith('/.*')) {
    const base = escaped.slice(0, -3)
    return new RegExp(`^(${base}|${escaped})$`, 'i')
  }

  return new RegExp(`^${escaped}$`, 'i')
}

export function isUrlExcluded(
  targetUrl: string,
  customExclusions: string[] = []
): { excluded: boolean; reason?: string } {
  try {
    let urlStr = targetUrl.trim()
    if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
      urlStr = 'https://' + urlStr
    }
    const parsed = new URL(urlStr)
    const pathname = parsed.pathname
    const cleanPath = pathname.replace(/\/+$/, '') || '/'

    // 1. Hostname checks for corporate/boilerplate subdomains
    const hostname = parsed.hostname.toLowerCase()
    if (
      hostname.startsWith('about.') ||
      hostname.startsWith('help.') ||
      hostname.startsWith('legal.') ||
      hostname.startsWith('support.') ||
      hostname.startsWith('careers.') ||
      hostname.startsWith('privacy.')
    ) {
      return { excluded: true, reason: `Excluded boilerplate subdomain: ${hostname}` }
    }

    // 2. Direct path matches
    const exactExcludedRoutes = [
      '/api',
      '/docs',
      '/blog',
      '/blogs',
      '/login',
      '/search',
      '/signin',
      '/signup',
      '/auth',
      '/accounts',
      '/account',
      '/legal',
      '/terms',
      '/privacy',
      '/policies',
      '/cookies',
      '/cookie-policy',
      '/explore',
      '/popular',
      '/web',
      '/help',
      '/support',
      '/about',
      '/careers',
      '/press',
      '/directory',
    ]
    if (exactExcludedRoutes.includes(cleanPath)) {
      return { excluded: true, reason: `Matches excluded route: ${cleanPath}` }
    }

    const prefixExcludedRoutes = [
      '/api/',
      '/docs/',
      '/blog/',
      '/blogs/',
      '/login/',
      '/search/',
      '/signin/',
      '/signup/',
      '/auth/',
      '/accounts/',
      '/account/',
      '/legal/',
      '/terms/',
      '/privacy/',
      '/policies/',
      '/cookies/',
      '/cookie-policy/',
      '/explore/',
      '/popular/',
      '/web/',
      '/help/',
      '/support/',
      '/about/',
      '/careers/',
      '/press/',
      '/directory/',
      '/password/',
      '/reset-password/',
    ]
    for (const pfx of prefixExcludedRoutes) {
      if (cleanPath.startsWith(pfx)) {
        return { excluded: true, reason: `Matches excluded path prefix: ${pfx}` }
      }
    }

    // 3. GitHub repository sub-views
    const ghSubMatch = pathname.match(/\/(commit|issues|pulls|actions|blob|releases|stargazers|network)(\/|$)/i)
    if (ghSubMatch) {
      return { excluded: true, reason: `Matches excluded repository sub-view: /${ghSubMatch[1]}/` }
    }

    // 4. Pattern checks
    const allExclusions = [...DEFAULT_EXCLUDED_PATTERNS, ...customExclusions]
    for (const pattern of allExclusions) {
      if (!pattern) continue
      if (pattern.includes('(') && pattern.includes('|')) {
        const regexStr = pattern
          .replace(/\*\*/g, '___STAR_STAR___')
          .replace(/\*/g, '[^/]*')
          .replace(/___STAR_STAR___/g, '.*')
        if (new RegExp(regexStr, 'i').test(pathname)) {
          return { excluded: true, reason: `Matches exclusion pattern: ${pattern}` }
        }
      } else if (globToRegex(pattern).test(pathname)) {
        return { excluded: true, reason: `Matches exclusion pattern: ${pattern}` }
      } else if (pathname === pattern || pathname.startsWith(pattern.endsWith('/') ? pattern : pattern + '/')) {
        return { excluded: true, reason: `Matches excluded prefix: ${pattern}` }
      }
    }

    return { excluded: false }
  } catch {
    return { excluded: false }
  }
}

export function evaluateScope(
  targetUrl: string,
  profile: CrawlProfile,
  customRules?: Partial<CrawlProfile>
): {
  allowed: boolean
  reason: string
  matchedRule?: string
} {
  try {
    const activeProfile = { ...profile, ...customRules }

    // Check default and active profile exclusions
    const exclCheck = isUrlExcluded(targetUrl, activeProfile.excludedPaths)
    if (exclCheck.excluded) {
      return {
        allowed: false,
        reason: exclCheck.reason || 'URL matches exclusion rule',
        matchedRule: 'Excluded Route Gate',
      }
    }

    const parsed = new URL(targetUrl.startsWith('http') ? targetUrl : 'https://' + targetUrl)
    const domain = parsed.hostname.replace(/^www\./, '')
    const path = parsed.pathname

    // Check allowed domains
    if (activeProfile.allowedDomains.length > 0 && !activeProfile.allowedDomains.includes('*')) {
      const isDomainAllowed = activeProfile.allowedDomains.some((d) => {
        const clean = d.replace(/^www\./, '')
        return domain === clean || domain.endsWith('.' + clean)
      })

      if (!isDomainAllowed) {
        return {
          allowed: false,
          reason: `Domain ${domain} is not in allowed domains list`,
          matchedRule: `Domain Boundary: [${activeProfile.allowedDomains.join(', ')}]`,
        }
      }
    }

    // Check included path patterns
    const hasCatchAll = activeProfile.includedPathPatterns.some(
      (p) => p === '**' || p === '/**' || p === '/*' || p === '*'
    )
    if (activeProfile.includedPathPatterns.length > 0 && !hasCatchAll) {
      const matchesInclusion = activeProfile.includedPathPatterns.some((pattern) => {
        return globToRegex(pattern).test(path)
      })

      if (!matchesInclusion) {
        return {
          allowed: false,
          reason: `Path ${path} does not match any included path pattern for profile "${activeProfile.name}"`,
          matchedRule: `Allowed Paths: ${activeProfile.includedPathPatterns.join(', ')}`,
        }
      }
    }

    return {
      allowed: true,
      reason: `URL matches scope rules for profile: ${activeProfile.name}`,
      matchedRule: `Scope: ${activeProfile.scopeType}`,
    }
  } catch (err: any) {
    return {
      allowed: false,
      reason: `Invalid URL format: ${err.message}`,
    }
  }
}
