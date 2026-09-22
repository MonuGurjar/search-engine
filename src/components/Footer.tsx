import { GithubIcon, XIcon, LinkedinIcon } from './icons'

const FOOTER_LINKS = ['About', 'Privacy', 'Features', 'Terms', 'Contact']

export function Footer() {
  return (
    <footer className="relative z-20 flex flex-col gap-5 border-t border-void-line/70 px-6 py-6 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-10 lg:px-14">
      <p className="text-void-muted">
        <span className="text-void-ink">© 2025 Void.</span>{' '}
        Search privately. Stay in control.
      </p>
      <div className="flex flex-wrap items-center gap-5 sm:gap-6">
        {FOOTER_LINKS.map((link) => (
          <a
            key={link}
            href="#"
            className="text-void-muted transition-colors hover:text-void-ink"
          >
            {link}
          </a>
        ))}
        <span className="hidden h-4 w-px bg-void-line sm:inline-block" aria-hidden />
        <div className="flex items-center gap-4 text-void-ink/80">
          <a
            href="https://x.com/m0nu_gurjar"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="X (Twitter)"
            title="X (Twitter)"
            className="transition-colors hover:text-void-green"
          >
            <XIcon className="size-4" />
          </a>
          <a
            href="https://github.com/MonuGurjar"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            title="GitHub"
            className="transition-colors hover:text-void-green"
          >
            <GithubIcon className="size-[18px]" />
          </a>
          <a
            href="https://www.linkedin.com/in/m0nugurjar/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            title="LinkedIn"
            className="transition-colors hover:text-void-green"
          >
            <LinkedinIcon className="size-[18px]" />
          </a>
        </div>
      </div>
    </footer>
  )
}
