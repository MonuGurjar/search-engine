import fs from 'node:fs'
import path from 'node:path'
import { isUrlExcluded } from './scope-profiles.ts'

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

const INDEX_FILE = path.resolve(import.meta.dirname, './data/indexed-db.json')

export function normalizeUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return ''
  let target = rawUrl.trim()
  if (!target.startsWith('http://') && !target.startsWith('https://')) {
    target = 'https://' + target
  }

  try {
    const parsed = new URL(target)
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, '')
    parsed.hash = ''

    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'fbclid', 'gclid']
    for (const p of trackingParams) {
      parsed.searchParams.delete(p)
    }

    if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.slice(0, -1)
    }

    return parsed.toString()
  } catch {
    return target.replace(/\/+$/, '')
  }
}

export function readIndexedFromDb(): IndexedDocument[] {
  try {
    if (fs.existsSync(INDEX_FILE)) {
      const data = fs.readFileSync(INDEX_FILE, 'utf-8')
      const parsed: IndexedDocument[] = JSON.parse(data || '[]')
      return cleanDuplicates(parsed)
    }
  } catch (err) {
    console.error('Failed to read indexed-db.json:', err)
  }
  return []
}

function cleanDuplicates(docs: IndexedDocument[]): IndexedDocument[] {
  const seen = new Set<string>()
  const cleaned: IndexedDocument[] = []

  for (const doc of docs) {
    const norm = normalizeUrl(doc.url)
    // Strictly filter out any excluded URLs (/api, /docs, /blog, /login, /search, etc.)
    if (isUrlExcluded(norm).excluded) {
      continue
    }

    if (!seen.has(norm)) {
      seen.add(norm)
      cleaned.push({
        ...doc,
        url: norm,
      })
    }
  }

  if (cleaned.length !== docs.length) {
    writeIndexedToDb(cleaned)
  }

  return cleaned
}

export function writeIndexedToDb(docs: IndexedDocument[]): boolean {
  try {
    const dir = path.dirname(INDEX_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(INDEX_FILE, JSON.stringify(docs, null, 2), 'utf-8')
    return true
  } catch (err) {
    console.error('Failed to write indexed-db.json:', err)
    return false
  }
}

export function isUrlIndexed(rawUrl: string): boolean {
  const targetNorm = normalizeUrl(rawUrl)
  if (isUrlExcluded(targetNorm).excluded) return false
  const current = readIndexedFromDb()
  return current.some((d) => normalizeUrl(d.url) === targetNorm)
}

export function addIndexedDocToDb(doc: IndexedDocument): { doc: IndexedDocument; isDuplicate: boolean; excluded?: boolean } {
  const normUrl = normalizeUrl(doc.url)
  // Check if URL matches default or custom exclusion rules
  const exclCheck = isUrlExcluded(normUrl)
  if (exclCheck.excluded) {
    return { doc, isDuplicate: true, excluded: true }
  }

  const current = readIndexedFromDb()
  const docWithNorm = { ...doc, url: normUrl }

  const existingIndex = current.findIndex(
    (d) => d.id === doc.id || normalizeUrl(d.url) === normUrl
  )

  if (existingIndex >= 0) {
    const existing = current[existingIndex]
    const updatedDoc: IndexedDocument = {
      ...docWithNorm,
      id: existing.id,
      indexedAt: doc.indexedAt || new Date().toISOString(),
    }
    current[existingIndex] = updatedDoc
    writeIndexedToDb(current)
    return { doc: updatedDoc, isDuplicate: true }
  }

  const updated = [docWithNorm, ...current]
  writeIndexedToDb(updated)
  return { doc: docWithNorm, isDuplicate: false }
}

export function deleteIndexedDocFromDb(id: string): boolean {
  const current = readIndexedFromDb()
  const updated = current.filter((d) => d.id !== id)
  return writeIndexedToDb(updated)
}
