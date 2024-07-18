import { ConditionBlock, SessionState } from '@mozbot.io/schemas'
import { ExecuteLogicResponse } from '../../../types'
import { executeCondition } from '@mozbot.io/logic/executeCondition'
export const executeConditionBlock = (
  state: SessionState,
  block: ConditionBlock
): ExecuteLogicResponse => {
  const { variables } = state.mozbotsQueue[0].mozbot
  const passedCondition = block.items.find(
    (item) =>
      item.content && executeCondition({ variables, condition: item.content })
  )
  return {
    outgoingEdgeId: passedCondition
      ? passedCondition.outgoingEdgeId
      : block.outgoingEdgeId,
  }
}
