import { useState, useEffect, useRef, type FormEvent, type KeyboardEvent } from 'react'
import { SearchIcon, MicIcon, CameraIcon, CloseIcon, HistoryIcon } from './icons'
import { getAutocompleteSuggestions } from '../lib/opensearch'

type Props = {
  value: string
  onChange: (v: string) => void
  onSubmit: (v: string) => void
  compact?: boolean
  autoFocus?: boolean
  onHome?: () => void
  placeholder?: string
  showMobileLogo?: boolean
}

const RECENT_KEY = 'void_recent_searches'
const MAX_RECENT = 5

export function SearchBar({
  value,
  onChange,
  onSubmit,
  compact = false,
  autoFocus,
  placeholder = 'Search anything...',
}: Props) {
  const [focused, setFocused] = useState(false)
  const [listening, setListening] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)

  // Load recent searches on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_KEY)
      if (saved) {
        setRecentSearches(JSON.parse(saved))
      }
    } catch {}
  }, [])

  // Save query to recent searches
  function saveRecentSearch(term: string) {
    const q = term.trim()
    if (!q) return
    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== q.toLowerCase())
      const updated = [q, ...filtered].slice(0, MAX_RECENT)
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(updated))
      } catch {}
      return updated
    })
  }

  function removeRecentSearch(termToRemove: string, e: React.MouseEvent) {
    e.stopPropagation()
    setRecentSearches((prev) => {
      const updated = prev.filter((item) => item !== termToRemove)
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(updated))
      } catch {}
      return updated
    })
  }

  function clearAllRecent(e: React.MouseEvent) {
    e.stopPropagation()
    setRecentSearches([])
    try {
      localStorage.removeItem(RECENT_KEY)
    } catch {}
  }

  // Debounced autocomplete suggestions from OpenSearch (180ms)
  useEffect(() => {
    if (!value.trim() || value.trim().length < 2) {
      setSuggestions([])
      setSelectedIndex(-1)
      return
    }

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const results = await getAutocompleteSuggestions(value, controller.signal)
        setSuggestions(results)
      } catch {
        setSuggestions([])
      }
    }, 180)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [value])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSubmit(e?: FormEvent) {
    if (e) e.preventDefault()
    const targetQuery =
      selectedIndex >= 0 && allItems[selectedIndex]
        ? allItems[selectedIndex].text
        : value
    if (targetQuery.trim()) {
      saveRecentSearch(targetQuery.trim())
      onChange(targetQuery.trim())
      onSubmit(targetQuery.trim())
      setFocused(false)
      setSelectedIndex(-1)
    }
  }

  function selectItem(text: string) {
    saveRecentSearch(text)
    onChange(text)
    onSubmit(text)
    setFocused(false)
    setSelectedIndex(-1)
  }

  // Keyboard navigation for dropdown
  const allItems: { type: 'recent' | 'suggestion'; text: string }[] = [
    ...(!value.trim() ? recentSearches.map((s) => ({ type: 'recent' as const, text: s })) : []),
    ...suggestions.map((s) => ({ type: 'suggestion' as const, text: s })),
  ]

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1 < allItems.length ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : allItems.length - 1))
    } else if (e.key === 'Escape') {
      setFocused(false)
      setSelectedIndex(-1)
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && allItems[selectedIndex]) {
        e.preventDefault()
        selectItem(allItems[selectedIndex].text)
      }
    }
  }

  function handleVoiceSearch() {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      try {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        const recognition = new SpeechRecognition()
        recognition.lang = 'en-US'
        recognition.start()
        setListening(true)
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript
          onChange(transcript)
          onSubmit(transcript)
          setListening(false)
        }
        recognition.onerror = () => setListening(false)
        recognition.onend = () => setListening(false)
      } catch {
        setListening(false)
      }
    } else {
      alert('Voice recognition is not supported in this browser.')
    }
  }

  function handleLensUpload() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        onChange(`Image: ${file.name.replace(/\.[^/.]+$/, '')}`)
        onSubmit(file.name.replace(/\.[^/.]+$/, ''))
      }
    }
    input.click()
  }

  const showDropdown = focused && (allItems.length > 0 || (recentSearches.length > 0 && !value.trim()))

  return (
    <div ref={containerRef} className={`relative w-full ${compact ? 'max-w-2xl' : 'max-w-2xl mx-auto'}`}>
      <form onSubmit={handleSubmit} className="w-full">
        <div
          className={`flex items-center rounded-full bg-white dark:bg-[#141416] border transition-all duration-200 ${
            compact ? 'px-4 py-2' : 'px-4 sm:px-5 py-2.5 sm:py-3'
          } ${
            focused
              ? 'border-blue-500/80 dark:border-zinc-500/80 shadow-[0_4px_24px_rgba(37,99,235,0.15)] dark:shadow-[0_4px_28px_rgba(0,0,0,0.65)] ring-1 ring-blue-500/30 dark:ring-zinc-600/40'
              : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
          }`}
        >
          {/* Search Magnifying Glass Icon / Submit Button */}
          <button
            type="submit"
            className="shrink-0 p-1 -ml-1 text-slate-400 hover:text-blue-600 dark:hover:text-zinc-200 transition-colors cursor-pointer rounded-full focus:outline-none"
            title="Search"
            aria-label="Search"
          >
            <SearchIcon
              className={`transition-colors ${
                compact ? 'size-4.5 mr-1.5' : 'size-5 mr-2'
              } ${focused ? 'text-blue-600 dark:text-zinc-200' : 'text-slate-400 dark:text-zinc-500'}`}
            />
          </button>

          {/* Text Input */}
          <input
            autoFocus={autoFocus}
            value={value}
            onChange={(e) => {
              onChange(e.target.value)
              setSelectedIndex(-1)
            }}
            onFocus={() => setFocused(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            aria-label={placeholder}
            autoComplete="off"
            spellCheck="false"
            className={`min-w-0 flex-1 bg-transparent outline-none text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 font-sans ${
              compact ? 'text-sm py-0.5' : 'text-[15px] sm:text-base py-0.5'
            }`}
          />

          {/* Clear Button (if text entered) */}
          {value.trim() && (
            <button
              type="button"
              onClick={() => {
                onChange('')
                setSuggestions([])
              }}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer mr-1"
              title="Clear"
            >
              <CloseIcon className="size-4" />
            </button>
          )}

          {/* Vertical Divider */}
          <div className="h-5 w-px bg-slate-200 dark:bg-zinc-800 mx-1.5 sm:mx-2 shrink-0" aria-hidden />

          {/* Right Actions: Voice & Camera Lens */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleVoiceSearch}
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                listening
                  ? 'text-red-500 bg-red-50 dark:bg-red-950/30 animate-pulse'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
              title="Search by voice"
              aria-label="Search by voice"
            >
              <MicIcon className="size-4 sm:size-4.5" />
            </button>

            <button
              type="button"
              onClick={handleLensUpload}
              className="p-1.5 rounded-full text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Search by image / Lens"
              aria-label="Search by image"
            >
              <CameraIcon className="size-4 sm:size-4.5" />
            </button>
          </div>
        </div>
      </form>

      {/* Autocomplete & Recent Searches Dropdown */}
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 overflow-hidden rounded-2xl border border-slate-200 dark:border-zinc-800/90 bg-white dark:bg-[#141416] shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Header if recent searches shown without query */}
          {!value.trim() && recentSearches.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 dark:border-zinc-800/80 text-[11px] font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
              <span>Recent Searches</span>
              <button
                type="button"
                onClick={clearAllRecent}
                className="hover:text-rose-500 transition-colors cursor-pointer font-sans normal-case text-xs"
              >
                Clear all
              </button>
            </div>
          )}

          <ul className="py-1.5">
            {allItems.map((item, idx) => {
              const isSelected = idx === selectedIndex
              const isRecent = item.type === 'recent'

              return (
                <li
                  key={`${item.type}-${item.text}-${idx}`}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => selectItem(item.text)}
                  className={`flex items-center justify-between px-4 py-2 text-sm cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-zinc-800/80 text-blue-600 dark:text-zinc-100'
                      : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {isRecent ? (
                      <HistoryIcon className="size-3.5 shrink-0 text-slate-400 dark:text-zinc-500" />
                    ) : (
                      <SearchIcon className="size-3.5 shrink-0 text-slate-400 dark:text-zinc-500" />
                    )}
                    <span className="truncate">{item.text}</span>
                  </div>

                  {isRecent && (
                    <button
                      type="button"
                      onClick={(e) => removeRecentSearch(item.text, e)}
                      className="p-1 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
                      title="Remove from history"
                    >
                      <CloseIcon className="size-3" />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
