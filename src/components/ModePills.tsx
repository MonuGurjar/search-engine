import { MODES } from './modes'

type Props = {
  active: string
  onChange: (id: string) => void
  compact?: boolean
}

export function ModePills({ active, onChange, compact = false }: Props) {
  return (
    <div
      className="flex flex-row flex-nowrap items-center justify-center gap-2 overflow-x-auto no-scrollbar max-w-full px-1 py-1 select-none"
      style={{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'nowrap',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      {MODES.map(({ id, label, Icon }) => {
        const selected = id === active
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            aria-pressed={selected}
            className={`group shrink-0 whitespace-nowrap flex items-center gap-1.5 rounded-full text-void-ink backdrop-blur-md transition-all duration-200 ease-out hover:-translate-y-0.5 cursor-pointer sm:gap-2 ${
              compact
                ? 'px-3 py-1.5 text-[12.5px] sm:px-3.5 sm:text-[13px]'
                : 'px-3.5 py-1.5 text-[13px] sm:px-4 sm:py-2 sm:text-[14px]'
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
              className="size-3.5 shrink-0 sm:size-4"
              style={{ color: selected ? 'var(--color-void-green)' : 'var(--color-void-ink)' }}
            />
            <span className="font-medium tracking-wide">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
