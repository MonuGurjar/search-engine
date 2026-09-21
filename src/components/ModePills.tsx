import { MODES } from './modes'

type Props = {
  active: string
  onChange: (id: string) => void
  compact?: boolean
}

export function ModePills({ active, onChange, compact = false }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
      {MODES.map(({ id, label, Icon }) => {
        const selected = id === active
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            aria-pressed={selected}
            className={`group flex items-center gap-2 rounded-full text-void-ink backdrop-blur-md transition-all duration-200 ease-out hover:-translate-y-0.5 cursor-pointer ${
              compact
                ? 'px-3.5 py-1.5 text-[13px]'
                : 'px-4 py-2 text-[13px] sm:px-5 sm:py-2.5 sm:text-[15px]'
            }`}
            style={{
              background: 'rgba(255,255,255,0.96)',
              border: `1px solid ${selected ? 'rgba(47,125,84,0.4)' : 'rgba(224,229,231,0.95)'}`,
              boxShadow: selected
                ? '0 12px 28px -14px rgba(37,54,60,0.45), 0 1px 2px rgba(37,54,60,0.05)'
                : '0 8px 22px -16px rgba(37,54,60,0.4), 0 1px 2px rgba(37,54,60,0.04)',
            }}
          >
            <Icon
              className={compact ? 'size-4' : 'size-4 sm:size-[18px]'}
              style={{ color: selected ? 'var(--color-void-green)' : 'var(--color-void-ink)' }}
            />
            <span className="font-medium tracking-wide">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
