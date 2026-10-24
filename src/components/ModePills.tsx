import { MODES } from './modes'

type Props = {
  active: string
  onChange: (id: string) => void
  compact?: boolean
  showAllOnly?: boolean
}

export function ModePills({ active, onChange, compact = false }: Props) {
  // Show all modes in results view or hero view
  const heroModes = compact ? MODES : MODES.slice(0, 5)

  return (
    <div
      className={`flex items-center transition-all duration-200 ${
        compact
          ? 'flex-nowrap justify-start gap-1 sm:gap-1.5 overflow-x-auto max-w-full px-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
          : 'flex-wrap sm:flex-nowrap justify-center gap-2.5 max-w-2xl mx-auto'
      }`}
    >
      {heroModes.map(({ id, label, Icon }) => {
        const selected = id === active || (active === 'web' && id === 'all')
        return (
          <button
            key={id}
            onClick={() => onChange(id === 'all' ? 'web' : id)}
            aria-pressed={selected}
            className={`group flex shrink-0 items-center gap-2 rounded-full font-sans transition-all duration-150 ease-out cursor-pointer select-none ${
              compact
                ? 'px-3 py-1.5 text-xs'
                : 'px-4 py-2 text-[13.5px]'
            } ${
              selected
                ? 'bg-blue-50 dark:bg-zinc-800 text-blue-600 dark:text-zinc-100 border border-blue-200/80 dark:border-zinc-700 shadow-sm font-medium'
                : 'bg-white dark:bg-zinc-900/80 text-slate-700 dark:text-zinc-400 border border-slate-200/90 dark:border-zinc-800/90 hover:bg-slate-50 dark:hover:bg-zinc-800/60 hover:text-slate-900 dark:hover:text-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.04)]'
            }`}
          >
            <Icon
              className={`size-4 shrink-0 transition-colors ${
                selected
                  ? 'text-blue-600 dark:text-zinc-100'
                  : 'text-slate-500 dark:text-zinc-500 group-hover:text-slate-700 dark:group-hover:text-zinc-300'
              }`}
            />
            <span>{label}</span>
          </button>
        )
      })}
    </div>
  )
}
