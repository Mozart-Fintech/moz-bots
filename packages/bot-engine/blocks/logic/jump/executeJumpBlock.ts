import { addEdgeToMozbot, createPortalEdge } from '../../../addEdgeToMozbot'
import { ExecuteLogicResponse } from '../../../types'
import { TRPCError } from '@trpc/server'
import { SessionState } from '@mozbot.io/schemas'
import { JumpBlock } from '@mozbot.io/schemas/features/blocks/logic/jump'

export const executeJumpBlock = (
  state: SessionState,
  { groupId, blockId }: JumpBlock['options'] = {}
): ExecuteLogicResponse => {
  if (!groupId) return { outgoingEdgeId: undefined }
  const { mozbot } = state.mozbotsQueue[0]
  const groupToJumpTo = mozbot.groups.find((group) => group.id === groupId)
  const blockToJumpTo =
    groupToJumpTo?.blocks.find((block) => block.id === blockId) ??
    groupToJumpTo?.blocks[0]

  if (!blockToJumpTo)
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Block to jump to is not found',
    })

  const portalEdge = createPortalEdge({
    to: { groupId, blockId: blockToJumpTo?.id },
  })
  const newSessionState = addEdgeToMozbot(state, portalEdge)

  return { outgoingEdgeId: portalEdge.id, newSessionState }
}
