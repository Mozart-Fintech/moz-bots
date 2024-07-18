import { IntegrationBlockType } from '@mozbot.io/schemas/features/blocks/integrations/constants'
import { ChatCompletionOpenAIOptions } from '@mozbot.io/schemas/features/blocks/integrations/openai'
import { OpenAI } from 'openai'
import { decryptV2 } from '@mozbot.io/lib/api/encryption/decryptV2'
import { forgedBlocks } from '@mozbot.io/forge-repository/definitions'
import { AsyncVariableStore } from '@mozbot.io/forge'
import {
  ParseVariablesOptions,
  parseVariables,
} from '@mozbot.io/variables/parseVariables'
import { getOpenAIChatCompletionStream } from './legacy/getOpenAIChatCompletionStream'
import { getCredentials } from '../queries/getCredentials'
import { getSession } from '../queries/getSession'
import { getBlockById } from '@mozbot.io/schemas/helpers'
import { isForgedBlockType } from '@mozbot.io/schemas/features/blocks/forged/helpers'
import { updateVariablesInSession } from '@mozbot.io/variables/updateVariablesInSession'
import { updateSession } from '../queries/updateSession'
import { deepParseVariables } from '@mozbot.io/variables/deepParseVariables'
import { saveSetVariableHistoryItems } from '../queries/saveSetVariableHistoryItems'

type Props = {
  sessionId: string
  messages: OpenAI.Chat.ChatCompletionMessage[] | undefined
}

export const getMessageStream = async ({
  sessionId,
  messages,
}: Props): Promise<{
  stream?: ReadableStream<any>
  status?: number
  message?: string
}> => {
  const session = await getSession(sessionId)

  if (!session?.state || !session.state.currentBlockId)
    return { status: 404, message: 'Could not find session' }

  const { group, block } = getBlockById(
    session.state.currentBlockId,
    session.state.mozbotsQueue[0].mozbot.groups
  )
  if (!block || !group)
    return {
      status: 404,
      message: 'Could not find block or group',
    }

  if (!('options' in block))
    return {
      status: 400,
      message: 'This block does not have options',
    }

  if (block.type === IntegrationBlockType.OPEN_AI && messages) {
    try {
      const stream = await getOpenAIChatCompletionStream(
        session.state,
        block.options as ChatCompletionOpenAIOptions,
        messages
      )
      if (!stream)
        return {
          status: 500,
          message: 'Could not create stream',
        }

      return { stream }
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        const { message } = error
        return {
          status: 500,
          message,
        }
      } else {
        throw error
      }
    }
  }
  if (!isForgedBlockType(block.type))
    return {
      status: 400,
      message: 'This block does not have a stream function',
    }

  const blockDef = forgedBlocks[block.type]
  const action = blockDef?.actions.find((a) => a.name === block.options?.action)

  if (!action || !action.run?.stream)
    return {
      status: 400,
      message: 'This block does not have a stream function',
    }

  try {
    if (!block.options.credentialsId)
      return { status: 404, message: 'Could not find credentials' }
    const credentials = await getCredentials(block.options.credentialsId)
    if (!credentials)
      return { status: 404, message: 'Could not find credentials' }
    const decryptedCredentials = await decryptV2(
      credentials.data,
      credentials.iv
    )

    const variables: AsyncVariableStore = {
      list: () => session.state.mozbotsQueue[0].mozbot.variables,
      get: (id: string) => {
        const variable = session.state.mozbotsQueue[0].mozbot.variables.find(
          (variable) => variable.id === id
        )
        return variable?.value
      },
      parse: (text: string, params?: ParseVariablesOptions) =>
        parseVariables(
          session.state.mozbotsQueue[0].mozbot.variables,
          params
        )(text),
      set: async (id: string, value: unknown) => {
        const variable = session.state.mozbotsQueue[0].mozbot.variables.find(
          (variable) => variable.id === id
        )
        if (!variable) return
        const { updatedState, newSetVariableHistory } =
          updateVariablesInSession({
            newVariables: [{ ...variable, value }],
            state: session.state,
            currentBlockId: session.state.currentBlockId,
          })
        if (
          newSetVariableHistory.length > 0 &&
          session.state.mozbotsQueue[0].resultId
        )
          await saveSetVariableHistoryItems(newSetVariableHistory)
        await updateSession({
          id: session.id,
          state: updatedState,
          isReplying: undefined,
        })
      },
    }
    const { stream, httpError } = await action.run.stream.run({
      credentials: decryptedCredentials,
      options: deepParseVariables(
        session.state.mozbotsQueue[0].mozbot.variables
      )(block.options),
      variables,
    })
    if (httpError) return httpError

    if (!stream) return { status: 500, message: 'Could not create stream' }

    return { stream }
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      const { message } = error
      return {
        status: 500,
        message,
      }
    }
    return {
      status: 500,
      message: 'Could not create stream',
    }
  }
}
