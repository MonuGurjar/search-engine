# VOID Search — A Quieter Way to Search

<div align="center">

![VOID Search Wordmark](src/assets/void-singularity.png)

**A minimalist, privacy-first search engine powered by React 19, Vercel Serverless Functions, and Aiven OpenSearch with Okapi BM25 statistical relevance ranking.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19.0-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.0-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![OpenSearch](https://img.shields.io/badge/OpenSearch-BM25-005eb8?logo=opensearch&logoColor=white)](https://opensearch.org/)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel&logoColor=white)](https://voidcore.me)

[**Live Demo (voidcore.me)**](https://voidcore.me) • [**Privacy Policy**](https://voidcore.me/privacy) • [**Terms of Service**](https://voidcore.me/terms) • [**Report an Issue**](https://github.com/MonuGurjar/search-engine/issues)

</div>

---

## 🌌 Overview

**VOID Search** is engineered around a single premise: **search without surveillance**. 

Unlike conventional search platforms that monetize telemetry, create persistent advertising dossiers, and bounce users through redirect tracking proxies, VOID delivers instant, high-relevance web and image discovery through a hardened, zero-knowledge architecture.

All queries are executed server-side via same-origin Vercel edge functions communicating over TLS 1.3 with an enterprise **Aiven OpenSearch** cluster. Browser-side database clients, client-visible credentials, and third-party trackers are strictly prohibited.

---

## ✨ Key Features

### 🔍 1. Neural & Statistical BM25 Ranking
- **Multi-Field Boosted BM25**: Sophisticated relevance scoring weighted across content fields:
  - `title^3.5`
  - `keywords^2.5`
  - `description^2.0`
  - `headings^1.5`
  - `content^1.0`
- **Phrase Matching & Operator Parsing**: Native support for exact phrase matching (`"exact phrase"`), domain filtering (`site:github.com`), and term exclusions (`-unwanted`).
- **Sanitized Highlight Fragments**: Excerpt snippets highlighted with secure `<mark>` tags, fully sanitized against XSS vectors before DOM injection.

### 🖼️ 2. Google Images-Style Grid & Inspection Modal
- **Dynamic Image Wall**: Multi-column responsive grid (`grid-cols-2` to `grid-cols-6`) showcasing crawled web imagery.
- **Tracking Pixel Elimination**: Automated filtering of analytics beacons, 1x1 tracking pixels (e.g. `facebook.com/tr?`), and corrupt base64 splash images.
- **Inspection Modal**: High-resolution image preview with domain favicon badges, direct "Visit Page" origin button, "Open Image" external links, and full keyboard navigation (<kbd>←</kbd> / <kbd>→</kbd> / <kbd>Esc</kbd>).

### ⚡ 3. Instant Autocomplete & Search Tools
- **Prefix Autocomplete**: Fast, debounced query suggestions queried against OpenSearch prefix analyzers.
- **Local Search History**: Client-side recent search memory stored strictly inside the user's browser `localStorage`—never transmitted or stored upstream.
- **Search Operators & Filters**: Category switching across **All** and **Images**, with interactive "Coming Soon" pill badges and toasts for upcoming modes (**Videos**, **News**, **Maps**).

### 🛡️ 4. Zero-Tracking Privacy by Design
- **No Personal Profiling**: Client IPs are not logged or associated with search queries.
- **No Tracking Cookies**: Zero advertising cookies, tracking pixels, or cross-site fingerprinting beacons.
- **Direct Outbound Navigation**: Search result links point directly to destination publisher URLs without intermediary redirect tracking.
- **Secret Insulation**: Database credentials, cluster endpoints, and upstream authorization tokens are strictly kept server-side in serverless function environments.

### 🎨 5. Glassmorphic Arc & Minimalist Aesthetic
- **Atmospheric Visuals**: Minimalist dark and light colorways with subtle specular lighting, fluid animations, and custom scrollbars.
- **Custom Dialogs**: Clean, custom frosted glass dialogues for voice search support and AI copilot preview.
- **Mobile-First Layout**: Mobile search results feature right-aligned thumbnails with optimized typography for clean one-handed scanning.
- **Featured Apps & Creator Profile**: 9-dot Waffle launcher showcasing featured web apps ([Med Russia](https://med-russia.vercel.app), [Placement AI](https://ai-placement-preparation.vercel.app), [Portfolio](https://monugurjar.vercel.app)) and creator developer card ([@MonuGurjar](https://github.com/MonuGurjar)).

---

## 🏛️ System Architecture

```text
┌───────────────────────────────────────────────────────────────┐
│                      Client Browser                           │
│     React 19 + TypeScript + Vite 8 + Tailwind CSS v4          │
│               (https://voidcore.me)                           │
└──────────────────────────────┬────────────────────────────────┘
                               │ Same-Origin Requests
                               ▼
┌───────────────────────────────────────────────────────────────┐
│              Vercel Serverless Edge Gateway                   │
│                                                               │
│   ┌─────────────────────────────┐  ┌───────────────────────┐  │
│   │   GET /api/search           │  │ GET /api/autocomplete │  │
│   │   - Input Validation (Zod)  │  │ - Prefix Suggestions  │  │
│   │   - In-Memory Rate Limiting │  │ - Debounce & Bounds   │  │
│   │   - BM25 Payload Builder    │  │ - Safe JSON Responses │  │
│   └──────────────┬──────────────┘  └───────────┬───────────┘  │
└──────────────────┼─────────────────────────────┼──────────────┘
                   │ TLS 1.3 / Basic Auth        │
                   │ (Server-Only Secrets)       │
                   ▼                             ▼
┌───────────────────────────────────────────────────────────────┐
│               Aiven OpenSearch Distributed Cluster            │
│                 Index: indexed_pages                          │
│     Okapi BM25 Ranking • Multi-Field Match • Phrase Boost     │
└───────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```text
Search-Engine/
├── api/                             # Serverless API Endpoints (Vercel Functions)
│   ├── search.ts                    # Primary search endpoint (GET/POST /api/search)
│   ├── autocomplete.ts              # Fast prefix suggestions (GET /api/autocomplete)
│   └── crawler/                     # Crawler webhook and administrative search routes
├── src/                             # Frontend React 19 Application
│   ├── assets/                      # Compressed WebP / PNG brand and app icons
│   ├── components/
│   │   ├── CustomDialog.tsx         # Reusable frosted glass modal dialog
│   │   ├── Footer.tsx               # Minimalist footer with legal triggers
│   │   ├── Header.tsx               # Header, theme toggle, and Waffle app launcher
│   │   ├── ModePills.tsx            # Search mode pills with "Coming Soon" tooltips
│   │   ├── PrivacyTermsModal.tsx    # Glossy deep-linkable privacy & terms modal
│   │   ├── Results.tsx              # Web search results & Google Images wall
│   │   ├── SearchBar.tsx            # Autocomplete search input & voice search
│   │   └── Wordmark.tsx             # Semantic VOID brand logo
│   ├── lib/                         # Client utilities & sanitizers
│   │   ├── opensearch.ts            # Client search caller (/api/search)
│   │   └── sanitizer.ts             # Safe URL protocol & HTML highlight sanitizer
│   ├── services/
│   │   └── search-client.ts         # Centralized frontend API client
│   ├── App.tsx                      # Root component, routing, & error boundary
│   ├── index.css                    # Tailwind CSS v4 styling & typography
│   └── main.tsx                     # Entrypoint
├── server/                          # Server-Side Core Modules
│   ├── opensearch-service.ts        # OpenSearch BM25 query construction & execution
│   └── security/
│       ├── rate-limiter.ts          # In-memory IP-based rate limiter
│       ├── url-sanitizer.ts         # SSRF & unsafe protocol validation
│       └── validation.ts            # Runtime input schema bounds
├── tests/                           # Native Node.js Test Suite
│   └── search_pipeline.test.mjs     # 13 integration & security audit tests
├── package.json                     # Project scripts & dependencies
├── tsconfig.json                    # TypeScript strict compiler configuration
├── vercel.json                      # Vercel routing, caching, and security headers
└── vite.config.ts                   # Vite bundler configuration
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v20.x` or higher (Node 22 recommended)
- **Package Manager**: `npm` or `pnpm`
- **Aiven OpenSearch**: A running OpenSearch instance with an `indexed_pages` index.

### 1. Clone & Install

```bash
git clone https://github.com/MonuGurjar/search-engine.git
cd search-engine
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root based on `.env.example`:

```bash
cp .env.example .env
```

Fill in your server-side OpenSearch credentials:

```ini
# Server-Only Variables (Never prefixed with VITE_)
OPENSEARCH_URL=https://your-opensearch-cluster.aivencloud.com:12170
OPENSEARCH_USER=avnadmin
OPENSEARCH_PASSWORD=your_secure_password
OPENSEARCH_INDEX=indexed_pages

# Public / Client-Safe Variables
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

> [!IMPORTANT]
> Never prefix database credentials with `VITE_`. Vite strictly bundles any `VITE_*` variable into public client-side JavaScript.

### 3. Run Development Server

```bash
npm run dev
```

The Vite dev server will start at `http://localhost:5173` (or configured port).

### 4. Run Test Suite

Run the full end-to-end and security test suite against live OpenSearch services:

```bash
npm test
```

Tests include query operator parsing, BM25 weight verification, rate-limiting enforcement, HTML sanitization, and production bundle secret audits.

### 5. Build for Production

```bash
npm run build
```

This compiles optimized client bundles into `dist/` with gzip asset summaries.

---

## 📡 API Reference

### `GET /api/search`
Executes a multi-field BM25 search query against OpenSearch.

**Query Parameters:**
| Parameter | Type | Default | Description |
|:---|:---|:---|:---|
| `q` | `string` | *(required)* | Search query string (supports `site:`, `""`, `-term`) |
| `mode` | `string` | `all` | Category filter (`all`, `images`, `web`) |
| `page` | `number` | `1` | Page number for pagination |
| `limit` | `number` | `10` | Number of results per page (capped at `100`) |

**Example Response:**
```json
{
  "results": [
    {
      "id": "doc_12345",
      "title": "Example Page Title",
      "url": "https://example.com/page",
      "domain": "example.com",
      "description": "Page excerpt snippet...",
      "highlightSnippet": "Page <mark>excerpt</mark> snippet...",
      "previewImage": "https://example.com/image.webp",
      "score": 42.8
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 10,
  "latencyMs": 38
}
```

### `GET /api/autocomplete`
Retrieves debounced query completion suggestions.

**Query Parameters:**
- `q`: Search prefix (min: 1 character, max: 200 characters)
- `limit`: Number of suggestions (default: `5`, max: `20`)

---

## 🔒 Security & Reliability Controls

- **Zero Client-Side Credentials**: Direct browser-to-database requests are completely eliminated. All database communication occurs strictly via serverless functions.
- **SSRF Defenses**: Crawler and URL validation safeguards defend against private, link-local, loopback, IPv4-mapped IPv6, and DNS rebinding attacks.
- **XSS & Protocol Sanitization**: All outbound links are validated against an allowlist of safe schemes (`http:`, `https:`). Highlighting snippets are escaped while strictly whitelisting `<mark>` tags.
- **Rate Limiting**: Automated IP rate limiting protects serverless endpoints against automated flood and denial-of-service abuse.
- **Security Headers**: Production deployments enforce strict HTTP headers via `vercel.json`:
  - `Content-Security-Policy`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`

---

## 🚢 Deployment to Vercel

The project is pre-configured for one-click deployment on **Vercel**:

1. Push your changes to GitHub:
   ```bash
   git push origin main
   ```
2. Import the repository in the [Vercel Dashboard](https://vercel.com/new).
3. In **Settings > Environment Variables**, add:
   - `OPENSEARCH_URL`
   - `OPENSEARCH_USER`
   - `OPENSEARCH_PASSWORD`
   - `OPENSEARCH_INDEX`
4. Deploy! Vercel automatically builds the Vite frontend and deploys serverless functions in `api/`.

---

## 👤 Author

**Monu Gurjar**
- Website: [monugurjar.vercel.app](https://monugurjar.vercel.app)
- GitHub: [@MonuGurjar](https://github.com/MonuGurjar)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
