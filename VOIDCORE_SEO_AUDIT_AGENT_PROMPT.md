# VoidCore Website SEO & Indexing Audit — Agent Instructions

## Objective

Audit the existing `voidcore.me` website and repository to determine what SEO, crawling, indexing, metadata, and technical website essentials are **already implemented, missing, broken, or uncertain**.

**This is an audit-first task. Do not make changes during the initial audit.** Inspect the codebase and deployed website, gather evidence, and produce a clear report. Do not assume a feature exists merely because it is typical for the framework.

## Target

- Primary domain: `https://www.voidcore.me`
- Also inspect: `https://voidcore.me`
- Search Console: domain ownership has already been verified by the site owner.
- Sitemap status: unknown; investigate rather than assume.
- Hosting may be Vercel, but verify this from the repository/configuration.
- Framework is unknown. Detect it from the repository before making framework-specific recommendations.

## Rules

1. Start by identifying the framework, build system, routing approach, deployment platform, and repository structure.
2. Audit both source code and the deployed site where network access is available.
3. Do not expose, copy into the report, or modify secrets, API keys, credentials, tokens, private environment variables, or personal data.
4. Do not make production changes, deploy, install packages, delete files, or alter DNS during the audit.
5. Do not add a sitemap, metadata, robots rules, redirects, or structured data until the audit report is complete and approved.
6. Distinguish **PASS**, **FAIL**, **WARNING**, **NOT APPLICABLE**, and **UNVERIFIED**:
   - **PASS**: directly verified with evidence.
   - **FAIL**: evidence confirms the item is missing, incorrect, or broken.
   - **WARNING**: a potential issue or improvement that needs context.
   - **NOT APPLICABLE**: does not apply to this site.
   - **UNVERIFIED**: could not reliably check.
7. For every finding, provide evidence: file path and relevant line/configuration, URL and observed response, or command and concise result. Never claim something was tested if it was not.
8. Do not treat a browser error, network restriction, or temporary failure as proof that a file or endpoint does not exist. Mark it UNVERIFIED and describe the limitation.
9. Do not use `site:domain` search results as definitive proof of indexing status.
10. Keep the existing architecture and coding conventions in mind. Recommend the smallest safe fix; do not rewrite the site or change frameworks.

---

## Audit checklist

### A. Discovery and project structure

- [ ] Identify framework and version from package/config files.
- [ ] Identify package manager and lockfile.
- [ ] Identify build, development, and test commands.
- [ ] Identify routes/pages and whether they are statically generated, server-rendered, or client-rendered.
- [ ] Identify deployment platform and domain configuration from available project files.
- [ ] Identify whether a `public/` or static-assets directory exists.
- [ ] Identify existing SEO packages, plugins, or metadata utilities.
- [ ] Note any build warnings or existing tests relevant to routing/metadata.

### B. Sitemap

Check all relevant possibilities; do not assume only one filename is valid.

Deployed URLs to test:
- `https://www.voidcore.me/sitemap.xml`
- `https://voidcore.me/sitemap.xml`
- `https://www.voidcore.me/sitemap_index.xml`
- `https://voidcore.me/sitemap_index.xml`
- `https://www.voidcore.me/robots.txt`
- `https://voidcore.me/robots.txt`

Repository checks:
- Search for `sitemap.xml`, `sitemap_index.xml`, `sitemap`, `Sitemap`, sitemap generators, and sitemap-related framework conventions.
- Check static/public files, route handlers, build scripts, dependencies, and deployment configuration.
- If Next.js is detected, inspect `app/sitemap.ts`, `app/sitemap.xml/route.ts`, or equivalent Pages Router implementation.
- If Vite/React or another SPA is detected, inspect whether a sitemap is present in the public directory or generated during build.
- Check whether the sitemap contains only canonical, public, indexable URLs.
- Check that URLs use the preferred HTTPS hostname consistently.
- Check XML validity, response status/content type, absolute URLs, duplicate URLs, and accidental inclusion of development, private, authentication, admin, or query-parameter URLs.
- Check whether the sitemap's URLs return successful responses and whether they are canonical.
- If the sitemap is absent, report that as a finding; do not create it during this audit.

### C. robots.txt and crawl directives

- [ ] Check `robots.txt` on both hostnames and note redirects/status.
- [ ] Check whether it accidentally blocks important pages, CSS, JavaScript, or assets needed for rendering.
- [ ] Check whether it declares the correct sitemap URL.
- [ ] Search source and rendered HTML for `noindex`, `nofollow`, `X-Robots-Tag`, and framework-specific robots metadata.
- [ ] Verify whether important pages are unintentionally blocked from indexing.
- [ ] Do not recommend blocking a page in `robots.txt` as a substitute for a `noindex` directive when the goal is to keep a crawlable page out of search results.
- [ ] Do not change any crawl rules during the audit.

### D. Domain, HTTPS, redirects, and canonicalization

Test both:
- `http://voidcore.me`
- `http://www.voidcore.me`
- `https://voidcore.me`
- `https://www.voidcore.me`

Record each redirect chain and final URL. Determine the preferred canonical hostname based on current configuration and owner intent; do not arbitrarily choose one.

Check:
- [ ] HTTPS works without certificate errors.
- [ ] HTTP redirects to HTTPS.
- [ ] `www` and non-`www` resolve consistently to the preferred hostname.
- [ ] Redirects avoid loops and unnecessary chains.
- [ ] Homepage canonical URL is correct.
- [ ] Each indexable page has an appropriate self-referencing canonical or an intentionally documented canonical.
- [ ] Canonicals do not point to staging, preview, localhost, a different domain, or the wrong route.
- [ ] Trailing slash behavior is consistent where applicable.
- [ ] Query parameters do not create unintended duplicate canonical pages.

### E. Page metadata and social sharing

Inspect the homepage and every discovered public, indexable route. For each route, check:

- [ ] Unique, descriptive HTML `<title>`.
- [ ] Useful meta description (not necessarily a direct ranking factor, but useful for snippets).
- [ ] Correct canonical URL.
- [ ] Appropriate robots meta directives.
- [ ] Correct document language (`<html lang="...">`).
- [ ] Meaningful heading structure, including a clear primary H1 where appropriate.
- [ ] Open Graph metadata: `og:title`, `og:description`, `og:url`, `og:type`, and a valid `og:image` where useful.
- [ ] Social card metadata such as `twitter:card` (or equivalent supported card tags).
- [ ] Favicon and relevant app icons exist and load successfully.
- [ ] Metadata is unique across pages when page content differs.
- [ ] No placeholder titles/descriptions, duplicate boilerplate, or accidental development branding.
- [ ] Metadata is present in the initial HTML response when required for crawlers and link previews; do not rely only on client-side JavaScript without checking actual behavior.

Create a route-by-route table in the report with the status and evidence for these items.

### F. HTTP status, broken links, and page access

- [ ] Record HTTP status for homepage and each discovered public route.
- [ ] Identify broken internal links and links to missing assets.
- [ ] Identify unintended 404s, 5xx responses, redirect loops, and soft-404 pages.
- [ ] Confirm important public pages are accessible without login.
- [ ] Confirm private/admin/account pages are not accidentally exposed in search metadata or sitemaps.
- [ ] Check custom 404 behavior.
- [ ] Note whether the site is an SPA and whether direct navigation to nested routes works on refresh.
- [ ] Do not crawl aggressively. Use a modest request rate and only public URLs.

### G. Rendering and indexability

- [ ] Determine whether key content is present in initial HTML or injected after JavaScript executes.
- [ ] If tools are available, compare raw response HTML with browser-rendered DOM.
- [ ] Check for empty root shells, missing page content, hydration errors, or client-side rendering failures.
- [ ] Check for accidental `noindex`, login walls, consent walls, or bot restrictions.
- [ ] Check that key content is meaningful and unique, not only a generic hero or repeated template.
- [ ] Check that navigation and important internal links use crawlable anchor elements with valid destinations.
- [ ] If the deployed site cannot be rendered or fetched, state that limitation and mark relevant items UNVERIFIED.

### H. Structured data

- [ ] Search for JSON-LD, Microdata, and RDFa.
- [ ] Determine whether structured data is useful for this site's actual purpose.
- [ ] Validate any existing structured data for syntax, correctness, and consistency with visible page content.
- [ ] Recommend only relevant types (for example, `Organization`, `WebSite`, `SoftwareApplication`, `Article`, or `BreadcrumbList` when genuinely applicable).
- [ ] Do not add ratings, reviews, prices, company facts, or other claims that are not supported by visible content.
- [ ] Do not add structured data just to chase rich results; explain when it is optional.

### I. Performance and mobile

Inspect implementation and, if tools/network access permit, measure the deployed site.

- [ ] Responsive viewport meta tag and mobile layout.
- [ ] Images appropriately sized and optimized; dimensions/aspect ratio set where practical.
- [ ] Lazy-load below-the-fold images where appropriate, without lazy-loading the main LCP image unnecessarily.
- [ ] JavaScript and CSS bundles are not obviously excessive for the site's needs.
- [ ] Fonts load reliably and avoid unnecessary layout shifts.
- [ ] Avoid blocking resources and obvious console errors.
- [ ] Check Core Web Vitals / PageSpeed Insights if available.
- [ ] Record actual measured values and test conditions; otherwise mark UNVERIFIED.
- [ ] Check accessibility basics that also support usability: image alt text, form labels, semantic landmarks, keyboard navigation, and focus visibility.

### J. Security and operational basics relevant to the website

This is not a penetration test. Do not probe vulnerabilities or perform destructive tests.

- [ ] Check for mixed content.
- [ ] Review visible security headers if a safe header check is available (for example CSP, HSTS, X-Content-Type-Options, Referrer-Policy, and frame protections).
- [ ] Check that secrets are not embedded in client-side source or public assets; do not print secrets if found—report file and type only.
- [ ] Check whether public/private route boundaries appear intentional.
- [ ] Check that external links opening new tabs use safe `rel` attributes where applicable.
- [ ] Do not attempt login bypass, exploit testing, or access to private data.

### K. Google Search Console readiness

The owner says domain ownership is verified. Do not repeat DNS verification unless there is evidence it is needed.

Check and report whether the site appears ready for the following owner-side steps:
- [ ] Submit the actual sitemap URL (only if one exists and is valid).
- [ ] Use URL Inspection on the preferred homepage URL.
- [ ] Run the live URL test.
- [ ] Request indexing for the homepage and key public pages when appropriate.
- [ ] Review Page Indexing reports and any manual actions/security issues shown in Search Console.
- [ ] Explain that verification is not the same as indexing, and sitemap submission does not guarantee indexing.
- [ ] Do not claim to have accessed Search Console unless authenticated access was actually available.

### L. Content and site-specific relevance

- [ ] Identify the website's purpose from the actual site content, not assumptions.
- [ ] Check whether the homepage clearly explains what the site/product does, who it is for, and its value.
- [ ] Check that each intended search landing page has distinct, useful content.
- [ ] Look for empty, duplicate, thin, placeholder, or under-construction public pages.
- [ ] Check visible contact/about/legal information where appropriate for the site's purpose.
- [ ] Recommend content improvements only when supported by what the site actually contains.
- [ ] Do not invent company details, author identities, testimonials, or product claims.

---

## Suggested safe inspection methods

Use tools already available in the environment. Avoid installing packages unless separately approved.

### Shell / repository

- Inspect `package.json`, lockfiles, framework config, route files, `public/`, and build scripts.
- Search the repository for sitemap, robots, canonical, metadata, `noindex`, JSON-LD, Open Graph, and `X-Robots-Tag`.
- Run existing lint, tests, or build only if dependencies are already installed and running the command is safe. Do not modify lockfiles.
- If network access is allowed, use low-impact HTTP requests to inspect headers, redirects, and public HTML.
- If a tool is unavailable, record that as a limitation rather than silently skipping the check.

Example read-only commands (adapt to the detected environment):
```bash
pwd
find . -maxdepth 3 -type f | sort | head -300
cat package.json
grep -RniE 'sitemap|robots\.txt|canonical|noindex|og:title|application/ld\+json' \
  --exclude-dir=node_modules --exclude-dir=.git .
```

For HTTP inspection, if `curl` is available:
```bash
curl -sSIL --max-redirs 10 https://www.voidcore.me/
curl -sSIL --max-redirs 10 https://voidcore.me/
curl -sSL --max-redirs 10 https://www.voidcore.me/robots.txt
curl -sSL --max-redirs 10 https://www.voidcore.me/sitemap.xml
```

These commands are examples, not proof of results. Run them and record the actual output. Do not dump environment variables or secret files into logs.

---

## Required output

Create a Markdown report named `VOIDCORE_SEO_AUDIT_REPORT.md` in the project workspace.

The report must contain:

1. **Executive summary**: overall readiness and the highest-priority issues.
2. **Detected stack and deployment**: evidence-based findings.
3. **Status summary**: counts of PASS, FAIL, WARNING, NOT APPLICABLE, and UNVERIFIED.
4. **Detailed checklist**: each relevant audit item with status and evidence.
5. **Route-by-route table**: URL, HTTP status, title, description, canonical, indexability, social metadata, and notes.
6. **Sitemap and robots findings**: source files, deployed endpoints, validity, and limitations.
7. **Redirect/canonical findings**: tested URLs, redirect chains, and preferred hostname determination.
8. **Performance/mobile/accessibility findings**: measured data or clearly marked unverified items.
9. **Security observations**: only safe, high-level observations; never include secrets.
10. **Google Search Console next steps**: actions the owner can take after the audit.
11. **Prioritized recommendations**:
    - P0: prevents crawling/indexing or creates major correctness risk.
    - P1: important fixes for technical SEO and discoverability.
    - P2: worthwhile improvements.
    - P3: optional enhancements.
12. **Implementation plan**: proposed files and minimal changes for each fix, but do not implement them yet.
13. **Limitations and assumptions**: what could not be inspected and why.
14. **Evidence log**: commands/URLs checked and concise results.

For every issue, include:
- Status
- Severity/priority
- Evidence
- Impact
- Recommended fix
- Relevant file(s) or URL(s)

Do not invent numeric performance scores, HTTP statuses, index counts, search traffic, or other measurements.

## Completion criteria

The audit is complete only when:
- The framework and project structure have been identified.
- Sitemap, robots.txt, canonicalization, redirects, page metadata, and key public routes have been checked as far as access allows.
- Findings have evidence and clear statuses.
- Unavailable checks are explicitly marked UNVERIFIED.
- The Markdown report has been created in the workspace.
- No production changes have been made.

At the end, provide a concise summary of what is present, missing, and uncertain, list the highest-priority issues, and point the user to `VOIDCORE_SEO_AUDIT_REPORT.md`.

**After the audit, stop and wait for approval. Do not implement fixes automatically.**
