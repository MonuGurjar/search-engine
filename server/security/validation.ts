export interface ValidatedSearchParams {
  query: string
  category?: string
  page: number
  limit: number
}

export interface ValidatedSuggestParams {
  query: string
  limit: number
}

const ALLOWED_CATEGORIES = new Set([
  "all",
  "web",
  "images",
  "videos",
  "news",
  "social",
  "academic",
  "code",
  "tools",
  "tech",
  "general",
])

const MAX_QUERY_LENGTH = 300
const MAX_LIMIT = 100
const DEFAULT_LIMIT = 20

/**
 * Validates and sanitizes parameters for search queries.
 */
export function validateSearchParams(
  input: any,
): {
  success: boolean
  data?: ValidatedSearchParams
  error?: string
} {
  if (!input || typeof input !== "object") {
    return { success: false, error: "Invalid request payload: expected object" }
  }

  const rawQuery = input.q ?? input.query ?? ""
  if (typeof rawQuery !== "string") {
    return { success: false, error: "Invalid query: expected string" }
  }

  const query = rawQuery.trim().slice(0, MAX_QUERY_LENGTH)

  // Validate category/mode
  let category: string | undefined = undefined
  const rawCat = input.category ?? input.mode
  if (typeof rawCat === "string" && rawCat.trim()) {
    const cleanCat = rawCat.trim().toLowerCase()
    if (ALLOWED_CATEGORIES.has(cleanCat)) {
      category = cleanCat === "all" || cleanCat === "web" ? undefined : cleanCat
    } else {
      // Allow custom categories if alphanumeric, up to 30 chars
      if (/^[a-zA-Z0-9_-]{1,30}$/.test(cleanCat)) {
        category = cleanCat
      }
    }
  }

  // Validate pagination
  let page = 1
  const rawPage = input.page
  if (rawPage !== undefined && rawPage !== null) {
    const parsedPage =
      typeof rawPage === "number" ? rawPage : parseInt(String(rawPage), 10)
    if (!isNaN(parsedPage) && parsedPage >= 1 && parsedPage <= 1000) {
      page = Math.floor(parsedPage)
    }
  }

  // Validate limit/size
  let limit = DEFAULT_LIMIT
  const rawLimit = input.limit ?? input.size
  if (rawLimit !== undefined && rawLimit !== null) {
    const parsedLimit =
      typeof rawLimit === "number" ? rawLimit : parseInt(String(rawLimit), 10)
    if (!isNaN(parsedLimit) && parsedLimit >= 1) {
      limit = Math.min(MAX_LIMIT, Math.floor(parsedLimit))
    }
  }

  return {
    success: true,
    data: {
      query,
      category,
      page,
      limit,
    },
  }
}

/**
 * Validates and sanitizes parameters for autocomplete suggestions.
 */
export function validateSuggestParams(
  input: any,
): {
  success: boolean
  data?: ValidatedSuggestParams
  error?: string
} {
  if (!input || typeof input !== "object") {
    return { success: false, error: "Invalid request payload" }
  }

  const rawQuery = input.q ?? input.query ?? ""
  if (typeof rawQuery !== "string") {
    return { success: false, error: "Invalid query" }
  }

  const query = rawQuery.trim().slice(0, 100)
  let limit = 6
  const rawLimit = input.limit ?? input.size
  if (rawLimit !== undefined && rawLimit !== null) {
    const parsed =
      typeof rawLimit === "number" ? rawLimit : parseInt(String(rawLimit), 10)
    if (!isNaN(parsed) && parsed >= 1) {
      limit = Math.min(10, Math.floor(parsed))
    }
  }

  return {
    success: true,
    data: {
      query,
      limit,
    },
  }
}
