import fs from 'node:fs'
import path from 'node:path'
import type { CrawlScopeType, ContentFilter } from './scope-profiles.ts'
import { normalizeUrl } from './indexed-service.ts'

export type CrawlTarget = {
  id: string
  url: string
  domain: string
  name?: string
  scopeType: CrawlScopeType
  maxDepth: number
  crawlDelayMs: number
  includedPathPatterns: string[]
  excludedPaths: string[]
  contentFilter: ContentFilter
  geminiDirective: string
  addedAt: string
  status: 'Active' | 'Paused' | 'Crawled'
  lastCrawledAt?: string
}

const DB_FILE = path.resolve(import.meta.dirname, './data/targets-db.json')

export function readTargetsFromDb(): CrawlTarget[] {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8')
      const parsed: CrawlTarget[] = JSON.parse(data || '[]')
      return cleanTargetDuplicates(parsed)
    }
  } catch (err) {
    console.error('Failed to read targets-db.json:', err)
  }
  return []
}

function cleanTargetDuplicates(targets: CrawlTarget[]): CrawlTarget[] {
  const seen = new Set<string>()
  const cleaned: CrawlTarget[] = []

  for (const t of targets) {
    const norm = normalizeUrl(t.url)
    if (!seen.has(norm)) {
      seen.add(norm)
      cleaned.push({
        ...t,
        url: norm,
      })
    }
  }

  if (cleaned.length !== targets.length) {
    writeTargetsToDb(cleaned)
  }

  return cleaned
}

export function writeTargetsToDb(targets: CrawlTarget[]): boolean {
  try {
    const dir = path.dirname(DB_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(targets, null, 2), 'utf-8')
    return true
  } catch (err) {
    console.error('Failed to write targets-db.json:', err)
    return false
  }
}

export function addTargetToDb(newTarget: Omit<CrawlTarget, 'id' | 'addedAt'> & { id?: string }): CrawlTarget {
  const current = readTargetsFromDb()
  const normUrl = normalizeUrl(newTarget.url)
  const target: CrawlTarget = {
    ...newTarget,
    url: normUrl,
    id: newTarget.id || `target-${Date.now()}`,
    addedAt: new Date().toISOString(),
    status: newTarget.status || 'Active',
  }

  const existingIdx = current.findIndex(
    (t) => t.id === target.id || normalizeUrl(t.url) === normUrl
  )

  let updated: CrawlTarget[]
  if (existingIdx >= 0) {
    current[existingIdx] = { ...current[existingIdx], ...target, id: current[existingIdx].id }
    updated = current
  } else {
    updated = [target, ...current]
  }

  writeTargetsToDb(updated)
  return target
}

export function deleteTargetFromDb(id: string): boolean {
  const current = readTargetsFromDb()
  const updated = current.filter((t) => t.id !== id)
  return writeTargetsToDb(updated)
}

export function updateTargetInDb(id: string, updates: Partial<CrawlTarget>): CrawlTarget | null {
  const current = readTargetsFromDb()
  const idx = current.findIndex((t) => t.id === id)
  if (idx === -1) return null
  const updatedItem = { ...current[idx], ...updates }
  current[idx] = updatedItem
  writeTargetsToDb(current)
  return updatedItem
}
