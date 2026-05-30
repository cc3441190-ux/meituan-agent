import { useEffect, useState } from 'react'
import type { IntentFormState } from '../../v4/intentConstraintForm'
import { INTENT_BUDGET_OPTIONS, INTENT_SCENE_OPTIONS } from '../../v4/intentConstraintForm'
import { IntentFieldPicker } from './IntentFieldPicker'

type IntentUnderstandingFieldsProps = {
  form: IntentFormState
  disabled: boolean
  isVague: boolean
  onChange: (patch: Partial<IntentFormState>) => void
  onBudgetChange: (budget: IntentFormState['budget']) => void
  budgetLabel: string
}

type OpenPicker = 'budget' | 'scene' | null

export function IntentUnderstandingFields({
  form,
  disabled,
  isVague,
  onChange,
  onBudgetChange,
  budgetLabel,
}: IntentUnderstandingFieldsProps) {
  const [openPicker, setOpenPicker] = useState<OpenPicker>(null)

  useEffect(() => {
    if (disabled) setOpenPicker(null)
  }, [disabled])

  const sceneOptions = isVague
    ? INTENT_SCENE_OPTIONS
    : INTENT_SCENE_OPTIONS.filter((o) => o.value !== 'hot_vague')

  const activeClass = disabled ? '' : 'is-active'
  const budgetActive = Boolean(form.budget) && !disabled

  const setPicker = (key: OpenPicker) => (open: boolean) => {
    setOpenPicker(open ? key : null)
  }

  return (
    <>
      <div
        className={[
          'v4-intent-budget',
          'v4-intent-budget--editable',
          budgetActive ? 'v4-intent-budget--active' : '',
          openPicker === 'budget' ? 'v4-intent-budget--open' : '',
          form.budget ? `v4-intent-budget--${form.budget}` : 'v4-intent-budget--unknown',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span className="v4-intent-budget-icon" aria-hidden>
          ¥
        </span>
        <div className="v4-intent-budget-body">
          <span className="v4-intent-budget-label">{budgetLabel}</span>
          <IntentFieldPicker
            variant="budget"
            ariaLabel="预算"
            disabled={disabled}
            value={form.budget}
            options={INTENT_BUDGET_OPTIONS}
            open={openPicker === 'budget'}
            onOpenChange={setPicker('budget')}
            onChange={onBudgetChange}
          />
        </div>
      </div>

      <div className="v4-intent-understanding v4-intent-understanding--editable">
        <label className={activeClass}>
          <span>时长</span>
          <span className="v4-iu-row">
            <input
              className="v4-iu-value v4-iu-num"
              type="number"
              min={3}
              max={8}
              step={1}
              disabled={disabled}
              value={form.timeHours}
              aria-label="时长（小时）"
              onChange={(e) => onChange({ timeHours: Number(e.target.value) || 4 })}
            />
            <span className="v4-iu-unit">小时</span>
          </span>
        </label>

        <label className={activeClass}>
          <span>出发地</span>
          <input
            className="v4-iu-value"
            type="text"
            disabled={disabled}
            placeholder="当前位置"
            value={form.originName}
            aria-label="出发地"
            onChange={(e) => onChange({ originName: e.target.value })}
          />
        </label>

        <label className={activeClass}>
          <span>同行人</span>
          <input
            className="v4-iu-value"
            type="text"
            disabled={disabled}
            placeholder="家庭、情侣…"
            value={form.peopleText}
            aria-label="同行人"
            onChange={(e) => onChange({ peopleText: e.target.value })}
          />
        </label>

        <div
          className={[
            'v4-iu-cell',
            activeClass,
            openPicker === 'scene' ? 'v4-iu-cell--open' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className="v4-iu-cell-label">场景</span>
          <IntentFieldPicker
            variant="cell"
            ariaLabel="场景"
            disabled={disabled}
            value={form.sceneMode}
            options={sceneOptions}
            open={openPicker === 'scene'}
            onOpenChange={setPicker('scene')}
            onChange={(sceneMode) => onChange({ sceneMode })}
          />
        </div>

        <label className={`v4-iu-full ${activeClass}`}>
          <span>偏好</span>
          <input
            className="v4-iu-value"
            type="text"
            disabled={disabled}
            placeholder="逛街散步、看展文化…"
            value={form.preferencesText}
            aria-label="偏好"
            onChange={(e) => onChange({ preferencesText: e.target.value })}
          />
        </label>
      </div>
    </>
  )
}
