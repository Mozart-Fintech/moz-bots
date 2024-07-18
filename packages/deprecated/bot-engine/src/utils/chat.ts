import { BubbleBlock, InputBlock, Block } from '@mozbot.io/schemas'
import { isInputBlock, isBubbleBlock } from '@mozbot.io/schemas/helpers'
import type { MozbotPostMessageData } from 'mozbot-js'
import { BubbleBlockType } from '@mozbot.io/schemas/features/blocks/bubbles/constants'
import { InputBlockType } from '@mozbot.io/schemas/features/blocks/inputs/constants'

export const getLastChatBlockType = (
  blocks: Block[]
): BubbleBlockType | InputBlockType | undefined => {
  const displayedBlocks = blocks.filter(
    (s) => isBubbleBlock(s) || isInputBlock(s)
  ) as (BubbleBlock | InputBlock)[]
  return displayedBlocks.pop()?.type
}

export const sendEventToParent = (data: MozbotPostMessageData) => {
  try {
    window.top?.postMessage(
      {
        from: 'mozbot',
        ...data,
      },
      '*'
    )
  } catch (error) {
    console.error(error)
  }
}
