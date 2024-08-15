import { ExecuteLogicResponse } from '../../../types'
import { ScriptBlock, SessionState, Variable } from '@mozbot.io/schemas'
import { extractVariablesFromText } from '@mozbot.io/variables/extractVariablesFromText'
import { parseGuessedValueType } from '@mozbot.io/variables/parseGuessedValueType'
import { parseVariables } from '@mozbot.io/variables/parseVariables'
import { defaultScriptOptions } from '@mozbot.io/schemas/features/blocks/logic/script/constants'
import { executeFunction } from '@mozbot.io/variables/executeFunction'
import { updateVariablesInSession } from '@mozbot.io/variables/updateVariablesInSession'

export const executeScript = async (
  state: SessionState,
  block: ScriptBlock
): Promise<ExecuteLogicResponse> => {
  const { variables } = state.mozbotsQueue[0].mozbot
  if (!block.options?.content || state.whatsApp)
    return { outgoingEdgeId: block.outgoingEdgeId }

  const isExecutedOnClient =
    block.options.isExecutedOnClient ?? defaultScriptOptions.isExecutedOnClient

  if (!isExecutedOnClient || state.whatsApp) {
    const { newVariables, error } = await executeFunction({
      variables,
      body: block.options.content,
    })

    const updateVarResults = newVariables
      ? updateVariablesInSession({
          newVariables,
          state,
          currentBlockId: block.id,
        })
      : undefined

    let newSessionState = state

    if (updateVarResults) {
      newSessionState = updateVarResults.updatedState
    }

    return {
      outgoingEdgeId: block.outgoingEdgeId,
      logs: error ? [{ status: 'error', description: error }] : [],
      newSessionState,
      newSetVariableHistory: updateVarResults?.newSetVariableHistory,
    }
  }

  const scriptToExecute = parseScriptToExecuteClientSideAction(
    variables,
    block.options.content
  )

  return {
    outgoingEdgeId: block.outgoingEdgeId,
    clientSideActions: [
      {
        type: 'scriptToExecute',
        scriptToExecute: scriptToExecute,
      },
    ],
  }
}

export const parseScriptToExecuteClientSideAction = (
  variables: Variable[],
  contentToEvaluate: string
) => {
  const content = parseVariables(variables, { fieldToParse: 'id' })(
    contentToEvaluate
  )
  const args = extractVariablesFromText(variables)(contentToEvaluate).map(
    (variable) => ({
      id: variable.id,
      value: parseGuessedValueType(variable.value),
    })
  )
  return {
    content,
    args,
  }
}
