/**
 * Legacy entry point for server/opensearch-service.
 * Re-exports from modular server architecture:
 * - server/opensearch/client.ts
 * - server/opensearch/search-service.ts
 * - server/opensearch/autocomplete-service.ts
 */

export * from "./opensearch/client.ts"
export * from "./opensearch/search-service.ts"
export * from "./opensearch/autocomplete-service.ts"
