/**
 * Aiven OpenSearch client for VOID Search Engine
 */

const OPENSEARCH_URL =
  import.meta.env.VITE_OPENSEARCH_URL ||
  'https://os-3c0470b3-voidcore.j.aivencloud.com:12170'

const OPENSEARCH_USER = import.meta.env.VITE_OPENSEARCH_USER || ''
const OPENSEARCH_PASSWORD = import.meta.env.VITE_OPENSEARCH_PASSWORD || ''
const OPENSEARCH_INDEX = import.meta.env.VITE_OPENSEARCH_INDEX || 'indexed_pages'

const authHeader =
  OPENSEARCH_USER && OPENSEARCH_PASSWORD
    ? 'Basic ' + btoa(`${OPENSEARCH_USER}:${OPENSEARCH_PASSWORD}`)
    : ''

export type OpenSearchDocument = {
  id?: string
  url: string
  title: string
  domain: string
  category?: string
  page_type?: string
  summary?: string
  topics?: string[]
  tags?: string[]
  indexed_at?: string
  preview_image?: string
  images?: string[]
  http_status?: number
}

export type OpenSearchResult = {
  total: number
  hits: OpenSearchDocument[]
}

/**
 * Search Aiven OpenSearch using multi-field fuzzy query and relevance scoring
 */
export async function searchOpenSearch(
  query: string,
  mode = 'all',
  size = 100,
  signal?: AbortSignal
): Promise<OpenSearchResult> {
  const cleanQuery = query.trim()
  if (!cleanQuery) {
    return { total: 0, hits: [] }
  }

  // Construct query body with field boosting & fuzzy fallback
  const mustClauses: any[] = [
    {
      multi_match: {
        query: cleanQuery,
        fields: [
          'title^3',
          'summary^2',
          'topics^1.5',
          'tags^1.5',
          'domain^1.2',
          'url',
        ],
        fuzziness: 'AUTO',
        operator: 'or',
      },
    },
  ]

  // Optional category/mode filtering if not 'all' or 'web'
  if (mode && mode !== 'all' && mode !== 'web' && mode !== 'tools') {
    mustClauses.push({
      bool: {
        should: [
          { match: { category: mode } },
          { match: { page_type: mode } },
          { match: { topics: mode } },
          { match: { tags: mode } },
        ],
        minimum_should_match: 1,
      },
    })
  }

  const searchBody = {
    size,
    query: {
      bool: {
        must: mustClauses,
      },
    },
    highlight: {
      fields: {
        summary: { number_of_fragments: 1, fragment_size: 150 },
        title: { number_of_fragments: 1 },
      },
    },
  }

  const endpoint = `${OPENSEARCH_URL}/${OPENSEARCH_INDEX}/_search`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (authHeader) {
    headers['Authorization'] = authHeader
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(searchBody),
    signal,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenSearch error ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  const total =
    typeof data.hits?.total === 'number'
      ? data.hits.total
      : data.hits?.total?.value || 0

  const hits: OpenSearchDocument[] = (data.hits?.hits || []).map((hit: any) => {
    const src = hit._source || {}
    return {
      ...src,
      id: hit._id || src.id,
    }
  })

  return { total, hits }
}
