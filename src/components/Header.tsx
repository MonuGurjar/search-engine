import { GearIcon } from './icons'
import { Wordmark } from './Wordmark'

type Props = {
  onHome: () => void
}

const LINKS = ['About', 'Privacy', 'Features']

export function Header({ onHome }: Props) {
  return (
    <header className="void-fade-down relative z-30 flex items-center justify-between px-5 py-5 sm:px-10 sm:py-6 lg:px-14">
      <button onClick={onHome} className="transition-opacity hover:opacity-70" aria-label="VOID home">
        <Wordmark size={26} />
      </button>

      <nav className="flex items-center gap-6 sm:gap-9">
        <div className="hidden items-center gap-7 sm:flex">
          {LINKS.map((l) => (
            <a
              key={l}
              href="#"
              className="text-sm text-void-muted transition-colors hover:text-void-ink"
            >
              {l}
            </a>
          ))}
        </div>
        <button
          className="group flex items-center gap-2 rounded-full bg-void-glass px-4 py-2 text-sm text-void-ink backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-void-green/45 hover:bg-white"
          style={{
            border: '1px solid rgba(214,222,224,0.95)',
            boxShadow: '0 8px 22px -16px rgba(37,54,60,0.4)',
          }}
        >
          <GearIcon className="size-[18px] text-void-muted transition-all duration-300 group-hover:rotate-45 group-hover:text-void-green" />
          <span>Settings</span>
        </button>
      </nav>
    </header>
  )
}
