import type {
  BotProps,
  PopupProps,
  BubbleProps,
} from '@mozbot.io/js/dist/index'
import dynamic from 'next/dynamic.js'

export const Standard: React.ComponentType<
  BotProps & {
    style?: React.CSSProperties
    className?: string
  }
> = dynamic(() => import('@mozbot.io/react/src/Standard'), { ssr: false })

export const Popup: React.ComponentType<PopupProps> = dynamic(
  () => import('@mozbot.io/react/src/Popup'),
  {
    ssr: false,
  }
)

export const Bubble: React.ComponentType<BubbleProps> = dynamic(
  () => import('@mozbot.io/react/src/Bubble'),
  {
    ssr: false,
  }
)

export * from '@mozbot.io/js'
