import { PublicMozbotV6 } from '@mozbot.io/schemas'
import { isInputBlock } from '@mozbot.io/schemas/helpers'

export const parseBlockIdVariableIdMap = (
  groups?: PublicMozbotV6['groups']
): {
  [key: string]: string
} => {
  if (!groups) return {}
  const blockIdVariableIdMap: { [key: string]: string } = {}
  groups.forEach((group) => {
    group.blocks.forEach((block) => {
      if (isInputBlock(block) && block.options?.variableId) {
        blockIdVariableIdMap[block.id] = block.options.variableId
      }
    })
  })
  return blockIdVariableIdMap
}
