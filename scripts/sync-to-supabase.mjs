import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'

const envPaths = [
  path.resolve(process.cwd(), 'crawler-dashboard/.env'),
  path.resolve(process.cwd(), '.env'),
]

const envVars = {}
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    const lines = fs.readFileSync(p, 'utf-8').split('\n')
    for (const l of lines) {
      const match = l.match(/^([A-Z0-9_]+)=(.*)$/)
      if (match) envVars[match[1]] = match[2].trim()
    }
  }
}

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  envVars['SUPABASE_URL'] ||
  process.env.VITE_SUPABASE_URL ||
  'https://wfptwjorlqtaizpngopk.supabase.co'

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  envVars['SUPABASE_SERVICE_ROLE_KEY'] ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  envVars['VITE_SUPABASE_ANON_KEY']

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

  const body = JSON.stringify(formatted)
  const parsedUrl = new URL(`${SUPABASE_URL}/rest/v1/indexed_pages?on_conflict=url`)

  const options = {
    hostname: parsedUrl.hostname,
    port: 443,
    path: parsedUrl.pathname + parsedUrl.search,
    method: 'POST',
    family: 4, // IPv4 fast resolve
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'resolution=merge-duplicates,return=minimal',
    },
  }

  const req = https.request(options, (res) => {
    let resData = ''
    res.on('data', (chunk) => (resData += chunk))
    res.on('end', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`Successfully synced ${formatted.length} documents to Supabase! (HTTP ${res.statusCode})`)
      } else {
        console.error(`Sync failed: HTTP ${res.statusCode}: ${resData}`)
      }
    })
  })

  req.on('error', (e) => {
    console.error('Request error:', e.message)
  })

  req.write(body)
  req.end()
}

sync()
