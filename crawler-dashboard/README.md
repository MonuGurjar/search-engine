# VOID Crawler & Indexing Control Console

Internal engineering control dashboard for the VOID Search Engine infrastructure. This application is **completely decoupled and isolated** from the public VOID search interface.

---

## Key Features

1. **URL Scope & Profile Boundaries**:
   - 5 built-in presets: *Technical Documentation*, *Research & Academic Papers*, *Deep Web Explorer*, *Quick Seed Discovery*, and *Custom Scope Profile*.
   - Domain boundary enforcement, path prefixes (`/docs/**`), regex exclusions (`/login`, `*.zip`), crawl depth limits, and politeness delay.
   - Interactive live scope tester to evaluate any test URL against active rules before dispatch.

2. **Live URL Extraction & Deep Metadata Harvest**:
   - Resolves canonical URLs, HTTP status codes, latencies, and language detection.
   - Harvests page titles, meta descriptions, Open Graph cards (`og:title`, `og:image`, `og:description`), favicons, H1–H3 heading hierarchies, outbound links, and content keywords.

3. **Secure Server-Side Gemini AI Metadata Enrichment**:
   - Direct integration with Google Gemini Flash (`GEMINI_API_KEY` stored securely in backend `.env`).
   - Generates high-density executive summaries, detects content categories, extracts named entities (technologies, organizations, persons), and assigns suggested search query tags and ranking weights.
   - Resilient multi-model rotation with automatic fallback.

4. **Crawler & Worker Telemetry**:
   - 8-thread worker pool monitor tracking real-time states (`FETCH`, `PARSE`, `EXTRACT`, `GEMINI`, `IDLE`).
   - Real-time sliders for concurrency threads, per-domain rate limits, and socket timeouts.
   - `robots.txt` compliance selector and customizable user-agent header.

5. **Operational Infrastructure Views**:
   - **Overview**: KPI stat cards, target URL analyzer bar, 7-stage interactive pipeline graph, and live log stream.
   - **URL Queue**: Prioritized frontier table (`P0` to `P3`) with depth filters and manual seed enqueueing.
   - **Indexed Pages**: Searchable catalog of parsed and enriched documents committed to the inverted index.
   - **Domains**: Domain health telemetry, crawl delay politeness, SSL certificate validity, and cached `robots.txt`.
   - **Errors**: Dead-letter retry queue for HTTP 4xx/5xx responses, timeouts, and scope blocked requests.
   - **Scheduler**: Automated cron crawl routines for recurring sitemaps and preprint archive sweeps.
   - **Settings**: Live backend verification and model inference configuration.

---

## Local Development

```bash
# 1. Navigate to the dashboard directory
cd crawler-dashboard

# 2. Configure environment
# Ensure .env has your GEMINI_API_KEY:
# GEMINI_API_KEY=your_key_here
# PORT=3001

# 3. Start the dashboard
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

## Production Build

```bash
cd crawler-dashboard
npm run build
npm run preview
```
