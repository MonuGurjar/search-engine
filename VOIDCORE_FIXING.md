# VOIDCORE — Code-Only Essential Fixing Prompt

You are working in the existing VOIDCORE repository. Implement the essential fixes that can be completed entirely in the codebase.

## Objective

Fix the reported frontend security exposure, SEO metadata, static SEO files, and application routing/configuration where the fix is fully controlled by repository code.

**Do not give me tasks that require me to manually change Vercel settings, Namecheap/domain settings, DNS records, production environment settings, or any other external dashboard. Do not make those changes yourself either.** If an issue depends on an external setting or unavailable secret, document it as blocked in `VOIDCORE_FIX_REPORT.md`; do not turn it into a manual to-do list for me. Continue with the remaining code-only fixes.

Do not add Twitter/X metadata, Open Graph/social previews, marketing features, unrelated refactors, or a redesign.

## Safety rules

1. Inspect the repository and `VOIDCORE_SEO_AUDIT_REPORT.md` before editing.
2. Check `git status` and preserve existing user changes.
3. Trace the current application and OpenSearch architecture instead of guessing.
4. Make focused changes only. Preserve the current UI, styling, search behavior, and API contracts.
5. Do not print, commit, or expose secret values.
6. Do not deploy to production or modify DNS, domain registrar, Vercel dashboard, or production settings.
7. Do not claim an external configuration has been fixed when only code has changed.
8. If a required value such as the primary hostname is not clearly established in the repository, use an existing documented project configuration if available. Otherwise, leave the external-dependent change unimplemented and record it as blocked—do not ask me to manually perform it as part of this task.
9. Never claim a check passed unless it was actually run and the result observed.

## 1. Fix the reported OpenSearch credential exposure

Inspect `src/lib/opensearch.ts` (or its current equivalent) and verify the audit finding.

- Remove any hardcoded username/password or secret fallback from browser-side code.
- Do not replace it with a `VITE_*` variable or another client-visible secret.
- Trace the existing OpenSearch request flow.
- If the repository already has a server-side API layer, route authenticated OpenSearch requests through it using server-only environment variables.
- If a safe server-side endpoint can be implemented within the current repository and deployment architecture, implement the smallest safe solution.
- Validate inputs and constrain the upstream host/path; do not create an unrestricted proxy.
- Preserve the existing search API behavior where possible.
- Document required environment variable *names* without including secret values.
- Check source and generated client assets for exposed credentials without displaying them.
- If the fix requires credentials or external infrastructure unavailable in the repository, remove the client-side secret exposure and safely disable/fail closed for the affected request rather than inventing credentials or exposing another secret. Document the limitation in the report.
- If genuine credentials were deployed, note in the report that rotation status cannot be confirmed from repository code alone. Do not create a separate manual task list.

## 2. Add real SEO files in the repository

Create the appropriate public files (normally in `public/` for Vite):

### `public/robots.txt`
- Allow crawling of intended public content.
- Include the sitemap URL only if the primary hostname is already clearly defined in the repository.
- Do not invent a domain or block assets needed to render the site.

### `public/sitemap.xml`
- Include only real, public, stable, indexable URLs.
- Use the primary hostname only if it is clearly established in existing repository configuration or documentation.
- Do not include API endpoints, private areas, modal states, nonexistent URLs, or duplicate hostnames.
- Do not invent pages or inaccurate `lastmod` dates.
- Ensure the file is valid XML and is not the SPA shell.

## 3. Add essential on-page SEO

- Add an accurate page title.
- Add a concise meta description describing the actual VOIDCORE website.
- Add a meaningful, visible `<h1>` to the homepage.
- Use semantic headings where supported by existing content.
- Preserve the existing design; do not add an unrelated hero section or hidden SEO text.
- Add a canonical URL only if the canonical hostname can be established safely from repository configuration. Do not guess between `www` and non-`www`.
- Do not add Twitter/X tags, Open Graph tags, social previews, or unrelated metadata.

## 4. Fix code-controlled routing and static file behavior

Review Vite and repository-controlled deployment configuration, including `vercel.json` if present.

- Ensure actual static files such as `robots.txt`, `sitemap.xml`, and existing assets are not rewritten to `/index.html`.
- Preserve legitimate client-side routes, search URLs, and direct navigation.
- Test refresh behavior on valid routes.
- Improve unknown-route handling where it can be done safely in the existing architecture.
- Do not claim a real HTTP 404 is fixed unless the response status was verified in a suitable environment.
- Do not modify Vercel dashboard settings, production deployment settings, DNS, or domain registrar settings.

## 5. Rendering and crawler accessibility

- Verify the audit's claim that the initial HTML contains an empty React root.
- Determine whether the main public title, description, heading, and meaningful content are accessible to crawlers.
- Do not migrate the project to another framework automatically.
- Implement a small, compatible prerendering improvement only if it is maintainable and can be tested within the existing repository without risking core search functionality.
- If this would require major architecture changes or external platform configuration, document the limitation in `VOIDCORE_FIX_REPORT.md` and continue. Do not ask me to perform a manual setup task.

## 6. Essential code-controlled security headers

- Review existing repository-controlled header configuration.
- Add `X-Content-Type-Options: nosniff` if it can be configured safely in the existing code/deployment configuration.
- Keep existing valid HTTPS/HSTS behavior; do not claim it is verified without an HTTP response test.
- Add a Content Security Policy only after checking the app's scripts, styles, connections, and API/OpenSearch requests. Avoid breaking the application.
- Do not require manual dashboard changes. If a header cannot be controlled from the repository, document it as externally controlled and leave it blocked.

## 7. Verification

Run checks available from the repository:

- Production build.
- Existing tests, lint, and type checks if available.
- Validate `robots.txt` and `sitemap.xml`.
- Verify static SEO files are not replaced by the SPA HTML shell in the local/preview environment.
- Verify title, description, heading, and canonical metadata where applicable.
- Test search submission/results and valid-route navigation.
- Test unknown-route behavior and report the actual result.
- Inspect the generated frontend bundle for credential exposure without printing secrets.
- Check for console/network errors if browser testing is available.
- Verify security headers only where an actual response can be inspected.
- Clearly distinguish local checks from live-domain checks. Do not imply the live website is fixed based only on a local build.

## 8. Final report

Create or update `VOIDCORE_FIX_REPORT.md` with:

- Changes made and exact files changed.
- Build and test commands run, with actual results.
- Local/preview HTTP results for `robots.txt` and `sitemap.xml` if available.
- Credential exposure check results without showing secret values.
- Any fixes blocked by missing secrets, unknown hostname, external hosting/domain settings, or architectural limitations.
- A concise `PASS`, `FAIL`, or `BLOCKED` status for each requirement.
- Any deployment-dependent behavior that cannot be verified from repository code.

Do not create a separate manual action list for me. Put external dependencies under `BLOCKED / OUTSIDE REPOSITORY CONTROL` in the report only.

## Completion criteria

- No hardcoded OpenSearch secret remains in client-side source or generated client assets.
- The app does not send upstream authentication secrets to the browser.
- Real, valid `robots.txt` and `sitemap.xml` files exist in the repository.
- Essential title, meta description, and visible semantic heading are implemented.
- Repository-controlled static file routing is corrected without breaking the app.
- Build and available tests are run and accurately reported.
- External dashboard, DNS, domain registrar, production environment, or deployment work is not performed or assigned to me as a task.

Finish by briefly summarizing code changes and verification results. Do not deploy to production.
