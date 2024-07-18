import { trackPixelEvent } from '@/lib/pixel'
import { isEmpty } from '@mozbot.io/lib/utils'
import type { PixelBlock } from '@mozbot.io/schemas'

export const executePixel = async (options: PixelBlock['options']) => {
  if (isEmpty(options?.pixelId)) return
  trackPixelEvent(options)
}
