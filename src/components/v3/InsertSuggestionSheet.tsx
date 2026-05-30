import type { InsertSuggestion } from '../../v3/types'

interface InsertSuggestionSheetProps {
  open: boolean
  suggestion: InsertSuggestion | null
  onClose: () => void
  onJoin: () => void
}

export function InsertSuggestionSheet({
  open,
  suggestion,
  onClose,
  onJoin,
}: InsertSuggestionSheetProps) {
  if (!open || !suggestion) return null

  return (
    <>
      <div className="overlay show" onClick={onClose} />
      <div className="v3-insert-sheet open">
        <div className="panel-handle" />
        <h2 className="v3-insert-title">在两站之间插入新场景</h2>
        <p className="v3-insert-poi">{suggestion.poi.name}</p>
        <p className="v3-insert-between">插入位置：{suggestion.insertBetween}</p>
        <ul className="v3-insert-facts">
          <li>+{suggestion.addMinutes} 分钟</li>
          <li>步行增加 {suggestion.walkMinutes} 分钟</li>
          {suggestion.dinnerDelay && <li>晚餐建议延后至 {suggestion.dinnerDelay}</li>}
          {suggestion.warning && <li className="v3-insert-warn">{suggestion.warning}</li>}
        </ul>
        <p className="v3-insert-hint">替换已有站点请点该站卡片上的「换一个」</p>
        <div className="v3-insert-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            取消
          </button>
          <button type="button" className="btn btn-primary" onClick={onJoin}>
            插入行程
          </button>
        </div>
      </div>
    </>
  )
}
