import { executeWait } from './blocks/logic/wait/executeWait'
import { LogicBlock, SessionState } from '@mozbot.io/schemas'
import { ExecuteLogicResponse } from './types'
import { executeScript } from './blocks/logic/script/executeScript'
import { executeJumpBlock } from './blocks/logic/jump/executeJumpBlock'
import { executeRedirect } from './blocks/logic/redirect/executeRedirect'
import { executeConditionBlock } from './blocks/logic/condition/executeConditionBlock'
import { executeSetVariable } from './blocks/logic/setVariable/executeSetVariable'
import { executeMozbotLink } from './blocks/logic/mozbotLink/executeMozbotLink'
import { executeAbTest } from './blocks/logic/abTest/executeAbTest'
import { LogicBlockType } from '@mozbot.io/schemas/features/blocks/logic/constants'

export const executeLogic =
  (state: SessionState) =>
  async (block: LogicBlock): Promise<ExecuteLogicResponse> => {
    switch (block.type) {
      case LogicBlockType.SET_VARIABLE:
        return executeSetVariable(state, block)
      case LogicBlockType.CONDITION:
        return executeConditionBlock(state, block)
      case LogicBlockType.REDIRECT:
        return executeRedirect(state, block)
      case LogicBlockType.SCRIPT:
        return executeScript(state, block)
      case LogicBlockType.MOZBOT_LINK:
        return executeMozbotLink(state, block)
      case LogicBlockType.WAIT:
        return executeWait(state, block)
      case LogicBlockType.JUMP:
        return executeJumpBlock(state, block.options)
      case LogicBlockType.AB_TEST:
        return executeAbTest(state, block)
    }
  }
