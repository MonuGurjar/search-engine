import type { CrawlProfile } from '../../server/scope-profiles'
import type { ExtractedMetadata } from '../../server/crawler-service'

export type ViewType =
  | 'overview'
  | 'profiles'
  | 'queue'
  | 'crawler'
  | 'indexed'
  | 'domains'
  | 'errors'
  | 'scheduler'
  | 'settings'

export type QueueItem = {
  id: string
  url: string
  domain: string
  depth: number
  priority: 'P0' | 'P1' | 'P2' | 'P3'
  profileId: string
  status: 'pending' | 'crawling' | 'indexed' | 'failed'
  addedAt: string
  retryCount: number
}

export type CrawlLogEntry = {
  id: string
  timestamp: string
  url: string
  method: string
  status: number
  responseTimeMs: number
  crawlState: 'FETCH' | 'PARSE' | 'EXTRACT' | 'GEMINI' | 'INDEXED' | 'BLOCKED' | 'ERROR'
  profileId: string
  sizeBytes?: number
  message?: string
}

export type IndexedDocument = {
  id: string
  url: string
  title: string
  domain: string
  category: string
  pageType: string
  summary: string
  topics: string[]
  tags: string[]
  indexedAt: string
  httpStatus: number
  profileId: string
}

export type DomainStat = {
  domain: string
  pagesIndexed: number
  crawlDelayMs: number
  robotsStatus: 'Allowed' | 'Restricted' | 'Cached'
  status: 'Healthy' | 'Rate Limited' | 'Degraded'
  sslValid: boolean
  lastCrawled: string
}

export type CrawlError = {
  id: string
  url: string
  domain: string
  errorCode: number
  errorType: 'HTTP 404' | 'HTTP 429' | 'HTTP 500' | 'Timeout' | 'Scope Blocked' | 'Parse Error'
  timestamp: string
  retryCount: number
  details: string
}

export type CronJob = {
  id: string
  name: string
  cronExpr: string
  profileId: string
  seedUrl: string
  lastRun: string
  nextRun: string
  status: 'Active' | 'Paused'
  maxPages: number
}

export type { CrawlProfile, ExtractedMetadata }
export type { CrawlTarget } from '../../server/targets-service'
