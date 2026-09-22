import type {
  QueueItem,
  CrawlLogEntry,
  IndexedDocument,
  DomainStat,
  CrawlError,
  CronJob,
} from '../types/dashboard'

export const INITIAL_STATS = {
  discovered: 0,
  queued: 0,
  crawled: 0,
  indexed: 0,
  failed: 0,
  rateUrlsPerSec: 0,
  avgLatencyMs: 0,
  activeWorkers: 0,
}

export const INITIAL_QUEUE: QueueItem[] = []

export const INITIAL_LOGS: CrawlLogEntry[] = []

export const INITIAL_INDEXED: IndexedDocument[] = []

export const INITIAL_DOMAINS: DomainStat[] = []

export const INITIAL_ERRORS: CrawlError[] = []

export const INITIAL_CRON_JOBS: CronJob[] = []
