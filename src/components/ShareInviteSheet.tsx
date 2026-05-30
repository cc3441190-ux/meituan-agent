import { useRef, useState } from 'react'
import type { InviteCard } from '../core/ports'
import { captureElementAsPng, downloadPngBlob, sharePngBlob } from '../utils/shareCardCapture'
import { ShareTripCardVisual } from './ShareTripCardVisual'

interface ShareInviteSheetProps {
  open: boolean
  card: InviteCard | null
  audience: 'partner' | 'friends'
  loading?: boolean
  waitingFeedback?: boolean
  onClose: () => void
  onAudienceChange: (audience: 'partner' | 'friends') => void
  /** 分享卡片图片（系统分享或保存）成功后回调 */
  onShareCard: (card: InviteCard) => void
}

export function ShareInviteSheet({
  open,
  card,
  audience,
  loading,
  waitingFeedback,
  onClose,
  onAudienceChange,
  onShareCard,
}: ShareInviteSheetProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [sharing, setSharing] = useState(false)
  const [shareHint, setShareHint] = useState<string | null>(null)

  if (!open) return null

  const handleShare = async () => {
    if (!card || !cardRef.current || sharing) return
    setSharing(true)
    setShareHint(null)
    try {
      const blob = await captureElementAsPng(cardRef.current, 2)
      const result = await sharePngBlob(blob, {
        title: card.headline,
        text: card.routeLine,
      })
      setShareHint(
        result === 'shared'
          ? '已通过系统分享发出卡片'
          : '当前环境不支持直接分享，已保存卡片图片到相册/下载',
      )
      onShareCard(card)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setShareHint('生成卡片失败，请稍后重试')
    } finally {
      setSharing(false)
    }
  }

  const handleSave = async () => {
    if (!card || !cardRef.current || sharing) return
    setSharing(true)
    try {
      const blob = await captureElementAsPng(cardRef.current, 2)
      downloadPngBlob(blob)
      setShareHint('卡片已保存，可在微信中选择图片发送')
      onShareCard(card)
    } catch {
      setShareHint('保存失败，请稍后重试')
    } finally {
      setSharing(false)
    }
  }

  return (
    <>
      <div className={`overlay ${open ? 'show' : ''}`} onClick={onClose} />
      <div className={`share-invite-sheet ${open ? 'open' : ''}`}>
        <div className="panel-handle" />
        <div className="share-invite-header">
          <h2 className="share-invite-title">分享行程卡片</h2>
          <p className="share-invite-sub">
            以图片卡片发给家人/朋友，比复制文字更直观；对方留言会出现在「家人反馈」
          </p>
        </div>

        <div className="share-invite-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={audience === 'partner'}
            className={`share-invite-tab ${audience === 'partner' ? 'active' : ''}`}
            onClick={() => onAudienceChange('partner')}
          >
            👩‍❤️‍👨 家人版
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={audience === 'friends'}
            className={`share-invite-tab ${audience === 'friends' ? 'active' : ''}`}
            onClick={() => onAudienceChange('friends')}
          >
            👯 朋友版
          </button>
        </div>

        {loading || !card ? (
          <div className="share-invite-loading">Agent 正在生成分享卡片…</div>
        ) : (
          <ShareTripCardVisual card={card} audience={audience} exportRef={cardRef} />
        )}

        {shareHint && (
          <p className="share-invite-share-hint" role="status">
            {shareHint}
          </p>
        )}

        {waitingFeedback && (
          <p className="share-invite-waiting" role="status">
            等待同伴查看方案并留言…
          </p>
        )}

        <div className="share-invite-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            稍后再说
          </button>
          <button
            type="button"
            className="btn share-invite-save-btn"
            onClick={handleSave}
            disabled={!card || loading || sharing}
          >
            保存图片
          </button>
          <button
            type="button"
            className="btn share-invite-share-btn"
            onClick={handleShare}
            disabled={!card || loading || sharing}
          >
            {sharing ? '生成中…' : '分享卡片'}
          </button>
        </div>
      </div>
    </>
  )
}
