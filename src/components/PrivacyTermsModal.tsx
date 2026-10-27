import { useState, useEffect, useCallback } from "react"
import {
  X,
  ShieldCheck,
  Scale,
  Globe,
  Copy,
  Check,
  Lock,
  Cookie,
  Server,
  EyeOff,
  ExternalLink,
  Sparkles,
  CheckCircle2,
} from "lucide-react"

export type LegalTab = "privacy" | "terms" | "about"

type Props = {
  isOpen: boolean
  initialTab?: LegalTab
  onClose: () => void
}

export function PrivacyTermsModal({
  isOpen,
  initialTab = "privacy",
  onClose,
}: Props) {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab)
  const [copied, setCopied] = useState(false)

  // Sync initialTab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab)
      // Update browser URL without reload to allow bookmarking / sharing
      try {
        const url = new URL(window.location.href)
        url.pathname = `/${initialTab}`
        window.history.replaceState({ modal: initialTab }, "", url.toString())
      } catch {
        // Ignore in restricted environments
      }
    }
  }, [isOpen, initialTab])

  // Handle URL restoration on close
  const handleClose = useCallback(() => {
    try {
      const url = new URL(window.location.href)
      if (
        url.pathname === "/privacy" ||
        url.pathname === "/terms" ||
        url.pathname === "/about"
      ) {
        url.pathname = "/"
      }
      url.searchParams.delete("modal")
      window.history.replaceState({}, "", url.toString())
    } catch {
      // Ignore
    }
    onClose()
  }, [onClose])

  // Switch tab and sync URL
  const switchTab = (tab: LegalTab) => {
    setActiveTab(tab)
    try {
      const url = new URL(window.location.href)
      url.pathname = `/${tab}`
      window.history.replaceState({ modal: tab }, "", url.toString())
    } catch {
      // Ignore
    }
  }

  // Keyboard navigation: Escape key closes modal
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, handleClose])

  // Prevent background body scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [isOpen])

  // Copy shareable link
  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}/${activeTab}`
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 dark:bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={handleClose}
    >
      {/* Glossy Modal Box */}
      <div
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden bg-white/90 dark:bg-[#121316]/90 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85)] ring-1 ring-black/5 dark:ring-white/10 transition-all text-slate-800 dark:text-zinc-200 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glossy Top Accent Edge */}
        <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 opacity-90" />

        {/* Subtle Ambient Radial Glows */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-200/70 dark:border-zinc-800/80 relative z-10 shrink-0">
          <div className="flex items-center justify-between gap-3 mb-4">
            {/* Brand Title Pill */}
            <div className="flex items-center gap-2">
              <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-mono font-medium tracking-wider uppercase text-emerald-600 dark:text-emerald-400">
                VOID Legal & Trust
              </span>
            </div>

            {/* Header Right Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Copy Link Button */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-2.5 py-1.5 rounded-xl text-xs font-sans text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-100 bg-slate-100/80 hover:bg-slate-200/80 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Copy link to this page"
              >
                {copied ? (
                  <>
                    <Check className="size-3.5 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      Copied!
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={handleClose}
                className="size-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800/80 transition-all cursor-pointer"
                aria-label="Close modal"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2
                id="modal-title"
                className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-white font-sans"
              >
                {activeTab === "privacy" && "Privacy Policy"}
                {activeTab === "terms" && "Terms of Service"}
                {activeTab === "about" && "About VOID Search"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Last updated: October 2026 • Verified Zero Tracking Policy
              </p>
            </div>

            {/* Glossy Segmented Tab Pill */}
            <div className="inline-flex p-1 rounded-2xl bg-slate-100/90 dark:bg-zinc-900/90 border border-slate-200/60 dark:border-zinc-800/80 shadow-inner">
              <button
                type="button"
                onClick={() => switchTab("privacy")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  activeTab === "privacy"
                    ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
                }`}
              >
                <ShieldCheck className="size-3.5 text-emerald-500" />
                <span>Privacy</span>
              </button>

              <button
                type="button"
                onClick={() => switchTab("terms")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  activeTab === "terms"
                    ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
                }`}
              >
                <Scale className="size-3.5 text-cyan-500" />
                <span>Terms</span>
              </button>

              <button
                type="button"
                onClick={() => switchTab("about")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  activeTab === "about"
                    ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
                }`}
              >
                <Globe className="size-3.5 text-blue-500" />
                <span>About</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-sm leading-relaxed text-slate-600 dark:text-zinc-300 relative z-10">
          {/* ================================================================= */}
          {/* TAB 1: PRIVACY POLICY                                             */}
          {/* ================================================================= */}
          {activeTab === "privacy" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Glossy Feature Callout Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <EyeOff className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-emerald-950 dark:text-emerald-200">
                      Zero Tracking Profiles
                    </h4>
                    <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/70 mt-0.5">
                      We never store search history, associate queries with IP
                      addresses, or create advertising profiles.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-cyan-50/60 dark:bg-cyan-950/20 border border-cyan-200/50 dark:border-cyan-800/30 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 shrink-0">
                    <Cookie className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-cyan-950 dark:text-cyan-200">
                      No Tracking Cookies
                    </h4>
                    <p className="text-[11px] text-cyan-800/80 dark:text-cyan-300/70 mt-0.5">
                      No cross-site tracking beacons or advertiser identifiers.
                      Your search stays in your session.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-800/30 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                    <Lock className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-indigo-950 dark:text-indigo-200">
                      Encrypted Serverless Pipeline
                    </h4>
                    <p className="text-[11px] text-indigo-800/80 dark:text-indigo-300/70 mt-0.5">
                      Zero browser-to-database credentials. All calls route
                      through hardened serverless functions over TLS 1.3.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                    <ExternalLink className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-amber-950 dark:text-amber-200">
                      Direct Outbound Navigation
                    </h4>
                    <p className="text-[11px] text-amber-800/80 dark:text-amber-300/70 mt-0.5">
                      Clicking search results opens the target site directly. We
                      never use redirect trackers or telemetry bounce hops.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 1 */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  1. Information We Do Not Collect
                </h3>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-zinc-300">
                  VOID Search was founded on the fundamental principle that your
                  thoughts and searches belong exclusively to you. We do not
                  collect, log, monetize, or sell:
                </p>
                <ul className="text-xs space-y-1 pl-5 list-disc text-slate-600 dark:text-zinc-400">
                  <li>Your name, email address, or contact details.</li>
                  <li>Your device IP address linked to your search queries.</li>
                  <li>Persistent unique advertiser IDs or fingerprinting hashes.</li>
                  <li>Search query logs associated with individual devices.</li>
                </ul>
              </div>

              {/* Section 2 */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Server className="size-4 text-cyan-500" />
                  2. Ephemeral Search Processing & OpenSearch BM25
                </h3>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-zinc-300">
                  When you submit a query on VOID, the request is received by our
                  server-side Vercel API functions. The query string is
                  sanitized and passed directly to our dedicated Aiven OpenSearch
                  cluster using the BM25 statistical ranking algorithm. Once the
                  scored documents and snippets are returned to your browser, the
                  in-memory request context is immediately discarded.
                </p>
              </div>

              {/* Section 3 */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Cookie className="size-4 text-amber-500" />
                  3. Browser Local Storage & Settings
                </h3>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-zinc-300">
                  VOID does not store third-party cookies on your device. We use
                  the browser's native <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 font-mono text-[11px]">localStorage</code> strictly
                  for two non-identifying purposes:
                </p>
                <ul className="text-xs space-y-1 pl-5 list-disc text-slate-600 dark:text-zinc-400">
                  <li>
                    <strong>Theme Preference:</strong> Storing whether you
                    prefer dark mode or light mode.
                  </li>
                  <li>
                    <strong>Recent Searches (Local Only):</strong> If enabled,
                    your last queries stay strictly inside your browser's local
                    memory. They are never transmitted back to VOID servers and
                    can be cleared at any time.
                  </li>
                </ul>
              </div>

              {/* Section 4 */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="size-4 text-emerald-500" />
                  4. Your Data Rights & Contact
                </h3>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-zinc-300">
                  Because VOID retains zero personal data or query associations,
                  there is no personal record to export or delete. If you have
                  any security disclosures or questions regarding our privacy
                  architecture, you can contact the maintainer directly via
                  GitHub at{" "}
                  <a
                    href="https://github.com/MonuGurjar/search-engine"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                  >
                    github.com/MonuGurjar/search-engine
                  </a>
                  .
                </p>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 2: TERMS OF SERVICE                                           */}
          {/* ================================================================= */}
          {activeTab === "terms" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Terms Highlights */}
              <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-700/50 text-xs space-y-2">
                <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-zinc-100">
                  <Sparkles className="size-4 text-emerald-500" />
                  <span>Fair Use & Transparency Summary</span>
                </div>
                <p className="text-slate-600 dark:text-zinc-400 leading-relaxed">
                  VOID Search is provided free of charge for open web research,
                  developer documentation exploration, educational use, and
                  information lookup. By accessing VOID, you agree to these fair
                  use terms.
                </p>
              </div>

              {/* Section 1 */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Scale className="size-4 text-cyan-500" />
                  1. Acceptance of Terms
                </h3>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-zinc-300">
                  By accessing or using the VOID Search application at{" "}
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                    voidcore.me
                  </span>
                  , you agree to be bound by these Terms of Service. If you do
                  not agree with any of these terms, you should discontinue use
                  of the service.
                </p>
              </div>

              {/* Section 2 */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  2. Permitted Use & Fair Access
                </h3>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-zinc-300">
                  You are welcome to query VOID for personal, research, academic,
                  and professional research. To preserve service availability
                  for all users, you agree not to:
                </p>
                <ul className="text-xs space-y-1 pl-5 list-disc text-slate-600 dark:text-zinc-400">
                  <li>
                    Launch automated denial-of-service (DDoS) or high-frequency
                    flood attacks against VOID endpoints.
                  </li>
                  <li>
                    Attempt to extract or reverse-engineer backend serverless
                    environment variables, database tokens, or secrets.
                  </li>
                  <li>
                    Bypass or manipulate automated IP rate-limiting safeguards.
                  </li>
                  <li>
                    Use the service for unlawful purposes or harmful distribution.
                  </li>
                </ul>
              </div>

              {/* Section 3 */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Globe className="size-4 text-blue-500" />
                  3. Indexing & Third-Party Content Disclaimer
                </h3>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-zinc-300">
                  VOID Search functions as an automated indexing and search
                  engine. The web pages, snippets, titles, and images displayed
                  in search results are indexed from publicly accessible
                  third-party websites.
                </p>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-zinc-300">
                  VOID does not host, control, or endorse the contents of any
                  external websites. All trademarks, copyrights, and intellectual
                  property belong to their respective authors and owners.
                </p>
              </div>

              {/* Section 4 */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="size-4 text-indigo-500" />
                  4. DMCA & Takedown Requests
                </h3>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-zinc-300">
                  If you are a copyright owner or site operator and wish to have
                  a specific page removed from VOID's search index or updated,
                  you can submit an issue or takedown request via our public
                  GitHub repository or update your site's{" "}
                  <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 font-mono text-[11px]">robots.txt</code> file.
                </p>
              </div>

              {/* Section 5 */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Lock className="size-4 text-amber-500" />
                  5. "As Is" Warranty & Limitation of Liability
                </h3>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-zinc-300">
                  VOID Search is provided on an "as is" and "as available"
                  basis, without warranty of any kind, express or implied. In no
                  event shall the maintainers of VOID be liable for any indirect,
                  consequential, or incidental damages arising out of the use or
                  inability to use this service.
                </p>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 3: ABOUT VOID                                                 */}
          {/* ================================================================= */}
          {activeTab === "about" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-cyan-500/10 border border-emerald-500/20 text-xs space-y-2">
                <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
                  VOID — Search Without Boundaries
                </h4>
                <p className="text-slate-600 dark:text-zinc-300 leading-relaxed">
                  VOID is an ultra-fast, minimalist, privacy-first search engine
                  engineered with React 19, TypeScript, Tailwind CSS, Vercel
                  Edge Functions, and an enterprise Aiven OpenSearch cluster
                  running Okapi BM25 statistical relevance ranking.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  System Architecture
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/60 dark:border-zinc-700/40">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 block">
                      Frontend
                    </span>
                    <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 mt-1 block">
                      React 19 + Vite 8
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/60 dark:border-zinc-700/40">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 block">
                      Serverless API
                    </span>
                    <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 mt-1 block">
                      Vercel Functions (Edge)
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/60 dark:border-zinc-700/40">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 block">
                      Search Index
                    </span>
                    <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 mt-1 block">
                      Aiven OpenSearch BM25
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
                <span>Designed & Built by Monu Gurjar</span>
                <a
                  href="https://github.com/MonuGurjar/search-engine"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  GitHub Repository ↗
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Sticky Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200/70 dark:border-zinc-800/80 bg-slate-50/70 dark:bg-zinc-900/60 flex items-center justify-between gap-3 relative z-10 shrink-0">
          {/* Quick Switch Button */}
          {activeTab === "privacy" ? (
            <button
              type="button"
              onClick={() => switchTab("terms")}
              className="text-xs text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center gap-1.5 cursor-pointer font-sans transition-colors"
            >
              <span>View Terms of Service</span>
              <span>→</span>
            </button>
          ) : activeTab === "terms" ? (
            <button
              type="button"
              onClick={() => switchTab("privacy")}
              className="text-xs text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center gap-1.5 cursor-pointer font-sans transition-colors"
            >
              <span>← View Privacy Policy</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => switchTab("privacy")}
              className="text-xs text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center gap-1.5 cursor-pointer font-sans transition-colors"
            >
              <span>← Back to Privacy</span>
            </button>
          )}

          {/* Close button */}
          <button
            type="button"
            onClick={handleClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-medium cursor-pointer transition-all shadow-sm"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  )
}
