import { byId } from '@mozbot.io/lib'
import {
  MakeComBlock,
  PabblyConnectBlock,
  ChatLog,
  VariableWithUnknowValue,
  HttpRequestBlock,
  ZapierBlock,
} from '@mozbot.io/schemas'
import { SessionState } from '@mozbot.io/schemas/features/chat/sessionState'
import { ExecuteIntegrationResponse } from '../../../types'
import { parseVariables } from '@mozbot.io/variables/parseVariables'
import { updateVariablesInSession } from '@mozbot.io/variables/updateVariablesInSession'
import { createHttpReqResponseMappingRunner } from '@mozbot.io/variables/codeRunners'

type Props = {
  state: SessionState
  block: HttpRequestBlock | ZapierBlock | MakeComBlock | PabblyConnectBlock
  logs?: ChatLog[]
  response: {
    statusCode: number
    data?: unknown
  }
}

export const resumeWebhookExecution = ({
  state,
  block,
  logs = [],
  response,
}: Props): ExecuteIntegrationResponse => {
  const { mozbot } = state.mozbotsQueue[0]
  const status = response.statusCode.toString()
  const isError = status.startsWith('4') || status.startsWith('5')

  const responseFromClient = logs.length === 0

  if (responseFromClient)
    logs.push(
      isError
        ? {
            status: 'error',
            description: `Webhook returned error`,
            details: response.data,
          }
        : {
            status: 'success',
            description: `Webhook executed successfully!`,
            details: response.data,
          }
    )

  let run: (varMapping: string) => unknown
  if (block.options?.responseVariableMapping) {
    run = createHttpReqResponseMappingRunner(response)
  }
  const newVariables = block.options?.responseVariableMapping?.reduce<
    VariableWithUnknowValue[]
  >((newVariables, varMapping) => {
    if (!varMapping?.bodyPath || !varMapping.variableId || !run)
      return newVariables
    const existingVariable = mozbot.variables.find(byId(varMapping.variableId))
    if (!existingVariable) return newVariables

    try {
      const value: unknown = run(
        parseVariables(mozbot.variables)(varMapping?.bodyPath)
      )
      return [...newVariables, { ...existingVariable, value }]
    } catch (err) {
      return newVariables
    }
  }, [])
  if (newVariables && newVariables.length > 0) {
    const { updatedState, newSetVariableHistory } = updateVariablesInSession({
      newVariables,
      state,
      currentBlockId: block.id,
    })
    return {
      outgoingEdgeId: block.outgoingEdgeId,
      newSessionState: updatedState,
      newSetVariableHistory,
      logs,
    }
  }

  return {
    outgoingEdgeId: block.outgoingEdgeId,
    logs,
  }
}
