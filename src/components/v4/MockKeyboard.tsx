const ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['⇧', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫'],
]

type MockKeyboardProps = {
  onDismiss?: () => void
}

export function MockKeyboard({ onDismiss }: MockKeyboardProps) {
  return (
    <div className="v4-ios-keyboard" role="presentation" onMouseDown={(e) => e.preventDefault()}>
      <div className="v4-ios-keyboard-toolbar">
        <button type="button" className="v4-ios-keyboard-done" onClick={onDismiss}>
          完成
        </button>
      </div>
      <div className="v4-ios-keyboard-body">
        {ROWS.map((row, rowIdx) => (
          <div className="v4-ios-keyboard-row" key={rowIdx}>
            {row.map((key) => (
              <span
                key={key}
                className={`v4-ios-key ${key.length > 1 ? 'v4-ios-key--wide' : ''} ${key === '⇧' || key === '⌫' ? 'v4-ios-key--func' : ''}`}
              >
                {key}
              </span>
            ))}
          </div>
        ))}
        <div className="v4-ios-keyboard-row v4-ios-keyboard-row--bottom">
          <span className="v4-ios-key v4-ios-key--func">123</span>
          <span className="v4-ios-key v4-ios-key--space">空格</span>
          <span className="v4-ios-key v4-ios-key--func v4-ios-key--return">换行</span>
        </div>
      </div>
      <div className="v4-ios-keyboard-safe" />
    </div>
  )
}
