import { MozbotViewerProps } from '@/components/MozbotViewer'
import { executeCondition } from '@/features/blocks/logic/condition'
import { executeRedirect } from '@/features/blocks/logic/redirect'
import { executeSetVariable } from '@/features/blocks/logic/setVariable'
import { executeMozbotLink } from '@/features/blocks/logic/mozbotLink'
import { executeWait } from '@/features/blocks/logic/wait'
import { LinkedMozbot } from '@/providers/MozbotProvider'
import { EdgeId, LogicState } from '@/types'
import { LogicBlock } from '@mozbot.io/schemas'
import { executeScript } from '@/features/blocks/logic/script/executeScript'
import { LogicBlockType } from '@mozbot.io/schemas/features/blocks/logic/constants'

export const executeLogic = async (
  block: LogicBlock,
  context: LogicState
): Promise<{
  nextEdgeId?: EdgeId
  linkedMozbot?: MozbotViewerProps['mozbot'] | LinkedMozbot
  blockedPopupUrl?: string
}> => {
  switch (block.type) {
    case LogicBlockType.SET_VARIABLE:
      return { nextEdgeId: executeSetVariable(block, context) }
    case LogicBlockType.CONDITION:
      return { nextEdgeId: executeCondition(block, context) }
    case LogicBlockType.REDIRECT:
      return executeRedirect(block, context)
    case LogicBlockType.SCRIPT:
      return { nextEdgeId: await executeScript(block, context) }
    case LogicBlockType.MOZBOT_LINK:
      return executeMozbotLink(block, context)
    case LogicBlockType.WAIT:
      return { nextEdgeId: await executeWait(block, context) }
    default:
      return {}
  }
}
