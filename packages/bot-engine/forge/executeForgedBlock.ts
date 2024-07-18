import { VariableStore, LogsStore } from '@mozbot.io/forge'
import { forgedBlocks } from '@mozbot.io/forge-repository/definitions'
import { ForgedBlock } from '@mozbot.io/forge-repository/types'
import { decrypt } from '@mozbot.io/lib/api/encryption/decrypt'
import {
  SessionState,
  ContinueChatResponse,
  Block,
  MozbotInSession,
  SetVariableHistoryItem,
} from '@mozbot.io/schemas'
import { deepParseVariables } from '@mozbot.io/variables/deepParseVariables'
import {
  ParseVariablesOptions,
  parseVariables,
} from '@mozbot.io/variables/parseVariables'
import { updateVariablesInSession } from '@mozbot.io/variables/updateVariablesInSession'
import { ExecuteIntegrationResponse } from '../types'
import { byId } from '@mozbot.io/lib'
import { BubbleBlockType } from '@mozbot.io/schemas/features/blocks/bubbles/constants'
import { getCredentials } from '../queries/getCredentials'

export const executeForgedBlock = async (
  state: SessionState,
  block: ForgedBlock
): Promise<ExecuteIntegrationResponse> => {
  const blockDef = forgedBlocks[block.type]
  if (!blockDef) return { outgoingEdgeId: block.outgoingEdgeId }
  const action = blockDef.actions.find((a) => a.name === block.options.action)
  const noCredentialsError = {
    status: 'error',
    description: 'Credentials not provided for integration',
  }

  let credentials: { data: string; iv: string } | null = null
  if (blockDef.auth) {
    if (!block.options.credentialsId) {
      return {
        outgoingEdgeId: block.outgoingEdgeId,
        logs: [noCredentialsError],
      }
    }
    credentials = await getCredentials(block.options.credentialsId)
    if (!credentials) {
      console.error('Could not find credentials in database')
      return {
        outgoingEdgeId: block.outgoingEdgeId,
        logs: [noCredentialsError],
      }
    }
  }

  const mozbot = state.mozbotsQueue[0].mozbot
  if (
    action?.run?.stream &&
    isNextBubbleTextWithStreamingVar(mozbot)(
      block.id,
      action.run.stream.getStreamVariableId(block.options)
    ) &&
    state.isStreamEnabled &&
    !state.whatsApp
  ) {
    return {
      outgoingEdgeId: block.outgoingEdgeId,
      clientSideActions: [
        {
          type: 'stream',
          expectsDedicatedReply: true,
          stream: true,
        },
      ],
    }
  }

  let newSessionState = state
  let setVariableHistory: SetVariableHistoryItem[] = []

  const variables: VariableStore = {
    get: (id: string) => {
      const variable = newSessionState.mozbotsQueue[0].mozbot.variables.find(
        (variable) => variable.id === id
      )
      return variable?.value
    },
    set: (id: string, value: unknown) => {
      const variable = newSessionState.mozbotsQueue[0].mozbot.variables.find(
        (variable) => variable.id === id
      )
      if (!variable) return
      const { newSetVariableHistory, updatedState } = updateVariablesInSession({
        newVariables: [{ ...variable, value }],
        state: newSessionState,
        currentBlockId: block.id,
      })
      newSessionState = updatedState
      setVariableHistory.push(...newSetVariableHistory)
    },
    parse: (text: string, params?: ParseVariablesOptions) =>
      parseVariables(
        newSessionState.mozbotsQueue[0].mozbot.variables,
        params
      )(text),
    list: () => newSessionState.mozbotsQueue[0].mozbot.variables,
  }
  let logs: NonNullable<ContinueChatResponse['logs']> = []
  const logsStore: LogsStore = {
    add: (log) => {
      if (typeof log === 'string') {
        logs.push({
          status: 'error',
          description: log,
        })
        return
      }
      logs.push(log)
    },
  }
  const credentialsData = credentials
    ? await decrypt(credentials.data, credentials.iv)
    : undefined

  const parsedOptions = deepParseVariables(
    state.mozbotsQueue[0].mozbot.variables,
    { removeEmptyStrings: true }
  )(block.options)
  await action?.run?.server?.({
    credentials: credentialsData ?? {},
    options: parsedOptions,
    variables,
    logs: logsStore,
  })

  const clientSideActions: ExecuteIntegrationResponse['clientSideActions'] = []

  if (action?.run?.web?.parseFunction) {
    clientSideActions.push({
      type: 'codeToExecute',
      codeToExecute: action?.run?.web?.parseFunction({
        options: parsedOptions,
      }),
    })
  }

  return {
    newSessionState,
    outgoingEdgeId: block.outgoingEdgeId,
    logs,
    clientSideActions,
    customEmbedBubble: action?.run?.web?.displayEmbedBubble
      ? {
          type: 'custom-embed',
          content: {
            url: action.run.web.displayEmbedBubble.parseUrl({
              options: parsedOptions,
            }),
            initFunction: action.run.web.displayEmbedBubble.parseInitFunction({
              options: parsedOptions,
            }),
            waitForEventFunction:
              action.run.web.displayEmbedBubble.waitForEvent?.parseFunction?.({
                options: parsedOptions,
              }),
          },
        }
      : undefined,
    newSetVariableHistory: setVariableHistory,
  }
}

const isNextBubbleTextWithStreamingVar =
  (mozbot: MozbotInSession) =>
  (blockId: string, streamVariableId?: string): boolean => {
    const streamVariable = mozbot.variables.find(
      (variable) => variable.id === streamVariableId
    )
    if (!streamVariable) return false
    const nextBlock = getNextBlock(mozbot)(blockId)
    if (!nextBlock) return false
    return (
      nextBlock.type === BubbleBlockType.TEXT &&
      (nextBlock.content?.richText?.length ?? 0) > 0 &&
      nextBlock.content?.richText?.at(0)?.children.at(0).text ===
        `{{${streamVariable.name}}}`
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

const isCredentialsV2 = (credentials: { iv: string }) =>
  credentials.iv.length === 24
