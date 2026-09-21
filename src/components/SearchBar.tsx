import { useState, type FormEvent } from 'react'
import { SearchIcon } from './icons'

type Props = {
  value: string
  onChange: (v: string) => void
  onSubmit: (v: string) => void
  compact?: boolean
  autoFocus?: boolean
}

export function SearchBar({ value, onChange, onSubmit, compact = false, autoFocus }: Props) {
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
        background: 'rgba(255,255,255,0.72)',
        border: `1px solid ${focused ? 'rgba(47,125,84,0.5)' : 'rgba(214,222,224,0.9)'}`,
        boxShadow: focused
          ? '0 22px 60px -24px rgba(37,54,60,0.4), 0 2px 8px rgba(37,54,60,0.06)'
          : '0 16px 46px -26px rgba(37,54,60,0.32), 0 1px 4px rgba(37,54,60,0.05)',
      }}
    >
      <div
        className={`flex items-center ${
          compact ? 'gap-2.5 pl-4 pr-1.5 py-1.5' : 'gap-3 pl-5 pr-2 py-2 sm:gap-4 sm:pl-7 sm:pr-3 sm:py-3'
        }`}
      >
        <SearchIcon
          className={
            compact
              ? 'size-5 text-void-muted shrink-0'
              : 'size-5 text-void-muted shrink-0 sm:size-6'
          }
        />
        <input
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search the web..."
          aria-label="Search the web"
          className={`min-w-0 flex-1 bg-transparent outline-none placeholder:text-void-faint text-void-ink ${
            compact ? 'text-[15px] py-1' : 'text-base py-1.5 sm:text-lg sm:py-2'
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
          className={`shrink-0 grid place-items-center rounded-full text-white transition-all duration-200 ease-out hover:scale-[1.05] active:scale-95 ${
            compact ? 'size-10' : 'size-11 sm:size-14'
          }`}
          style={{
            background: 'linear-gradient(160deg, #38966a 0%, #2f7d54 60%, #276848 100%)',
            boxShadow: '0 10px 24px -8px rgba(47,125,84,0.55)',
          }}
        >
          <SearchIcon className={compact ? 'size-[18px]' : 'size-5 sm:size-6'} />
        </button>
      </div>
    </form>
  )
}
