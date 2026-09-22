import { useState, type FormEvent } from 'react'
import { SearchIcon } from './icons'

type Props = {
  value: string
  onChange: (v: string) => void
  onSubmit: (v: string) => void
  compact?: boolean
  autoFocus?: boolean
  showMobileLogo?: boolean
  onHome?: () => void
}

export function SearchBar({
  value,
  onChange,
  onSubmit,
  compact = false,
  autoFocus,
  showMobileLogo = false,
  onHome,
}: Props) {
  const [focused, setFocused] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (value.trim()) onSubmit(value.trim())
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full rounded-full backdrop-blur-xl transition-all duration-300 ease-out"
      style={{
        background: 'rgba(255,255,255,0.74)',
        border: `1px solid ${focused ? 'rgba(47,125,84,0.5)' : 'rgba(214,222,224,0.9)'}`,
        boxShadow: focused
          ? '0 18px 48px -20px rgba(37,54,60,0.38), 0 2px 8px rgba(37,54,60,0.06)'
          : '0 12px 36px -22px rgba(37,54,60,0.28), 0 1px 4px rgba(37,54,60,0.04)',
      }}
    >
      <div
        className={`flex items-center ${
          compact
            ? 'gap-2 pl-3.5 pr-1.5 py-1'
            : 'gap-3 pl-4 sm:pl-6 pr-1.5 sm:pr-2 py-1.5 sm:py-2'
        }`}
      >
        {showMobileLogo ? (
          <>
            {/* On mobile: VOID logo in left corner of search bar */}
            <button
              type="button"
              onClick={onHome}
              aria-label="VOID Home"
              title="VOID Home"
              className="group -ml-1 flex sm:hidden size-7 shrink-0 items-center justify-center rounded-full transition-transform active:scale-90 cursor-pointer"
            >
              <span className="relative flex size-6 items-center justify-center font-display select-none">
                <span className="relative z-10 text-[13px] font-semibold tracking-tight text-void-ink transition-colors group-hover:text-void-green">
                  V
                </span>
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full border-[1.6px] border-void-green transition-shadow group-hover:shadow-[0_0_10px_rgba(47,125,84,0.6)]"
                  style={{ boxShadow: '0 0 6px rgba(47,125,84,0.38)' }}
                />
              </span>
            </button>
            {/* On desktop: standard SearchIcon */}
            <SearchIcon className="hidden sm:block size-4 text-void-muted shrink-0" />
          </>
        ) : (
          <SearchIcon
            className={
              compact
                ? 'size-4 text-void-muted shrink-0'
                : 'size-5 text-void-muted shrink-0'
            }
          />
        )}
        <input
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search the web..."
          aria-label="Search the web"
          className={`min-w-0 flex-1 bg-transparent outline-none placeholder:text-void-faint text-void-ink ${
            compact ? 'text-[14px] py-0.5' : 'text-base py-1 sm:text-[16px] sm:py-1'
          }`}
        />
        <span
          aria-hidden
          className="w-px self-stretch my-1"
          style={{ background: 'rgba(214,222,224,0.9)' }}
        />
        <button
          type="submit"
          aria-label="Search"
          className={`shrink-0 grid place-items-center rounded-full text-white transition-all duration-200 ease-out hover:scale-[1.05] active:scale-95 cursor-pointer ${
            compact ? 'size-8' : 'size-9 sm:size-10'
          }`}
          style={{
            background: 'linear-gradient(160deg, #38966a 0%, #2f7d54 60%, #276848 100%)',
            boxShadow: '0 8px 18px -6px rgba(47,125,84,0.5)',
          }}
        >
          <SearchIcon className={compact ? 'size-3.5' : 'size-4 sm:size-[18px]'} />
        </button>
      </div>
    </form>
  )
}
