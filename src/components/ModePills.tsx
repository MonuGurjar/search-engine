import { MODES } from './modes'

type Props = {
  active: string
  onChange: (id: string) => void
  compact?: boolean
}

export function ModePills({ active, onChange, compact = false }: Props) {
  return (
    <div className="flex flex-nowrap items-center justify-start sm:justify-center gap-1.5 sm:gap-2 overflow-x-auto max-w-full py-1 px-1 sm:px-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {MODES.map(({ id, label, Icon }) => {
        const selected = id === active
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            aria-pressed={selected}
            className={`group flex shrink-0 items-center gap-1.5 sm:gap-2 rounded-full text-void-ink backdrop-blur-md transition-all duration-200 ease-out hover:-translate-y-0.5 cursor-pointer ${
              compact
                ? 'px-3 sm:px-3.5 py-1.5 text-[12.5px]'
                : 'px-3.5 sm:px-4 py-1.5 text-[13px] sm:text-[13.5px]'
            }`}
            style={{
              background: 'rgba(255,255,255,0.95)',
              border: `1px solid ${selected ? 'rgba(47,125,84,0.45)' : 'rgba(224,229,231,0.95)'}`,
              boxShadow: selected
                ? '0 12px 28px -14px rgba(37,54,60,0.45), 0 1px 2px rgba(37,54,60,0.05)'
                : '0 8px 22px -16px rgba(37,54,60,0.35), 0 1px 2px rgba(37,54,60,0.04)',
            }}
          >
            <Icon
              className="size-3.5 sm:size-4 shrink-0"
              style={{ color: selected ? 'var(--color-void-green)' : 'var(--color-void-ink)' }}
            />
            <span className="font-medium tracking-wide">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
