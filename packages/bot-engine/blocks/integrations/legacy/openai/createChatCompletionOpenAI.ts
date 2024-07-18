import {
  Block,
  Credentials,
  SessionState,
  MozbotInSession,
} from '@mozbot.io/schemas'
import {
  ChatCompletionOpenAIOptions,
  OpenAICredentials,
} from '@mozbot.io/schemas/features/blocks/integrations/openai'
import { byId, isEmpty } from '@mozbot.io/lib'
import { decrypt } from '@mozbot.io/lib/api/encryption/decrypt'
import { resumeChatCompletion } from './resumeChatCompletion'
import { parseChatCompletionMessages } from './parseChatCompletionMessages'
import { executeChatCompletionOpenAIRequest } from './executeChatCompletionOpenAIRequest'
import prisma from '@mozbot.io/lib/prisma'
import { ExecuteIntegrationResponse } from '../../../../types'
import { parseVariableNumber } from '@mozbot.io/variables/parseVariableNumber'
import { updateVariablesInSession } from '@mozbot.io/variables/updateVariablesInSession'
import {
  chatCompletionMessageRoles,
  defaultOpenAIOptions,
} from '@mozbot.io/schemas/features/blocks/integrations/openai/constants'
import { BubbleBlockType } from '@mozbot.io/schemas/features/blocks/bubbles/constants'

export const createChatCompletionOpenAI = async (
  state: SessionState,
  {
    outgoingEdgeId,
    options,
    blockId,
  }: {
    outgoingEdgeId?: string
    options: ChatCompletionOpenAIOptions
    blockId: string
  }
): Promise<ExecuteIntegrationResponse> => {
  let newSessionState = state
  const noCredentialsError = {
    status: 'error',
    description: 'Make sure to select an OpenAI account',
  }

  if (!options.credentialsId) {
    return {
      outgoingEdgeId,
      logs: [noCredentialsError],
    }
  }
  const credentials = await prisma.credentials.findUnique({
    where: {
      id: options.credentialsId,
    },
  })
  if (!credentials) {
    console.error('Could not find credentials in database')
    return { outgoingEdgeId, logs: [noCredentialsError] }
  }
  const { apiKey } = (await decrypt(
    credentials.data,
    credentials.iv
  )) as OpenAICredentials['data']

  const { mozbot } = newSessionState.mozbotsQueue[0]

  const { variablesTransformedToList, messages } = parseChatCompletionMessages(
    mozbot.variables
  )(options.messages)
  if (variablesTransformedToList.length > 0)
    newSessionState = updateVariablesInSession({
      state,
      newVariables: variablesTransformedToList,
      currentBlockId: undefined,
    }).updatedState

  const temperature = parseVariableNumber(mozbot.variables)(
    options.advancedSettings?.temperature
  )

  const assistantMessageVariableName = mozbot.variables.find(
    (variable) =>
      options.responseMapping?.find(
        (m) => m.valueToExtract === 'Message content'
      )?.variableId === variable.id
  )?.name

  if (
    newSessionState.isStreamEnabled &&
    !newSessionState.whatsApp &&
    isNextBubbleMessageWithAssistantMessage(mozbot)(
      blockId,
      assistantMessageVariableName
    )
  ) {
    return {
      clientSideActions: [
        {
          type: 'streamOpenAiChatCompletion',
          streamOpenAiChatCompletion: {
            messages: messages as {
              content?: string
              role: (typeof chatCompletionMessageRoles)[number]
            }[],
          },
          expectsDedicatedReply: true,
        },
      ],
      outgoingEdgeId,
      newSessionState,
    }
  }

  const { chatCompletion, logs } = await executeChatCompletionOpenAIRequest({
    apiKey,
    messages,
    model: options.model ?? defaultOpenAIOptions.model,
    temperature,
    baseUrl: options.baseUrl,
    apiVersion: options.apiVersion,
  })
  if (!chatCompletion)
    return {
      startTimeShouldBeUpdated: true,
      outgoingEdgeId,
      logs,
    }
  const messageContent = chatCompletion.choices.at(0)?.message?.content
  const totalTokens = chatCompletion.usage?.total_tokens
  if (isEmpty(messageContent)) {
    console.error('OpenAI block returned empty message', chatCompletion.choices)
    return { outgoingEdgeId, newSessionState, startTimeShouldBeUpdated: true }
  }
  return {
    ...(await resumeChatCompletion(newSessionState, {
      options,
      outgoingEdgeId,
      logs,
    })(messageContent, totalTokens)),
    startTimeShouldBeUpdated: true,
  }
}

const isNextBubbleMessageWithAssistantMessage =
  (mozbot: MozbotInSession) =>
  (blockId: string, assistantVariableName?: string): boolean => {
    if (!assistantVariableName) return false
    const nextBlock = getNextBlock(mozbot)(blockId)
    if (!nextBlock) return false
    return (
      nextBlock.type === BubbleBlockType.TEXT &&
      (nextBlock.content?.richText?.length ?? 0) > 0 &&
      nextBlock.content?.richText?.at(0)?.children.at(0).text ===
        `{{${assistantVariableName}}}`
    )
  }

const getNextBlock =
  (mozbot: MozbotInSession) =>
  (blockId: string): Block | undefined => {
    const group = mozbot.groups.find((group) =>
      group.blocks.find(byId(blockId))
    )
    if (!group) return
    const blockIndex = group.blocks.findIndex(byId(blockId))
    const nextBlockInGroup = group.blocks.at(blockIndex + 1)
    if (nextBlockInGroup) return nextBlockInGroup
    const outgoingEdgeId = group.blocks.at(blockIndex)?.outgoingEdgeId
    if (!outgoingEdgeId) return
    const outgoingEdge = mozbot.edges.find(byId(outgoingEdgeId))
    if (!outgoingEdge) return
    const connectedGroup = mozbot.groups.find(byId(outgoingEdge?.to.groupId))
    if (!connectedGroup) return
    return outgoingEdge.to.blockId
      ? connectedGroup.blocks.find(
          (block) => block.id === outgoingEdge.to.blockId
        )
      : connectedGroup?.blocks.at(0)
  }

const isCredentialsV2 = (credentials: Pick<Credentials, 'iv'>) =>
  credentials.iv.length === 24
