import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import {
  analyzeTargetUrl,
  crawlAndIndexSingle,
  crawlWithChildLinks,
  crawlUnindexedTargets,
} from './server/crawler-service.ts'
import { PRESET_PROFILES } from './server/scope-profiles.ts'
import {
  readTargetsFromDb,
  addTargetToDb,
  deleteTargetFromDb,
  updateTargetInDb,
} from './server/targets-service.ts'
import {
  readIndexedFromDb,
  addIndexedDocToDb,
  deleteIndexedDocFromDb,
} from './server/indexed-service.ts'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Ensure GEMINI_API_KEY is available in process.env for the server service
  if (env.GEMINI_API_KEY) {
    process.env.GEMINI_API_KEY = env.GEMINI_API_KEY
  }

  const port = parseInt(env.PORT || '3001')

  return {
    plugins: [
      react(),
      tailwindcss(),
      crawlerApiPlugin(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    server: {
      port,
      host: '0.0.0.0',
      strictPort: false,
    },
    preview: {
      port,
      host: '0.0.0.0',
    },
  }
})

function crawlerApiPlugin(): Plugin {
  return {
    name: 'void-crawler-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || ''

        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        // GET /api/crawler/indexed
        if (url.startsWith('/api/crawler/indexed') && req.method === 'GET') {
          const docs = readIndexedFromDb()
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(docs))
          return
        }

        // POST /api/crawler/indexed
        if (url === '/api/crawler/indexed' && req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => { body += chunk })
          req.on('end', () => {
            try {
              const doc = JSON.parse(body || '{}')
              const created = addIndexedDocToDb(doc)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(created))
            } catch (err: any) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err.message }))
            }
          })
          return
        }

        // DELETE /api/crawler/indexed
        if (url.startsWith('/api/crawler/indexed') && req.method === 'DELETE') {
          let id = new URL(req.url || '', 'http://localhost').searchParams.get('id')
          if (id) {
            deleteIndexedDocFromDb(id)
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true, id }))
          } else {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Missing id' }))
          }
          return
        }

        // GET /api/crawler/health
        if (url === '/api/crawler/health' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              status: 'operational',
              crawlerStatus: 'running',
              activeWorkers: 8,
              geminiConfigured: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5),
              geminiModel: 'gemini-1.5-flash',
              timestamp: new Date().toISOString(),
            })
          )
          return
        }

        // GET /api/crawler/profiles
        if (url === '/api/crawler/profiles' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(PRESET_PROFILES))
          return
        }

        // GET /api/crawler/targets
        if (url.startsWith('/api/crawler/targets') && req.method === 'GET') {
          const targets = readTargetsFromDb()
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(targets))
          return
        }

        // POST /api/crawler/targets
        if (url === '/api/crawler/targets' && req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '{}')
              if (!data.url) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Missing target URL' }))
                return
              }
              const created = addTargetToDb(data)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(created))
            } catch (err: any) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err.message }))
            }
          })
          return
        }

        // DELETE /api/crawler/targets
        if (url.startsWith('/api/crawler/targets') && req.method === 'DELETE') {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })
          req.on('end', () => {
            try {
              let id = new URL(req.url || '', 'http://localhost').searchParams.get('id')
              if (!id && body) {
                const parsed = JSON.parse(body)
                id = parsed.id
              }
              if (id) {
                deleteTargetFromDb(id)
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true, id }))
              } else {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Missing target id' }))
              }
            } catch (err: any) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err.message }))
            }
          })
          return
        }

        // PUT /api/crawler/targets
        if (url.startsWith('/api/crawler/targets') && req.method === 'PUT') {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '{}')
              if (!data.id) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Missing target id' }))
                return
              }
              const updated = updateTargetInDb(data.id, data)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(updated))
            } catch (err: any) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err.message }))
            }
          })
          return
        }

        // POST /api/crawler/analyze
        if (url === '/api/crawler/analyze' && req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })

          req.on('end', async () => {
            try {
              const data = JSON.parse(body || '{}')
              const targetUrl = data.url
              const profileId = data.profileId || 'tech-docs'
              const customScope = data.customScope

              if (!targetUrl || typeof targetUrl !== 'string') {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Missing or invalid "url" parameter.' }))
                return
              }

              const result = await analyzeTargetUrl(targetUrl, profileId, customScope)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(result))
            } catch (err: any) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err.message || 'Crawler analysis failed.' }))
            }
          })
          return
        }

        // POST /api/crawler/add-and-crawl
        if (url === '/api/crawler/add-and-crawl' && req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => { body += chunk })
          req.on('end', async () => {
            try {
              const data = JSON.parse(body || '{}')
              const targetUrl = data.url
              const crawlChildLinks = Boolean(data.crawlChildLinks)
              const profileId = data.profileId || 'tech-docs'

              if (!targetUrl || typeof targetUrl !== 'string') {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Missing target URL' }))
                return
              }

              const cleanUrl = targetUrl.trim()
              const domain = new URL(cleanUrl.startsWith('http') ? cleanUrl : 'https://' + cleanUrl).hostname.replace(/^www\./, '')
              
              // Register target in targets DB (auto-deduped)
              addTargetToDb({
                url: cleanUrl,
                domain,
                name: data.name || `${domain} Target`,
                scopeType: 'path-prefix',
                maxDepth: 3,
                crawlDelayMs: 250,
                includedPathPatterns: ['/**'],
                excludedPaths: ['/login', '/auth/*'],
                contentFilter: {
                  extractCodeBlocks: true,
                  extractHeadings: true,
                  extractLinks: true,
                  extractImages: false,
                  extractPdfs: false,
                },
                geminiDirective: 'Extract main topics and write clear search snippet.',
                status: 'Active',
              })

              let rootDoc: any
              let childDocs: any[] = []
              let isDuplicate = false
              let skippedCount = 0

              if (crawlChildLinks) {
                const result = await crawlWithChildLinks(cleanUrl, profileId, 35)
                rootDoc = result.rootDoc
                childDocs = result.childDocs
                skippedCount = result.skippedCount
              } else {
                const result = await crawlAndIndexSingle(cleanUrl, profileId, false)
                rootDoc = result.doc
                isDuplicate = result.isDuplicate
                if (isDuplicate) skippedCount = 1
              }

              const allIndexed = readIndexedFromDb()
              res.setHeader('Content-Type', 'application/json')
              res.end(
                JSON.stringify({
                  success: true,
                  rootDoc,
                  childDocs,
                  isDuplicate,
                  skippedCount,
                  totalIndexedCount: allIndexed.length,
                  allIndexed,
                })
              )
            } catch (err: any) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err.message || 'Crawl failed' }))
            }
          })
          return
        }

        // POST /api/crawler/crawl-unindexed
        if (url === '/api/crawler/crawl-unindexed' && req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => { body += chunk })
          req.on('end', async () => {
            try {
              const targets = readTargetsFromDb()
              const result = await crawlUnindexedTargets(targets)
              const allIndexed = readIndexedFromDb()
              res.setHeader('Content-Type', 'application/json')
              res.end(
                JSON.stringify({
                  success: true,
                  crawledCount: result.crawledDocs.length,
                  crawledDocs: result.crawledDocs,
                  skippedCount: result.skippedCount,
                  totalIndexedCount: allIndexed.length,
                  allIndexed,
                })
              )
            } catch (err: any) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err.message || 'Failed to crawl unindexed targets' }))
            }
          })
          return
        }

        next()
      })
    },
  }
}
