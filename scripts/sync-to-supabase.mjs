import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://wfptwjorlqtaizpngopk.supabase.co'
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ClqHllu2_8R_DxCkdzOAgg_uPltwH5h'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const DB_PATH = path.resolve(process.cwd(), 'crawler-dashboard/server/data/indexed-db.json')

async function sync() {
  if (!fs.existsSync(DB_PATH)) {
    console.error('No indexed-db.json found at:', DB_PATH)
    return
  }

  const raw = fs.readFileSync(DB_PATH, 'utf-8')
  const docs = JSON.parse(raw || '[]')

  console.log(`Found ${docs.length} local documents to sync to Supabase...`)

  const formatted = docs.map((d) => ({
    id: d.id,
    url: d.url,
    domain: d.domain,
    title: d.title || '',
    category: d.category || '',
    page_type: d.pageType || 'WebPage',
    summary: d.summary || '',
    topics: d.topics || [],
    tags: d.tags || [],
    http_status: d.httpStatus || 200,
    indexed_at: d.indexedAt || new Date().toISOString(),
  }))

  const { data, error } = await supabase
    .from('indexed_pages')
    .upsert(formatted, { onConflict: 'url' })

  if (error) {
    console.error('Sync failed:', error.message)
    console.log('Tip: Ensure you have created the "indexed_pages" table and added insert permissions in Supabase SQL editor.')
  } else {
    console.log(`Successfully synced ${formatted.length} documents to Supabase!`)
  }
}

sync()
