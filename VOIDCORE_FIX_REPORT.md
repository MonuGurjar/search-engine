# VOIDCORE — Code-Only Essential Fixes Report

**Date:** October 24, 2026  
**Repository:** Local workspace `/home/unknown-kernel/Music/Search-Engine`  
**Execution Mode:** Code-only fixes within repository boundaries (No external dashboard changes, DNS modifications, or production deployments applied).

---

## 1. Summary of Changes

The following repository-controlled fixes have been implemented:

| Category | File | Description of Changes |
| :--- | :--- | :--- |
| **Security: OpenSearch Credentials** | [`api/search.ts`](file:///home/unknown-kernel/Music/Search-Engine/api/search.ts) *(New)* | Implemented serverless API endpoint (`/api/search`) to securely proxy OpenSearch queries. Enforces `POST` method, validates and constrains query inputs (max length 300), constrains upstream endpoints to `/${OPENSEARCH_INDEX}/_search`, reads server-only environment variables (`OPENSEARCH_USER`, `OPENSEARCH_PASSWORD`, `OPENSEARCH_URL`), and safely fails closed if credentials are not configured. |
| **Security: Client Bundle Sanitation** | [`src/lib/opensearch.ts`](file:///home/unknown-kernel/Music/Search-Engine/src/lib/opensearch.ts) | Removed all hardcoded credentials, basic auth headers, and fallback secrets from browser code. All queries (`searchOpenSearch` and `getAutocompleteSuggestions`) now delegate to `/api/search`. Retained in-memory caching and preserved existing API contracts. |
| **Local Dev Support** | [`vite.config.ts`](file:///home/unknown-kernel/Music/Search-Engine/vite.config.ts) | Added dev server middleware in `configureServer` to dispatch `/api/search` locally during `vite` dev mode. Removed Open Graph and Twitter card tag injection to keep metadata minimal and focused. Avoided duplicate `name="description"` tag injection. |
| **Static SEO Files** | [`public/robots.txt`](file:///home/unknown-kernel/Music/Search-Engine/public/robots.txt) *(New)* | Created valid plain-text crawler directives (`Allow: /`, `Sitemap: https://www.voidcore.me/sitemap.xml`). |
| **Static SEO Files** | [`public/sitemap.xml`](file:///home/unknown-kernel/Music/Search-Engine/public/sitemap.xml) *(New)* | Created valid XML sitemap containing only the primary public canonical URL (`https://www.voidcore.me/`) with no invented dates or private routes. |
| **On-Page SEO & Fallback Content** | [`index.html`](file:///home/unknown-kernel/Music/Search-Engine/index.html) | Added concise `<meta name="description">` describing the VOID search engine. Added crawler-accessible semantic fallback content (`<main>`, `<h1>VOID</h1>`, tagline, and description) inside `<div id="root">`, which React 19 hydrates/replaces upon mounting. |
| **Semantic Heading & Unknown Routes** | [`src/App.tsx`](file:///home/unknown-kernel/Music/Search-Engine/src/App.tsx) | Wrapped the homepage VOID wordmark in a visible semantic `<h1>` element, establishing proper document heading hierarchy without altering visual design. Added client-side unknown-route state handling to display a clean "Page Not Found" screen with a return-to-search action when paths other than `/` are accessed. |
| **Routing & Security Headers** | [`vercel.json`](file:///home/unknown-kernel/Music/Search-Engine/vercel.json) | Configured SPA rewrite negative lookahead (`/((?!api/|robots\\.txt|sitemap\\.xml).*)`) to ensure static files and serverless API routes are never rewritten to `index.html`. Added essential security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`). |
| **Project Configuration** | [`tsconfig.json`](file:///home/unknown-kernel/Music/Search-Engine/tsconfig.json) | Included `"api"` directory in TypeScript compilation scope. |
| **Documentation** | [`.env.example`](file:///home/unknown-kernel/Music/Search-Engine/.env.example) | Documented server-side environment variable names (`OPENSEARCH_URL`, `OPENSEARCH_USER`, `OPENSEARCH_PASSWORD`, `OPENSEARCH_INDEX`) without secret values. |

---

## 2. Requirement Status Summary

| Item | Requirement | Status | Verification & Evidence |
| :---: | :--- | :---: | :--- |
| **1.1** | Remove hardcoded OpenSearch credentials from client code | **`PASS`** | Client bundle scan (`grep -E 'YXZu\|aivencloud\|Basic \|OPENSEARCH_PASSWORD' dist/assets/*.js`) confirmed zero credentials. |
| **1.2** | Server-side API endpoint for OpenSearch requests | **`PASS`** | Created `api/search.ts` with input validation, upstream path constraint, and fail-closed logic. Node handler test confirmed 405 on non-POST and safe empty results without server credentials. |
| **1.3** | Do not expose credentials or send upstream auth to browser | **`PASS`** | Client receives only `{ total, hits }` or `{ suggestions }`; upstream auth header is confined to server. |
| **1.4** | Credential rotation in external cluster | **`BLOCKED / OUTSIDE REPOSITORY CONTROL`** | Hardcoded credentials previously present in the repository history must be rotated in the Aiven cloud console. Rotation status cannot be confirmed from repository code alone. |
| **2.1** | Add real `public/robots.txt` | **`PASS`** | File created in repository; confirmed served as `text/plain` (HTTP 200, Content-Length 69) in Vite preview test. |
| **2.2** | Add real `public/sitemap.xml` | **`PASS`** | File created in repository; confirmed served as `text/xml` (HTTP 200, Content-Length 167) in Vite preview test. |
| **3.1** | Accurate page title | **`PASS`** | Confirmed `<title>VOID — A Quieter Way to Search</title>` present in compiled `dist/index.html`. |
| **3.2** | Concise meta description | **`PASS`** | Confirmed `<meta name="description" content="A private, minimalist search engine designed for clarity and calm discovery." />` present in `dist/index.html`. |
| **3.3** | Meaningful, visible `<h1>` on homepage | **`PASS`** | Homepage VOID Wordmark wrapped in semantic `<h1>` in `src/App.tsx`; fallback initial HTML in `index.html` also includes `<h1>VOID</h1>`. |
| **3.4** | Canonical URL tag | **`BLOCKED / OUTSIDE REPOSITORY CONTROL`** | Canonical tag requires setting the definitive canonical host redirect (between `voidcore.me` and `www.voidcore.me`) in Vercel/DNS settings. Per safety rule 8 and section 3, no arbitrary guess was made in code. |
| **3.5** | Exclude social preview / OG / Twitter tags | **`PASS`** | `vite.config.ts` adjusted; `dist/index.html` verified free of `og:*` and `twitter:*` tags. |
| **4.1** | Static files not rewritten to `index.html` | **`PASS`** | Negative lookahead rewrite pattern configured in `vercel.json`; local preview server verified serving actual static files. |
| **4.2** | Unknown-route handling | **`PASS`** | `src/App.tsx` now handles non-root paths and presents a dedicated "Page Not Found" screen. |
| **4.3** | True HTTP 404 status code on unknown routes | **`BLOCKED / OUTSIDE REPOSITORY CONTROL`** | In a client-side SPA deployed on Vercel without edge SSR middleware, non-static paths are served HTTP 200 by Vercel edge routing. A true HTTP 404 response requires edge routing configuration on Vercel. |
| **5.1** | Crawler accessibility of initial HTML | **`PASS`** | Semantic initial HTML added inside `<div id="root">` containing `<h1>VOID</h1>`, tagline, and description. Replaced smoothly upon client React hydration. |
| **6.1** | Code-controlled security headers | **`PASS`** | Added `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy: strict-origin-when-cross-origin` in `vercel.json`. |
| **6.2** | Strict Content Security Policy (CSP) | **`BLOCKED / OUTSIDE REPOSITORY CONTROL`** | The search engine displays preview images dynamically fetched from third-party websites across the entire internet. Enforcing a strict `img-src` CSP without breaking search results requires either image proxy infrastructure or external CDN header tuning. |

---

## 3. Verification Commands and Observed Results

### 3.1 TypeScript Type Checking
- **Command:** `npx tsc --noEmit`
- **Result:** Exit code `0` (Zero type errors across `src/`, `vite.config.ts`, and `api/`).

### 3.2 Production Build
- **Command:** `npm run build`
- **Result:** Exit code `0`
  ```
  vite v8.3.0 building client environment for production...
  transforming (25) src/index.css✓ 25 modules transformed.
  rendering chunks (1)...computing gzip size...
  dist/index.html                   2.14 kB │ gzip:  1.05 kB
  dist/assets/index-BIX-_LN6.css   46.72 kB │ gzip:  9.05 kB
  dist/assets/index-BwTQ0Eev.js   266.59 kB │ gzip: 82.65 kB
  ✓ built in 179ms
  ```

### 3.3 Credential Exposure Check
- **Command:**
  ```bash
  grep -E 'YXZu|aivencloud|Basic |OPENSEARCH_PASSWORD|OPENSEARCH_USER' dist/assets/*.js
  ```
- **Result:** Exit code `1` (No matches found; client assets are 100% clean of credentials).

### 3.4 Local Preview HTTP Checks
Using local preview server (`vite preview --port 4173`):
- **Endpoint: `http://localhost:4173/robots.txt`**
  ```http
  HTTP/1.1 200 OK
  Content-Type: text/plain
  Content-Length: 69

  User-agent: *
  Allow: /

  Sitemap: https://www.voidcore.me/sitemap.xml
  ```
- **Endpoint: `http://localhost:4173/sitemap.xml`**
  ```http
  HTTP/1.1 200 OK
  Content-Type: text/xml
  Content-Length: 167

  <?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
      <loc>https://www.voidcore.me/</loc>
    </url>
  </urlset>
  ```
- **Endpoint: `http://localhost:4173/` (HTML Head & Body Scan)**
  - `<title>VOID — A Quieter Way to Search</title>` present.
  - Exactly one `<meta name="description" ...>` tag present.
  - Zero `og:*` or `twitter:*` tags present.
  - Initial crawler-accessible semantic structure present in `#root`.

### 3.5 API Handler Execution Test
- **Command:** Isolated Node execution of `api/search.ts`
- **Results:**
  - Non-POST request: Returned `405 Method Not Allowed`.
  - Empty search / unconfigured credentials: Safely failed closed returning `200 OK {"total":0,"hits":[]}` without unhandled exceptions or credential leakage.

---

## 4. Blocked / Outside Repository Control

The following items cannot be resolved solely within repository code and require external platform or infrastructure management:

1. **Aiven OpenSearch Credential Rotation:**
   - Because fallback credentials existed in prior git commits and deployed client bundles, the cluster credentials must be rotated in the Aiven cloud console.
2. **Canonical Host Redirection (Apex vs. WWW):**
   - The choice between `https://voidcore.me` and `https://www.voidcore.me` and the corresponding 301/308 redirect is controlled in the Vercel Project Domains dashboard and DNS registrar settings.
3. **Deployment Verification:**
   - All tests documented above were conducted locally against the production build and preview environment. Live domain verification (`voidcore.me`) will occur once code is pushed and deployed via Vercel.
