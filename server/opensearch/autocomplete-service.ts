import { executeOpenSearchQuery } from "./client.ts"

/**
 * Autocomplete prefix matching for search bar suggestions.
 * Queries title, topics, headings, and domain with prefix expansions.
 */
export async function getAutocompleteSuggestions(
  query: string,
  limit = 5,
): Promise<string[]> {
  const clean = (query || "").trim().slice(0, 100)
  if (!clean || clean.length < 2) return []

  const suggestBody = {
    size: Math.min(10, Math.max(1, limit + 2)),
    _source: ["title", "topics", "headings", "domain"],
    query: {
      bool: {
        should: [
          {
            match_phrase_prefix: {
              title: { query: clean, max_expansions: 10 },
            },
          },
          { prefix: { domain: clean.toLowerCase() } },
          { match_phrase_prefix: { topics: { query: clean } } },
          { match_phrase_prefix: { headings: { query: clean } } },
        ],
      },
    },
  }

  try {
    const json = await executeOpenSearchQuery("/_search", suggestBody, 5000)
    const suggestionsSet = new Set<string>()

    for (const hit of json.hits?.hits || []) {
      const src = hit._source || {}
      if (src.title && src.title.toLowerCase().includes(clean.toLowerCase())) {
        suggestionsSet.add(src.title.trim())
      }
      if (Array.isArray(src.topics)) {
        for (const t of src.topics) {
          if (t && t.toLowerCase().includes(clean.toLowerCase())) {
            suggestionsSet.add(t.trim())
          }
        }
      }
      if (Array.isArray(src.headings)) {
        for (const h of src.headings) {
          if (h && h.toLowerCase().includes(clean.toLowerCase())) {
            suggestionsSet.add(h.trim())
          }
        }
      }
    }

    return Array.from(suggestionsSet).slice(0, limit)
  } catch (err: any) {
    console.error("[OpenSearch Autocomplete] Suggestion error:", err.message)
    return []
  }
}
