import { GithubIcon, XIcon, YoutubeIcon } from './icons'

export function Footer() {
  return (
    <footer className="relative z-20 flex flex-col gap-5 border-t border-void-line/70 px-6 py-6 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-10 lg:px-14">
      <p className="text-void-muted">
        <span className="text-void-ink">© 2025 Void.</span>{' '}
        Search privately. Stay in control.
      </p>
      <div className="flex items-center gap-6">
        <a href="#" className="text-void-muted transition-colors hover:text-void-ink">Privacy</a>
        <a href="#" className="text-void-muted transition-colors hover:text-void-ink">Terms</a>
        <a href="#" className="text-void-muted transition-colors hover:text-void-ink">Contact</a>
        <span className="h-4 w-px bg-void-line" aria-hidden />
        <div className="flex items-center gap-4 text-void-ink/80">
          <a href="#" aria-label="GitHub" className="transition-colors hover:text-void-green"><GithubIcon className="size-[18px]" /></a>
          <a href="#" aria-label="X" className="transition-colors hover:text-void-green"><XIcon className="size-4" /></a>
          <a href="#" aria-label="YouTube" className="transition-colors hover:text-void-green"><YoutubeIcon className="size-5" /></a>
        </div>
      </div>
    </footer>
  )
}
