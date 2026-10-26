import type { IncomingMessage, ServerResponse } from 'node:http'
import crawlerSearchHandler from './crawler/search.ts'
import searchHandler from './search.ts'

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const url = req.url || '/'
  const cleanPath = url.split('?')[0].replace(/^\/api\//, '').replace(/^\//, '')

  if (cleanPath.startsWith('crawler/search')) {
    return crawlerSearchHandler(req, res)
  }

  return searchHandler(req, res)
}
