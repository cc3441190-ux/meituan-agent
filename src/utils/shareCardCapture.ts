import html2canvas from 'html2canvas'

/**
 * 将 DOM 节点导出为 PNG（用于系统分享 / 保存图片）
 * 使用 html2canvas，确保 CSS 样式在 Windows Chrome 下完整渲染
 */
export async function captureElementAsPng(
  element: HTMLElement,
  scale = 2,
): Promise<Blob> {
  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#faf8f3',
    logging: false,
    // 强制包含滚动区域完整内容
    scrollX: 0,
    scrollY: 0,
  })

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png', 0.92),
  )
  if (!blob) throw new Error('html2canvas: blob 生成失败')
  return blob
}

export function downloadPngBlob(blob: Blob, filename = '行程卡片.png'): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function sharePngBlob(
  blob: Blob,
  meta: { title: string; text?: string },
): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], '行程卡片.png', { type: 'image/png' })
  const payload: ShareData = {
    title: meta.title,
    text: meta.text,
    files: [file],
  }

  if (typeof navigator.share === 'function') {
    try {
      if (navigator.canShare?.(payload)) {
        await navigator.share(payload)
        return 'shared'
      }
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] })
        return 'shared'
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err
    }
  }

  downloadPngBlob(blob)
  return 'downloaded'
}
