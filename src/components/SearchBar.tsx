import { useState, useEffect, useRef, type FormEvent, type KeyboardEvent } from 'react'
import { Atom, ChevronDown, Check } from 'lucide-react'
import { SearchIcon, CloseIcon, HistoryIcon } from './icons'
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

const AI_MODELS = [
  '6 Luna',
  'DeepSeek R1',
  'Claude 3.5 Sonnet',
  'GPT-4o',
  'Gemini 1.5 Pro',
]

const TIME_FILTERS = [
  'Any time',
  'Past 24 hours',
  'Past week',
  'Past month',
  'Past year',
]

// ==========================================
// Custom UI Glyphs matching the user's reference design
// ==========================================

function ToolsTwoNodeIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="5" cy="6.5" r="2.5" />
      <path d="M8 6.5h8" />
      <path d="M4 13.5h8" />
      <circle cx="15" cy="13.5" r="2.5" />
    </svg>
  )
}

function SparklesChatIcon({ className = 'size-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      <path d="M12 7c0 2-1 3-3 3 2 0 3 1 3 3 0-2 1-3 3-3-2 0-3-1-3-3z" fill="currentColor" stroke="none" />
    </svg>
  )
}

function AudioWaveformIcon({ className = 'size-3.5', active = false }: { className?: string; active?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className}>
      <rect x="2.5" y="4.5" width="2" height="7" rx="1" className={active ? 'animate-pulse' : ''} />
      <rect x="7" y="2" width="2" height="12" rx="1" className={active ? 'animate-pulse delay-75' : ''} />
      <rect x="11.5" y="5.5" width="2" height="5" rx="1" className={active ? 'animate-pulse delay-150' : ''} />
    </svg>
  )
}

export function SearchBar({
  value,
  onChange,
  onSubmit,
  compact = false,
  autoFocus,
  placeholder = 'Ask anything privately',
}: Props) {
  const [focused, setFocused] = useState(false)
  const [listening, setListening] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)

  // Interactive controls matching reference UI
  const [modeTab, setModeTab] = useState<'search' | 'ai'>('ai')
  const [reasoningActive, setReasoningActive] = useState(false)
  const [selectedModel, setSelectedModel] = useState('6 Luna')
  const [modelMenuOpen, setModelMenuOpen] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [timeFilter, setTimeFilter] = useState('Any time')

  const containerRef = useRef<HTMLDivElement>(null)
  const modelMenuRef = useRef<HTMLDivElement>(null)
  const toolsMenuRef = useRef<HTMLDivElement>(null)

  // Load recent searches on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_KEY)
      if (saved) {
        setRecentSearches(JSON.parse(saved))
      }
    } catch {}
  }, [])

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false)
        setModelMenuOpen(false)
        setToolsOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
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

  const allItems: { type: 'suggestion' | 'recent'; text: string }[] = value.trim()
    ? [
        ...recentSearches
          .filter((t) => t.toLowerCase().includes(value.toLowerCase()) && t.toLowerCase() !== value.toLowerCase())
          .map((text) => ({ type: 'recent' as const, text })),
        ...suggestions
          .filter((s) => !recentSearches.some((r) => r.toLowerCase() === s.toLowerCase()))
          .map((text) => ({ type: 'suggestion' as const, text })),
      ]
    : recentSearches.map((text) => ({ type: 'recent' as const, text }))

  function handleSubmit(e?: FormEvent) {
    if (e) e.preventDefault()
    const finalQuery = selectedIndex >= 0 && allItems[selectedIndex] ? allItems[selectedIndex].text : value
    if (finalQuery.trim()) {
      saveRecentSearch(finalQuery)
      onSubmit(finalQuery.trim())
      setSuggestions([])
      setFocused(false)
    }
  }

  function selectItem(text: string) {
    onChange(text)
    saveRecentSearch(text)
    onSubmit(text)
    setSuggestions([])
    setFocused(false)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < allItems.length - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > -1 ? prev - 1 : -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      setSuggestions([])
      setFocused(false)
    }
  }

  // Voice Search via Web Speech API (retaining Mic functionality)
  function handleVoiceSearch() {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: typeof window.webkitSpeechRecognition }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: typeof window.webkitSpeechRecognition }).webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert('Voice search is not supported in this browser.')
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.lang = 'en-US'
      recognition.interimResults = false

      recognition.onstart = () => setListening(true)
      recognition.onend = () => setListening(false)
      recognition.onerror = () => setListening(false)

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        if (transcript) {
          onChange(transcript)
          saveRecentSearch(transcript)
          onSubmit(transcript)
        }
      }

      recognition.start()
    } catch {
      setListening(false)
    }
  }

  const showDropdown = focused && (allItems.length > 0 || (recentSearches.length > 0 && !value.trim()))

  return (
    <div ref={containerRef} className={`relative w-full ${compact ? 'max-w-2xl' : 'max-w-2xl mx-auto'}`}>
      <form onSubmit={handleSubmit} className="w-full">
        <div
          className={`rounded-2xl sm:rounded-[24px] bg-[#f8fafc] dark:bg-[#1a1b1e] border transition-all duration-200 select-none ${
            focused
              ? 'border-slate-300 dark:border-zinc-700 shadow-[0_4px_30px_rgba(0,0,0,0.5)] ring-1 ring-slate-400/20 dark:ring-zinc-600/30'
              : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 shadow-sm'
          }`}
        >
          {/* Top Row: Clean Input Field (no camera or left search icon) + Search/Ask AI Pill */}
          <div className="flex items-center justify-between px-4 sm:px-5 pt-3 sm:pt-3.5 pb-2 gap-2">
            {/* Input field with reference placeholder */}
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

            {/* Clear Button (appears when query is typed) */}
            {value.trim() && (
              <button
                type="button"
                onClick={() => {
                  onChange('')
                  setSuggestions([])
                }}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                title="Clear"
              >
                <CloseIcon className="size-3.5" />
              </button>
            )}

            {/* Segmented Pill: [Search] [Ask AI] */}
            <div className="flex items-center p-0.5 rounded-full bg-slate-200/80 dark:bg-[#28292d] text-xs font-medium shrink-0">
              <button
                type="button"
                onClick={() => {
                  setModeTab('search')
                  if (value.trim()) handleSubmit()
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                  modeTab === 'search'
                    ? 'bg-white dark:bg-[#121315] text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                }`}
              >
                <SearchIcon className="size-3.5" />
                <span>Search</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setModeTab('ai')
                  if (value.trim()) handleSubmit()
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                  modeTab === 'ai'
                    ? 'bg-white dark:bg-[#121315] text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                }`}
              >
                <SparklesChatIcon className="size-3.5" />
                <span>Ask AI</span>
              </button>
            </div>
          </div>

          {/* Bottom Toolbar: Tools on Left, Reasoning / Model / Mic on Right */}
          <div className="flex items-center justify-between px-4 sm:px-5 pb-2.5 sm:pb-3 pt-0.5 text-xs text-slate-600 dark:text-zinc-400">
            {/* Left: Tools button */}
            <div className="relative" ref={toolsMenuRef}>
              <button
                type="button"
                onClick={() => setToolsOpen(!toolsOpen)}
                className={`flex items-center gap-1.5 font-medium transition-colors cursor-pointer py-1 ${
                  toolsOpen || timeFilter !== 'Any time'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Search Tools & Filters"
              >
                <ToolsTwoNodeIcon className="size-3.5 sm:size-4" />
                <span>Tools</span>
              </button>

              {/* Tools dropdown */}
              {toolsOpen && (
                <div className="absolute left-0 bottom-full mb-2 w-48 rounded-xl bg-white dark:bg-[#1c1d21] border border-slate-200 dark:border-zinc-800 shadow-xl p-1.5 z-50 animate-in fade-in duration-100">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-zinc-500 px-2 py-1 block">
                    Time Filter
                  </span>
                  {TIME_FILTERS.map((tf) => (
                    <button
                      key={tf}
                      type="button"
                      onClick={() => {
                        setTimeFilter(tf)
                        setToolsOpen(false)
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <span>{tf}</span>
                      {timeFilter === tf && <Check className="size-3 text-blue-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Reasoning Toggle, Model Selector, Audio Waveform Mic */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              {/* Reasoning Button */}
              <button
                type="button"
                onClick={() => setReasoningActive(!reasoningActive)}
                className={`flex items-center gap-1.5 font-medium transition-all cursor-pointer px-2 py-1 rounded-lg ${
                  reasoningActive
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40'
                    : 'text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Toggle deep reasoning mode"
              >
                <Atom className="size-3.5 sm:size-4" />
                <span className="text-xs">Reasoning</span>
              </button>

              {/* Model Selector Pill (e.g. 6 Luna ∨) */}
              <div className="relative" ref={modelMenuRef}>
                <button
                  type="button"
                  onClick={() => setModelMenuOpen(!modelMenuOpen)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-200/70 dark:bg-[#28292d] text-slate-700 dark:text-zinc-200 hover:bg-slate-300/70 dark:hover:bg-zinc-700 transition-colors font-medium cursor-pointer text-xs"
                  title="Choose AI Model"
                >
                  <span>{selectedModel}</span>
                  <ChevronDown className="size-3 opacity-70" />
                </button>

                {/* Model dropdown menu */}
                {modelMenuOpen && (
                  <div className="absolute right-0 bottom-full mb-2 w-44 rounded-xl bg-white dark:bg-[#1c1d21] border border-slate-200 dark:border-zinc-800 shadow-xl p-1.5 z-50 animate-in fade-in duration-100">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-zinc-500 px-2 py-1 block">
                      AI Model
                    </span>
                    {AI_MODELS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setSelectedModel(m)
                          setModelMenuOpen(false)
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      >
                        <span>{m}</span>
                        {selectedModel === m && <Check className="size-3 text-blue-500" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Voice Mic Button (Audio Waveform glyph) */}
              <button
                type="button"
                onClick={handleVoiceSearch}
                className={`size-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  listening
                    ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30'
                    : 'bg-slate-200/80 dark:bg-[#34353a] text-slate-700 dark:text-zinc-200 hover:bg-slate-300 dark:hover:bg-zinc-600'
                }`}
                title="Search by voice"
                aria-label="Search by voice"
              >
                <AudioWaveformIcon className="size-3 sm:size-3.5" active={listening} />
              </button>
            </div>
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
                className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 cursor-pointer text-[11px]"
              >
                Clear all
              </button>
            </div>
          )}

          <ul className="py-1.5 max-h-72 overflow-y-auto">
            {allItems.map((item, idx) => {
              const isRecent = item.type === 'recent'
              const isSelected = idx === selectedIndex

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
