import { useEffect, useId, useRef } from 'react'

export type IntentPickerOption<T extends string> = {
  value: T
  label: string
}

type IntentFieldPickerProps<T extends string> = {
  value: T
  options: IntentPickerOption<T>[]
  onChange: (value: T) => void
  disabled?: boolean
  variant: 'budget' | 'cell'
  ariaLabel: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function IntentFieldPicker<T extends string>({
  value,
  options,
  onChange,
  disabled = false,
  variant,
  ariaLabel,
  open,
  onOpenChange,
}: IntentFieldPickerProps<T>) {
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const selected = options.find((o) => o.value === value) ?? options[0]

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) onOpenChange(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onOpenChange])

  const toggle = () => {
    if (disabled) return
    onOpenChange(!open)
  }

  const pick = (next: T) => {
    onChange(next)
    onOpenChange(false)
  }

  return (
    <div
      ref={rootRef}
      className={[
        'v4-iu-picker',
        `v4-iu-picker--${variant}`,
        open ? 'is-open' : '',
        disabled ? 'is-disabled' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        type="button"
        className="v4-iu-picker-trigger"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listId}
        onClick={toggle}
      >
        <span className="v4-iu-picker-value">{selected?.label ?? '—'}</span>
        <span className="v4-iu-picker-chevron" aria-hidden />
      </button>
      {open && (
        <div id={listId} className="v4-iu-picker-panel" role="listbox" aria-label={ariaLabel}>
          {options.map((opt) => (
            <button
              key={opt.value || '__empty'}
              type="button"
              role="option"
              aria-selected={opt.value === value}
              className={[
                'v4-iu-picker-chip',
                opt.value === value ? 'is-selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => pick(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
