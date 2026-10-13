import { useState, type FormEvent } from 'react'
import { SearchIcon, MicIcon, CameraIcon, CloseIcon } from './icons'

type Props = {
  value: string
  onChange: (v: string) => void
  onSubmit: (v: string) => void
  compact?: boolean
  autoFocus?: boolean
  onHome?: () => void
  placeholder?: string
}

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

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (value.trim()) onSubmit(value.trim())
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

  return (
    <form
      onSubmit={handleSubmit}
      className={`w-full transition-all duration-200 ease-out ${
        compact ? 'max-w-2xl' : 'max-w-2xl mx-auto'
      }`}
    >
      <div
        className={`flex items-center rounded-full bg-white dark:bg-[#0e131f] border transition-all duration-200 ${
          compact ? 'px-4 py-2' : 'px-4 sm:px-5 py-2.5 sm:py-3'
        } ${
          focused
            ? 'border-blue-500/80 shadow-[0_4px_24px_rgba(37,99,235,0.15)] ring-1 ring-blue-500/30'
            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
        }`}
      >
        {/* Search Magnifying Glass Icon */}
        <SearchIcon
          className={`shrink-0 transition-colors ${
            compact ? 'size-4.5 mr-2.5' : 'size-5 mr-3'
          } ${focused ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}
        />

        {/* Text Input */}
        <input
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          aria-label={placeholder}
          className={`min-w-0 flex-1 bg-transparent outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-sans ${
            compact ? 'text-sm py-0.5' : 'text-[15px] sm:text-base py-0.5'
          }`}
        />

        {/* Clear Button (if text entered) */}
        {value.trim() && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer mr-1"
            title="Clear"
          >
            <CloseIcon className="size-4" />
          </button>
        )}

        {/* Vertical Divider */}
        <div className="h-5 w-px bg-slate-200 dark:bg-slate-700/80 mx-1.5 sm:mx-2 shrink-0" aria-hidden />

        {/* Right Actions: Voice & Camera Lens */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleVoiceSearch}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              listening
                ? 'text-red-500 bg-red-50 dark:bg-red-950/40 animate-pulse'
                : 'text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Search by voice"
            aria-label="Search by voice"
          >
            <MicIcon className="size-4 sm:size-4.5" />
          </button>

          <button
            type="button"
            onClick={handleLensUpload}
            className="p-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Search by image / Lens"
            aria-label="Search by image"
          >
            <CameraIcon className="size-4 sm:size-4.5" />
          </button>
        </div>
      </div>
    </form>
  )
}
