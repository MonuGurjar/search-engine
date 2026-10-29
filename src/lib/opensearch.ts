/**
 * VOID Search Client Library
 * Proxies requests through same-origin API endpoints (/api/search and /api/autocomplete).
 * ZERO database credentials or cluster endpoints exposed to the browser.
 */

import {
  search,
  getAutocomplete,
  type OpenSearchDocument,
  type OpenSearchResult,
} from "../services/search-client"

export type { OpenSearchDocument, OpenSearchResult }

/**
 * Searches the private VOID index via secure serverless endpoint.
 */
export async function searchOpenSearch(
  query: string,
  mode = "all",
  size = 12,
  signal?: AbortSignal,
  page = 1,
): Promise<OpenSearchResult> {
  return search(query, mode, size, signal, page)
}

/**
 * Fetches search autocomplete suggestions via secure serverless endpoint.
 */
export async function getAutocompleteSuggestions(
  query: string,
  signal?: AbortSignal,
): Promise<string[]> {
  return getAutocomplete(query, signal)
}
