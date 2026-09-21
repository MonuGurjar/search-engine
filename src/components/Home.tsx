import { useEffect, useState } from 'react'
import { ChevronDown } from './icons'
import { ModePills } from './ModePills'
import { SearchBar } from './SearchBar'
import { Wordmark } from './Wordmark'

type Props = {
  mode: string
  onMode: (id: string) => void
  onSearch: (q: string) => void
}

export function Home({ mode, onMode, onSearch }: Props) {
  const [query, setQuery] = useState('')
  const [markSize, setMarkSize] = useState(104)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const apply = () => setMarkSize(mq.matches ? 68 : 104)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  return (
    <section className="relative flex min-h-[calc(100vh-88px)] flex-col items-center justify-center px-5 sm:px-6">
      {/* hero core */}
      <div className="relative flex w-full max-w-3xl flex-col items-center">
        <div className="relative flex flex-col items-center">
          <Wordmark
            size={markSize}
            pulse
            className="void-fade-up relative select-none"
            style={{ animationDelay: '0.15s' }}
          />
          <p
            className="void-label void-fade-up relative mt-3 text-[12px] text-void-muted/90 sm:mt-4 sm:text-sm"
            style={{ animationDelay: '0.35s' }}
          >
            A Quieter Way to Search
          </p>
        </div>

        <div className="void-fade-up mt-9 w-full sm:mt-12" style={{ animationDelay: '0.5s' }}>
          <SearchBar value={query} onChange={setQuery} onSubmit={onSearch} />
        </div>

        <div className="void-fade-up mt-5 w-full sm:mt-6" style={{ animationDelay: '0.65s' }}>
          <ModePills active={mode} onChange={onMode} />
        </div>
      </div>

      {/* scroll indicator */}
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5 text-void-muted sm:bottom-2 sm:gap-2">
        <ChevronDown className="size-4 animate-bounce" style={{ animationDuration: '2.4s' }} />
        <span className="void-label text-[10px]">Scroll to Explore</span>
      </div>
    </section>
  )
}
